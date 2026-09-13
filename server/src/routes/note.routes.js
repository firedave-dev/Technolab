/**
 * Routes de saisie des notes de matiere.
 *
 * La restriction fine — un professeur n'ecrit que sur SES matieres — est portee
 * par `verifierAccesMatiere` dans le controleur : elle depend de la matiere
 * visee, que le middleware de route ne connait pas encore.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES } from '../config/roles.js';
import * as notes from '../controllers/noteMatiere.controller.js';
import {
  enregistrerGrilleSchema,
  grilleQuerySchema,
  publicationSchema,
} from '../validations/note.validation.js';

/*
 * Deux perimetres distincts, et la difference est voulue.
 *
 * SAISIE porte les notes : c'est l'affaire du professeur et de la direction. Le
 * surveillant n'y figure pas — il suit l'assiduite, il ne note pas.
 *
 * IMPRESSION couvre la seule liste d'emargement, un document vierge a remplir
 * au stylo. Le surveillant l'edite pour la distribuer : la feuille ne porte
 * aucune note, il n'y a donc rien a divulguer.
 */
const SAISIE = [...ADMIN_ROLES, ROLES.PROFESSEUR];
const IMPRESSION = [...ADMIN_ROLES, ROLES.SURVEILLANT, ROLES.PROFESSEUR];

const router = Router();
router.use(protect, restrictTo(...IMPRESSION));

router.get('/mes-enseignements', restrictTo(...IMPRESSION), notes.mesEnseignements);
router.get('/grille', restrictTo(...SAISIE), validate({ query: grilleQuerySchema }), notes.grille);

/*
 * Liste d'emargement : document papier remis au professeur pour corriger au
 * stylo. Meme perimetre que la grille — le titulaire pour ses matieres, la
 * direction et le surveillant pour toutes.
 */
router.get('/emargement', restrictTo(...IMPRESSION), validate({ query: grilleQuerySchema }), notes.emargement);
router.put('/grille', restrictTo(...SAISIE), validate({ body: enregistrerGrilleSchema }), notes.enregistrerGrille);
router.patch('/publication', restrictTo(...SAISIE), validate({ body: publicationSchema }), notes.basculerPublication);

export default router;
