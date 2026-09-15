/**
 * Sauvegardes : consultation et declenchement manuel.
 *
 * Reserve a ADMIN_ROLES. La liste des sauvegardes dit quelles donnees existent
 * ailleurs et a quelle date : c'est un renseignement sur la resilience de
 * l'etablissement, pas une information de travail quotidien.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { ADMIN_ROLES } from '../config/roles.js';
import { catchAsync } from '../utils/catchAsync.js';
import { env } from '../config/env.js';
import {
  executerSauvegarde, historiqueSauvegardes, sauvegardeConfiguree,
} from '../services/sauvegarde.service.js';

const router = Router();
router.use(protect, restrictTo(...ADMIN_ROLES));

/** GET /api/sauvegardes — etat du dispositif et dernieres executions. */
router.get('/', catchAsync(async (req, res) => {
  res.json({
    success: true,
    active: sauvegardeConfiguree(),
    heure: env.sauvegarde.heure,
    retention: env.sauvegarde.retention,
    entrees: await historiqueSauvegardes(30),
  });
}));

/** POST /api/sauvegardes — declenchement immediat. */
router.post('/', catchAsync(async (req, res) => {
  const resultat = await executerSauvegarde({ declencheur: 'manuelle' });
  res.status(resultat.statut === 'reussie' ? 200 : 503).json({
    success: resultat.statut === 'reussie',
    message: resultat.statut === 'reussie'
      ? `Sauvegarde effectuee : ${resultat.documents} documents`
      : `Sauvegarde impossible : ${resultat.erreur || resultat.message}`,
    resultat,
  });
}));

export default router;
