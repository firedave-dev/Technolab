/**
 * Tableau de bord et statistiques.
 *
 * `monTableauDeBord` renvoie une charge utile differente selon le role : chacun
 * recoit exactement les indicateurs qu'il peut exploiter, et rien de plus. C'est le
 * serveur qui decide, pas l'interface — un etudiant ne recoit jamais les chiffres
 * financiers de l'etablissement, meme masques.
 */
import { Matiere } from '../models/Matiere.js';
import { Evaluation } from '../models/Evaluation.js';
import { Note } from '../models/Note.js';
import { Absence } from '../models/Absence.js';
import { Examen } from '../models/Examen.js';
import { Paiement } from '../models/Paiement.js';
import { Echeance } from '../models/Echeance.js';
import { Classe } from '../models/Classe.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import { calculerBulletin } from '../services/scolarite.service.js';
import { soldeEtudiant, statistiquesComptables } from '../services/comptabilite.service.js';
import { seancesDuJour } from '../services/planning.service.js';
import {
  absencesDuJour,
  encaissementsParMois,
  paiementsParMode,
  prochainsExamens,
  repartitionEffectifs,
  statistiquesPedagogiques,
  syntheseParClasse,
  tendanceEncaissements,
} from '../services/statistiques.service.js';

/** Effectifs bruts de l'etablissement. */
async function effectifs() {
  const [parRole, classes] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', total: { $sum: 1 } } }]),
    Classe.countDocuments({ actif: true }),
  ]);

  const compte = Object.fromEntries(parRole.map(({ _id, total }) => [_id, total]));
  const personnel = STAFF_ROLES.reduce((somme, role) => somme + (compte[role] || 0), 0);

  return {
    etudiants: compte[ROLES.ETUDIANT] || 0,
    parents: compte[ROLES.PARENT] || 0,
    personnel,
    classes,
    parRole: compte,
  };
}

/** Alertes actionnables affichees en tete du tableau de bord de la direction. */
async function alertes() {
  const [paiementsAValider, absencesNonJustifiees, echeancesEnRetard, notesNonPubliees] = await Promise.all([
    Paiement.countDocuments({ statut: 'en_attente' }),
    Absence.countDocuments({ justifie: false }),
    Echeance.countDocuments({
      statut: { $in: ['a_payer', 'partiel'] },
      dateEcheance: { $lt: new Date() },
    }),
    Evaluation.countDocuments({ publiee: false }),
  ]);

  return { paiementsAValider, absencesNonJustifiees, echeancesEnRetard, notesNonPubliees };
}

// ===================== Tableaux de bord par role =====================

/** Direction : vision globale et alertes. */
async function tableauDirection() {
  const [chiffres, pedagogie, finances, absences, seances, alertesEnCours, tendance] =
    await Promise.all([
      effectifs(),
      statistiquesPedagogiques(),
      statistiquesComptables(),
      absencesDuJour(),
      seancesDuJour({}),
      alertes(),
      tendanceEncaissements(),
    ]);

  return {
    effectifs: chiffres,
    pedagogie,
    finances,
    tendanceEncaissements: tendance,
    absencesDuJour: absences,
    seancesDuJour: { jour: seances.jour, nombre: seances.seances.length },
    alertes: alertesEnCours,
  };
}

/** Secretariat : inscriptions, caisse et absences du jour. */
async function tableauSecretariat() {
  const [chiffres, finances, absences, paiementsAValider, tendance] = await Promise.all([
    effectifs(),
    statistiquesComptables(),
    absencesDuJour(),
    Paiement.countDocuments({ statut: 'en_attente' }),
    tendanceEncaissements(),
  ]);

  return {
    effectifs: chiffres,
    finances,
    tendanceEncaissements: tendance,
    absencesDuJour: absences,
    alertes: { paiementsAValider },
  };
}

/** Professeur : ses cours du jour et l'etat de ses corrections. */
async function tableauProfesseur(acteur) {
  const matieres = await Matiere.find({ professeur: acteur._id, actif: true })
    .populate('classe', 'nom niveau')
    .lean();

  const idsMatieres = matieres.map((m) => m._id);
  const idsClasses = [...new Set(matieres.map((m) => String(m.classe?._id)).filter(Boolean))];

  const [seances, evaluations, effectifsClasses] = await Promise.all([
    seancesDuJour({ professeur: acteur._id }),
    Evaluation.find({ matiere: { $in: idsMatieres } })
      .sort({ date: -1 })
      .limit(50)
      .populate('matiere', 'nom')
      .lean(),
    User.aggregate([
      { $match: { role: ROLES.ETUDIANT, 'infosEtudiant.classe': { $in: matieres.map((m) => m.classe?._id).filter(Boolean) } } },
      { $group: { _id: '$infosEtudiant.classe', total: { $sum: 1 } } },
    ]),
  ]);

  const parClasse = Object.fromEntries(effectifsClasses.map((e) => [String(e._id), e.total]));
  const notes = await Note.aggregate([
    { $match: { evaluation: { $in: evaluations.map((e) => e._id) } } },
    { $group: { _id: '$evaluation', total: { $sum: 1 } } },
  ]);
  const parEvaluation = Object.fromEntries(notes.map((n) => [String(n._id), n.total]));

  const matiereParId = Object.fromEntries(matieres.map((m) => [String(m._id), m]));

  // Corrections en cours : evaluations dont toutes les notes ne sont pas saisies.
  const aCorriger = evaluations
    .filter((e) => {
      const classe = matiereParId[String(e.matiere?._id || e.matiere)]?.classe?._id;
      const effectif = parClasse[String(classe)] || 0;
      return (parEvaluation[String(e._id)] || 0) < effectif;
    })
    .slice(0, 5)
    .map((e) => ({
      id: e._id,
      titre: e.titre,
      matiere: e.matiere?.nom,
      date: e.date,
      saisies: parEvaluation[String(e._id)] || 0,
    }));

  return {
    matieres: matieres.map((m) => ({
      id: m._id,
      nom: m.nom,
      code: m.code,
      classe: m.classe?.nom,
      effectif: parClasse[String(m.classe?._id)] || 0,
    })),
    seancesDuJour: seances,
    aCorriger,
    aPublier: evaluations.filter((e) => !e.publiee).length,
    prochainsExamens: await prochainsExamens(idsClasses.length ? idsClasses : null, 3),
  };
}

