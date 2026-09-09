/**
 * Agregats du tableau de bord et de la page statistiques.
 *
 * Les moyennes sont calculees selon les memes regles que les bulletins
 * (voir scolarite.service.js) : note ramenee sur 20, ponderee par le coefficient de
 * l'evaluation, puis moyenne des matieres ponderee par leur propre coefficient.
 * Ici le calcul est fait en une seule agregation Mongo plutot qu'en JavaScript,
 * pour rester rapide sur l'ensemble de l'etablissement.
 */
import { Note } from '../models/Note.js';
import { Evaluation } from '../models/Evaluation.js';
import { Absence, jour } from '../models/Absence.js';
import { Examen } from '../models/Examen.js';
import { Paiement } from '../models/Paiement.js';
import { Echeance } from '../models/Echeance.js';
import { Classe } from '../models/Classe.js';
import { Matiere } from '../models/Matiere.js';
import { User } from '../models/User.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';

const arrondir = (v, d = 2) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Bornes de la journee en cours. */
function bornesDuJour(date = new Date()) {
  const debut = jour(date);
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + 1);
  return { debut, fin };
}

/**
 * Moyenne generale de chaque etudiant, calculee en base.
 * @param filtre  contraintes sur les etudiants (ex. { 'infosEtudiant.classe': id })
 * @param options periode et prise en compte des evaluations non publiees
 */
export async function moyennesParEtudiant({ classe, periode, inclureNonPubliees = false } = {}) {
  const filtreEvaluation = {};
  if (classe) filtreEvaluation.classe = classe;
  if (periode) filtreEvaluation.periode = periode;
  if (!inclureNonPubliees) filtreEvaluation.publiee = true;

  const evaluations = await Evaluation.find(filtreEvaluation).select('_id matiere bareme coefficient').lean();
  if (!evaluations.length) return [];

  const parEvaluation = Object.fromEntries(
    evaluations.map((e) => [String(e._id), e])
  );

  const matieres = await Matiere.find({ _id: { $in: [...new Set(evaluations.map((e) => String(e.matiere)))] } })
    .select('_id coefficient')
    .lean();
  const coefMatiere = Object.fromEntries(matieres.map((m) => [String(m._id), m.coefficient || 1]));

  const notes = await Note.find({
    evaluation: { $in: evaluations.map((e) => e._id) },
    absent: false,
    valeur: { $ne: null },
  }).select('etudiant evaluation valeur').lean();

  // Niveau 1 : moyenne par (etudiant, matiere), ponderee par le coefficient de l'evaluation.
  const parEtudiantMatiere = new Map();

  for (const note of notes) {
    const evaluation = parEvaluation[String(note.evaluation)];
    if (!evaluation) continue;

    const cle = `${note.etudiant}|${evaluation.matiere}`;
    const agregat = parEtudiantMatiere.get(cle) || { total: 0, poids: 0, etudiant: note.etudiant, matiere: evaluation.matiere };

    agregat.total += (note.valeur / evaluation.bareme) * 20 * evaluation.coefficient;
    agregat.poids += evaluation.coefficient;
    parEtudiantMatiere.set(cle, agregat);
  }

  // Niveau 2 : moyenne generale, ponderee par le coefficient de la matiere.
  const parEtudiant = new Map();

  for (const { etudiant, matiere, total, poids } of parEtudiantMatiere.values()) {
    if (!poids) continue;

    const moyenneMatiere = total / poids;
    const coefficient = coefMatiere[String(matiere)] || 1;
    const cle = String(etudiant);
    const agregat = parEtudiant.get(cle) || { total: 0, poids: 0 };

    agregat.total += moyenneMatiere * coefficient;
    agregat.poids += coefficient;
    parEtudiant.set(cle, agregat);
  }

  return [...parEtudiant.entries()]
    .filter(([, a]) => a.poids > 0)
    .map(([etudiant, a]) => ({ etudiant, moyenne: arrondir(a.total / a.poids) }));
}

