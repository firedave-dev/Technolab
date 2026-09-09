/** CRUD des classes et consultation de leurs effectifs. */
import { Classe } from '../models/Classe.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/roles.js';
import { presenterUtilisateur } from '../services/user.service.js';

/** Ajoute l'effectif reel a chaque classe (une seule agregation pour toute la liste). */
async function avecEffectifs(classes) {
  const ids = classes.map((c) => c._id);
  const comptes = await User.aggregate([
    { $match: { role: ROLES.ETUDIANT, 'infosEtudiant.classe': { $in: ids } } },
    { $group: { _id: '$infosEtudiant.classe', total: { $sum: 1 } } },
  ]);

  const parClasse = Object.fromEntries(comptes.map(({ _id, total }) => [String(_id), total]));
  return classes.map((c) => ({ ...c, id: c._id, effectif: parClasse[String(c._id)] || 0 }));
}

/** GET /api/classes */
export const lister = catchAsync(async (req, res) => {
  const { anneeScolaire, niveau, actif, q } = req.query;
  const filtre = {};

  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;
  if (niveau) filtre.niveau = niveau;
  if (actif !== undefined) filtre.actif = actif;
  if (q) {
    const recherche = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtre.$or = [{ nom: recherche }, { filiere: recherche }];
  }

  const classes = await Classe.find(filtre)
    .sort({ anneeScolaire: -1, niveau: 1, nom: 1 })
    .populate('professeurPrincipal', 'nom prenom email')
    .lean();

  res.json({ success: true, classes: await avecEffectifs(classes) });
});

/** GET /api/classes/:id — fiche de la classe et liste de ses etudiants */
export const obtenir = catchAsync(async (req, res) => {
  const classe = await Classe.findById(req.params.id)
    .populate('professeurPrincipal', 'nom prenom email telephone')
    .lean();

  if (!classe) throw ApiError.notFound('Classe introuvable');

  const etudiants = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe._id })
    .sort('nom prenom')
    .lean();

  res.json({
    success: true,
    classe: { ...classe, id: classe._id, effectif: etudiants.length },
    etudiants: etudiants.map((e) => presenterUtilisateur(e, req.user)),
  });
});

/** POST /api/classes */
export const creer = catchAsync(async (req, res) => {
  const donnees = { ...req.body };
  if (!donnees.professeurPrincipal) delete donnees.professeurPrincipal;

  if (donnees.professeurPrincipal) {
    const prof = await User.findOne({ _id: donnees.professeurPrincipal, role: ROLES.PROFESSEUR });
    if (!prof) throw ApiError.badRequest('Le professeur principal doit etre un compte professeur');
  }

  const classe = await Classe.create(donnees);
  res.status(201).json({ success: true, message: 'Classe creee', classe });
});

/** PATCH /api/classes/:id */
export const modifier = catchAsync(async (req, res) => {
  const classe = await Classe.findById(req.params.id);
  if (!classe) throw ApiError.notFound('Classe introuvable');

  const donnees = { ...req.body };

  // Chaine vide = retrait du professeur principal.
  if (donnees.professeurPrincipal === '') donnees.professeurPrincipal = undefined;
  else if (donnees.professeurPrincipal) {
    const prof = await User.findOne({ _id: donnees.professeurPrincipal, role: ROLES.PROFESSEUR });
    if (!prof) throw ApiError.badRequest('Le professeur principal doit etre un compte professeur');
  }

  // La capacite ne peut pas passer sous l'effectif deja inscrit.
  if (donnees.capacite !== undefined) {
    const effectif = await User.countDocuments({ 'infosEtudiant.classe': classe._id });
    if (donnees.capacite < effectif) {
      throw ApiError.badRequest(`Capacite inferieure a l'effectif actuel (${effectif} etudiants)`);
    }
  }

  Object.assign(classe, donnees);
  await classe.save();

  res.json({ success: true, message: 'Classe mise a jour', classe });
});

/** DELETE /api/classes/:id — refuse tant que des etudiants y sont rattaches */
export const supprimer = catchAsync(async (req, res) => {
  const classe = await Classe.findById(req.params.id);
  if (!classe) throw ApiError.notFound('Classe introuvable');

  const effectif = await User.countDocuments({ 'infosEtudiant.classe': classe._id });
  if (effectif > 0) {
    throw ApiError.badRequest(
      `Impossible de supprimer : ${effectif} etudiant(s) y sont rattaches. Archivez-la plutot.`
    );
  }

  await classe.deleteOne();
  res.json({ success: true, message: 'Classe supprimee' });
});
