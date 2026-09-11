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

/**
 * La requete vient-elle d'un autre site que celui qui repond ?
 *
 * Le client et l'API peuvent etre servis par deux domaines distincts — front sur
 * Vercel, API sur Railway. Le navigateur considere alors chaque appel comme
 * « cross-site », et le regime du cookie doit s'y adapter.
 *
 * Absence d'en-tete Origin : requete de meme origine, ou appel hors navigateur
 * (curl, test). On reste dans le cas restrictif, qui est le bon par defaut.
 */
function requeteCroiseLesSites(req) {
  const origine = req?.get?.('origin');
  if (!origine) return false;
  try {
    return new URL(origine).host !== req.get('host');
  } catch {
    return false;
  }
}

/**
 * Attributs du cookie de refresh.
 *
 * Poser et effacer un cookie exigent EXACTEMENT les memes attributs : un
 * `clearCookie` qui n'en reprend pas le `sameSite` ou le `secure` ne supprime
 * rien, et la deconnexion laisse le jeton en place. Les deux operations lisent
 * donc cette fonction unique plutot que deux listes a maintenir en parallele.
 *
 * Le choix de `sameSite` :
 * - `strict` protege le mieux, mais interdit au navigateur de renvoyer le cookie
 *   depuis un autre domaine — la session serait perdue a chaque rechargement sur
 *   un deploiement front/API separe ;
 * - `none` retablit cet envoi, au prix obligatoire du drapeau `secure`, donc de
 *   HTTPS. On ne l'active que la ou les deux conditions sont reunies.
 */
function optionsCookieRefresh(req) {
  const croiseLesSites = env.isProd && requeteCroiseLesSites(req);

  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: croiseLesSites ? 'none' : env.isProd ? 'strict' : 'lax',
    path: '/api/auth',
  };
}

export function poserCookieRefresh(res, token, expiresAt) {
  res.cookie(REFRESH_COOKIE, token, { ...optionsCookieRefresh(res.req), expires: expiresAt });
}

export function effacerCookieRefresh(res) {
  res.clearCookie(REFRESH_COOKIE, optionsCookieRefresh(res.req));
}