/** Synthese pedagogique : moyenne de l'etablissement et taux de reussite. */
export async function statistiquesPedagogiques({ classe, periode } = {}) {
  const moyennes = await moyennesParEtudiant({ classe, periode });
  const valeurs = moyennes.map((m) => m.moyenne);

  if (!valeurs.length) {
    return { evalues: 0, moyenne: null, tauxReussite: null, repartition: [] };
  }

  const admis = valeurs.filter((v) => v >= 10).length;

  // Repartition par tranche : lecture immediate du niveau general de la promotion.
  const TRANCHES = [
    ['Insuffisant (< 10)', (v) => v < 10],
    ['Passable (10-12)', (v) => v >= 10 && v < 12],
    ['Assez bien (12-14)', (v) => v >= 12 && v < 14],
    ['Bien (14-16)', (v) => v >= 14 && v < 16],
    ['Tres bien (>= 16)', (v) => v >= 16],
  ];

  return {
    evalues: valeurs.length,
    moyenne: arrondir(valeurs.reduce((s, v) => s + v, 0) / valeurs.length),
    tauxReussite: Math.round((admis / valeurs.length) * 100),
    admis,
    repartition: TRANCHES.map(([libelle, test]) => ({
      libelle,
      nombre: valeurs.filter(test).length,
    })),
  };
}

/** Absences constatees aujourd'hui. */
export async function absencesDuJour(filtre = {}) {
  const { debut, fin } = bornesDuJour();
  const base = { ...filtre, date: { $gte: debut, $lt: fin } };

  const [total, retards, nonJustifiees] = await Promise.all([
    Absence.countDocuments(base),
    Absence.countDocuments({ ...base, type: 'retard' }),
    Absence.countDocuments({ ...base, justifie: false }),
  ]);

  return { total, absences: total - retards, retards, nonJustifiees };
}

/** Encaissements des N derniers mois, pour la courbe d'evolution. */
export async function encaissementsParMois(nombreMois = 12) {
  const debut = new Date();
  debut.setMonth(debut.getMonth() - (nombreMois - 1));
  debut.setDate(1);
  debut.setHours(0, 0, 0, 0);

  const agregat = await Paiement.aggregate([
    { $match: { statut: 'valide', datePaiement: { $gte: debut } } },
    {
      $group: {
        _id: { annee: { $year: '$datePaiement' }, mois: { $month: '$datePaiement' } },
        montant: { $sum: '$montant' },
        nombre: { $sum: 1 },
      },
    },
  ]);

  const parCle = Object.fromEntries(
    agregat.map((a) => [`${a._id.annee}-${a._id.mois}`, a])
  );

  // On reconstruit la serie complete : les mois sans encaissement valent zero.
  const serie = [];
  for (let i = 0; i < nombreMois; i += 1) {
    const date = new Date(debut);
    date.setMonth(date.getMonth() + i);

    const cle = `${date.getFullYear()}-${date.getMonth() + 1}`;
    serie.push({
      mois: date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      montant: parCle[cle]?.montant || 0,
      nombre: parCle[cle]?.nombre || 0,
    });
  }

  return serie;
}

/**
 * Tendance des encaissements : 30 derniers jours contre les 30 precedents.
 *
 * On compare deux fenetres glissantes plutot que deux mois calendaires : au 2 du
 * mois, opposer un mois entame a un mois complet donnerait une chute artificielle
 * de 90 %. La comparaison a duree egale est la seule honnete.
 *
 * `variation` vaut null quand la periode de reference est vide : on ne calcule pas
 * un pourcentage d'evolution a partir de zero.
 */
export async function tendanceEncaissements(jours = 30) {
  const maintenant = new Date();
  const debutRecente = new Date(maintenant);
  debutRecente.setDate(debutRecente.getDate() - jours);
  const debutPrecedente = new Date(maintenant);
  debutPrecedente.setDate(debutPrecedente.getDate() - jours * 2);

  const somme = async (depuis, jusqua) => {
    const [agregat] = await Paiement.aggregate([
      { $match: { statut: 'valide', datePaiement: { $gte: depuis, $lt: jusqua } } },
      { $group: { _id: null, montant: { $sum: '$montant' } } },
    ]);
    return agregat?.montant || 0;
  };

  const [recente, precedente] = await Promise.all([
    somme(debutRecente, maintenant),
    somme(debutPrecedente, debutRecente),
  ]);

  return {
    recente,
    precedente,
    variation: precedente > 0 ? ((recente - precedente) / precedente) * 100 : null,
    jours,
  };
}

