/** Limitation de debit sur les points sensibles (anti brute-force). */
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const message = { success: false, message: 'Trop de tentatives, reessayez dans quelques minutes' };

// Les suites de tests enchainent des dizaines de connexions : le compteur les fausserait.
const estTest = () => env.nodeEnv === 'test';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 10 : 100, // souple en developpement
  message,
  standardHeaders: true,
  legacyHeaders: false,
  skip: estTest,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message,
  standardHeaders: true,
  legacyHeaders: false,
  skip: estTest,
});
