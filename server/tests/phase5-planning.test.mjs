/** Tests de bout en bout Phase 5 : emploi du temps, tableaux de bord et statistiques. */
// Chemin du dossier src/, resolu depuis l'emplacement de ce fichier.
const SRC = new URL('../src/', import.meta.url).href;
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

const BASE = 'http://localhost:5094/api';
const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(nom);
  console.log(`${condition ? 'OK   ' : 'ECHEC'} ${nom} ${detail ? '-> ' + detail : ''}`);
}

async function appel(chemin, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(BASE + chemin, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
}

const connecter = async (email, motDePasse = 'Passer@123') =>
  (await appel('/auth/login', { method: 'POST', body: { email, motDePasse } })).data?.accessToken;

const aNettoyer = [];

await connectDB();
const server = createApp().listen(5094);

try {
  const admin = await connecter(ADMIN_EMAIL, 'Admin@1234');
  const directeur = await connecter('directeur@technolab-ista.edu');
  const secretaire = await connecter('secretaire@technolab-ista.edu');
  const professeur = await connecter('professeur@technolab-ista.edu');
  const surveillant = await connecter('surveillant@technolab-ista.edu');
  const parent = await connecter('parent@technolab-ista.edu');
  const etudiant = await connecter('etudiant@technolab-ista.edu');
  verifier('connexion des 7 profils',
    [admin, directeur, secretaire, professeur, surveillant, parent, etudiant].every(Boolean));

  const mesMatieres = (await appel('/evaluations/mes-matieres', { token: professeur })).data.matieres;
  const maMatiere = mesMatieres[0];
  const classeId = maMatiere.classe._id || maMatiere.classe.id;

  // =========================== EMPLOI DU TEMPS ===========================
  let r = await appel(`/planning?classe=${classeId}`, { token: admin });
  verifier('GET /planning renvoie une grille hebdomadaire',
    r.status === 200 && Array.isArray(r.data.jours) && r.data.jours.length === 6 && r.data.total > 0,
    `${r.data?.total} creneaux`);
  verifier('grille indexee par jour',
    r.data.jours.every((j) => Array.isArray(r.data.grille[j])),
    Object.entries(r.data.grille).map(([j, c]) => `${j.slice(0, 3)}:${c.length}`).join(' '));

  const creneauExistant = r.data.creneaux[0];

  // Conflit de classe : meme creneau, meme classe
  r = await appel('/planning', {
    method: 'POST', token: secretaire,
    body: {
      matiere: mesMatieres.find((m) => String(m.classe._id || m.classe.id) === String(classeId) && m.id !== maMatiere.id)?.id || maMatiere.id,
      jour: creneauExistant.jour,
      heureDebut: creneauExistant.heureDebut,
      heureFin: creneauExistant.heureFin,
      salle: 'Salle inconnue',
    },
  });
  verifier('conflit de classe detecte', r.status === 409, r.data?.message);

  // Conflit de salle : autre classe, meme salle, meme creneau
  const matiereAutreClasse = (await appel('/matieres', { token: admin })).data.matieres
    .find((m) => String(m.classe?._id) !== String(classeId));

  r = await appel('/planning', {
    method: 'POST', token: secretaire,
    body: {
      matiere: matiereAutreClasse.id,
      jour: creneauExistant.jour,
      heureDebut: creneauExistant.heureDebut,
      heureFin: creneauExistant.heureFin,
      salle: creneauExistant.salle,
    },
  });
  verifier('conflit de salle detecte', r.status === 409, r.data?.message);

  // Creneau libre : le dimanche n'existe pas, on prend samedi tres tot
  r = await appel('/planning', {
    method: 'POST', token: secretaire,
    body: { matiere: maMatiere.id, jour: 'samedi', heureDebut: '06:00', heureFin: '07:00', salle: 'Salle TEST', type: 'td' },
  });
  const creneauTest = r.data?.creneau;
  if (creneauTest) aNettoyer.push(creneauTest._id);
  verifier('creation d un creneau libre', r.status === 201, r.data?.message);
  verifier('classe et professeur deduits de la matiere',
    String(creneauTest?.classe?._id) === String(classeId) && Boolean(creneauTest?.professeur));

  r = await appel('/planning', {
    method: 'POST', token: secretaire,
    body: { matiere: maMatiere.id, jour: 'samedi', heureDebut: '08:00', heureFin: '07:00', salle: 'X' },
  });
  verifier('heure de fin anterieure refusee', r.status === 400);

  r = await appel('/planning', {
    method: 'POST', token: professeur,
    body: { matiere: maMatiere.id, jour: 'samedi', heureDebut: '06:00', heureFin: '07:00' },
  });
  verifier('professeur ne planifie pas les cours', r.status === 403);

  // Chevauchement partiel : 06:30-07:30 recoupe 06:00-07:00
  r = await appel('/planning', {
    method: 'POST', token: secretaire,
    body: { matiere: maMatiere.id, jour: 'samedi', heureDebut: '06:30', heureFin: '07:30', salle: 'Salle AUTRE' },
  });
  verifier('chevauchement partiel detecte', r.status === 409, r.data?.message);

  // Modification vers un creneau libre
  r = await appel(`/planning/${creneauTest._id}`, {
    method: 'PATCH', token: secretaire, body: { heureDebut: '06:00', heureFin: '07:30' },
  });
  verifier('modification d un creneau', r.status === 200 && r.data.creneau.heureFin === '07:30');

  // ====================== PERIMETRE DE CONSULTATION ======================
  r = await appel('/planning', { token: professeur });
  verifier('professeur voit son emploi du temps',
    r.status === 200 && r.data.creneaux.every((c) => c.professeur),
    `${r.data?.total} creneaux`);

  r = await appel('/planning', { token: etudiant });
  const planningEtudiant = r.data?.creneaux || [];
  verifier('etudiant ne voit que sa classe',
    r.status === 200 && planningEtudiant.length > 0
      && new Set(planningEtudiant.map((c) => String(c.classe._id))).size === 1,
    `${planningEtudiant.length} creneaux`);

  const autreClasse = (await appel('/classes', { token: admin })).data.classes
    .find((c) => String(c.id) !== String(planningEtudiant[0].classe._id));
  r = await appel(`/planning?classe=${autreClasse.id}`, { token: etudiant });
  verifier('etudiant ne peut pas consulter une autre classe',
    r.data.creneaux.every((c) => String(c.classe._id) !== String(autreClasse.id)));

  r = await appel('/planning', { token: parent });
  verifier('parent voit le planning de ses enfants', r.status === 200 && r.data.creneaux.length > 0,
    `${r.data?.total} creneaux`);

  // ======================= TABLEAUX DE BORD PAR ROLE =======================
  r = await appel('/statistiques/mon-tableau', { token: directeur });
  const tdbDirection = r.data?.tableau;
  verifier('tableau de la direction',
    r.status === 200 && tdbDirection.effectifs && tdbDirection.finances && tdbDirection.alertes,
    `${tdbDirection?.effectifs?.etudiants} etudiants, recouvrement ${tdbDirection?.finances?.tauxRecouvrement}%`);

  r = await appel('/statistiques/mon-tableau', { token: secretaire });
  verifier('tableau du secretariat (sans alertes pedagogiques)',
    r.status === 200 && r.data.tableau.finances && r.data.tableau.alertes.notesNonPubliees === undefined);

  r = await appel('/statistiques/mon-tableau', { token: professeur });
  const tdbProf = r.data?.tableau;
  verifier('tableau du professeur',
    r.status === 200 && Array.isArray(tdbProf.matieres) && tdbProf.matieres.length > 0
      && Array.isArray(tdbProf.aCorriger),
    `${tdbProf?.matieres?.length} matieres, ${tdbProf?.aCorriger?.length} a corriger`);
  verifier('aucune donnee financiere pour le professeur', tdbProf.finances === undefined);

  r = await appel('/statistiques/mon-tableau', { token: surveillant });
  verifier('tableau du surveillant',
    r.status === 200 && r.data.tableau.absencesDuJour && Array.isArray(r.data.tableau.surveillances),
    `${r.data?.tableau?.alertes?.absencesNonJustifiees} absences a justifier`);

  r = await appel('/statistiques/mon-tableau', { token: etudiant });
  const tdbEtudiant = r.data?.tableau;
  verifier('tableau de l etudiant',
    r.status === 200 && tdbEtudiant.scolarite && tdbEtudiant.absences && tdbEtudiant.finances,
    `moyenne ${tdbEtudiant?.scolarite?.moyenne}, reste ${tdbEtudiant?.finances?.reste}`);
  verifier('etudiant ne recoit que son propre solde',
    tdbEtudiant.finances.total >= 0 && tdbEtudiant.effectifs === undefined);

  r = await appel('/statistiques/mon-tableau', { token: parent });
  verifier('tableau du parent, un bloc par enfant',
    r.status === 200 && Array.isArray(r.data.tableau.enfants) && r.data.tableau.enfants.length > 0,
    `${r.data?.tableau?.enfants?.length} enfant(s)`);
  verifier('resume enfant complet',
    r.data.tableau.enfants.every((e) => e.etudiant && e.scolarite && e.absences && e.finances));

  // ====================== STATISTIQUES ETABLISSEMENT ======================
  r = await appel('/statistiques/etablissement', { token: admin });
  const stats = r.data?.statistiques;
  verifier('statistiques d etablissement completes',
    r.status === 200 && stats.effectifs && stats.pedagogie && stats.finances
      && Array.isArray(stats.classes) && Array.isArray(stats.encaissements),
    `${stats?.classes?.length} classes, ${stats?.encaissements?.length} mois`);

  verifier('serie d encaissements sur 12 mois',
    stats.encaissements.length === 12 && stats.encaissements.every((m) => typeof m.montant === 'number'));

  verifier('repartition des effectifs par niveau et filiere',
    stats.repartition.parNiveau.length > 0 && stats.repartition.parFiliere.length > 0,
    stats.repartition.parNiveau.map((n) => `${n.libelle}:${n.nombre}`).join(' '));

  verifier('taux de reussite calcule',
    stats.pedagogie.evalues > 0 && stats.pedagogie.tauxReussite !== null,
    `${stats.pedagogie.evalues} evalues, moyenne ${stats.pedagogie.moyenne}, reussite ${stats.pedagogie.tauxReussite}%`);

  verifier('repartition des moyennes en 5 tranches',
    stats.pedagogie.repartition.length === 5
      && stats.pedagogie.repartition.reduce((s, t) => s + t.nombre, 0) === stats.pedagogie.evalues);

  verifier('synthese par classe avec effectif et recouvrement',
    stats.classes.every((c) => typeof c.effectif === 'number' && 'tauxRecouvrement' in c),
    stats.classes.map((c) => `${c.classe.nom}:${c.effectif}`).join(' '));

  r = await appel('/statistiques/etablissement', { token: secretaire });
  verifier('statistiques d etablissement reservees a la direction', r.status === 403);

  r = await appel('/statistiques/etablissement', { token: parent });
  verifier('parent exclu des statistiques globales', r.status === 403);

  // ===================== COHERENCE AVEC LES BULLETINS =====================
  const idEtudiantRef = (await appel('/auth/me', { token: etudiant })).data.utilisateur.id;
  const bulletin = (await appel(`/bulletins/${idEtudiantRef}`, { token: etudiant })).data.bulletin;
  const tableau = (await appel('/statistiques/mon-tableau', { token: etudiant })).data.tableau;

  verifier('moyenne du tableau de bord identique a celle du bulletin',
    bulletin.moyenneGenerale === tableau.scolarite.moyenne,
    `bulletin ${bulletin.moyenneGenerale} / tableau ${tableau.scolarite.moyenne}`);

  // ============================== NETTOYAGE ==============================
  r = await appel(`/planning/${creneauTest._id}`, { method: 'DELETE', token: admin });
  verifier('suppression d un creneau', r.status === 200);
  if (r.status === 200) aNettoyer.length = 0;

  console.log(`\nResultat : ${ok.length} succes, ${ko.length} echec(s)`);
  if (ko.length) console.log('Echecs :', ko);
} finally {
  try {
    const admin = await connecter(ADMIN_EMAIL, 'Admin@1234');
    for (const id of aNettoyer) await appel(`/planning/${id}`, { method: 'DELETE', token: admin });
  } catch { /* nettoyage best effort */ }

  server.close();
  process.exit(ko.length ? 1 : 0);
}
