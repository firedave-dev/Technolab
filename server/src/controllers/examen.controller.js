/**
 * Planification des examens : creneau, salle et surveillants.
 * Deux controles de coherence sont appliques a chaque enregistrement :
 * une salle ne peut accueillir deux epreuves qui se chevauchent, et une classe
 * ne peut pas etre convoquee a deux endroits au meme moment.
 */
import { Examen } from '../models/Examen.js';
import { Matiere } from '../models/Matiere.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';
import { perimetreEtudiants } from '../services/scolarite.service.js';
import { jour } from '../models/Absence.js';
import { notifier } from '../services/notification.service.js';

const PEUPLE = [
  { path: 'matiere', select: 'nom code' },
  { path: 'classe', select: 'nom niveau filiere' },
  { path: 'surveillants', select: 'nom prenom email role' },
];

/**
 * Cherche un chevauchement de creneau, pour la meme salle ou la meme classe,
 * le meme jour. Deux creneaux se chevauchent si debut1 < fin2 et debut2 < fin1.
 */
async function detecterConflit({ id, date, heureDebut, heureFin, salle, classe }) {
  const memeJour = jour(date);
  const lendemain = new Date(memeJour);
  lendemain.setDate(lendemain.getDate() + 1);

  const candidats = await Examen.find({
    _id: { $ne: id || null },
    date: { $gte: memeJour, $lt: lendemain },
    statut: { $ne: 'annule' },
    $or: [{ salle }, { classe }],
  })
    .populate('classe', 'nom')
    .lean();

  const chevauche = candidats.find((e) => heureDebut < e.heureFin && e.heureDebut < heureFin);
  if (!chevauche) return null;

  return chevauche.salle === salle
    ? `La salle ${salle} est deja occupee de ${chevauche.heureDebut} a ${chevauche.heureFin}`
    : `La classe ${chevauche.classe?.nom} a deja une epreuve de ${chevauche.heureDebut} a ${chevauche.heureFin}`;
}

/** Verifie que les surveillants designes font partie du personnel. */
async function verifierSurveillants(ids = []) {
  if (!ids.length) return;

  const trouves = await User.countDocuments({
    _id: { $in: ids },
    role: { $in: [ROLES.SURVEILLANT, ROLES.PROFESSEUR, ROLES.SECRETAIRE] },
    actif: true,
  });

  if (trouves !== ids.length) {
    throw ApiError.badRequest('Les surveillants doivent etre des membres actifs du personnel');
  }
}

/** GET /api/examens */
export const lister = catchAsync(async (req, res) => {
  const { classe, matiere, statut, du, au } = req.query;
  const filtre = {};

  if (classe) filtre.classe = classe;
  if (matiere) filtre.matiere = matiere;
  if (statut) filtre.statut = statut;
  if (du || au) {
    filtre.date = {};
    if (du) filtre.date.$gte = jour(du);
    if (au) filtre.date.$lte = jour(au);
  }

  // Un etudiant ou un parent ne voit que le calendrier des classes concernees.
  const perimetre = await perimetreEtudiants(req.user);
  if (perimetre !== null) {
    const concernes = await User.find({ _id: { $in: perimetre } })
      .select('infosEtudiant.classe')
      .lean();

    const classes = concernes.map((e) => e.infosEtudiant?.classe).filter(Boolean);
    if (!classes.length) return res.json({ success: true, examens: [] });

    filtre.classe = classe && classes.some((c) => String(c) === String(classe))
      ? classe
      : { $in: classes };
  }

  const examens = await Examen.find(filtre).sort({ date: 1, heureDebut: 1 }).populate(PEUPLE).lean();

  res.json({ success: true, examens: examens.map((e) => ({ ...e, id: e._id })) });
});

/** GET /api/examens/mes-surveillances — convocations d'un surveillant */
export const mesSurveillances = catchAsync(async (req, res) => {
  const examens = await Examen.find({ surveillants: req.user._id, statut: { $ne: 'annule' } })
    .sort({ date: 1, heureDebut: 1 })
    .populate(PEUPLE)
    .lean();

  res.json({ success: true, examens: examens.map((e) => ({ ...e, id: e._id })) });
});

/** GET /api/examens/:id */
export const obtenir = catchAsync(async (req, res) => {
  const examen = await Examen.findById(req.params.id).populate(PEUPLE).lean();
  if (!examen) throw ApiError.notFound('Examen introuvable');

  const perimetre = await perimetreEtudiants(req.user);
  if (perimetre !== null) {
    const concernes = await User.find({ _id: { $in: perimetre } }).select('infosEtudiant.classe').lean();
    const autorise = concernes.some((e) => String(e.infosEtudiant?.classe) === String(examen.classe._id));
    if (!autorise) throw ApiError.forbidden('Cet examen ne concerne pas votre classe');
  }

  res.json({ success: true, examen: { ...examen, id: examen._id } });
});

/** POST /api/examens */
export const creer = catchAsync(async (req, res) => {
  const matiere = await Matiere.findById(req.body.matiere);
  if (!matiere) throw ApiError.badRequest('Matiere introuvable');

  await verifierSurveillants(req.body.surveillants);

  const conflit = await detecterConflit({ ...req.body, classe: matiere.classe });
  if (conflit) throw ApiError.conflict(conflit);

  const examen = await Examen.create({
    ...req.body,
    titre: req.body.titre || `${matiere.nom} — ${req.body.type || 'partiel'}`,
    classe: matiere.classe,
    creePar: req.user._id,
  });

  await examen.populate(PEUPLE);

  // Les surveillants designes sont prevenus de leur convocation.
  await notifier(examen.surveillants.map((s) => s._id), {
    type: 'examen',
    titre: 'Convocation de surveillance',
    message: `${examen.titre} le ${new Date(examen.date).toLocaleDateString('fr-FR')} de ${examen.heureDebut} a ${examen.heureFin} (salle ${examen.salle}).`,
    lien: '/examens',
  });

  res.status(201).json({ success: true, message: 'Examen planifie', examen });
});

/** PATCH /api/examens/:id */
export const modifier = catchAsync(async (req, res) => {
  const examen = await Examen.findById(req.params.id);
  if (!examen) throw ApiError.notFound('Examen introuvable');

  if (req.body.surveillants) await verifierSurveillants(req.body.surveillants);

  const futur = {
    id: examen._id,
    date: req.body.date || examen.date,
    heureDebut: req.body.heureDebut || examen.heureDebut,
    heureFin: req.body.heureFin || examen.heureFin,
    salle: req.body.salle || examen.salle,
    classe: examen.classe,
  };

  // Un examen annule ne bloque plus personne : le controle est inutile.
  if ((req.body.statut || examen.statut) !== 'annule') {
    const conflit = await detecterConflit(futur);
    if (conflit) throw ApiError.conflict(conflit);
  }

  Object.assign(examen, req.body);
  await examen.save();
  await examen.populate(PEUPLE);

  res.json({ success: true, message: 'Examen mis a jour', examen });
});

/** DELETE /api/examens/:id */
export const supprimer = catchAsync(async (req, res) => {
  const examen = await Examen.findById(req.params.id);
  if (!examen) throw ApiError.notFound('Examen introuvable');

  await examen.deleteOne();
  res.json({ success: true, message: 'Examen supprime' });
});

/** GET /api/examens/salles — salles deja utilisees, pour aider a la saisie */
export const salles = catchAsync(async (req, res) => {
  if (!STAFF_ROLES.includes(req.user.role)) throw ApiError.forbidden();

  const utilisees = await Examen.distinct('salle');
  res.json({ success: true, salles: utilisees.sort() });
});