/** Repartition des encaissements par mode de reglement. */
export async function paiementsParMode() {
  const agregat = await Paiement.aggregate([
    { $match: { statut: 'valide' } },
    { $group: { _id: '$mode', montant: { $sum: '$montant' }, nombre: { $sum: 1 } } },
    { $sort: { montant: -1 } },
  ]);

  return agregat.map((a) => ({ mode: a._id, montant: a.montant, nombre: a.nombre }));
}

/**
 * Tableau de synthese par classe : effectif, moyenne, absences et recouvrement.
 * C'est la vue que consulte la direction pour reperer une classe en difficulte.
 */
export async function syntheseParClasse({ anneeScolaire, periode } = {}) {
  const filtre = { actif: true };
  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;

  const classes = await Classe.find(filtre).sort({ niveau: 1, nom: 1 }).lean();
  const { debut, fin } = bornesDuJour();

  const lignes = [];

  for (const classe of classes) {
    const [effectif, moyennes, absences, echeances] = await Promise.all([
      User.countDocuments({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe._id }),
      moyennesParEtudiant({ classe: classe._id, periode }),
      Absence.countDocuments({ classe: classe._id, date: { $gte: debut, $lt: fin } }),
      Echeance.aggregate([
        { $match: { classe: classe._id, statut: { $ne: 'annule' } } },
        { $group: { _id: null, attendu: { $sum: '$montant' }, encaisse: { $sum: '$montantPaye' } } },
      ]),
    ]);

    const valeurs = moyennes.map((m) => m.moyenne);
    const finance = echeances[0];

    lignes.push({
      classe: { id: classe._id, nom: classe.nom, niveau: classe.niveau, filiere: classe.filiere },
      effectif,
      capacite: classe.capacite,
      moyenne: valeurs.length ? arrondir(valeurs.reduce((s, v) => s + v, 0) / valeurs.length) : null,
      tauxReussite: valeurs.length
        ? Math.round((valeurs.filter((v) => v >= 10).length / valeurs.length) * 100)
        : null,
      absencesDuJour: absences,
      tauxRecouvrement: finance?.attendu
        ? Math.round((finance.encaisse / finance.attendu) * 100)
        : null,
    });
  }

  return lignes;
}

/** Repartition des effectifs etudiants par niveau et par filiere. */
export async function repartitionEffectifs() {
  const agregat = await User.aggregate([
    { $match: { role: ROLES.ETUDIANT, 'infosEtudiant.classe': { $ne: null } } },
    {
      $lookup: {
        from: 'classes',
        localField: 'infosEtudiant.classe',
        foreignField: '_id',
        as: 'classe',
      },
    },
    { $unwind: '$classe' },
    {
      $group: {
        _id: { niveau: '$classe.niveau', filiere: '$classe.filiere' },
        nombre: { $sum: 1 },
      },
    },
  ]);

  const parNiveau = {};
  const parFiliere = {};

  for (const ligne of agregat) {
    parNiveau[ligne._id.niveau] = (parNiveau[ligne._id.niveau] || 0) + ligne.nombre;
    parFiliere[ligne._id.filiere] = (parFiliere[ligne._id.filiere] || 0) + ligne.nombre;
  }

  const enSerie = (objet) =>
    Object.entries(objet)
      .map(([libelle, nombre]) => ({ libelle, nombre }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle));

  return { parNiveau: enSerie(parNiveau), parFiliere: enSerie(parFiliere) };
}

/** Prochains examens, tous profils confondus ou restreints a des classes. */
export async function prochainsExamens(classes = null, limite = 5) {
  const filtre = { date: { $gte: jour(new Date()) }, statut: 'planifie' };
  if (classes) filtre.classe = { $in: classes };

  const examens = await Examen.find(filtre)
    .sort({ date: 1, heureDebut: 1 })
    .limit(limite)
    .populate('matiere', 'nom')
    .populate('classe', 'nom')
    .lean();

  return examens.map((e) => ({ ...e, id: e._id }));
}

/** Roles consideres comme ayant acces aux statistiques d'etablissement. */
export const peutVoirEtablissement = (role) => STAFF_ROLES.includes(role);
