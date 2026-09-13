/**
 * Routes des Unites d'Enseignement.
 *
 * La lecture est ouverte a l'ensemble du personnel — un professeur a besoin de
 * savoir dans quelle UE tombe sa matiere. L'ECRITURE, elle, est reservee a la
 * direction et au secretariat : composer les UE, c'est decider de la
 * compensation entre matieres, donc de ce qui valide un semestre.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { PEDAGOGIE_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as ue from '../controllers/ue.controller.js';
import {
  appliquerUESchema,
  echangeMatieresSchema,
  semestreQuerySchema,
} from '../validations/ue.validation.js';

// Les UE relevent du meme groupe que les matieres dont elles sont faites.
const GESTION = PEDAGOGIE_ROLES;

const router = Router();
router.use(protect);

router.get('/types', restrictTo(...STAFF_ROLES), ue.types);
router.get('/etat', restrictTo(...STAFF_ROLES), validate({ query: semestreQuerySchema }), ue.etat);
router.get('/proposition', restrictTo(...GESTION), validate({ query: semestreQuerySchema }), ue.proposition);
router.get('/', restrictTo(...STAFF_ROLES), validate({ query: semestreQuerySchema }), ue.lister);

router.post('/appliquer', restrictTo(...GESTION), validate({ body: appliquerUESchema }), ue.appliquer);
router.patch('/echanger', restrictTo(...GESTION), validate({ body: echangeMatieresSchema }), ue.echanger);

export default router;
