/**
 * Routes comptables : grille tarifaire, echeanciers et paiements.
 * Regle generale — la direction et le secretariat encaissent, seule la direction
 * valide les paiements et definit les tarifs.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import * as compta from '../controllers/comptabilite.controller.js';
import * as paiements from '../controllers/paiement.controller.js';
import {
  annulerPaiementSchema,
  creerFraisSchema,
  creerPaiementSchema,
  genererClasseSchema,
  genererEcheancierSchema,
  idParamSchema,
  listeEcheancesQuerySchema,
  listeFraisQuerySchema,
  listePaiementsQuerySchema,
  majEcheanceSchema,
  majFraisSchema,
  soldeQuerySchema,
  statistiquesQuerySchema,
  verificationRecuSchema,
} from '../validations/comptabilite.validation.js';

// Profils habilites a encaisser et a gerer les echeanciers.
const CAISSE = [...ADMIN_ROLES, ROLES.SECRETAIRE];

// --- /api/frais : grille tarifaire ---
export const fraisRouter = Router();
fraisRouter.use(protect);

fraisRouter.get('/', restrictTo(...STAFF_ROLES), validate({ query: listeFraisQuerySchema }), compta.listerFrais);
fraisRouter.post('/', restrictTo(...ADMIN_ROLES), validate({ body: creerFraisSchema }), compta.creerFrais);
fraisRouter.patch('/:id', restrictTo(...ADMIN_ROLES), validate({ params: idParamSchema, body: majFraisSchema }), compta.modifierFrais);
fraisRouter.delete('/:id', restrictTo(...ADMIN_ROLES), validate({ params: idParamSchema }), compta.supprimerFrais);

// --- /api/echeances : echeanciers ---
export const echeanceRouter = Router();
echeanceRouter.use(protect);

echeanceRouter.get('/statistiques', restrictTo(...CAISSE), validate({ query: statistiquesQuerySchema }), compta.statistiques);

// Consultation ouverte : le controleur restreint etudiants et parents a leur perimetre.
echeanceRouter.get('/', validate({ query: listeEcheancesQuerySchema }), compta.listerEcheances);
echeanceRouter.get('/solde/:id', validate({ params: idParamSchema, query: soldeQuerySchema }), compta.solde);
echeanceRouter.get('/etudiant/:id', validate({ params: idParamSchema, query: soldeQuerySchema }), compta.echeancierEtudiant);

echeanceRouter.post('/classe', restrictTo(...CAISSE), validate({ body: genererClasseSchema }), compta.genererPourClasse);
echeanceRouter.post(
  '/etudiant/:id',
  restrictTo(...CAISSE),
  validate({ params: idParamSchema, body: genererEcheancierSchema }),
  compta.genererPourEtudiant
);
echeanceRouter.patch('/:id', restrictTo(...ADMIN_ROLES), validate({ params: idParamSchema, body: majEcheanceSchema }), compta.modifierEcheance);

// --- /api/paiements ---
export const paiementRouter = Router();

/*
 * Verification publique d'un recu (cible du QR code imprime). Declaree AVANT
 * `protect` : elle doit rester atteignable sans compte, sinon le QR ne servirait
 * qu'aux personnes deja connectees. La limite de debit generale de l'API s'y applique.
 */
paiementRouter.get(
  '/verification/:numeroRecu',
  validate({ params: verificationRecuSchema }),
  paiements.verifierRecu
);

paiementRouter.use(protect);

paiementRouter.get('/', validate({ query: listePaiementsQuerySchema }), paiements.lister);
paiementRouter.get('/:id', validate({ params: idParamSchema }), paiements.obtenir);
paiementRouter.get('/:id/recu', validate({ params: idParamSchema }), paiements.recu);

paiementRouter.post('/', restrictTo(...CAISSE), validate({ body: creerPaiementSchema }), paiements.creer);
paiementRouter.patch('/:id/validation', restrictTo(...ADMIN_ROLES), validate({ params: idParamSchema }), paiements.valider);
paiementRouter.patch(
  '/:id/annulation',
  restrictTo(...ADMIN_ROLES),
  validate({ params: idParamSchema, body: annulerPaiementSchema }),
  paiements.annuler
);

export default { fraisRouter, echeanceRouter, paiementRouter };
