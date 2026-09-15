/**
 * Journal des actions : consultation reservee a la direction.
 *
 * ADMIN_ROLES et non STAFF_ROLES : savoir qui a saisi quelle note, qui a
 * encaisse quel paiement et qui s'est connecte quand releve du pilotage de
 * l'etablissement, pas du travail quotidien. Ouvrir ce registre au secretariat
 * ou aux enseignants reviendrait a mettre tout le monde sous la surveillance de
 * tout le monde.
 */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { ADMIN_ROLES } from '../config/roles.js';
import * as journal from '../controllers/journal.controller.js';

const router = Router();

router.use(protect, restrictTo(...ADMIN_ROLES));

router.get('/', journal.lister);
router.get('/domaines', journal.domaines);

export default router;
