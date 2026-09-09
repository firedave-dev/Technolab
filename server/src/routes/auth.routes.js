/** Routes d'authentification : /api/auth */
import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { ADMIN_ROLES } from '../config/roles.js';
import * as auth from '../controllers/auth.controller.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateMeSchema,
} from '../validations/auth.validation.js';

const router = Router();

// --- Routes publiques (limitees en debit pour contrer le brute-force) ---
router.post('/login', authLimiter, validate({ body: loginSchema }), auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), auth.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), auth.resetPassword);

// --- Routes authentifiees ---
router.get('/me', protect, auth.getMe);
router.patch('/me', protect, validate({ body: updateMeSchema }), auth.updateMe);
router.patch('/change-password', protect, validate({ body: changePasswordSchema }), auth.changePassword);

// --- Creation de comptes : administration uniquement ---
router.post(
  '/register',
  protect,
  restrictTo(...ADMIN_ROLES),
  validate({ body: registerSchema }),
  auth.register
);

export default router;
