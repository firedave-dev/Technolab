/** Dossiers etudiants et liaison parents : /api/etudiants */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as ctrl from '../controllers/student.controller.js';
import {
  affecterClasseSchema,
  idEtParentParamSchema,
  idParamSchema,
  lienParentSchema,
  listeQuerySchema,
} from '../validations/user.validation.js';

const router = Router();
router.use(protect);

// Consultation de la liste : personnel uniquement.
const CONSULTATION = [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR, ROLES.SURVEILLANT];
// Modification des dossiers : direction et secretariat.
const GESTION = [...ADMIN_ROLES, ROLES.SECRETAIRE];

router.get('/mes-enfants', restrictTo(ROLES.PARENT), ctrl.mesEnfants);

router.get('/', restrictTo(...CONSULTATION), validate({ query: listeQuerySchema }), ctrl.lister);

// Un etudiant ou un parent peut ouvrir ce dossier : le controleur verifie le lien.
router.get(
  '/:id',
  restrictTo(...STAFF_ROLES, ROLES.ETUDIANT, ROLES.PARENT),
  validate({ params: idParamSchema }),
  ctrl.dossier
);

router.patch(
  '/:id/classe',
  restrictTo(...GESTION),
  validate({ params: idParamSchema, body: affecterClasseSchema }),
  ctrl.affecterClasse
);

router.post(
  '/:id/parents',
  restrictTo(...GESTION),
  validate({ params: idParamSchema, body: lienParentSchema }),
  ctrl.lierParent
);

router.delete(
  '/:id/parents/:parentId',
  restrictTo(...GESTION),
  validate({ params: idEtParentParamSchema }),
  ctrl.delierParent
);

export default router;
