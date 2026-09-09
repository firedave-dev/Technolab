/**
 * Routes des modules pedagogiques : matieres, evaluations, notes et bulletins.
 * Le detail des permissions par matiere (professeur titulaire) est traite dans
 * les controleurs, via verifierAccesMatiere.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as matieres from '../controllers/matiere.controller.js';
import * as evaluations from '../controllers/evaluation.controller.js';
import * as bulletins from '../controllers/bulletin.controller.js';
import {
  bulletinQuerySchema,
  creerEvaluationSchema,
  creerMatiereSchema,
  idParamSchema,
  listeEvaluationsQuerySchema,
  listeMatieresQuerySchema,
  majEvaluationSchema,
  majMatiereSchema,
  releveQuerySchema,
  saisieNotesSchema,
} from '../validations/scolarite.validation.js';

// Profils habilites a administrer l'offre de formation.
const GESTION = [...ADMIN_ROLES, ROLES.SECRETAIRE];
// Profils habilites a saisir des notes.
const SAISIE = [...GESTION, ROLES.PROFESSEUR];

// --- /api/matieres ---
export const matiereRouter = Router();
matiereRouter.use(protect);

matiereRouter.get('/', restrictTo(...STAFF_ROLES), validate({ query: listeMatieresQuerySchema }), matieres.lister);
matiereRouter.get('/:id', restrictTo(...STAFF_ROLES), validate({ params: idParamSchema }), matieres.obtenir);
matiereRouter.post('/', restrictTo(...GESTION), validate({ body: creerMatiereSchema }), matieres.creer);
matiereRouter.patch('/:id', restrictTo(...GESTION), validate({ params: idParamSchema, body: majMatiereSchema }), matieres.modifier);
matiereRouter.delete('/:id', restrictTo(...GESTION), validate({ params: idParamSchema }), matieres.supprimer);

// --- /api/evaluations ---
export const evaluationRouter = Router();
evaluationRouter.use(protect, restrictTo(...SAISIE));

evaluationRouter.get('/mes-matieres', evaluations.mesMatieres);
evaluationRouter.get('/', validate({ query: listeEvaluationsQuerySchema }), evaluations.lister);
evaluationRouter.post('/', validate({ body: creerEvaluationSchema }), evaluations.creer);

evaluationRouter.get('/:id/notes', validate({ params: idParamSchema }), evaluations.grilleNotes);
evaluationRouter.put('/:id/notes', validate({ params: idParamSchema, body: saisieNotesSchema }), evaluations.saisirNotes);
evaluationRouter.patch('/:id/publication', validate({ params: idParamSchema }), evaluations.basculerPublication);

evaluationRouter.patch('/:id', validate({ params: idParamSchema, body: majEvaluationSchema }), evaluations.modifier);
evaluationRouter.delete('/:id', validate({ params: idParamSchema }), evaluations.supprimer);

// --- /api/bulletins ---
export const bulletinRouter = Router();
bulletinRouter.use(protect);

bulletinRouter.get(
  '/classe/:id',
  restrictTo(...SAISIE),
  validate({ params: idParamSchema, query: releveQuerySchema }),
  bulletins.releveClasse
);

// Etudiant et parent y accedent : le controleur verifie le lien exact.
bulletinRouter.get(
  '/:id',
  restrictTo(...STAFF_ROLES, ROLES.ETUDIANT, ROLES.PARENT),
  validate({ params: idParamSchema, query: bulletinQuerySchema }),
  bulletins.bulletinEtudiant
);

export default { matiereRouter, evaluationRouter, bulletinRouter };
