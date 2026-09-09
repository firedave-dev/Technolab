/** CRUD des matieres enseignees (pivot classe / professeur). */
import { Matiere } from '../models/Matiere.js';
import { Evaluation } from '../models/Evaluation.js';
import { Classe } from '../models/Classe.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/roles.js';

/** Verifie que la classe et le professeur references existent bien. */
async function verifierReferences({ classe, professeur }) {
  if (classe && !(await Classe.exists({ _id: classe }))) {
    throw ApiError.badRequest('Classe introuvable');
  }
  if (professeur && !(await User.exists({ _id: professeur, role: ROLES.PROFESSEUR }))) {
    throw ApiError.badRequest('Le titulaire doit etre un compte professeur');
  }
}

/** GET /api/matieres */
export const lister = catchAsync(async (req, res) => {
  const { classe, professeur, anneeScolaire, actif, q } = req.query;
  const filtre = {};

  if (classe) filtre.classe = classe;
  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;
  if (actif !== undefined) filtre.actif = actif;

  // Un professeur ne voit que ses matieres, sauf s'il consulte explicitement un collegue.
  if (req.user.role === ROLES.PROFESSEUR) filtre.professeur = req.user._id;
  else if (professeur) filtre.professeur = professeur;

  if (q) {
    const recherche = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtre.$or = [{ nom: recherche }, { code: recherche }];
  }

  const matieres = await Matiere.find(filtre)
    .sort({ nom: 1 })
    .populate('classe', 'nom niveau filiere anneeScolaire')
    .populate('professeur', 'nom prenom email')
    .lean();

  res.json({
    success: true,
    matieres: matieres.map((m) => ({ ...m, id: m._id })),
  });
});

/** GET /api/matieres/:id */
export const obtenir = catchAsync(async (req, res) => {
  const matiere = await Matiere.findById(req.params.id)
    .populate('classe', 'nom niveau filiere anneeScolaire capacite')
    .populate('professeur', 'nom prenom email telephone')
    .lean();

  if (!matiere) throw ApiError.notFound('Matiere introuvable');

  const nombreEvaluations = await Evaluation.countDocuments({ matiere: matiere._id });

  res.json({ success: true, matiere: { ...matiere, id: matiere._id, nombreEvaluations } });
});

/** POST /api/matieres */
export const creer = catchAsync(async (req, res) => {
  const donnees = { ...req.body };
  if (!donnees.professeur) delete donnees.professeur;

  await verifierReferences(donnees);

  const doublon = await Matiere.exists({
    code: donnees.code.toUpperCase(),
    classe: donnees.classe,
    anneeScolaire: donnees.anneeScolaire,
  });
  if (doublon) throw ApiError.conflict('Ce code de matiere existe deja pour cette classe');

  const matiere = await Matiere.create(donnees);
  await matiere.populate([
    { path: 'classe', select: 'nom niveau filiere anneeScolaire' },
    { path: 'professeur', select: 'nom prenom email' },
  ]);

  res.status(201).json({ success: true, message: 'Matiere creee', matiere });
});

/** PATCH /api/matieres/:id */
export const modifier = catchAsync(async (req, res) => {
  const matiere = await Matiere.findById(req.params.id);
  if (!matiere) throw ApiError.notFound('Matiere introuvable');

  const donnees = { ...req.body };
  // Chaine vide = retrait du titulaire.
  if (donnees.professeur === '') donnees.professeur = undefined;

  await verifierReferences(donnees);

  Object.assign(matiere, donnees);
  await matiere.save();
  await matiere.populate([
    { path: 'classe', select: 'nom niveau filiere anneeScolaire' },
    { path: 'professeur', select: 'nom prenom email' },
  ]);

  res.json({ success: true, message: 'Matiere mise a jour', matiere });
});

/** DELETE /api/matieres/:id — refuse tant que des evaluations y sont rattachees */
export const supprimer = catchAsync(async (req, res) => {
  const matiere = await Matiere.findById(req.params.id);
  if (!matiere) throw ApiError.notFound('Matiere introuvable');

  const evaluations = await Evaluation.countDocuments({ matiere: matiere._id });
  if (evaluations > 0) {
    throw ApiError.badRequest(
      `Impossible de supprimer : ${evaluations} evaluation(s) y sont rattachees. Desactivez-la plutot.`
    );
  }

  await matiere.deleteOne();
  res.json({ success: true, message: 'Matiere supprimee' });
});
