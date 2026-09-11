/** Tests de bout en bout Phase 3 : matieres, evaluations, notes, bulletins, examens, absences. */
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

const BASE = 'http://localhost:5096/api';
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

const dansNJours = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

await connectDB();
const server = createApp().listen(5096);
const aNettoyer = { evaluations: [], examens: [], matieres: [], absences: [] };

try {
  const admin = await connecter(ADMIN_EMAIL, 'Admin@1234');
  const secretaire = await connecter('secretaire@technolab-ista.edu');
  const prof = await connecter('professeur@technolab-ista.edu');
  const prof2 = await connecter('m.keita@technolab-ista.edu');
  const surveillant = await connecter('surveillant@technolab-ista.edu');
  const parent = await connecter('parent@technolab-ista.edu');
  const etudiant = await connecter('etudiant@technolab-ista.edu');
  verifier('connexion des profils de test',
    [admin, secretaire, prof, prof2, surveillant, parent, etudiant].every(Boolean));

  // ================= MATIERES =================
  let r = await appel('/matieres', { token: admin });
  const matieres = r.data?.matieres || [];
  verifier('GET /matieres (direction voit tout)', r.status === 200 && matieres.length >= 12,
    `${matieres.length} matieres`);

  r = await appel('/matieres', { token: prof });
  const siennes = r.data?.matieres || [];
  verifier('professeur ne voit que ses matieres',
    r.status === 200 && siennes.length > 0 && siennes.length < matieres.length,
    `${siennes.length} matieres`);

  r = await appel('/matieres', { token: parent });
  verifier('parent exclu du module matieres', r.status === 403);

  const classeId = siennes[0].classe._id || siennes[0].classe.id;

  r = await appel('/matieres', {
    method: 'POST', token: secretaire,
    body: { nom: 'Test matiere', code: 'TST', classe: classeId, anneeScolaire: '2025-2026', coefficient: 2 },
  });
  const matiereTest = r.data?.matiere;
  if (matiereTest) aNettoyer.matieres.push(matiereTest._id);
  verifier('creation de matiere par le secretariat', r.status === 201);

  r = await appel('/matieres', {
    method: 'POST', token: secretaire,
    body: { nom: 'Doublon', code: 'TST', classe: classeId, anneeScolaire: '2025-2026' },
  });
  verifier('code de matiere unique par classe', r.status === 409, r.data?.message);

  r = await appel('/matieres', {
    method: 'POST', token: prof,
    body: { nom: 'Interdit', code: 'INT', classe: classeId, anneeScolaire: '2025-2026' },
  });
  verifier('professeur ne peut pas creer de matiere', r.status === 403);

  r = await appel('/matieres', {
    method: 'POST', token: admin,
    body: { nom: 'Mauvais titulaire', code: 'MTI', classe: classeId, anneeScolaire: '2025-2026', professeur: (await appel('/auth/me', { token: surveillant })).data.utilisateur.id },
  });
  verifier('titulaire doit etre un professeur', r.status === 400, r.data?.message);

  // ================= EVALUATIONS =================
  const maMatiere = siennes[0];

  r = await appel('/evaluations', {
    method: 'POST', token: prof,
    body: { matiere: maMatiere.id, titre: 'Controle de test', type: 'devoir', date: dansNJours(-2), bareme: 20, coefficient: 2, periode: 'semestre1' },
  });
  const evaluation = r.data?.evaluation;
  if (evaluation) aNettoyer.evaluations.push(evaluation._id);
  verifier('professeur cree une evaluation sur sa matiere', r.status === 201);
  verifier('classe denormalisee depuis la matiere',
    String(evaluation?.classe?._id) === String(classeId));

  // Une matiere qui n'appartient pas a ce professeur
  const matiereAutrui = matieres.find((m) => String(m.professeur?._id) !== String(maMatiere.professeur?._id));
  r = await appel('/evaluations', {
    method: 'POST', token: prof,
    body: { matiere: matiereAutrui.id, titre: 'Intrusion', date: dansNJours(-1), periode: 'semestre1' },
  });
  verifier('professeur bloque sur la matiere d un collegue', r.status === 403, r.data?.message);

  r = await appel(`/evaluations/${evaluation._id}`, {
    method: 'PATCH', token: prof2, body: { titre: 'Tentative' },
  });
  verifier('autre professeur ne peut pas modifier l evaluation', r.status === 403);

  // ================= SAISIE DES NOTES =================
  r = await appel(`/evaluations/${evaluation._id}/notes`, { token: prof });
  const lignes = r.data?.lignes || [];
  verifier('grille de saisie listee sur la classe', r.status === 200 && lignes.length > 0,
    `${lignes.length} etudiants`);

  r = await appel(`/evaluations/${evaluation._id}/notes`, {
    method: 'PUT', token: prof,
    body: { notes: [{ etudiant: lignes[0].etudiant.id, valeur: 25 }] },
  });
  verifier('note superieure au bareme refusee', r.status === 400, r.data?.message);

  const saisie = lignes.map((l, i) => ({
    etudiant: l.etudiant.id,
    valeur: i === 1 ? null : 12 + i,
    absent: i === 1,
  }));
  r = await appel(`/evaluations/${evaluation._id}/notes`, { method: 'PUT', token: prof, body: { notes: saisie } });
  verifier('saisie en lot des notes', r.status === 200 && r.data.saisies === lignes.length, r.data?.message);

  r = await appel(`/evaluations/${evaluation._id}/notes`, { token: prof });
  verifier('absent exclu de la moyenne de l evaluation',
    r.data.statistiques.absents === 1 && r.data.statistiques.moyenne !== null,
    `moyenne ${r.data?.statistiques?.moyenne}`);

  // Un etudiant d'une autre classe est refuse
  const autreClasse = (await appel('/classes', { token: admin })).data.classes
    .find((c) => String(c.id) !== String(classeId));
  const etranger = (await appel(`/etudiants?classe=${autreClasse.id}`, { token: admin })).data.etudiants[0];
  if (etranger) {
    r = await appel(`/evaluations/${evaluation._id}/notes`, {
      method: 'PUT', token: prof, body: { notes: [{ etudiant: etranger.id, valeur: 15 }] },
    });
    verifier('note refusee pour un etudiant hors de la classe', r.status === 400, r.data?.message);
  }

  // Ligne vide : la note est retiree
  r = await appel(`/evaluations/${evaluation._id}/notes`, {
    method: 'PUT', token: prof,
    body: { notes: [{ etudiant: lignes[0].etudiant.id, valeur: null, absent: false }] },
  });
  const apres = await appel(`/evaluations/${evaluation._id}/notes`, { token: prof });
  verifier('ligne vidée retire la note', apres.data.statistiques.saisies === lignes.length - 1,
    `${apres.data?.statistiques?.saisies} saisies`);

  // On restaure la note : seuls les etudiants notes sont notifies a la publication.
  await appel(`/evaluations/${evaluation._id}/notes`, {
    method: 'PUT', token: prof, body: { notes: [{ etudiant: lignes[0].etudiant.id, valeur: 14 }] },
  });

  // ================= PUBLICATION =================
  const etudiantCible = lignes[0].etudiant.id;

  r = await appel(`/bulletins/${etudiantCible}?periode=semestre1`, { token: admin });
  const bulletinStaff = r.data?.bulletin;
  verifier('bulletin cote personnel (provisoire)', r.status === 200 && r.data.provisoire === true,
    `moyenne ${bulletinStaff?.moyenneGenerale}`);

  verifier('bulletin : moyenne, rang et mention calcules',
    bulletinStaff?.moyenneGenerale !== null && bulletinStaff?.rang >= 1 && Boolean(bulletinStaff?.mention),
    `rang ${bulletinStaff?.rang}/${bulletinStaff?.effectif} — ${bulletinStaff?.mention}`);

  // ---- Composition de la moyenne de matiere ----
  //
  // On ne verifie pas seulement que la formule tombe juste : on RECALCULE les deux
  // composantes depuis les notes du bulletin. C'est ce qui prouve que le serveur a
  // bien range chaque evaluation dans son groupe. Un examen compte a tort dans la
  // moyenne de classe donnerait une formule exacte sur des composantes fausses.
  const TYPES_CLASSE = ['devoir', 'interrogation', 'tp', 'projet'];

  const moyenneGroupe = (lignes) => {
    let total = 0;
    let poids = 0;
    for (const l of lignes) {
      if (l.absent || l.valeur === null || l.valeur === undefined) continue;
      total += (l.valeur / l.evaluation.bareme) * 20 * l.evaluation.coefficient;
      poids += l.evaluation.coefficient;
    }
    return poids ? Math.round((total / poids) * 100) / 100 : null;
  };

  const composee = (classe, examen) => {
    if (examen === null) return classe;
    if (classe === null) return examen;
    return Math.round(((examen * 2 + classe) / 3) * 100) / 100;
  };

  const ecarts = [];
  for (const ligne of bulletinStaff?.matieres || []) {
    const attenduClasse = moyenneGroupe(
      ligne.evaluations.filter((e) => TYPES_CLASSE.includes(e.evaluation.type))
    );
    const attenduExamen = moyenneGroupe(
      ligne.evaluations.filter((e) => e.evaluation.type === 'examen')
    );

    if (ligne.moyenneClasse !== attenduClasse) {
      ecarts.push(`${ligne.matiere.code} classe ${ligne.moyenneClasse} != ${attenduClasse}`);
    }
    if (ligne.moyenneExamen !== attenduExamen) {
      ecarts.push(`${ligne.matiere.code} examen ${ligne.moyenneExamen} != ${attenduExamen}`);
    }
    if (ligne.moyenne !== composee(attenduClasse, attenduExamen)) {
      ecarts.push(
        `${ligne.matiere.code} moyenne ${ligne.moyenne} != ${composee(attenduClasse, attenduExamen)}`
      );
    }
  }

  verifier('bulletin : les deux composantes sont calculees sur les bons types',
    ecarts.length === 0, ecarts.slice(0, 3).join(' ; ') || `${bulletinStaff?.matieres?.length} matieres`);

  const avecLesDeux = (bulletinStaff?.matieres || []).find(
    (m) => m.moyenneClasse !== null && m.moyenneExamen !== null
  );

  verifier('bulletin : une matiere porte bien les deux composantes',
    Boolean(avecLesDeux),
    avecLesDeux
      ? `${avecLesDeux.matiere.code} : classe ${avecLesDeux.moyenneClasse}, examen ${avecLesDeux.moyenneExamen} -> ${avecLesDeux.moyenne}`
      : 'aucun examen seme : la formule ne serait pas demontrable');

  // L'examen pese double : la moyenne de matiere doit donc se tenir du cote de
  // l'examen des que les deux composantes different.
  verifier('bulletin : l examen pese deux fois la moyenne de classe',
    !avecLesDeux
    || avecLesDeux.moyenneClasse === avecLesDeux.moyenneExamen
    || Math.abs(avecLesDeux.moyenne - avecLesDeux.moyenneExamen)
       < Math.abs(avecLesDeux.moyenne - avecLesDeux.moyenneClasse),
    avecLesDeux
      ? `${avecLesDeux.moyenne} entre classe ${avecLesDeux.moyenneClasse} et examen ${avecLesDeux.moyenneExamen}`
      : '—');

  // Le nom « moyenneClasse » designe desormais le controle continu d'une matiere.
  // La moyenne de la promotion, elle, porte un nom distinct : les confondre
  // afficherait la moyenne des camarades a la place de celle de l'etudiant.
  verifier('bulletin : la moyenne de la promotion porte un nom distinct',
    bulletinStaff?.moyenneGeneraleClasse !== undefined && bulletinStaff?.moyenneClasse === undefined,
    `promotion ${bulletinStaff?.moyenneGeneraleClasse}`);

  const avantPublication = (await appel(`/bulletins/${etudiantCible}`, { token: etudiant }))
    .data?.bulletin?.matieres
    ?.find((m) => m.matiere.id === maMatiere.id)
    ?.evaluations.length;

  r = await appel(`/evaluations/${evaluation._id}/publication`, { method: 'PATCH', token: prof });
  verifier('publication des notes', r.status === 200 && r.data.evaluation.publiee === true);

  const apresPublication = (await appel(`/bulletins/${etudiantCible}`, { token: etudiant }))
    .data?.bulletin?.matieres
    ?.find((m) => m.matiere.id === maMatiere.id)
    ?.evaluations.length;

  verifier('evaluation visible par l etudiant seulement une fois publiee',
    apresPublication === avantPublication + 1, `${avantPublication} -> ${apresPublication}`);

  r = await appel('/notifications', { token: etudiant });
  verifier('notification de note recue par l etudiant',
    r.status === 200 && r.data.notifications.some((n) => n.type === 'note'),
    `${r.data?.nonLues} non lues`);

  // ================= ACCES AUX BULLETINS =================
  const idEtudiantRef = (await appel('/auth/me', { token: etudiant })).data.utilisateur.id;

  r = await appel(`/bulletins/${idEtudiantRef}`, { token: parent });
  verifier('parent consulte le bulletin de son enfant', r.status === 200);

  r = await appel(`/bulletins/${etudiantCible}`, { token: parent });
  const estSonEnfant = String(etudiantCible) === String(idEtudiantRef);
  verifier('parent bloque sur un bulletin tiers', estSonEnfant || r.status === 403, r.data?.message);

  r = await appel(`/bulletins/classe/${classeId}?periode=semestre1`, { token: admin });
  verifier('releve de classe avec taux de reussite',
    r.status === 200 && r.data.releve.length > 0 && r.data.statistiques.tauxReussite !== null,
    `${r.data?.statistiques?.tauxReussite}% de reussite`);

  r = await appel(`/bulletins/classe/${classeId}`, { token: parent });
  verifier('parent exclu du releve de classe', r.status === 403);

  // ================= EXAMENS =================
  const idSurveillant = (await appel('/auth/me', { token: surveillant })).data.utilisateur.id;

  r = await appel('/examens', {
    method: 'POST', token: secretaire,
    body: { matiere: maMatiere.id, type: 'final', date: dansNJours(20), heureDebut: '08:00', heureFin: '11:00', salle: 'Salle TEST', surveillants: [idSurveillant] },
  });
  const examen = r.data?.examen;
  if (examen) aNettoyer.examens.push(examen._id);
  verifier('planification d un examen', r.status === 201, examen?.titre);

  r = await appel('/examens', {
    method: 'POST', token: secretaire,
    body: { matiere: matiereAutrui.id, type: 'final', date: dansNJours(20), heureDebut: '10:00', heureFin: '12:00', salle: 'Salle TEST' },
  });
  verifier('conflit de salle detecte', r.status === 409, r.data?.message);

  r = await appel('/examens', {
    method: 'POST', token: secretaire,
    body: { matiere: maMatiere.id, type: 'rattrapage', date: dansNJours(20), heureDebut: '09:00', heureFin: '10:00', salle: 'Salle AUTRE' },
  });
  verifier('conflit de classe detecte', r.status === 409, r.data?.message);

  r = await appel('/examens', {
    method: 'POST', token: secretaire,
    body: { matiere: maMatiere.id, date: dansNJours(21), heureDebut: '11:00', heureFin: '09:00', salle: 'Salle X' },
  });
  verifier('heure de fin anterieure refusee', r.status === 400);

  r = await appel('/examens', {
    method: 'POST', token: prof,
    body: { matiere: maMatiere.id, date: dansNJours(25), heureDebut: '08:00', heureFin: '10:00', salle: 'Salle Y' },
  });
  verifier('professeur ne planifie pas les examens', r.status === 403);

  r = await appel('/examens/mes-surveillances', { token: surveillant });
  verifier('surveillant voit ses convocations',
    r.status === 200 && r.data.examens.some((e) => String(e._id) === String(examen._id)),
    `${r.data?.examens?.length} convocations`);

  r = await appel('/notifications', { token: surveillant });
  verifier('surveillant notifie de sa convocation',
    r.data.notifications.some((n) => n.type === 'examen'));

  const saClasse = (await appel(`/etudiants/${idEtudiantRef}`, { token: etudiant }))
    .data?.etudiant?.infosEtudiant?.classe?._id;

  r = await appel('/examens', { token: etudiant });
  const examensEtudiant = r.data?.examens || [];
  verifier('etudiant ne voit que les examens de sa classe',
    r.status === 200 && examensEtudiant.length > 0
      && examensEtudiant.every((e) => String(e.classe._id) === String(saClasse)),
    `${examensEtudiant.length} examens de sa classe`);

  // ================= ABSENCES =================
  const elevesClasse = (await appel(`/etudiants?classe=${classeId}`, { token: admin })).data.etudiants;

  r = await appel(`/absences/appel?classe=${classeId}&date=${dansNJours(0)}&creneau=matin`, { token: prof });
  verifier('feuille d appel prechargee',
    r.status === 200 && r.data.lignes.length === elevesClasse.length && r.data.dejaSaisi === false);

  r = await appel('/absences/appel', {
    method: 'POST', token: prof,
    body: {
      classe: classeId, date: dansNJours(0), matiere: maMatiere.id, creneau: 'matin',
      lignes: elevesClasse.map((e, i) => ({
        etudiant: e.id,
        present: i > 1,
        type: i === 1 ? 'retard' : 'absence',
        minutesRetard: i === 1 ? 15 : undefined,
      })),
    },
  });
  verifier('appel enregistre par le professeur', r.status === 200 && r.data.absents === Math.min(2, elevesClasse.length),
    r.data?.message);

  // Rejouer l'appel ne cree pas de doublon
  r = await appel('/absences/appel', {
    method: 'POST', token: prof,
    body: {
      classe: classeId, date: dansNJours(0), matiere: maMatiere.id, creneau: 'matin',
      lignes: elevesClasse.map((e, i) => ({ etudiant: e.id, present: i > 1, type: i === 1 ? 'retard' : 'absence', minutesRetard: i === 1 ? 15 : undefined })),
    },
  });
  const apresRejeu = await appel(`/absences?classe=${classeId}&du=${dansNJours(0)}&au=${dansNJours(0)}`, { token: admin });
  verifier('appel rejouable sans doublon', apresRejeu.data.pagination.total === Math.min(2, elevesClasse.length),
    `${apresRejeu.data?.pagination?.total} saisies`);

  // Le professeur doit preciser une matiere qui lui est assignee
  r = await appel('/absences/appel', {
    method: 'POST', token: prof,
    body: { classe: classeId, date: dansNJours(0), matiere: matiereAutrui.id, creneau: 'soir', lignes: [{ etudiant: elevesClasse[0].id, present: false }] },
  });
  verifier('appel refuse sur la matiere d un collegue', r.status === 403, r.data?.message);

  // Correction : marquer present retire la saisie
  r = await appel('/absences/appel', {
    method: 'POST', token: surveillant,
    body: { classe: classeId, date: dansNJours(0), creneau: 'matin', lignes: [{ etudiant: elevesClasse[0].id, present: true }] },
  });
  const apresCorrection = await appel(`/absences?classe=${classeId}&du=${dansNJours(0)}&au=${dansNJours(0)}`, { token: admin });
  verifier('marquer present retire la saisie',
    apresCorrection.data.pagination.total === Math.min(2, elevesClasse.length) - 1);

  const absenceRestante = apresCorrection.data.absences[0];
  aNettoyer.absences.push(absenceRestante._id);

  r = await appel(`/absences/${absenceRestante._id}/justification`, {
    method: 'PATCH', token: prof, body: { justifie: true },
  });
  verifier('professeur ne peut pas justifier', r.status === 403);

  r = await appel(`/absences/${absenceRestante._id}/justification`, {
    method: 'PATCH', token: surveillant, body: { justifie: true, motif: 'Certificat medical' },
  });
  verifier('surveillant justifie une absence', r.status === 200 && r.data.absence.justifie === true);

  r = await appel('/notifications', { token: parent });
  verifier('parent notifie des absences',
    r.status === 200 && r.data.notifications.some((n) => n.type === 'absence'),
    `${r.data?.nonLues} non lues`);

  r = await appel('/absences', { token: parent });
  const idsEnfants = (await appel('/etudiants/mes-enfants', { token: parent })).data.enfants.map((e) => String(e.id));
  verifier('parent ne voit que les absences de ses enfants',
    r.status === 200 && r.data.absences.every((a) => idsEnfants.includes(String(a.etudiant._id))),
    `${r.data?.absences?.length} absences`);

  r = await appel(`/absences?etudiant=${elevesClasse.find((e) => !idsEnfants.includes(String(e.id)))?.id || elevesClasse[0].id}`, { token: parent });
  verifier('parent bloque sur un etudiant tiers', r.status === 403 || r.data.absences.length === 0);

  r = await appel(`/absences/statistiques?classe=${classeId}`, { token: surveillant });
  verifier('statistiques d absences par etudiant',
    r.status === 200 && typeof r.data.statistiques.total === 'number',
    `${r.data?.statistiques?.total} au total, ${r.data?.statistiques?.nonJustifiees} non justifiees`);

  // Tous les roles du personnel peuvent pointer ; le refus se verifie donc sur une
  // famille, qui consulte l assiduite de son enfant sans jamais la saisir.
  r = await appel('/absences', {
    method: 'POST', token: parent,
    body: { etudiant: elevesClasse[0].id, date: dansNJours(-3) },
  });
  verifier('un parent ne peut pas pointer une absence', r.status === 403);

  // ================= NOTIFICATIONS =================
  r = await appel('/notifications', { token: parent });
  const notif = r.data.notifications[0];

  r = await appel(`/notifications/${notif._id}/lecture`, { method: 'PATCH', token: etudiant });
  verifier('notification d autrui inaccessible', r.status === 404);

  r = await appel(`/notifications/${notif._id}/lecture`, { method: 'PATCH', token: parent });
  verifier('marquer une notification comme lue', r.status === 200 && r.data.notification.lu === true);

  r = await appel('/notifications/lecture', { method: 'PATCH', token: parent });
  const restantes = await appel('/notifications', { token: parent });
  verifier('tout marquer comme lu', r.status === 200 && restantes.data.nonLues === 0, r.data?.message);

  console.log(`\nResultat : ${ok.length} succes, ${ko.length} echec(s)`);
  if (ko.length) console.log('Echecs :', ko);
} finally {
  // Nettoyage des donnees creees par le test
  try {
    const admin = await connecter(ADMIN_EMAIL, 'Admin@1234');
    for (const id of aNettoyer.absences) await appel(`/absences/${id}`, { method: 'DELETE', token: admin });
    for (const id of aNettoyer.examens) await appel(`/examens/${id}`, { method: 'DELETE', token: admin });
    for (const id of aNettoyer.evaluations) await appel(`/evaluations/${id}`, { method: 'DELETE', token: admin });
    for (const id of aNettoyer.matieres) await appel(`/matieres/${id}`, { method: 'DELETE', token: admin });
  } catch { /* nettoyage best effort */ }

  server.close();
  process.exit(ko.length ? 1 : 0);
}
