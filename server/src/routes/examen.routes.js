/** Planification des examens : /api/examens */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as ctrl from '../controllers/examen.controller.js';
import {
  creerExamenSchema,
  idParamSchema,
  listeExamensQuerySchema,
  majExamenSchema,
} from '../validations/scolarite.validation.js';

const router = Router();
router.use(protect);

// La planification releve de la direction et du secretariat.
const PLANIFICATION = [...ADMIN_ROLES, ROLES.SECRETAIRE];

router.get('/mes-surveillances', restrictTo(...STAFF_ROLES), ctrl.mesSurveillances);
router.get('/salles', restrictTo(...STAFF_ROLES), ctrl.salles);

// Consultation ouverte a tous : les etudiants et parents sont filtres sur leur classe.
router.get('/', validate({ query: listeExamensQuerySchema }), ctrl.lister);
router.get('/:id', validate({ params: idParamSchema }), ctrl.obtenir);

router.post('/', restrictTo(...PLANIFICATION), validate({ body: creerExamenSchema }), ctrl.creer);
router.patch('/:id', restrictTo(...PLANIFICATION), validate({ params: idParamSchema, body: majExamenSchema }), ctrl.modifier);
router.delete('/:id', restrictTo(...ADMIN_ROLES), validate({ params: idParamSchema }), ctrl.supprimer);

export default router;
