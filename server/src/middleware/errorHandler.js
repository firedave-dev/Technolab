/** Gestion centralisee des erreurs + route 404. */
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route introuvable : ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars -- Express identifie le handler d'erreur par ses 4 arguments
export const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;
  let details = err.details;

  // Erreurs Mongoose traduites en reponses lisibles
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Donnees invalides';
    details = Object.values(err.errors).map((e) => ({ champ: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Identifiant invalide : ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = `Cette valeur existe deja : ${Object.keys(err.keyValue).join(', ')}`;
  }

  if (statusCode >= 500) console.error('[error]', err);

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && env.isProd ? 'Erreur interne du serveur' : message,
    ...(details ? { details } : {}),
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
