/**
 * Controleur d'authentification.
 * Flux : login    -> access token (corps de reponse) + refresh token (cookie httpOnly)
 *        refresh  -> rotation du refresh token et emission d'un nouvel access token
 */
import crypto from 'node:crypto';
import { catchAsync } from '../utils/catchAsync.js';
import { emailReinitialisation } from '../services/email.service.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { ROLE_LABELS } from '../config/roles.js';
import { env } from '../config/env.js';
import {
  REFRESH_COOKIE,
  creerRefreshToken,
  effacerCookieRefresh,
  poserCookieRefresh,
  revoquerRefreshToken,
  revoquerToutesSessions,
  roterRefreshToken,
  signerAccessToken,
} from '../services/token.service.js';

/** Format unique de l'utilisateur renvoye au client. */
const presenter = (user) => ({
  id: user._id,
  matricule: user.matricule,
  nom: user.nom,
  prenom: user.prenom,
  nomComplet: `${user.prenom} ${user.nom}`,
  email: user.email,
  telephone: user.telephone,
  role: user.role,
  roleLabel: ROLE_LABELS[user.role],
  actif: user.actif,
  photoUrl: user.photoUrl,
  derniereConnexion: user.derniereConnexion,
});

/** Emet la paire de jetons et repond au client. */
async function envoyerSession(user, req, res, statusCode = 200) {
  const accessToken = signerAccessToken(user);
  const { token, expiresAt } = await creerRefreshToken(user, req);
  poserCookieRefresh(res, token, expiresAt);

  res.status(statusCode).json({
    success: true,
    accessToken,
    utilisateur: presenter(user),
  });
}

/**
 * POST /api/auth/register
 * Reserve a l'administration (protege par restrictTo au niveau des routes).
 * Il n'y a pas d'inscription libre : les comptes sont crees par l'etablissement.
 */
export const register = catchAsync(async (req, res) => {
  const existe = await User.findOne({ email: req.body.email });
  if (existe) throw ApiError.conflict('Un compte utilise deja cet email');

  const user = await User.create(req.body);
  res.status(201).json({
    success: true,
    message: 'Compte cree avec succes',
    utilisateur: presenter(user),
  });
});

/** POST /api/auth/login */
export const login = catchAsync(async (req, res) => {
  const { email, motDePasse } = req.body;

  const user = await User.findOne({ email }).select('+motDePasse');
  // Message volontairement generique : on ne revele pas si l'email existe en base.
  if (!user || !(await user.verifierMotDePasse(motDePasse))) {
    throw ApiError.unauthorized('Email ou mot de passe incorrect');
  }
  if (!user.actif) throw ApiError.forbidden('Compte desactive, contactez l administration');

  user.derniereConnexion = new Date();
  await user.save({ validateBeforeSave: false });

  await envoyerSession(user, req, res);
});

/** POST /api/auth/refresh — rotation du refresh token */
export const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Session absente, veuillez vous reconnecter');

  const resultat = await roterRefreshToken(token, req);
  if (!resultat) {
    effacerCookieRefresh(res);
    throw ApiError.unauthorized('Session expiree ou invalide');
  }

  poserCookieRefresh(res, resultat.token, resultat.expiresAt);
  res.json({
    success: true,
    accessToken: signerAccessToken(resultat.user),
    utilisateur: presenter(resultat.user),
  });
});

/** POST /api/auth/logout */
export const logout = catchAsync(async (req, res) => {
  await revoquerRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  effacerCookieRefresh(res);
  res.json({ success: true, message: 'Deconnexion reussie' });
});

/** GET /api/auth/me */
export const getMe = catchAsync(async (req, res) => {
  res.json({ success: true, utilisateur: presenter(req.user) });
});

/** PATCH /api/auth/me — mise a jour du profil (email, role et mot de passe exclus) */
export const updateMe = catchAsync(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json({ success: true, message: 'Profil mis a jour', utilisateur: presenter(req.user) });
});

/** PATCH /api/auth/change-password */
export const changePassword = catchAsync(async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;

  const user = await User.findById(req.user._id).select('+motDePasse');
  if (!(await user.verifierMotDePasse(ancienMotDePasse))) {
    throw ApiError.unauthorized('Ancien mot de passe incorrect');
  }

  user.motDePasse = nouveauMotDePasse;
  await user.save();
  await revoquerToutesSessions(user._id); // toutes les autres sessions sont invalidees

  await envoyerSession(user, req, res);
});

/**
 * POST /api/auth/forgot-password
 * Genere un jeton valable 30 minutes et envoie le lien par email.
 * En developpement le jeton est aussi journalise et renvoye, pour faciliter les tests.
 */
export const forgotPassword = catchAsync(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const reponse = {
    success: true,
    message: 'Si un compte existe pour cet email, un lien de reinitialisation a ete envoye',
  };

  // Reponse identique dans tous les cas : pas d'enumeration des comptes existants.
  if (!user || !user.actif) return res.json(reponse);

  const token = user.creerTokenReset(30);
  await user.save({ validateBeforeSave: false });

  const lien = `${env.clientUrl}/reset-password?token=${token}`;

  // L'envoi ne conditionne pas la reponse : le jeton reste valable meme si le
  // serveur de messagerie est indisponible.
  await emailReinitialisation({
    destinataire: user.email,
    prenom: user.prenom,
    lien,
    dureeMinutes: 30,
  });

  if (!env.isProd) {
    console.log(`[auth] Lien de reinitialisation pour ${user.email} : ${lien}`);
    reponse.resetToken = token; // aide au test, jamais expose en production
  }

  res.json(reponse);
});

/** POST /api/auth/reset-password */
export const resetPassword = catchAsync(async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');

  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpire: { $gt: new Date() },
  }).select('+motDePasse +resetTokenHash +resetTokenExpire');

  if (!user) throw ApiError.badRequest('Jeton invalide ou expire');

  user.motDePasse = req.body.motDePasse;
  user.resetTokenHash = undefined;
  user.resetTokenExpire = undefined;
  await user.save();
  await revoquerToutesSessions(user._id);

  await envoyerSession(user, req, res);
});
