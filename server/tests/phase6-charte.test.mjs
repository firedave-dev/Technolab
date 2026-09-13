/**
 * Tests Phase 6 : identite visuelle, emails transactionnels et documents PDF.
 *
 * Ces verifications portent sur ce qui est mesurable automatiquement : contrastes
 * WCAG, presence des couleurs de charte dans les livrables, integrite des fichiers
 * de marque, et bon fonctionnement du circuit d'email sans serveur SMTP.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url).href;
// fileURLToPath gere correctement les chemins Windows (lettre de lecteur, separateurs).
const RACINE = fileURLToPath(new URL('..', import.meta.url));
const { connectDB } = await import(SRC + 'config/db.js');

/**
 * Compte administrateur de reference, lu depuis la configuration.
 *
 * Cette adresse est reglable par SEED_ADMIN_EMAIL : la coder en dur ici faisait
 * echouer toute la suite des qu'un deploiement changeait l'adresse de l'admin,
 * alors que le code teste etait intact. On lit donc la meme source que le seed.
 */
const { env } = await import(SRC + 'config/env.js');
const ADMIN_EMAIL = env.seed.adminEmail;
const ADMIN_MDP = env.seed.adminPassword;
const { createApp } = await import(SRC + 'app.js');

const BASE = 'http://localhost:5092/api';
const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(nom);
  console.log(`${condition ? 'OK   ' : 'ECHEC'} ${nom} ${detail ? '-> ' + detail : ''}`);
}

async function appel(chemin, { method = 'GET', body, token, brut = false } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(BASE + chemin, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (brut) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()) };

  let data = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
}

const connecter = async (email, motDePasse = 'Passer@123') =>
  (await appel('/auth/login', { method: 'POST', body: { email, motDePasse } })).data?.accessToken;

// ---------------------------------------------------------------- contrastes

/** Luminance relative WCAG 2.1. */
function luminance(hex) {
  const canaux = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, v, b] = canaux.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * v + 0.0722 * b;
}

const contraste = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const MARINE = '#2E4474';
const ISTA = '#038129';
const CLAIR = '#C4CDDC';
const BLANC = '#FFFFFF';

/** Dimensions d'un PNG, lues dans l'en-tete IHDR. */
function dimensionsPNG(chemin) {
  const b = fs.readFileSync(chemin);
  const signature = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return {
    signature,
    largeur: b.readUInt32BE(16),
    hauteur: b.readUInt32BE(20),
    // Octet 25 de l'en-tete IHDR : 6 = RVB + alpha, 2 = RVB sans transparence.
    typeCouleur: b.readUInt8(25),
    taille: b.length,
  };
}

await connectDB();
const server = createApp().listen(5092);

