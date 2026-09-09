/** Pointage et suivi des absences : /api/absences */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES } from '../config/roles.js';
import * as ctrl from '../controllers/absence.controller.js';
import {
  creerAbsenceSchema,
  etatAppelQuerySchema,
  feuilleAppelSchema,
  idParamSchema,
  justifierAbsenceSchema,
  listeAbsencesQuerySchema,
  statistiquesAbsencesQuerySchema,
} from '../validations/scolarite.validation.js';

const router = Router();
router.use(protect);

// Qui peut pointer : professeurs (leurs cours) et surveillance.
const SAISIE = [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR, ROLES.SURVEILLANT];
// Qui peut justifier : surveillance, secretariat, direction.
const JUSTIFICATION = [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.SURVEILLANT];

router.get('/appel', restrictTo(...SAISIE), validate({ query: etatAppelQuerySchema }), ctrl.etatAppel);
router.post('/appel', restrictTo(...SAISIE), validate({ body: feuilleAppelSchema }), ctrl.feuilleAppel);

router.get('/statistiques', validate({ query: statistiquesAbsencesQuerySchema }), ctrl.statistiques);
router.get('/etudiant/:id', validate({ params: idParamSchema }), ctrl.parEtudiant);

// Consultation ouverte : etudiants et parents sont restreints a leur perimetre.
router.get('/', validate({ query: listeAbsencesQuerySchema }), ctrl.lister);

router.post('/', restrictTo(...SAISIE), validate({ body: creerAbsenceSchema }), ctrl.creer);
router.patch(
  '/:id/justification',
  restrictTo(...JUSTIFICATION),
  validate({ params: idParamSchema, body: justifierAbsenceSchema }),
  ctrl.justifier
);
router.delete('/:id', restrictTo(...JUSTIFICATION), validate({ params: idParamSchema }), ctrl.supprimer);

export default router;
