/**
 * Client HTTP unique de l'application.
 * - L'access token vit en memoire (pas dans localStorage : reduit la surface XSS).
 * - Le refresh token est un cookie httpOnly gere par le navigateur.
 * - En cas de 401, une seule requete de refresh est lancee et les appels en attente sont rejoues.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // envoie le cookie de refresh
});

let accessToken = null;
let onSessionExpiree = () => {};

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const setOnSessionExpiree = (cb) => { onSessionExpiree = cb; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// --- Rafraichissement automatique de la session ---
let refreshEnCours = null;
const ROUTES_SANS_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requete = error.config;
    const estAuth = ROUTES_SANS_REFRESH.some((r) => requete?.url?.includes(r));

    if (error.response?.status === 401 && requete && !requete._rejouee && !estAuth) {
      requete._rejouee = true;
      try {
        // Une seule requete de refresh, meme si plusieurs appels echouent en meme temps.
        refreshEnCours ??= api
          .post('/auth/refresh')
          .then((res) => res.data.accessToken)
          .finally(() => { refreshEnCours = null; });

        const nouveauToken = await refreshEnCours;
        setAccessToken(nouveauToken);
        requete.headers.Authorization = `Bearer ${nouveauToken}`;
        return api(requete);
      } catch {
        setAccessToken(null);
        onSessionExpiree();
      }
    }

    return Promise.reject(error);
  }
);

/** Extrait un message lisible depuis une erreur axios. */
export const messageErreur = (error, defaut = 'Une erreur est survenue') =>
  error?.response?.data?.message || error?.message || defaut;

export default api;
