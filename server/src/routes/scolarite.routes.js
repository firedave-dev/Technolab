/**
 * Routes des modules pedagogiques : matieres, evaluations, notes et bulletins.
 * Le detail des permissions par matiere (professeur titulaire) est traite dans
 * les controleurs, via verifierAccesMatiere.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, DOSSIER_ROLES, PEDAGOGIE_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
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

/*
 * L'offre de formation est administree par la direction et le surveillant, pas
 * par le secretariat : celui-ci gere les inscriptions et la caisse.
 */
const GESTION = PEDAGOGIE_ROLES;
// Consultation : les memes, plus le professeur, qui y trouve ses matieres.
const LECTURE = [...PEDAGOGIE_ROLES, ROLES.PROFESSEUR];
// Profils habilites a saisir des notes.
const SAISIE = [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR];

// --- /api/matieres ---
export const matiereRouter = Router();
matiereRouter.use(protect);

matiereRouter.get('/', restrictTo(...LECTURE), validate({ query: listeMatieresQuerySchema }), matieres.lister);
matiereRouter.get('/:id', restrictTo(...LECTURE), validate({ params: idParamSchema }), matieres.obtenir);
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

/*
 * Le releve de classe porte les moyennes de TOUTES les matieres pour chaque
 * etudiant : il releve du dossier, pas de la saisie. Un professeur n'y a donc
 * pas acces, meme s'il enseigne dans cette classe.
 */
bulletinRouter.get(
  '/classe/:id',
  restrictTo(...DOSSIER_ROLES),
  validate({ params: idParamSchema, query: releveQuerySchema }),
  bulletins.releveClasse
);

/*
 * Bulletin individuel. L'etudiant et le parent y accedent — le controleur
 * verifie le lien exact — mais PAS le professeur : le document expose les notes
 * de toutes les matieres, dont celles de ses collegues.
 */
bulletinRouter.get(
  '/:id',
  restrictTo(...DOSSIER_ROLES, ROLES.ETUDIANT, ROLES.PARENT),
  validate({ params: idParamSchema, query: bulletinQuerySchema }),
  bulletins.bulletinEtudiant
);

export default { matiereRouter, evaluationRouter, bulletinRouter };
