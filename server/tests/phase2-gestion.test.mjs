/** Tests de bout en bout du module Phase 2 : utilisateurs, etudiants, classes, parents. */
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

const BASE = 'http://localhost:5098/api';
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

async function connecter(email, motDePasse = 'Passer@123') {
  const r = await appel('/auth/login', { method: 'POST', body: { email, motDePasse } });
  return r.data?.accessToken;
}

await connectDB();
const server = createApp().listen(5098);

try {
  const admin = await connecter(ADMIN_EMAIL, 'Admin@1234');
  const secretaire = await connecter('secretaire@technolab-ista.edu');
  const professeur = await connecter('professeur@technolab-ista.edu');
  const parent = await connecter('parent@technolab-ista.edu');
  const etudiant = await connecter('etudiant@technolab-ista.edu');
  verifier('connexion des 5 profils de test', [admin, secretaire, professeur, parent, etudiant].every(Boolean));

  // --- Liste et filtres ---
  let r = await appel('/users?limite=5', { token: admin });
  // On verifie la COHERENCE de la pagination, pas un effectif absolu : un seuil
  // en dur (« au moins 18 comptes ») ne passait que grace aux comptes laisses par
  // les executions precedentes, et tombait des que la base etait resemee proprement.
  const pg = r.data?.pagination;
  verifier('GET /users pagine',
    r.status === 200
    && r.data.utilisateurs.length === 5
    && pg.limite === 5
    && pg.total >= r.data.utilisateurs.length
    && pg.pages === Math.ceil(pg.total / 5),
    `total ${pg?.total}, ${pg?.pages} page(s)`);

  r = await appel('/users?role=professeur', { token: admin });
  verifier('filtre par role', r.status === 200 && r.data.utilisateurs.every((u) => u.role === 'professeur'),
    `${r.data?.utilisateurs?.length} professeurs`);

  r = await appel('/users?q=diallo', { token: admin });
  verifier('recherche texte', r.status === 200 && r.data.utilisateurs.length === 1,
    r.data?.utilisateurs?.[0]?.nomComplet);

  // --- Confidentialite du salaire ---
  r = await appel('/users?role=professeur', { token: admin });
  const salaireVuAdmin = r.data.utilisateurs.some((u) => u.infosPersonnel?.salaire !== undefined);
  r = await appel('/users?role=professeur', { token: secretaire });
  const salaireVuSecretaire = r.data.utilisateurs.some((u) => u.infosPersonnel?.salaire !== undefined);
  verifier('salaire visible par la direction', salaireVuAdmin);
  verifier('salaire masque pour le secretariat', !salaireVuSecretaire);

  // --- RBAC : acces au module ---
  r = await appel('/users', { token: professeur });
  verifier('professeur exclu du module utilisateurs', r.status === 403);

  // --- Delegation : le secretariat ne cree pas de personnel ---
  r = await appel('/users', {
    method: 'POST', token: secretaire,
    body: { nom: 'Test', prenom: 'Prof', email: `prof.${Date.now()}@x.io`, role: 'professeur' },
  });
  verifier('secretaire ne peut pas creer un professeur', r.status === 403, r.data?.message);

  // --- Creation avec mot de passe provisoire et matricule auto ---
  const emailEtu = `eleve.${Date.now()}@x.io`;
  r = await appel('/users', {
    method: 'POST', token: secretaire,
    body: { nom: 'Doumbia', prenom: 'Salif', email: emailEtu, role: 'etudiant', sexe: 'M' },
  });
  const nouvelEtudiant = r.data?.utilisateur;
  verifier('secretaire cree un etudiant', r.status === 201);
  verifier('matricule genere au bon format', /^ETU-\d{4}-\d{4}$/.test(nouvelEtudiant?.matricule || ''), nouvelEtudiant?.matricule);
  verifier('mot de passe provisoire renvoye une fois', typeof r.data?.motDePasseProvisoire === 'string');
  verifier('mot de passe absent du corps utilisateur', nouvelEtudiant?.motDePasse === undefined);

  // Le compte cree peut se connecter avec ce mot de passe
  const tokenNouveau = await connecter(emailEtu, r.data.motDePasseProvisoire);
  verifier('connexion avec le mot de passe provisoire', Boolean(tokenNouveau));

  // --- Classes ---
  r = await appel('/classes', { token: admin });
  const classes = r.data?.classes || [];
  verifier('GET /classes avec effectifs', r.status === 200 && classes.length === 3 && classes.every((c) => 'effectif' in c),
    classes.map((c) => `${c.nom}:${c.effectif}`).join(' '));

  const classeL1 = classes.find((c) => c.nom === 'L1 Informatique A');

  r = await appel(`/classes/${classeL1.id}`, {
    method: 'PATCH', token: admin, body: { capacite: 1 },
  });
  verifier('capacite refusee si inferieure a l effectif', r.status === 400, r.data?.message);

  r = await appel(`/classes/${classeL1.id}`, { method: 'DELETE', token: admin });
  verifier('suppression refusee si la classe est peuplee', r.status === 400, r.data?.message);

  r = await appel('/classes', {
    method: 'POST', token: admin,
    body: { nom: 'L3 Informatique A', niveau: 'L3', filiere: 'Informatique', anneeScolaire: '2025-2026', capacite: 30 },
  });
  const classeTemporaire = r.data?.classe;
  verifier('creation de classe', r.status === 201, classeTemporaire?.nom);

  // --- Affectation de classe ---
  r = await appel(`/etudiants/${nouvelEtudiant.id}/classe`, {
    method: 'PATCH', token: secretaire, body: { classe: classeTemporaire._id },
  });
  verifier('affectation a une classe', r.status === 200 && r.data.etudiant.infosEtudiant.classe.nom === 'L3 Informatique A');

  // --- Liaison parent-enfant ---
  const parentId = (await appel('/users?role=parent&q=Seydou', { token: admin })).data.utilisateurs[0].id;

  r = await appel(`/etudiants/${nouvelEtudiant.id}/parents`, {
    method: 'POST', token: secretaire, body: { parentId },
  });
  verifier('liaison parent -> etudiant', r.status === 200 && r.data.etudiant.parents.length === 1, r.data?.message);

  r = await appel(`/etudiants/${nouvelEtudiant.id}/parents`, {
    method: 'POST', token: secretaire, body: { parentId },
  });
  verifier('doublon de liaison refuse', r.status === 409);

  // Le parent voit bien le nouvel enfant des les deux sens ecrits
  r = await appel('/etudiants/mes-enfants', { token: parent });
  verifier('parent voit ses enfants', r.status === 200 && r.data.enfants.length === 2,
    `${r.data?.enfants?.length} enfants`);

  // --- Confidentialite des dossiers ---
  r = await appel(`/etudiants/${nouvelEtudiant.id}`, { token: parent });
  verifier('parent consulte le dossier de son enfant', r.status === 200);

  r = await appel(`/etudiants/${nouvelEtudiant.id}`, { token: etudiant });
  verifier('etudiant ne voit pas le dossier d un autre', r.status === 403, r.data?.message);

  r = await appel('/etudiants', { token: parent });
  verifier('parent exclu de la liste globale des etudiants', r.status === 403);

  r = await appel('/etudiants', { token: professeur });
  verifier('professeur consulte la liste des etudiants', r.status === 200,
    `${r.data?.pagination?.total} etudiants`);

  r = await appel(`/etudiants?classe=${classeL1.id}`, { token: professeur });
  verifier('filtre etudiants par classe', r.status === 200 && r.data.etudiants.length > 0,
    `${r.data?.etudiants?.length} en L1 Informatique A`);

  const adminId = (await appel('/auth/me', { token: admin })).data.utilisateur.id;

  // --- Filtre multi-roles (page Personnel) ---
  r = await appel('/users?roles=professeur,surveillant', { token: admin });
  verifier('filtre multi-roles', r.status === 200
    && r.data.utilisateurs.every((u) => ['professeur', 'surveillant'].includes(u.role)),
    `${r.data?.utilisateurs?.length} membres`);

  r = await appel('/users?roles=professeur,inexistant', { token: admin });
  verifier('role inconnu dans la liste rejete', r.status === 400);

  // --- Modification d'un compte ---
  r = await appel(`/users/${nouvelEtudiant.id}`, {
    method: 'PATCH', token: secretaire,
    body: { telephone: '+223 76 12 34 56', infosEtudiant: { statut: 'suspendu', nationalite: 'Malienne' } },
  });
  verifier('modification du dossier etudiant', r.status === 200
    && r.data.utilisateur.telephone === '+223 76 12 34 56'
    && r.data.utilisateur.infosEtudiant.statut === 'suspendu');

  // --- Un gestionnaire peut editer son propre profil sans changer son role ---
  r = await appel(`/users/${adminId}`, {
    method: 'PATCH', token: admin, body: { role: 'admin', telephone: '+223 60 00 00 00' },
  });
  verifier('edition de son propre profil (role inchange)', r.status === 200);

  r = await appel(`/users/${adminId}`, { method: 'PATCH', token: admin, body: { role: 'surveillant' } });
  verifier('changement de son propre role refuse', r.status === 400, r.data?.message);

  // --- Changement de role : le bloc scolarite est retire ---
  r = await appel(`/users/${nouvelEtudiant.id}`, {
    method: 'PATCH', token: admin, body: { role: 'parent' },
  });
  verifier('bloc scolarite supprime au changement de role',
    r.status === 200 && r.data.utilisateur.infosEtudiant === undefined, r.data?.utilisateur?.role);

  r = await appel(`/users/${nouvelEtudiant.id}`, {
    method: 'PATCH', token: admin, body: { role: 'etudiant' },
  });
  verifier('retour au role etudiant', r.status === 200);

  // --- Email deja utilise ---
  r = await appel(`/users/${nouvelEtudiant.id}`, {
    method: 'PATCH', token: admin, body: { email: ADMIN_EMAIL },
  });
  verifier('email deja pris refuse', r.status === 409, r.data?.message);

  // --- Protections sur soi-meme ---
  r = await appel(`/users/${adminId}/statut`, { method: 'PATCH', token: admin });
  verifier('impossible de desactiver son propre compte', r.status === 400, r.data?.message);

  // --- Desactivation d'un compte ---
  r = await appel(`/users/${nouvelEtudiant.id}/statut`, { method: 'PATCH', token: secretaire });
  verifier('desactivation d un compte', r.status === 200 && r.data.utilisateur.actif === false);

  r = await appel('/auth/login', { method: 'POST', body: { email: emailEtu, motDePasse: 'peu importe' } });
  verifier('compte desactive ne peut plus se connecter', r.status === 401 || r.status === 403);

  // --- Reinitialisation par l'administration ---
  r = await appel(`/users/${nouvelEtudiant.id}/mot-de-passe`, { method: 'POST', token: secretaire, body: {} });
  verifier('reinitialisation renvoie un mot de passe provisoire', r.status === 200 && !!r.data.motDePasseProvisoire);

  // --- Statistiques ---
  r = await appel('/users/statistiques', { token: admin });
  verifier('statistiques par role', r.status === 200 && r.data.statistiques.parRole.etudiant >= 5,
    JSON.stringify(r.data?.statistiques?.parRole));

  // --- Validation ---
  r = await appel('/users', {
    method: 'POST', token: admin,
    body: { nom: 'A', prenom: 'B', email: 'pas-un-email', role: 'inexistant' },
  });
  verifier('validation Zod sur la creation', r.status === 400 && r.data.details.length >= 3,
    `${r.data?.details?.length} erreurs`);

  /*
   * Garde-fou du retrait de « concierge » : retirer un role du referentiel ne suffit
   * pas s'il reste acceptable a l'ecriture. On verifie donc qu'il est rejete comme
   * n'importe quelle valeur inconnue, et que le referentiel expose bien sept roles.
   */
  r = await appel('/users', {
    method: 'POST', token: admin,
    body: { nom: 'Test', prenom: 'Retire', email: `retire.${Date.now()}@x.io`, role: 'concierge' },
  });
  verifier('role retire du referentiel refuse a la creation', r.status === 400);

  const { ROLE_VALUES } = await import(SRC + 'config/roles.js');
  verifier('referentiel a sept roles', ROLE_VALUES.length === 7, ROLE_VALUES.join(', '));
  verifier('concierge absent du referentiel', !ROLE_VALUES.includes('concierge'));

  r = await appel('/users/pas-un-id', { token: admin });
  verifier('identifiant invalide rejete', r.status === 400);

  // --- Nettoyage : suppression en cascade des liaisons ---
  r = await appel(`/users/${nouvelEtudiant.id}`, { method: 'DELETE', token: secretaire });
  verifier('suppression du compte de test', r.status === 200);

  r = await appel('/etudiants/mes-enfants', { token: parent });
  verifier('liaison retiree du parent apres suppression', r.data.enfants.length === 1,
    `${r.data?.enfants?.length} enfant`);

  r = await appel(`/classes/${classeTemporaire._id}`, { method: 'DELETE', token: admin });
  verifier('suppression de la classe vide', r.status === 200);

  console.log(`\nResultat : ${ok.length} succes, ${ko.length} echec(s)`);
  if (ko.length) console.log('Echecs :', ko);
} finally {
  server.close();
  process.exit(ko.length ? 1 : 0);
}
