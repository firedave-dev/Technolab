/**
 * CRUD des comptes utilisateurs (personnel, etudiants, parents).
 * L'acces est deja restreint aux profils gestionnaires par les routes ; ce controleur
 * applique en plus la matrice de delegation : un secretaire ne peut pas creer un directeur.
 */
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, ROLE_LABELS, peutGererRole, rolesGerablesPar } from '../config/roles.js';
import { env } from '../config/env.js';
import { emailBienvenue } from '../services/email.service.js';
import {
  construireFiltre,
  genererMatricule,
  genererMotDePasseProvisoire,
  listerUtilisateurs,
  nettoyerBlocsRole,
  presenterUtilisateur,
} from '../services/user.service.js';

/** Verifie que l'acteur a le droit d'agir sur ce role, sinon leve une 403 explicite. */
function verifierDelegation(acteur, roleCible) {
  if (!peutGererRole(acteur.role, roleCible)) {
    throw ApiError.forbidden(`Votre profil ne peut pas gerer un compte de type "${roleCible}"`);
  }
}

/** GET /api/users — liste filtrable et paginee */
export const lister = catchAsync(async (req, res) => {
  const { page, limite, tri, ...filtres } = req.query;
  const filtre = construireFiltre(filtres);

  const { elements, pagination } = await listerUtilisateurs(filtre, { page, limite, tri });

  res.json({
    success: true,
    utilisateurs: elements.map((u) => presenterUtilisateur(u, req.user)),
    pagination,
  });
});

/** GET /api/users/statistiques — effectifs par role, pour le tableau de bord */
export const statistiques = catchAsync(async (req, res) => {
  const [parRole, actifs, inactifs] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', total: { $sum: 1 } } }]),
    User.countDocuments({ actif: true }),
    User.countDocuments({ actif: false }),
  ]);

  res.json({
    success: true,
    statistiques: {
      total: actifs + inactifs,
      actifs,
      inactifs,
      parRole: Object.fromEntries(parRole.map(({ _id, total }) => [_id, total])),
    },
  });
});

/** GET /api/users/roles-gerables — alimente le selecteur de role du formulaire */
export const rolesGerables = catchAsync(async (req, res) => {
  res.json({ success: true, roles: rolesGerablesPar(req.user.role) });
});

/** GET /api/users/:id */
export const obtenir = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire')
    .populate('parents', 'nom prenom email telephone matricule')
    .populate('enfants', 'nom prenom email matricule infosEtudiant.statut');

  if (!user) throw ApiError.notFound('Utilisateur introuvable');

  res.json({ success: true, utilisateur: presenterUtilisateur(user, req.user) });
});

/**
 * POST /api/users
 * Le matricule et le mot de passe sont generes s'ils ne sont pas fournis :
 * le mot de passe provisoire n'est renvoye qu'a cette occasion.
 */
export const creer = catchAsync(async (req, res) => {
  verifierDelegation(req.user, req.body.role);

  if (await User.exists({ email: req.body.email })) {
    throw ApiError.conflict('Un compte utilise deja cet email');
  }

  const donnees = nettoyerBlocsRole(req.body, req.body.role);
  const motDePasseProvisoire = donnees.motDePasse ? null : genererMotDePasseProvisoire();

  const user = await User.create({
    ...donnees,
    matricule: donnees.matricule || (await genererMatricule(donnees.role)),
    motDePasse: donnees.motDePasse || motDePasseProvisoire,
  });

  // Les identifiants provisoires partent par courrier ; ils restent affiches a
  // l'administration, qui peut les transmettre autrement si l'email n'arrive pas.
  if (motDePasseProvisoire) {
    await emailBienvenue({
      destinataire: user.email,
      prenom: user.prenom,
      roleLabel: ROLE_LABELS[user.role],
      motDePasseProvisoire,
      lien: `${env.clientUrl}/login`,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Compte cree avec succes',
    utilisateur: presenterUtilisateur(user, req.user),
    ...(motDePasseProvisoire ? { motDePasseProvisoire } : {}),
  });
});

/** PATCH /api/users/:id */
export const modifier = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');

  // Droit sur le role actuel, et sur le nouveau role en cas de changement.
  verifierDelegation(req.user, user.role);
  if (req.body.role && req.body.role !== user.role) verifierDelegation(req.user, req.body.role);

  if (req.body.email && req.body.email !== user.email) {
    if (await User.exists({ email: req.body.email, _id: { $ne: user._id } })) {
      throw ApiError.conflict('Un compte utilise deja cet email');
    }
  }

  // Un gestionnaire ne peut pas se retirer lui-meme ses propres droits.
  // Renvoyer son role inchange reste autorise : seul un changement effectif est bloque.
  const changeDeRole = req.body.role && req.body.role !== user.role;
  if (user._id.equals(req.user._id) && (changeDeRole || req.body.actif === false)) {
    throw ApiError.badRequest('Vous ne pouvez pas modifier votre propre role ni desactiver votre compte');
  }

  const roleFinal = req.body.role || user.role;
  Object.assign(user, nettoyerBlocsRole(req.body, roleFinal));

  // Changement de role : les blocs devenus hors-sujet sont retires.
  if (roleFinal !== ROLES.ETUDIANT) user.infosEtudiant = undefined;

  await user.save();

  res.json({
    success: true,
    message: 'Compte mis a jour',
    utilisateur: presenterUtilisateur(user, req.user),
  });
});

/** PATCH /api/users/:id/statut — activation / desactivation (alternative douce a la suppression) */
export const basculerActif = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  verifierDelegation(req.user, user.role);

  if (user._id.equals(req.user._id)) {
    throw ApiError.badRequest('Vous ne pouvez pas desactiver votre propre compte');
  }

  user.actif = !user.actif;
  await user.save({ validateBeforeSave: false });

  // Un compte desactive ne doit plus pouvoir rafraichir sa session.
  if (!user.actif) await RefreshToken.deleteMany({ user: user._id });

  res.json({
    success: true,
    message: user.actif ? 'Compte reactive' : 'Compte desactive',
    utilisateur: presenterUtilisateur(user, req.user),
  });
});

/** POST /api/users/:id/mot-de-passe — reinitialisation par l'administration */
export const reinitialiserMotDePasse = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select('+motDePasse');
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  verifierDelegation(req.user, user.role);

  const nouveau = req.body.motDePasse || genererMotDePasseProvisoire();
  user.motDePasse = nouveau;
  await user.save();
  await RefreshToken.deleteMany({ user: user._id }); // sessions en cours coupees

  res.json({
    success: true,
    message: 'Mot de passe reinitialise',
    ...(req.body.motDePasse ? {} : { motDePasseProvisoire: nouveau }),
  });
});

/**
 * DELETE /api/users/:id
 * Suppression definitive : les liaisons parent-enfant et les sessions sont nettoyees.
 * La desactivation reste preferable pour conserver l'historique.
 */
export const supprimer = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Utilisateur introuvable');
  verifierDelegation(req.user, user.role);

  if (user._id.equals(req.user._id)) {
    throw ApiError.badRequest('Vous ne pouvez pas supprimer votre propre compte');
  }

  await Promise.all([
    User.updateMany({ enfants: user._id }, { $pull: { enfants: user._id } }),
    User.updateMany({ parents: user._id }, { $pull: { parents: user._id } }),
    RefreshToken.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();

  res.json({ success: true, message: 'Compte supprime' });
});
