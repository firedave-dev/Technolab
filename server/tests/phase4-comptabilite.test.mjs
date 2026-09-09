/** Tests de bout en bout Phase 4 : tarifs, echeanciers, paiements et recus PDF. */
// Chemin du dossier src/, resolu depuis l'emplacement de ce fichier.
const SRC = new URL('../src/', import.meta.url).href;
const { connectDB } = await import(SRC + 'config/db.js');
const { createApp } = await import(SRC + 'app.js');

const BASE = 'http://localhost:5095/api';
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
  if (brut) {
    return { status: res.status, type: res.headers.get('content-type'), buffer: Buffer.from(await res.arrayBuffer()) };
  }
  let data = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
}

const connecter = async (email, motDePasse = 'Passer@123') =>
  (await appel('/auth/login', { method: 'POST', body: { email, motDePasse } })).data?.accessToken;

const ANNEE = '2025-2026';
const aNettoyer = { frais: [], paiements: [] };

await connectDB();
const server = createApp().listen(5095);

try {
  const admin = await connecter('admin@technolab-ista.edu', 'Admin@1234');
  const directeur = await connecter('directeur@technolab-ista.edu');
  const secretaire = await connecter('secretaire@technolab-ista.edu');
  const professeur = await connecter('professeur@technolab-ista.edu');
  const parent = await connecter('parent@technolab-ista.edu');
  const etudiant = await connecter('etudiant@technolab-ista.edu');
  verifier('connexion des profils de test',
    [admin, directeur, secretaire, professeur, parent, etudiant].every(Boolean));

  const classes = (await appel('/classes', { token: admin })).data.classes;
  const classe = classes.find((c) => c.effectif > 0) || classes[0];
  const eleves = (await appel(`/etudiants?classe=${classe.id}`, { token: admin })).data.etudiants;
  const idEtudiantRef = (await appel('/auth/me', { token: etudiant })).data.utilisateur.id;

  // ============================ GRILLE TARIFAIRE ============================
  let r = await appel('/frais', { token: admin });
  verifier('GET /frais (grille du seed)', r.status === 200 && r.data.frais.length >= 9,
    `${r.data?.frais?.length} frais`);

  r = await appel('/frais', {
    method: 'POST', token: secretaire,
    body: { libelle: 'Frais de test', montant: 30000, classe: classe.id, anneeScolaire: ANNEE, premiereEcheance: '2025-11-01' },
  });
  verifier('secretaire ne definit pas les tarifs', r.status === 403);

  r = await appel('/frais', {
    method: 'POST', token: admin,
    body: {
      libelle: 'Frais de test', type: 'autre', montant: 30000, classe: classe.id,
      anneeScolaire: ANNEE, nombreTranches: 2, intervalleMois: 1, premiereEcheance: '2025-11-01',
    },
  });
  const fraisTest = r.data?.frais;
  if (fraisTest) aNettoyer.frais.push(fraisTest._id);
  verifier('direction cree un frais', r.status === 201, fraisTest?.libelle);

  r = await appel('/frais', {
    method: 'POST', token: admin,
    body: { libelle: 'Frais de test', montant: 10000, classe: classe.id, anneeScolaire: ANNEE, premiereEcheance: '2025-11-01' },
  });
  verifier('libelle unique par classe et annee', r.status === 409, r.data?.message);

  r = await appel('/frais', { token: professeur });
  verifier('professeur consulte la grille en lecture', r.status === 200);

  r = await appel('/frais', { token: parent });
  verifier('parent exclu de la grille tarifaire', r.status === 403);

  // ============================== ECHEANCIERS ==============================
  const cible = eleves[0];

  r = await appel(`/echeances/etudiant/${cible.id}`, {
    method: 'POST', token: secretaire, body: { anneeScolaire: ANNEE },
  });
  verifier('generation de l echeancier (frais de test inclus)',
    r.status === 201 && r.data.resultat.creees === 2, r.data?.message);

  r = await appel(`/echeances/etudiant/${cible.id}`, {
    method: 'POST', token: secretaire, body: { anneeScolaire: ANNEE },
  });
  verifier('generation rejouable sans doublon', r.status === 201 && r.data.resultat.creees === 0,
    r.data?.message);

  r = await appel(`/echeances/etudiant/${cible.id}`, { token: secretaire });
  const dossier = r.data;
  verifier('echeancier complet avec solde',
    r.status === 200 && dossier.echeances.length > 0 && typeof dossier.solde.total === 'number',
    `${dossier.echeances?.length} echeances, du ${dossier.solde?.total}`);

  const tranches = dossier.echeances.filter((e) => e.libelle.startsWith('Frais de test'));
  verifier('montant reparti sur les tranches',
    tranches.length === 2 && tranches.reduce((s, t) => s + t.montant, 0) === 30000,
    tranches.map((t) => t.montant).join(' + '));

  verifier('virtuels reste et enRetard exposes',
    dossier.echeances.every((e) => 'reste' in e && 'enRetard' in e));

  // Generation en lot pour la classe
  r = await appel('/echeances/classe', {
    method: 'POST', token: secretaire, body: { classe: classe.id, anneeScolaire: ANNEE },
  });
  verifier('generation en lot pour une classe', r.status === 201 && r.data.etudiants === eleves.length,
    r.data?.message);

  // ============================== PAIEMENTS ================================
  const aRegler = dossier.echeances.find((e) => e.statut === 'a_payer' && e.reste > 0);

  r = await appel('/paiements', {
    method: 'POST', token: secretaire,
    body: { etudiant: cible.id, echeance: aRegler.id, montant: aRegler.reste + 1000, mode: 'especes' },
  });
  verifier('encaissement superieur au reste du refuse', r.status === 400, r.data?.message);

  r = await appel('/paiements', {
    method: 'POST', token: professeur,
    body: { etudiant: cible.id, montant: 1000 },
  });
  verifier('professeur ne peut pas encaisser', r.status === 403);

  // Paiement partiel par le secretariat : reste en attente
  const acompte = Math.floor(aRegler.reste / 2);
  r = await appel('/paiements', {
    method: 'POST', token: secretaire,
    body: { etudiant: cible.id, echeance: aRegler.id, montant: acompte, mode: 'mobile_money', reference: 'MM-TEST-1' },
  });
  const paiementSecretaire = r.data?.paiement;
  if (paiementSecretaire) aNettoyer.paiements.push(paiementSecretaire._id);
  verifier('paiement du secretariat en attente de validation',
    r.status === 201 && paiementSecretaire.statut === 'en_attente', paiementSecretaire?.numeroRecu);
  verifier('numero de recu au bon format', /^REC-\d{4}-\d{4}$/.test(paiementSecretaire?.numeroRecu || ''),
    paiementSecretaire?.numeroRecu);

  // Tant qu'il n'est pas valide, le solde ne bouge pas
  r = await appel(`/echeances/etudiant/${cible.id}`, { token: secretaire });
  const echeanceAvant = r.data.echeances.find((e) => e.id === aRegler.id);
  verifier('paiement en attente non compte dans le solde',
    echeanceAvant.montantPaye === aRegler.montantPaye, `paye ${echeanceAvant.montantPaye}`);

  r = await appel(`/paiements/${paiementSecretaire._id}/validation`, { method: 'PATCH', token: secretaire });
  verifier('secretaire ne valide pas les paiements', r.status === 403);

  r = await appel(`/paiements/${paiementSecretaire._id}/validation`, { method: 'PATCH', token: directeur });
  verifier('directeur valide le paiement', r.status === 200 && r.data.paiement.statut === 'valide');

  r = await appel(`/echeances/etudiant/${cible.id}`, { token: secretaire });
  const echeanceApres = r.data.echeances.find((e) => e.id === aRegler.id);
  verifier('solde recalcule apres validation',
    echeanceApres.montantPaye === acompte && echeanceApres.statut === 'partiel',
    `paye ${echeanceApres.montantPaye}, statut ${echeanceApres.statut}`);

  r = await appel(`/paiements/${paiementSecretaire._id}/validation`, { method: 'PATCH', token: directeur });
  verifier('double validation refusee', r.status === 400, r.data?.message);

  // Solde de l'echeance apres paiement du reliquat par la direction (valide d'emblee)
  r = await appel('/paiements', {
    method: 'POST', token: admin,
    body: { etudiant: cible.id, echeance: aRegler.id, montant: aRegler.reste - acompte, mode: 'especes' },
  });
  const paiementDirection = r.data?.paiement;
  if (paiementDirection) aNettoyer.paiements.push(paiementDirection._id);
  verifier('la direction encaisse en valide directement',
    r.status === 201 && paiementDirection.statut === 'valide');

  r = await appel(`/echeances/etudiant/${cible.id}`, { token: secretaire });
  const echeanceSoldee = r.data.echeances.find((e) => e.id === aRegler.id);
  verifier('echeance passee au statut paye',
    echeanceSoldee.statut === 'paye' && echeanceSoldee.reste === 0,
    `${echeanceSoldee.montantPaye}/${echeanceSoldee.montant}`);

  // ============================== ANNULATION ===============================
  r = await appel(`/paiements/${paiementDirection._id}/annulation`, {
    method: 'PATCH', token: admin, body: { motif: 'Cheque sans provision' },
  });
  verifier('annulation d un paiement', r.status === 200 && r.data.paiement.statut === 'annule');

  r = await appel(`/echeances/etudiant/${cible.id}`, { token: secretaire });
  const echeanceApresAnnulation = r.data.echeances.find((e) => e.id === aRegler.id);
  verifier('solde recalcule apres annulation',
    echeanceApresAnnulation.montantPaye === acompte && echeanceApresAnnulation.statut === 'partiel',
    `paye ${echeanceApresAnnulation.montantPaye}, statut ${echeanceApresAnnulation.statut}`);

  // ============================== RECU PDF =================================
  r = await appel(`/paiements/${paiementSecretaire._id}/recu`, { token: secretaire, brut: true });
  verifier('recu PDF genere', r.status === 200 && r.type?.includes('application/pdf'),
    `${r.buffer?.length} octets`);
  verifier('en-tete PDF valide', r.buffer?.subarray(0, 5).toString() === '%PDF-',
    r.buffer?.subarray(0, 8).toString());

  r = await appel(`/paiements/${paiementSecretaire._id}/recu`, { token: parent, brut: true });
  const estSonEnfant = String(cible.id) === String(idEtudiantRef);
  verifier('recu inaccessible a un parent tiers', estSonEnfant || r.status === 403);

  // ========================= PERIMETRE ETUDIANT / PARENT ====================
  r = await appel('/paiements', { token: etudiant });
  verifier('etudiant ne voit que ses paiements',
    r.status === 200 && r.data.paiements.every((p) => String(p.etudiant._id) === String(idEtudiantRef)),
    `${r.data?.paiements?.length} paiements`);

  r = await appel(`/echeances/etudiant/${idEtudiantRef}`, { token: parent });
  verifier('parent consulte l echeancier de son enfant', r.status === 200);

  const autreEleve = eleves.find((e) => String(e.id) !== String(idEtudiantRef));
  if (autreEleve) {
    r = await appel(`/echeances/etudiant/${autreEleve.id}`, { token: etudiant });
    verifier('etudiant bloque sur un dossier tiers', r.status === 403, r.data?.message);
  }

  r = await appel('/echeances/statistiques', { token: etudiant });
  verifier('statistiques comptables reservees a la caisse', r.status === 403);

  // ============================== STATISTIQUES ==============================
  r = await appel(`/echeances/statistiques?anneeScolaire=${ANNEE}`, { token: admin });
  const stats = r.data?.statistiques;
  verifier('statistiques comptables completes',
    r.status === 200 && stats.attendu > 0 && stats.tauxRecouvrement !== null,
    `attendu ${stats?.attendu}, encaisse ${stats?.encaisse}, recouvrement ${stats?.tauxRecouvrement}%`);
  verifier('coherence attendu = encaisse + reste',
    stats.attendu === stats.encaisse + stats.reste);
  verifier('paiements en attente comptabilises',
    typeof stats.paiementsEnAttente.nombre === 'number',
    `${stats?.paiementsEnAttente?.nombre} en attente`);

  r = await appel(`/echeances?enRetard=true&limite=5`, { token: admin });
  verifier('filtre des echeances en retard',
    r.status === 200 && r.data.echeances.every((e) => e.enRetard),
    `${r.data?.pagination?.total} en retard`);

  // ============================== VALIDATION ===============================
  r = await appel('/paiements', {
    method: 'POST', token: admin, body: { etudiant: cible.id, montant: 0 },
  });
  verifier('montant nul refuse', r.status === 400);

  r = await appel('/paiements', {
    method: 'POST', token: admin,
    body: { etudiant: cible.id, echeance: dossier.echeances[0].id, montant: 500, mode: 'inconnu' },
  });
  verifier('mode de paiement invalide refuse', r.status === 400);

  r = await appel('/frais', {
    method: 'POST', token: admin,
    body: { libelle: 'X', montant: -5, classe: classe.id, anneeScolaire: '2025', premiereEcheance: 'pas-une-date' },
  });
  verifier('validation Zod sur la grille tarifaire', r.status === 400 && r.data.details.length >= 3,
    `${r.data?.details?.length} erreurs`);

  // Suppression d'un frais utilise
  r = await appel(`/frais/${fraisTest._id}`, { method: 'DELETE', token: admin });
  verifier('suppression refusee si des echeances en dependent', r.status === 400, r.data?.message);

  console.log(`\nResultat : ${ok.length} succes, ${ko.length} echec(s)`);
  if (ko.length) console.log('Echecs :', ko);
} finally {
  // Nettoyage : paiements, echeances puis frais crees par le test
  try {
    const admin = await connecter('admin@technolab-ista.edu', 'Admin@1234');
    const { Paiement } = await import(SRC + 'models/Paiement.js');
    const { Echeance } = await import(SRC + 'models/Echeance.js');
    const { FraisScolarite } = await import(SRC + 'models/FraisScolarite.js');

    await Paiement.deleteMany({ _id: { $in: aNettoyer.paiements } });
    for (const id of aNettoyer.frais) {
      await Echeance.deleteMany({ frais: id });
      await FraisScolarite.deleteOne({ _id: id });
    }
    if (admin) console.log('[nettoyage] Frais et paiements de test supprimes');
  } catch (erreur) {
    console.log('[nettoyage] Incomplet :', erreur.message);
  }

  server.close();
  process.exit(ko.length ? 1 : 0);
}
