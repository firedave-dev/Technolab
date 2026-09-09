/** Notifications internes : /api/notifications */
import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/notification.controller.js';
import { idParamSchema, listeNotificationsQuerySchema } from '../validations/scolarite.validation.js';

const router = Router();
router.use(protect); // chacun ne voit que ses propres notifications

router.get('/', validate({ query: listeNotificationsQuerySchema }), ctrl.lister);
router.patch('/lecture', ctrl.toutMarquerLu);
router.patch('/:id/lecture', validate({ params: idParamSchema }), ctrl.marquerLue);

export default router;
