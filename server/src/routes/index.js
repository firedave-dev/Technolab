/** Agregation des routes de l'API. Les phases suivantes brancheront ici leurs modules. */
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import studentRoutes from './student.routes.js';
import classeRoutes from './classe.routes.js';
import { bulletinRouter, evaluationRouter, matiereRouter } from './scolarite.routes.js';
import publicRoutes from './public.routes.js';
import ueRoutes from './ue.routes.js';
import noteRoutes from './note.routes.js';
import examenRoutes from './examen.routes.js';
import absenceRoutes from './absence.routes.js';
import notificationRoutes from './notification.routes.js';
import { echeanceRouter, fraisRouter, paiementRouter } from './comptabilite.routes.js';
import { planningRouter, statistiqueRouter } from './planning.routes.js';

const router = Router();

router.get('/health', (req, res) =>
  res.json({ success: true, service: 'Technolab ISTA API', date: new Date().toISOString() })
);

// Documents publics : aucune authentification, volontairement.
router.use('/public', publicRoutes);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/etudiants', studentRoutes);
router.use('/classes', classeRoutes);
router.use('/matieres', matiereRouter);
router.use('/ue', ueRoutes);
router.use('/notes', noteRoutes);
 router.use('/evaluations', evaluationRouter);
router.use('/bulletins', bulletinRouter);
router.use('/examens', examenRoutes);
router.use('/absences', absenceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/frais', fraisRouter);
router.use('/echeances', echeanceRouter);
router.use('/paiements', paiementRouter);
router.use('/planning', planningRouter);
router.use('/statistiques', statistiqueRouter);

export default router;