/** Surveillance : absences a traiter et convocations. */
async function tableauSurveillant(acteur) {
  const [absences, aJustifier, surveillances, seances] = await Promise.all([
    absencesDuJour(),
    Absence.countDocuments({ justifie: false }),
    Examen.find({ surveillants: acteur._id, statut: 'planifie', date: { $gte: new Date() } })
      .sort({ date: 1 })
      .limit(5)
      .populate('matiere', 'nom')
      .populate('classe', 'nom')
      .lean(),
    seancesDuJour({}),
  ]);

  return {
    absencesDuJour: absences,
    alertes: { absencesNonJustifiees: aJustifier },
    surveillances: surveillances.map((e) => ({ ...e, id: e._id })),
    seancesDuJour: { jour: seances.jour, nombre: seances.seances.length },
  };
}

/** Resume scolaire et financier d'un etudiant, reutilise pour le profil parent. */
async function resumeEtudiant(etudiantId) {
  const etudiant = await User.findById(etudiantId)
    .populate('infosEtudiant.classe', 'nom niveau filiere')
    .lean();

  const classe = etudiant?.infosEtudiant?.classe;

  const [bulletin, absences, solde, examens, seances] = await Promise.all([
    calculerBulletin(etudiantId, {}).catch(() => null),
    Absence.aggregate([
      { $match: { etudiant: etudiant._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          nonJustifiees: { $sum: { $cond: ['$justifie', 0, 1] } },
        },
      },
    ]),
    soldeEtudiant(etudiantId),
    prochainsExamens(classe ? [classe._id] : null, 3),
    classe ? seancesDuJour({ classe: classe._id }) : { jour: null, seances: [] },
  ]);

  return {
    etudiant: {
      id: etudiant._id,
      nomComplet: `${etudiant.prenom} ${etudiant.nom}`,
      matricule: etudiant.matricule,
      classe: classe?.nom || null,
    },
    scolarite: {
      moyenne: bulletin?.moyenneGenerale ?? null,
      mention: bulletin?.mention ?? null,
      rang: bulletin?.rang ?? null,
      effectif: bulletin?.effectif ?? 0,
      moyenneGeneraleClasse: bulletin?.moyenneGeneraleClasse ?? null,
    },
    absences: {
      total: absences[0]?.total || 0,
      nonJustifiees: absences[0]?.nonJustifiees || 0,
    },
    finances: { total: solde.total, paye: solde.paye, reste: solde.reste, tauxReglement: solde.tauxReglement },
    prochainsExamens: examens,
    seancesDuJour: seances,
  };
}

// ============================= Endpoints =============================

/** GET /api/statistiques/mon-tableau — charge utile adaptee au role de l'appelant */
export const monTableauDeBord = catchAsync(async (req, res) => {
  const { role } = req.user;
  let donnees;

  if (ADMIN_ROLES.includes(role)) donnees = await tableauDirection();
  else if (role === ROLES.SECRETAIRE) donnees = await tableauSecretariat();
  else if (role === ROLES.PROFESSEUR) donnees = await tableauProfesseur(req.user);
  else if (role === ROLES.SURVEILLANT) donnees = await tableauSurveillant(req.user);
  else if (role === ROLES.ETUDIANT) donnees = await resumeEtudiant(req.user._id);
  else if (role === ROLES.PARENT) {
    const enfants = req.user.enfants || [];
    donnees = { enfants: await Promise.all(enfants.map((id) => resumeEtudiant(id))) };
  } else {
    throw ApiError.forbidden();
  }

  res.json({ success: true, role, tableau: donnees });
});

/**
 * GET /api/statistiques/etablissement
 * Vue analytique complete, reservee aux profils qui pilotent l'etablissement.
 */
export const etablissement = catchAsync(async (req, res) => {
  const { periode, anneeScolaire } = req.query;

  const [chiffres, pedagogie, finances, absences, repartition, classes, encaissements, modes] =
    await Promise.all([
      effectifs(),
      statistiquesPedagogiques({ periode }),
      statistiquesComptables({ anneeScolaire }),
      absencesDuJour(),
      repartitionEffectifs(),
      syntheseParClasse({ anneeScolaire, periode }),
      encaissementsParMois(12),
      paiementsParMode(),
    ]);

  res.json({
    success: true,
    statistiques: {
      effectifs: chiffres,
      pedagogie,
      finances,
      absencesDuJour: absences,
      repartition,
      classes,
      encaissements,
      modesPaiement: modes,
    },
  });
});
