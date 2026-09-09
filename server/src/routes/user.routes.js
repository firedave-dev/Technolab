/** Routes de gestion des comptes : /api/users */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES } from '../config/roles.js';
import * as ctrl from '../controllers/user.controller.js';
import {
  creerUtilisateurSchema,
  idParamSchema,
  listeQuerySchema,
  majUtilisateurSchema,
  nouveauMotDePasseSchema,
} from '../validations/user.validation.js';

const router = Router();

// Seuls les profils gestionnaires accedent a ce module.
const GESTIONNAIRES = [...ADMIN_ROLES, ROLES.SECRETAIRE];
router.use(protect, restrictTo(...GESTIONNAIRES));

router.get('/statistiques', ctrl.statistiques);
router.get('/roles-gerables', ctrl.rolesGerables);

router.get('/', validate({ query: listeQuerySchema }), ctrl.lister);
router.post('/', validate({ body: creerUtilisateurSchema }), ctrl.creer);

router.get('/:id', validate({ params: idParamSchema }), ctrl.obtenir);
router.patch('/:id', validate({ params: idParamSchema, body: majUtilisateurSchema }), ctrl.modifier);
router.delete('/:id', validate({ params: idParamSchema }), ctrl.supprimer);

router.patch('/:id/statut', validate({ params: idParamSchema }), ctrl.basculerActif);
router.post(
  '/:id/mot-de-passe',
  validate({ params: idParamSchema, body: nouveauMotDePasseSchema }),
  ctrl.reinitialiserMotDePasse
);

export default router;
