/**
 * Evaluations et saisie des notes.
 * Un professeur n'intervient que sur ses propres matieres ; la direction et le
 * secretariat ont la main sur l'ensemble. Les notes ne deviennent visibles des
 * etudiants et des parents qu'une fois l'evaluation publiee.
 */
import mongoose from 'mongoose';
import { Evaluation } from '../models/Evaluation.js';
import { Matiere } from '../models/Matiere.js';
import { Note } from '../models/Note.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';
import { moyennePonderee, verifierAccesMatiere } from '../services/scolarite.service.js';
import { notifier } from '../services/notification.service.js';

/** Charge une evaluation et verifie les droits de l'acteur sur sa matiere. */
async function chargerEvaluation(id, acteur, options = {}) {
  const evaluation = await Evaluation.findById(id).populate('matiere');
  if (!evaluation) throw ApiError.notFound('Evaluation introuvable');
  verifierAccesMatiere(acteur, evaluation.matiere, options);
  return evaluation;
}

/** GET /api/evaluations */
export const lister = catchAsync(async (req, res) => {
  const { matiere, classe, periode, type, publiee } = req.query;
  const filtre = {};

  if (matiere) filtre.matiere = matiere;
  if (classe) filtre.classe = classe;
  if (periode) filtre.periode = periode;
  if (type) filtre.type = type;
  if (publiee !== undefined) filtre.publiee = publiee;

  // Un professeur ne voit que les evaluations de ses matieres.
  if (req.user.role === ROLES.PROFESSEUR) {
    const siennes = await Matiere.find({ professeur: req.user._id }).select('_id').lean();
    filtre.matiere = matiere
      ? { $in: siennes.filter((m) => String(m._id) === String(matiere)).map((m) => m._id) }
      : { $in: siennes.map((m) => m._id) };
  }

  const evaluations = await Evaluation.find(filtre)
    .sort({ date: -1 })
    .populate('matiere', 'nom code coefficient')
    .populate('classe', 'nom niveau')
    .lean();

  // Nombre de notes saisies par evaluation : indique l'avancement de la correction.
  const comptes = await Note.aggregate([
    { $match: { evaluation: { $in: evaluations.map((e) => e._id) } } },
    { $group: { _id: '$evaluation', total: { $sum: 1 } } },
  ]);
  const parEvaluation = Object.fromEntries(comptes.map(({ _id, total }) => [String(_id), total]));

  res.json({
    success: true,
    evaluations: evaluations.map((e) => ({
      ...e,
      id: e._id,
      notesSaisies: parEvaluation[String(e._id)] || 0,
    })),
  });
});

/**
 * GET /api/evaluations/:id/notes
 * Renvoie la liste des etudiants de la classe avec leur note : c'est la grille de saisie.
 */
export const grilleNotes = catchAsync(async (req, res) => {
  const evaluation = await chargerEvaluation(req.params.id, req.user, { lecture: true });

  const [etudiants, notes] = await Promise.all([
    User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': evaluation.classe })
      .sort('nom prenom')
      .select('nom prenom matricule')
      .lean(),
    Note.find({ evaluation: evaluation._id }).lean(),
  ]);

  const parEtudiant = Object.fromEntries(notes.map((n) => [String(n.etudiant), n]));

  const lignes = etudiants.map((e) => {
    const note = parEtudiant[String(e._id)];
    return {
      etudiant: { id: e._id, nomComplet: `${e.prenom} ${e.nom}`, matricule: e.matricule },
      valeur: note?.valeur ?? null,
      absent: Boolean(note?.absent),
      appreciation: note?.appreciation || '',
      saisie: Boolean(note),
    };
  });

  const moyenne = moyennePonderee(
    lignes.map((l) => ({ note: l.absent ? null : l.valeur, bareme: evaluation.bareme, coefficient: 1 }))
  );

  res.json({
    success: true,
    evaluation: { ...evaluation.toJSON(), id: evaluation._id },
    lignes,
    statistiques: {
      effectif: lignes.length,
      saisies: lignes.filter((l) => l.saisie).length,
      absents: lignes.filter((l) => l.absent).length,
      moyenne,
    },
  });
});

/** POST /api/evaluations */
export const creer = catchAsync(async (req, res) => {
  const matiere = await Matiere.findById(req.body.matiere);
  if (!matiere) throw ApiError.badRequest('Matiere introuvable');
  verifierAccesMatiere(req.user, matiere);

  const evaluation = await Evaluation.create({
    ...req.body,
    classe: matiere.classe, // denormalisation depuis la matiere
    creePar: req.user._id,
  });

  await evaluation.populate([
    { path: 'matiere', select: 'nom code coefficient' },
    { path: 'classe', select: 'nom niveau' },
  ]);

  res.status(201).json({ success: true, message: 'Evaluation creee', evaluation });
});

