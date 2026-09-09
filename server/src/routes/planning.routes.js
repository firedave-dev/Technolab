/** Emploi du temps et statistiques : /api/planning et /api/statistiques */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as planning from '../controllers/planning.controller.js';
import * as stats from '../controllers/statistique.controller.js';
import {
  creerCreneauSchema,
  dupliquerSchema,
  idParamSchema,
  listePlanningQuerySchema,
  majCreneauSchema,
  statistiquesQuerySchema,
} from '../validations/planning.validation.js';

// La construction de l'emploi du temps releve de la direction et du secretariat.
const PLANIFICATION = [...ADMIN_ROLES, ROLES.SECRETAIRE];

// --- /api/planning ---
export const planningRouter = Router();
planningRouter.use(protect);

planningRouter.get('/salles', restrictTo(...STAFF_ROLES), planning.salles);

// Consultation ouverte a tous : le controleur restreint chacun a son perimetre.
planningRouter.get('/', validate({ query: listePlanningQuerySchema }), planning.lister);

planningRouter.post('/', restrictTo(...PLANIFICATION), validate({ body: creerCreneauSchema }), planning.creer);
planningRouter.post('/dupliquer', restrictTo(...PLANIFICATION), validate({ body: dupliquerSchema }), planning.dupliquer);
planningRouter.patch(
  '/:id',
  restrictTo(...PLANIFICATION),
  validate({ params: idParamSchema, body: majCreneauSchema }),
  planning.modifier
);
planningRouter.delete('/:id', restrictTo(...PLANIFICATION), validate({ params: idParamSchema }), planning.supprimer);

// --- /api/statistiques ---
export const statistiqueRouter = Router();
statistiqueRouter.use(protect);

// Chacun recoit la charge utile correspondant a son role.
statistiqueRouter.get('/mon-tableau', stats.monTableauDeBord);

statistiqueRouter.get(
  '/etablissement',
  restrictTo(...ADMIN_ROLES),
  validate({ query: statistiquesQuerySchema }),
  stats.etablissement
);

export default { planningRouter, statistiqueRouter };
