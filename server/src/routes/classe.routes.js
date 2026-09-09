/** Gestion des classes : /api/classes */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as ctrl from '../controllers/classe.controller.js';
import {
  creerClasseSchema,
  idParamSchema,
  listeClassesQuerySchema,
  majClasseSchema,
} from '../validations/user.validation.js';

const router = Router();
router.use(protect);

// Tout le personnel consulte les classes ; seules la direction et la secretaire les modifient.
const GESTION = [...ADMIN_ROLES, ROLES.SECRETAIRE];

router.get('/', restrictTo(...STAFF_ROLES), validate({ query: listeClassesQuerySchema }), ctrl.lister);
router.get('/:id', restrictTo(...STAFF_ROLES), validate({ params: idParamSchema }), ctrl.obtenir);

router.post('/', restrictTo(...GESTION), validate({ body: creerClasseSchema }), ctrl.creer);
router.patch('/:id', restrictTo(...GESTION), validate({ params: idParamSchema, body: majClasseSchema }), ctrl.modifier);
router.delete('/:id', restrictTo(...ADMIN_ROLES), validate({ params: idParamSchema }), ctrl.supprimer);

export default router;