/** PATCH /api/evaluations/:id */
export const modifier = catchAsync(async (req, res) => {
  const evaluation = await chargerEvaluation(req.params.id, req.user);

  Object.assign(evaluation, req.body);
  await evaluation.save();
  await evaluation.populate([
    { path: 'matiere', select: 'nom code coefficient' },
    { path: 'classe', select: 'nom niveau' },
  ]);

  res.json({ success: true, message: 'Evaluation mise a jour', evaluation });
});

/** DELETE /api/evaluations/:id — supprime aussi les notes associees */
export const supprimer = catchAsync(async (req, res) => {
  const evaluation = await chargerEvaluation(req.params.id, req.user);

  await Note.deleteMany({ evaluation: evaluation._id });
  await evaluation.deleteOne();

  res.json({ success: true, message: 'Evaluation et notes associees supprimees' });
});

/**
 * PUT /api/evaluations/:id/notes
 * Saisie en lot : une ligne par etudiant. Les lignes vides et non marquees absentes
 * sont ignorees, ce qui permet d'enregistrer une correction en plusieurs fois.
 */
export const saisirNotes = catchAsync(async (req, res) => {
  const evaluation = await chargerEvaluation(req.params.id, req.user);

  // On n'accepte que des etudiants reellement inscrits dans la classe de l'evaluation.
  const inscrits = await User.find({
    role: ROLES.ETUDIANT,
    'infosEtudiant.classe': evaluation.classe,
  }).select('_id').lean();
  const autorises = new Set(inscrits.map((e) => String(e._id)));

  const operations = [];
  const aSupprimer = [];
  const horsClasse = [];

  for (const ligne of req.body.notes) {
    if (!autorises.has(ligne.etudiant)) {
      horsClasse.push(ligne.etudiant);
      continue;
    }

    const absent = Boolean(ligne.absent);
    const valeur = absent ? null : ligne.valeur ?? null;

    // Ligne laissee vide : la note existante est retiree.
    if (!absent && valeur === null && !ligne.appreciation) {
      aSupprimer.push(new mongoose.Types.ObjectId(ligne.etudiant));
      continue;
    }

    if (valeur !== null && valeur > evaluation.bareme) {
      throw ApiError.badRequest(`Note superieure au bareme (${evaluation.bareme})`);
    }

    operations.push({
      updateOne: {
        filter: { evaluation: evaluation._id, etudiant: ligne.etudiant },
        update: {
          $set: {
            valeur,
            absent,
            appreciation: ligne.appreciation || '',
            saisiePar: req.user._id,
          },
        },
        upsert: true,
      },
    });
  }

  if (horsClasse.length) {
    throw ApiError.badRequest(`${horsClasse.length} etudiant(s) ne sont pas inscrits dans cette classe`);
  }

  if (operations.length) await Note.bulkWrite(operations);
  if (aSupprimer.length) {
    await Note.deleteMany({ evaluation: evaluation._id, etudiant: { $in: aSupprimer } });
  }

  const saisies = await Note.countDocuments({ evaluation: evaluation._id });

  res.json({
    success: true,
    message: `${operations.length} note(s) enregistree(s)`,
    saisies,
  });
});

/**
 * PATCH /api/evaluations/:id/publication
 * Publie ou depublie les notes. A la publication, etudiants et parents sont notifies.
 */
export const basculerPublication = catchAsync(async (req, res) => {
  const evaluation = await chargerEvaluation(req.params.id, req.user);

  evaluation.publiee = !evaluation.publiee;
  await evaluation.save();

  if (evaluation.publiee) {
    const notes = await Note.find({ evaluation: evaluation._id }).select('etudiant').lean();
    const etudiants = await User.find({ _id: { $in: notes.map((n) => n.etudiant) } })
      .select('parents')
      .lean();

    // Chaque etudiant note et ses parents recoivent l'information.
    const destinataires = etudiants.flatMap((e) => [e._id, ...(e.parents || [])]);

    await notifier(destinataires, {
      type: 'note',
      titre: 'Nouvelle note disponible',
      message: `Les notes de "${evaluation.titre}" (${evaluation.matiere.nom}) sont consultables.`,
      lien: '/notes',
    });
  }

  res.json({
    success: true,
    message: evaluation.publiee ? 'Notes publiees' : 'Publication retiree',
    evaluation,
  });
});

/** GET /api/evaluations/mes-matieres — raccourci pour le selecteur cote client */
export const mesMatieres = catchAsync(async (req, res) => {
  const filtre = { actif: true };
  if (req.user.role === ROLES.PROFESSEUR) filtre.professeur = req.user._id;
  else if (!STAFF_ROLES.includes(req.user.role)) throw ApiError.forbidden();

  const matieres = await Matiere.find(filtre)
    .sort('nom')
    .populate('classe', 'nom niveau filiere')
    .lean();

  res.json({ success: true, matieres: matieres.map((m) => ({ ...m, id: m._id })) });
});
