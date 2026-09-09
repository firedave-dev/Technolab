/**
 * Dossiers etudiants et liaison parent-enfant.
 * Regle de confidentialite : le personnel voit tous les dossiers, un parent uniquement
 * ceux de ses enfants, un etudiant uniquement le sien.
 */
import { User } from '../models/User.js';
import { Classe } from '../models/Classe.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';
import { construireFiltre, listerUtilisateurs, presenterUtilisateur } from '../services/user.service.js';

/** L'acteur a-t-il le droit de consulter ce dossier ? */
function verifierAccesDossier(acteur, etudiant) {
  if (STAFF_ROLES.includes(acteur.role)) return;

  const estSonDossier = etudiant._id.equals(acteur._id);
  const estSonEnfant = acteur.enfants?.some((id) => id.equals(etudiant._id));

  if (!estSonDossier && !estSonEnfant) {
    throw ApiError.forbidden('Vous ne pouvez consulter que votre dossier ou celui de vos enfants');
  }
}

/** GET /api/etudiants — liste filtrable (classe, statut, recherche) */
export const lister = catchAsync(async (req, res) => {
  const { page, limite, tri, ...filtres } = req.query;
  const filtre = construireFiltre({ ...filtres, role: ROLES.ETUDIANT });

  const { elements, pagination } = await listerUtilisateurs(filtre, { page, limite, tri });

  res.json({
    success: true,
    etudiants: elements.map((u) => presenterUtilisateur(u, req.user)),
    pagination,
  });
});

/** GET /api/etudiants/mes-enfants — vue dediee au profil parent */
export const mesEnfants = catchAsync(async (req, res) => {
  const enfants = await User.find({ _id: { $in: req.user.enfants || [] } })
    .sort('prenom')
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire')
    .lean();

  res.json({
    success: true,
    enfants: enfants.map((e) => presenterUtilisateur(e, req.user)),
  });
});

/** GET /api/etudiants/:id — dossier complet */
export const dossier = catchAsync(async (req, res) => {
  const etudiant = await User.findOne({ _id: req.params.id, role: ROLES.ETUDIANT })
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire capacite')
    .populate('parents', 'nom prenom email telephone matricule actif');

  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');
  verifierAccesDossier(req.user, etudiant);

  res.json({ success: true, etudiant: presenterUtilisateur(etudiant, req.user) });
});

/** PATCH /api/etudiants/:id/classe — affectation ou retrait de classe */
export const affecterClasse = catchAsync(async (req, res) => {
  const etudiant = await User.findOne({ _id: req.params.id, role: ROLES.ETUDIANT });
  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');

  const { classe } = req.body;

  if (classe) {
    const cible = await Classe.findById(classe);
    if (!cible) throw ApiError.notFound('Classe introuvable');
    if (!cible.actif) throw ApiError.badRequest('Cette classe est archivee');

    // Controle de capacite : on ne compte pas l'etudiant s'il y est deja.
    const effectif = await User.countDocuments({
      'infosEtudiant.classe': cible._id,
      _id: { $ne: etudiant._id },
    });
    if (effectif >= cible.capacite) {
      throw ApiError.badRequest(`Classe complete (${effectif}/${cible.capacite} places occupees)`);
    }
  }

  etudiant.infosEtudiant = { ...(etudiant.infosEtudiant?.toObject?.() || {}), classe: classe || undefined };
  await etudiant.save();
  await etudiant.populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire');

  res.json({
    success: true,
    message: classe ? 'Etudiant affecte a la classe' : 'Etudiant retire de sa classe',
    etudiant: presenterUtilisateur(etudiant, req.user),
  });
});

/**
 * POST /api/etudiants/:id/parents — rattache un parent a l'etudiant.
 * Les deux sens de la relation sont ecrits pour rester coherents.
 */
export const lierParent = catchAsync(async (req, res) => {
  const [etudiant, parent] = await Promise.all([
    User.findOne({ _id: req.params.id, role: ROLES.ETUDIANT }),
    User.findOne({ _id: req.body.parentId, role: ROLES.PARENT }),
  ]);

  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');
  if (!parent) throw ApiError.notFound('Parent introuvable');

  if (etudiant.parents.some((id) => id.equals(parent._id))) {
    throw ApiError.conflict('Ce parent est deja rattache a cet etudiant');
  }

  await Promise.all([
    User.updateOne({ _id: etudiant._id }, { $addToSet: { parents: parent._id } }),
    User.updateOne({ _id: parent._id }, { $addToSet: { enfants: etudiant._id } }),
  ]);

  const maj = await User.findById(etudiant._id)
    .populate('parents', 'nom prenom email telephone matricule actif')
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire');

  res.json({
    success: true,
    message: `${parent.prenom} ${parent.nom} est desormais rattache a cet etudiant`,
    etudiant: presenterUtilisateur(maj, req.user),
  });
});

/** DELETE /api/etudiants/:id/parents/:parentId */
export const delierParent = catchAsync(async (req, res) => {
  const { id, parentId } = req.params;

  const etudiant = await User.findOne({ _id: id, role: ROLES.ETUDIANT });
  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');

  await Promise.all([
    User.updateOne({ _id: id }, { $pull: { parents: parentId } }),
    User.updateOne({ _id: parentId }, { $pull: { enfants: id } }),
  ]);

  const maj = await User.findById(id)
    .populate('parents', 'nom prenom email telephone matricule actif')
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire');

  res.json({
    success: true,
    message: 'Liaison supprimee',
    etudiant: presenterUtilisateur(maj, req.user),
  });
});
