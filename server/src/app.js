/** Construction de l'application Express (sans demarrage du serveur : facilite les tests). */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // requis pour des IP correctes derriere un proxy

  // --- Securite et parsing ---
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true, // indispensable pour le cookie de refresh
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // --- API ---
  app.use('/api', apiLimiter, routes);

  // --- 404 puis gestion centralisee des erreurs ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
