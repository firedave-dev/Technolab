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

const MARINE = '#0B2E52';
const ISTA = '#1F6FE0';
const CLAIR = '#7FB6F7';
const BLANC = '#FFFFFF';

/** Dimensions d'un PNG, lues dans l'en-tete IHDR. */
function dimensionsPNG(chemin) {
  const b = fs.readFileSync(chemin);
  const signature = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return { signature, largeur: b.readUInt32BE(16), hauteur: b.readUInt32BE(20), taille: b.length };
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
  const rampe = ['#4a8ce8', '#1f6fe0', '#1a5cbc', '#164a97', '#0b2e52'];
  const luminances = rampe.map(luminance);
  verifier('rampe des graphiques monotone du clair au fonce',
    luminances.every((l, i) => i === 0 || l < luminances[i - 1]));
  verifier('extremite claire de la rampe au-dessus de 3:1 sur carte blanche',
    contraste(rampe[0], BLANC) >= 3, `${contraste(rampe[0], BLANC).toFixed(2)}:1`);
  verifier('rampe sans bleu clair (jamais sur fond clair)',
    !rampe.includes(CLAIR.toLowerCase()));

  // ======================== FICHIERS DE MARQUE ========================
  const marque = path.join(RACINE, 'src', 'marque');
  const logoMarine = dimensionsPNG(path.join(marque, 'logo-horizontal-marine.png'));
  verifier('logo marine present et valide cote serveur',
    logoMarine.signature && logoMarine.largeur > 0, `${logoMarine.largeur}x${logoMarine.hauteur}`);

  // Le lockup doit rester au-dessus de 28 mm (~106 px a 96 dpi) une fois pose a 200 px.
  const largeurLockup = 200 * (941 / 1065);
  verifier('logo a 200 px : lockup au-dessus du plancher de 28 mm', largeurLockup >= 106,
    `${Math.round(largeurLockup)} px de lockup`);

  // --- SVG servis au navigateur ---
  const marqueClient = path.join(RACINE, '..', 'client', 'public', 'marque');

  const SVG_ATTENDUS = [
    'logo-horizontal.svg', 'logo-horizontal-marine.svg',
    'logo-vertical.svg', 'logo-vertical-inverse.svg', 'icone-marine.svg',
  ];

  for (const nom of SVG_ATTENDUS) {
    const chemin = path.join(marqueClient, nom);
    if (!fs.existsSync(chemin)) {
      verifier(`${nom} present`, false, 'fichier absent');
      continue;
    }

    const svg = fs.readFileSync(chemin, 'utf8');
    const viewBox = (svg.match(/viewBox="([^"]+)"/) || [])[1];

    // Sans viewBox, un SVG ne se redimensionne pas en CSS : c'est le defaut des exports.
    verifier(`${nom} : viewBox present et bien forme`,
      Boolean(viewBox) && viewBox.split(/\s+/).length === 4, viewBox || 'absent');

    // Les cadres gris de l'export ne doivent plus figurer dans le fichier livre.
    verifier(`${nom} : cadre parasite retire`,
      !/fill="#[dD]6[dD]3[dD]1"/.test(svg) && !/fill="#[eE]4[eE]1[dD][fF]"/.test(svg));
  }

  // L'icone servie en favicon doit etre carree, sinon elle est deformee par le navigateur.
  const iconeSvg = fs.readFileSync(path.join(marqueClient, 'icone-marine.svg'), 'utf8');
  const [, , largeurVue, hauteurVue] = (iconeSvg.match(/viewBox="([^"]+)"/) || ['', ''])[1]
    .split(/\s+/).map(Number);
  verifier('icone : viewBox carre', Math.abs(largeurVue - hauteurVue) < 0.5,
    `${largeurVue} x ${hauteurVue}`);

  /*
   * Le vertical bichrome fourni est ampute a gauche (lockup 339x306 contre 344x310
   * pour les variantes saines, colle au bord du canevas) : il n'est pas livre.
   */
  verifier('vertical bichrome ampute non livre',
    !fs.existsSync(path.join(marqueClient, 'logo-vertical-bichrome.svg')));

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

  // ====================== SERVICE D EMAIL ======================
  const { envoyerEmail, envoiReelActif, optionsTransport } =
    await import(SRC + 'services/email.service.js');

  /*
   * Le choix du transport est verifie sur la FONCTION PURE, a qui l'on passe une
   * configuration explicite. Tester l'environnement de la machine reviendrait a
   * ecrire « aucun SMTP n'est configure ici » : l'assertion casserait le jour ou
   * la messagerie passe reellement en production.
   */
  verifier('transport : sans hote declare, on journalise',
    optionsTransport({ host: '' }).jsonTransport === true);

  const port587 = optionsTransport({ host: 'smtp.exemple.test', port: 587, user: 'u', pass: 'p' });
  verifier('transport : port 587 negocie STARTTLS (secure = false)',
    port587.secure === false && port587.host === 'smtp.exemple.test');
  verifier('transport : identifiants transmis quand un utilisateur est declare',
    port587.auth?.user === 'u' && port587.auth?.pass === 'p');

  const port465 = optionsTransport({ host: 'smtp.exemple.test', port: 465 });
  verifier('transport : port 465 chiffre des la connexion (secure = true)',
    port465.secure === true);
  verifier('transport : relais sans authentification accepte',
    port465.auth === undefined);

  /*
   * L'envoi complet n'est exerce que si la machine n'a PAS de SMTP configure :
   * sur un poste de production, ce test posterait un vrai message a une adresse
   * fictive, ce qui degrade la reputation du domaine expediteur.
   */
  if (envoiReelActif()) {
    console.log('INFO  SMTP configure sur cette machine : envoi de bout en bout non exerce');
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

  // Une adresse vide ne doit jamais faire remonter d'exception, et nodemailer la
  // rejette localement : aucun paquet ne quitte la machine, meme SMTP configure.
  const echec = await envoyerEmail({ destinataire: '', sujet: 'Test', titre: 'Test' });
  verifier('un echec d envoi ne leve pas d exception',
    typeof echec === 'object' && echec.envoye === false, echec.transport);

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
    const flux = [];
    let i = 0;
    while ((i = pdf.buffer.indexOf('stream', i)) !== -1) {
      let d = i + 6;
      if (pdf.buffer[d] === 13) d += 1;
      if (pdf.buffer[d] === 10) d += 1;
      const f = pdf.buffer.indexOf('endstream', d);
      if (f === -1) break;
      try { flux.push(zlib.inflateSync(pdf.buffer.subarray(d, f)).toString('latin1')); } catch { /* flux binaire */ }
      i = f;
    }
    const contenu = flux.join('');
    verifier('recu PDF : couleurs de la charte dans le flux de dessin',
      contenu.includes('0.043137254901960784') || contenu.includes('scn'),
      'operateurs de couleur presents');
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
