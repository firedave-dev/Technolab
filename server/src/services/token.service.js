/**
 * Emission / verification des jetons.
 * - Access token (JWT court) : renvoye dans le corps de la reponse, porte par le header Authorization.
 * - Refresh token (aleatoire, hashe en base) : depose dans un cookie httpOnly, invisible du JavaScript.
 */
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';

export const REFRESH_COOKIE = 'refreshToken';

export function signerAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpires }
  );
}

export function verifierAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

/** Cree une session de rafraichissement et renvoie le token en clair. */
export async function creerRefreshToken(user, req) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresDays * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: RefreshToken.hash(token),
    expiresAt,
    userAgent: req.get('user-agent'),
    ip: req.ip,
  });

  return { token, expiresAt };
}

/** Rotation : le token presente est supprime, un nouveau est emis. */
export async function roterRefreshToken(token, req) {
  const existant = await RefreshToken.findOne({ tokenHash: RefreshToken.hash(token) }).populate('user');
  if (!existant || existant.expiresAt < new Date()) return null;

  await existant.deleteOne();
  if (!existant.user || !existant.user.actif) return null;

  const nouveau = await creerRefreshToken(existant.user, req);
  return { user: existant.user, ...nouveau };
}

export async function revoquerRefreshToken(token) {
  if (!token) return;
  await RefreshToken.deleteOne({ tokenHash: RefreshToken.hash(token) });
}

export async function revoquerToutesSessions(userId) {
  await RefreshToken.deleteMany({ user: userId });
}

export function poserCookieRefresh(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/api/auth',
  });
}

export function effacerCookieRefresh(res) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}
