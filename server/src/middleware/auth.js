/**
 * Protection des routes : authentification JWT puis controle des roles (RBAC).
 */
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { User } from '../models/User.js';
import { verifierAccessToken } from '../services/token.service.js';

/** Verifie le jeton d'acces et attache l'utilisateur courant a req.user. */
export const protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Aucun jeton fourni, veuillez vous connecter');

  let payload;
  try {
    payload = verifierAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized(
      err.name === 'TokenExpiredError' ? 'Session expiree' : 'Jeton invalide'
    );
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("Cet utilisateur n'existe plus");
  if (!user.actif) throw ApiError.forbidden('Compte desactive, contactez l administration');
  if (user.motDePasseChangeApres(payload.iat)) {
    throw ApiError.unauthorized('Mot de passe modifie recemment, reconnectez-vous');
  }

  req.user = user;
  next();
});

/**
 * Restreint l'acces a une liste de roles.
 * Usage : router.get('/x', protect, restrictTo(ROLES.ADMIN, ROLES.DIRECTEUR), handler)
 */
export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden("Votre role ne permet pas d'acceder a cette ressource"));
  }
  next();
};