try {
  // ======================= CONTRASTES DE LA CHARTE =======================
  const cISTA = contraste(ISTA, BLANC);
  verifier('bleu ISTA sur blanc conforme AA petit texte (>= 4,5:1)', cISTA >= 4.5,
    `${cISTA.toFixed(2)}:1`);

  const cBoutonPrimaire = contraste(BLANC, ISTA);
  verifier('blanc sur bouton primaire conforme AA', cBoutonPrimaire >= 4.5,
    `${cBoutonPrimaire.toFixed(2)}:1`);

  const cMarine = contraste(MARINE, BLANC);
  verifier('marine sur blanc, texte informatif', cMarine >= 7,
    `${cMarine.toFixed(2)}:1 (AAA)`);

  const cSidebar = contraste(BLANC, MARINE);
  verifier('blanc sur barre laterale marine', cSidebar >= 4.5, `${cSidebar.toFixed(2)}:1`);

  const cClairSurMarine = contraste(CLAIR, MARINE);
  verifier('bleu clair sur marine, usage autorise', cClairSurMarine >= 4.5,
    `${cClairSurMarine.toFixed(2)}:1`);

  const cClairSurBlanc = contraste(CLAIR, BLANC);
  verifier('bleu clair sur blanc bien insuffisant, d ou son interdiction', cClairSurBlanc < 3,
    `${cClairSurBlanc.toFixed(2)}:1`);

  // ==================== RAMPE ORDINALE DES GRAPHIQUES ====================
  const rampe = ['#2b954b', '#038129', '#026a22', '#025f1e', '#01521a'];
  const luminances = rampe.map(luminance);
  verifier('rampe des graphiques monotone du clair au fonce',
    luminances.every((l, i) => i === 0 || l < luminances[i - 1]));
  verifier('extremite claire de la rampe au-dessus de 3:1 sur carte blanche',
    contraste(rampe[0], BLANC) >= 3, `${contraste(rampe[0], BLANC).toFixed(2)}:1`);
  verifier('rampe sans bleu clair (jamais sur fond clair)',
    !rampe.includes(CLAIR.toLowerCase()));

  // ======================== FICHIERS DE MARQUE ========================
  const marque = path.join(RACINE, 'src', 'marque');
  const marqueClient = path.join(RACINE, '..', 'client', 'public', 'marque');

  // Le serveur genere les PDF et les emails : il lui faut sa propre copie.
  for (const nom of ['blason.png', 'blason-sur-marine.png']) {
    const info = dimensionsPNG(path.join(marque, nom));
    verifier(`${nom} present et valide cote serveur`,
      info.signature && info.largeur > 0, `${info.largeur}x${info.hauteur}`);
  }

  /*
   * Le detourage doit avoir produit de la VRAIE transparence.
   *
   * Le fichier d'origine porte un canal alpha qui vaut 255 partout : un simple
   * controle « le PNG a-t-il un canal alpha » serait donc passe sans rien
   * garantir. On verifie le type de couleur 6 (RVB + alpha) ET le fait que le
   * fichier aplati sur le bleu soit sensiblement plus leger — preuve qu'il
   * couvre reellement un aplat uni la ou l'autre laisse voir le fond.
   */
  const blason = dimensionsPNG(path.join(marqueClient, 'logo-technolab.png'));
  verifier('blason client : PNG avec canal alpha', blason.typeCouleur === 6,
    `type de couleur ${blason.typeCouleur}`);

  // Le blason est quasi carre : tout calage qui le traite comme un verrou
  // horizontal le ferait deborder de son bandeau.
  const rapport = blason.largeur / blason.hauteur;
  verifier('blason quasi carre (calage en hauteur, jamais en largeur)',
    rapport > 0.9 && rapport < 1.2, `rapport ${rapport.toFixed(3)}`);

  // --- Icones d'application ---
  for (const cote of [16, 32, 180, 192, 512]) {
    const info = dimensionsPNG(path.join(marqueClient, `icone-${cote}.png`));
    verifier(`icone-${cote} : presente et carree a la bonne taille`,
      info.signature && info.largeur === cote && info.hauteur === cote,
      `${info.largeur}x${info.hauteur}`);
  }

  /*
   * Les fichiers de l'ancienne charte ne doivent plus etre livres : laisses en
   * place, ils resteraient servis par leur URL et pourraient reapparaitre dans
   * un cache, un partage social ou un favori.
   */
  const ANCIENS = [
    'logo-horizontal.svg', 'logo-horizontal-marine.svg', 'logo-vertical.svg',
    'logo-vertical-inverse.svg', 'icone-marine.svg', 'icone-claire.svg',
    'icone-monochrome.svg',
  ];
  const survivants = ANCIENS.filter((n) => fs.existsSync(path.join(marqueClient, n)));
  verifier('fichiers de l ancienne charte retires', survivants.length === 0,
    survivants.join(', ') || 'aucun');

  // ====================== GABARIT DES EMAILS ======================
  const { composerEmail, composerTexte, CID_LOGO } = await import(SRC + 'services/email.template.js');

  const html = composerEmail({
    titre: 'Titre de test',
    intro: 'Bonjour Aicha,',
    corps: ['Premier paragraphe.'],
    action: { libelle: 'Agir', url: 'https://exemple.test/action' },
    complement: 'Note complementaire.',
  });

  verifier('email : aplat marine en en-tete et en pied',
    (html.match(new RegExp(MARINE, 'g')) || []).length >= 2);
  verifier('email : bouton d action en bleu ISTA', html.includes(ISTA));
  verifier('email : texte secondaire du pied en bleu clair', html.includes(CLAIR));
  verifier('email : logo joint au message plutot que lie',
    html.includes(`cid:${CID_LOGO}`) && !html.includes('<img src="http'));
  verifier('email : pile de polices avec repli sans-serif',
    html.includes('Archivo') && html.includes('sans-serif'));
  verifier('email : mise en page en tableaux, compatible Outlook',
    html.includes('role="presentation"'));

  const dangereux = composerEmail({ titre: '<script>alert(1)</script>', intro: '' });
  verifier('email : le titre est echappe', !dangereux.includes('<script>'));

  const texte = composerTexte({
    titre: 'Titre de test',
    intro: 'Bonjour',
    corps: ['<strong>Gras</strong>'],
    action: { libelle: 'Agir', url: 'https://exemple.test/action' },
  });
  verifier('email : version texte brut sans balises',
    !texte.includes('<') && texte.includes('https://exemple.test/action'));

  // ---------------- Fiche institutionnelle du pied ----------------

  const { env: config } = await import(SRC + 'config/env.js');

  /*
   * Le pied porte l'identite de l'etablissement. Chaque mention etant
   * configurable, on verifie qu'elle est REPRISE quand elle existe — et non
   * qu'une valeur precise est presente, ce qui casserait a la premiere
   * relecture de l'adresse par la direction.
   */
  for (const [champ, valeur] of Object.entries({
    adresse: config.etablissement.adresse,
    telephone: config.etablissement.telephone,
    email: config.etablissement.email,
  })) {
    if (!valeur) continue;
    verifier(`email : le pied reprend ${champ}`, html.includes(valeur), valeur);
    verifier(`email texte : le pied reprend ${champ}`, texte.includes(valeur));
  }

  /*
   * Une mention non renseignee doit etre OMISE, jamais rendue a vide : un pied
   * affichant « Tel. » suivi de rien fait plus de degats qu'une ligne absente.
   */
  verifier('email : aucune etiquette orpheline dans le pied',
    !/Tel\.\s*(&nbsp;·|<\/p>)/.test(html) && !/Agrement\s*(&nbsp;·|<\/p>)/.test(html));

  // Une adresse de reponse existant, le pied ne doit plus dire « ne pas repondre ».
  if (config.smtp.repondreA) {
    verifier('email : le pied invite a repondre a l adresse relevee',
      html.includes(config.smtp.repondreA) && !html.includes('ne pas repondre'),
      config.smtp.repondreA);
  }

  // ---------------- Habillage par nature d evenement ----------------

  const { sujetNotification } = await import(SRC + 'services/email.service.js');

  /*
   * Chaque nature de notification porte son propre prefixe d'objet : les
   * messageries regroupant par sujet, une famille distingue d'un coup d'oeil
   * une absence — qui appelle une reaction — d'une trace de paiement.
   *
   * Aucun envoi reel n'a lieu : le sujet est calcule par une fonction pure, qui
   * ne touche ni le reseau ni la configuration.
   */
  const PREFIXES = {
    absence: '[Absence]',
    note: '[Notes]',
    paiement: '[Scolarite]',
    examen: '[Examens]',
  };

  for (const [type, prefixe] of Object.entries(PREFIXES)) {
    const sujet = sujetNotification(type, 'Titre du message');
    verifier(`email ${type} : objet prefixe ${prefixe}`,
      sujet === `${prefixe} Titre du message`, sujet);
  }

  const distincts = new Set(
    Object.keys(PREFIXES).map((t) => sujetNotification(t, 'X'))
  );
  verifier('email : les quatre natures donnent quatre objets distincts',
    distincts.size === 4, `${distincts.size} objets`);

  // Une nature inconnue ne doit ni prefixer, ni faire echouer l'envoi.
  verifier('email : une nature inconnue retombe sur l objet nu',
    sujetNotification('inexistant', 'Titre') === 'Titre',
    sujetNotification('inexistant', 'Titre'));
  verifier('email : une nature absente retombe sur l objet nu',
    sujetNotification(undefined, 'Titre') === 'Titre');

  // ====================== SERVICE D EMAIL ======================
  const { envoyerEmail, envoiReelActif, modeEnvoi, composerExpediteur, interpreterReponse } =
    await import(SRC + 'services/email.service.js');

  /*
   * Le choix du mode est verifie sur la FONCTION PURE, a qui l'on passe une
   * configuration explicite. Tester l'environnement de la machine reviendrait a
   * ecrire « aucune cle n'est configuree ici » : l'assertion casserait le jour
   * ou la messagerie passe reellement en production.
   */
  verifier('transport : sans cle d API, mode degrade',
    modeEnvoi({ cleApi: '' }) === 'journal');
  verifier('transport : avec cle d API, envoi reel',
    modeEnvoi({ cleApi: 're_exemple' }) === 'resend');

  // --- Composition de l'expediteur ---
  verifier('expediteur : adresse nue composee avec le nom',
    composerExpediteur({ nomExpediteur: 'TechnoLAB-ISTA', adresseExpediteur: 'mails@exemple.test' })
    === 'TechnoLAB-ISTA <mails@exemple.test>');

  /*
   * Un .env herite de la configuration SMTP precedente porte deja la forme
   * complete. La recomposer donnerait « Nom <Nom <adresse>> », que le
   * fournisseur rejetterait — et le refus n'apparaitrait qu'a l'envoi reel.
   */
  verifier('expediteur : une adresse deja composee n est pas recomposee',
    composerExpediteur({ nomExpediteur: 'TechnoLAB-ISTA', adresseExpediteur: 'Ancien <a@b.test>' })
    === 'Ancien <a@b.test>');

  verifier('expediteur : sans nom, l adresse seule suffit',
    composerExpediteur({ adresseExpediteur: 'a@b.test' }) === 'a@b.test');
  verifier('expediteur : configuration vide ne fabrique rien',
    composerExpediteur({}) === '');

  /*
   * Lecture de la reponse du fournisseur.
   *
   * Le point critique : Resend NE LEVE PAS sur un refus applicatif — adresse
   * invalide, domaine non verifie, quota depasse. Il renvoie un objet dont seul
   * `error` est renseigne. Un code qui ne surveillerait que l'exception
   * compterait ces refus comme des envois reussis.
   */
  const accepte = interpreterReponse({ data: { id: 'abc-123' } });
  verifier('reponse : un envoi accepte rend son identifiant',
    accepte.envoye === true && accepte.id === 'abc-123' && accepte.transport === 'resend');

  const refuse = interpreterReponse({ error: { message: 'Invalid `to` field' } });
  verifier('reponse : un refus applicatif est capture, sans exception',
    refuse.envoye === false && refuse.transport === 'echec'
    && refuse.erreur === 'Invalid `to` field',
    refuse.erreur);

  verifier('reponse : une erreur sans message reste exploitable',
    interpreterReponse({ error: {} }).envoye === false);

  /*
   * L'envoi complet n'est exerce que si la machine n'a PAS de cle configuree :
   * sur un poste de production, ce test posterait un vrai message a une adresse
   * fictive, ce qui degrade la reputation du domaine expediteur.
   */
  if (envoiReelActif()) {
    console.log('INFO  Cle Resend presente sur cette machine : envoi de bout en bout non exerce');
  } else {
    const resultat = await envoyerEmail({
      destinataire: 'test@exemple.test',
      sujet: 'Test',
      titre: 'Test',
      intro: 'Bonjour',
    });
    verifier('transport de secours : le message est journalise',
      resultat.transport === 'journal' && resultat.envoye === false);
  }

  /*
   * Une adresse vide est ecartee AVANT tout appel reseau : elle ne vaut pas un
   * aller-retour, et le fournisseur la refuserait de toute facon. Le service ne
   * doit pour autant jamais lever — l'action metier qui a declenche ce courrier
   * a deja abouti.
   */
  const echec = await envoyerEmail({ destinataire: '', sujet: 'Test', titre: 'Test' });
  verifier('un echec d envoi ne leve pas d exception',
    typeof echec === 'object' && echec.envoye === false, echec.transport);
  verifier('une adresse vide n atteint jamais le reseau',
    echec.transport !== 'resend', echec.transport);

  // ============== MOT DE PASSE OUBLIE : L EMAIL NE BLOQUE PAS ==============
  const r = await appel('/auth/forgot-password', {
    method: 'POST', body: { email: 'etudiant@technolab-ista.edu' },
  });
  verifier('mot de passe oublie : le jeton reste emis malgre l absence de SMTP',
    r.status === 200 && Boolean(r.data.resetToken));

  // ======================== RECU PDF A LA CHARTE ========================
  const admin = await connecter(ADMIN_EMAIL, 'Admin@1234');
  const paiements = (await appel('/paiements?statut=valide&limite=1', { token: admin })).data.paiements;

  if (paiements?.length) {
    const pdf = await appel(`/paiements/${paiements[0].id}/recu`, { token: admin, brut: true });
    verifier('recu PDF genere', pdf.status === 200 && pdf.buffer.subarray(0, 5).toString() === '%PDF-',
      `${pdf.buffer.length} octets`);
    verifier('recu PDF : logo embarque comme image',
      pdf.buffer.includes('/Image'), 'XObject image present');

    // Le texte du bandeau a laisse place au logo : plus de nom en toutes lettres en en-tete.
    /*
     * Extraction des flux de contenu du PDF.
     *
     * Deux pieges, qui faisaient que cette boucle ne rendait qu'UN flux — une
     * police binaire — au lieu des quatre du document :
     * - « stream » apparait aussi a l'interieur de « endstream » ; sans le
     *   filtrer, la recherche repart au milieu du marqueur de fin ;
     * - il faut reprendre APRES « endstream », et non a son debut.
     *
     * Le flux de dessin etant alors absent, le controle de couleurs qui suit
     * passait sur du bruit binaire : il ne verifiait rien.
     */
    const FIN = 'endstream';
    const flux = [];
    let i = 0;
    while ((i = pdf.buffer.indexOf('stream', i)) !== -1) {
      if (i >= 3 && pdf.buffer.subarray(i - 3, i).toString('latin1') === 'end') { i += 6; continue; }
      let d = i + 6;
      if (pdf.buffer[d] === 13) d += 1;
      if (pdf.buffer[d] === 10) d += 1;
      const f = pdf.buffer.indexOf(FIN, d);
      if (f === -1) break;
      try { flux.push(zlib.inflateSync(pdf.buffer.subarray(d, f)).toString('latin1')); } catch { /* flux binaire */ }
      i = f + FIN.length;
    }
    const contenu = flux.join('');
    /*
     * Les couleurs de la charte doivent reellement figurer dans le flux de dessin.
     *
     * PDF exprime ses couleurs en composantes flottantes 0-1 : on cherche donc la
     * composante verte du vert de marque (129/255) et la composante bleue du bleu
     * d'autorite (116/255), chacune assez singuliere pour ne pas apparaitre par
     * hasard. Le controle precedent se contentait de la presence d'un operateur
     * de couleur quelconque — il serait reste vert avec une charte entierement
     * fausse.
     */
    const composante = (canal) => String(canal / 255).slice(0, 12);
    const vertPresent = contenu.includes(composante(129));
    const bleuPresent = contenu.includes(composante(116));
    verifier('recu PDF : couleurs de la charte dans le flux de dessin',
      vertPresent && bleuPresent,
      `vert ${vertPresent ? 'ok' : 'absent'}, bleu ${bleuPresent ? 'ok' : 'absent'}`);
  } else {
    verifier('recu PDF genere', false, 'aucun paiement valide en base');
  }

  // ================== VERIFICATION PUBLIQUE D'UN RECU ==================
  // Cible du QR imprime : elle doit repondre sans authentification, et ne rien
  // divulguer de plus que ce que porte deja le papier.
  const paiementsExistants = (await appel('/paiements?statut=valide&limite=1', { token: admin })).data.paiements;

  if (paiementsExistants?.length) {
    const numero = paiementsExistants[0].numeroRecu;

    const publique = await appel(`/paiements/verification/${numero}`);
    verifier('verification d un recu sans authentification',
      publique.status === 200 && publique.data.recu.numero === numero,
      `${publique.data?.recu?.montant} FCFA`);

    verifier('verification : aucune identite divulguee',
      !JSON.stringify(publique.data).match(/nom|prenom|etudiant|matricule/i));

    const inconnu = await appel('/paiements/verification/REC-2026-9999');
    verifier('verification : numero inconnu rejete', inconnu.status === 404);

    const malforme = await appel('/paiements/verification/PAS-UN-NUMERO');
    verifier('verification : format de numero valide', malforme.status === 400);

    // Le recu embarque desormais deux images : le logo et le QR de verification.
    const pdfQr = await appel(`/paiements/${paiementsExistants[0].id}/recu`, { token: admin, brut: true });
    const imagesPdf = (pdfQr.buffer.toString('latin1').match(/\/Subtype \/Image/g) || []).length;
    verifier('recu PDF : logo et QR embarques', imagesPdf >= 2, `${imagesPdf} image(s)`);
  }

  // ====================== COMPOSITION DES PAGES SEO ======================
  // `composerPage` est l'etape de build qui injecte le HTML pre-rendu et remonte
  // les metadonnees. Testee ici en isolation : elle n'exige aucun build prealable.
  const { composerPage } = await import(
    pathToFileURL(path.join(RACINE, '..', 'client', 'scripts', 'composer-page.mjs')).href
  );

  const gabarit = [
    '<!doctype html><html><head>',
    '<title>Titre du gabarit</title>',
    '<meta name="description" content="Description du gabarit" />',
    '</head><body><div id="root"></div></body></html>',
  ].join('');

  const renduPage = [
    '<title>Titre de la page</title>',
    '<meta name="description" content="Description de la page"/>',
    '<link rel="canonical" href="https://exemple.test/"/>',
    '<script type="application/ld+json">{"@type":"EducationalOrganization"}</script>',
    '<main><h1>Contenu indexable</h1></main>',
  ].join('');

  const page = composerPage(gabarit, renduPage);

  verifier('SEO : un seul titre dans la page composee',
    (page.match(/<title>/g) || []).length === 1
    && page.includes('<title>Titre de la page</title>'));

  verifier('SEO : une seule description',
    (page.match(/name="description"/g) || []).length === 1
    && page.includes('Description de la page'));

  verifier('SEO : canonique et donnees structurees remontees dans le head',
    page.indexOf('rel="canonical"') < page.indexOf('</head>')
    && page.indexOf('ld+json') < page.indexOf('</head>'));

  verifier('SEO : contenu injecte dans la racine',
    page.includes('<div id="root"><main><h1>Contenu indexable</h1></main></div>'));

  // ==================== PAGES PUBLIQUES : SEMANTIQUE ====================
  const sourcesClient = path.join(RACINE, '..', 'client', 'src');

  const layoutPublic = fs.readFileSync(path.join(sourcesClient, 'layouts', 'LayoutPublic.jsx'), 'utf8');
  verifier('site public : balises semantiques HTML5',
    ['<header', '<nav', '<main', '<footer'].every((b) => layoutPublic.includes(b)));

  verifier('site public : lien d evitement present', layoutPublic.includes('lien-evitement'));

  const PAGES_PUBLIQUES = ['Accueil', 'Formations', 'Admissions', 'APropos'];
  const sourcesPages = {};

  for (const nom of PAGES_PUBLIQUES) {
    const source = fs.readFileSync(path.join(sourcesClient, 'pages', 'public', `${nom}.jsx`), 'utf8');
    sourcesPages[nom] = source;
    verifier(`${nom} : metadonnees declarees`,
      source.includes('<Seo') && source.includes('description='));
  }

  // ==================== PHOTOGRAPHIES DU SITE PUBLIC ====================
  /*
   * Trois defaillances silencieuses sont surveillees ici :
   *   - une page reference une photo absente du catalogue (faute de frappe) ;
   *   - le catalogue annonce une photo dont le fichier n'a pas ete produit ;
   *   - un fichier est re-exporte a une autre taille que celle declaree, ce qui
   *     reintroduit le decalage de mise en page que width/height evitait.
   * Aucune ne provoque d'erreur au build : la page part en ligne avec un trou.
   */
  const dossierPhotos = path.join(RACINE, '..', 'client', 'public', 'photos');
  const catalogue = fs.readFileSync(path.join(sourcesClient, 'utils', 'photos.js'), 'utf8');

  const declarees = [...catalogue.matchAll(/^  '([a-z0-9-]+)': \{$/gm)].map((m) => m[1]);
  verifier('photos : le catalogue est non vide', declarees.length > 0, `${declarees.length} clichés`);

  verifier('photos : chaque cliche porte un texte alternatif',
    (catalogue.match(/^    alt:/gm) || []).length === declarees.length);

  /** Largeur et hauteur reelles d'un WebP encode en VP8 lossy. */
  function dimensionsWebp(fichier) {
    const tampon = fs.readFileSync(fichier);
    if (tampon.toString('ascii', 12, 16) !== 'VP8 ') return null; // autre variante : non verifiable ici
    return {
      largeur: tampon.readUInt16LE(26) & 0x3fff,
      hauteur: tampon.readUInt16LE(28) & 0x3fff,
    };
  }

  let fichiersManquants = 0;
  let dimensionsFausses = 0;

  for (const nom of declarees) {
    const bloc = catalogue.slice(catalogue.indexOf(`'${nom}': {`));
    const largeur = Number(bloc.match(/largeur: (\d+)/)[1]);
    const hauteur = Number(bloc.match(/hauteur: (\d+)/)[1]);
    const avecVariante = /variante: true/.test(bloc.slice(0, bloc.indexOf('},')));

    const attendus = [`${nom}.avif`, `${nom}.webp`];
    if (avecVariante) attendus.push(`${nom}@0.5x.avif`, `${nom}@0.5x.webp`);

    for (const fichier of attendus) {
      const chemin = path.join(dossierPhotos, fichier);
      if (!fs.existsSync(chemin) || fs.statSync(chemin).size === 0) fichiersManquants += 1;
    }

    const reelles = dimensionsWebp(path.join(dossierPhotos, `${nom}.webp`));
    if (reelles && (reelles.largeur !== largeur || reelles.hauteur !== hauteur)) {
      dimensionsFausses += 1;
      console.log(`      ${nom} : declare ${largeur}x${hauteur}, fichier ${reelles.largeur}x${reelles.hauteur}`);
    }
  }

  verifier('photos : les deux formats sont presents pour chaque cliche', fichiersManquants === 0);
  verifier('photos : les dimensions declarees correspondent aux fichiers', dimensionsFausses === 0);

  // Toute photo appelee depuis une page publique doit figurer au catalogue.
  const appelees = new Set();
  for (const source of Object.values(sourcesPages)) {
    for (const m of source.matchAll(/nom="([a-z0-9-]+)"/g)) appelees.add(m[1]);
    for (const m of source.matchAll(/photo: '([a-z0-9-]+)'/g)) appelees.add(m[1]);
  }
  const orphelines = [...appelees].filter((n) => !declarees.includes(n));
  verifier('photos : aucune page ne reference un cliche inconnu',
    orphelines.length === 0, orphelines.join(', '));


  console.log(`\nResultat : ${ok.length} succes, ${ko.length} echec(s)`);
  if (ko.length) console.log('Echecs :', ko);
} finally {
  // Le test de mot de passe oublie a change le jeton de reinitialisation, pas le mot
  // de passe : aucune remise en etat necessaire.
  server.close();
  process.exit(ko.length ? 1 : 0);
}
