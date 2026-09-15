/**
 * Rapports de direction.
 *
 * ADMIN_ROLES seulement. Ces documents agregent les resultats, les impayes et
 * les absences de tout l'etablissement : c'est la matiere d'un conseil
 * d'administration, pas celle d'un poste de travail.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { ADMIN_ROLES } from '../config/roles.js';
import * as rapports from '../controllers/rapport.controller.js';

const router = Router();
router.use(protect, restrictTo(...ADMIN_ROLES));

router.get('/', rapports.catalogue);
router.get('/:cle/pdf', rapports.telecharger);
router.get('/:cle', rapports.consulter);

export default router;
