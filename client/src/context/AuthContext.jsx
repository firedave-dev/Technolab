/**
 * Contexte d'authentification : source unique de l'utilisateur connecte.
 * Au montage, une tentative de refresh silencieux restaure la session (cookie httpOnly).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.api.js';
import { setAccessToken, setOnSessionExpiree } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [chargement, setChargement] = useState(true); // vrai tant que la session n'est pas resolue

  // Deconnexion forcee declenchee par l'intercepteur axios (refresh impossible)
  useEffect(() => {
    setOnSessionExpiree(() => {
      setUtilisateur(null);
      setAccessToken(null);
    });
  }, []);

  // Restauration de session au chargement de l'application
  useEffect(() => {
    let annule = false;

    (async () => {
      try {
        const { accessToken, utilisateur: u } = await authApi.refresh();
        if (annule) return;
        setAccessToken(accessToken);
        setUtilisateur(u);
      } catch {
        if (!annule) setUtilisateur(null); // aucune session valide : ecran de connexion
      } finally {
        if (!annule) setChargement(false);
      }
    })();

    return () => { annule = true; };
  }, []);

  const login = useCallback(async (identifiants) => {
    const { accessToken, utilisateur: u } = await authApi.login(identifiants);
    setAccessToken(accessToken);
    setUtilisateur(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Meme si l'appel echoue, on nettoie l'etat local.
    }
    setAccessToken(null);
    setUtilisateur(null);
    toast.success('Vous etes deconnecte');
  }, []);

  /** Applique une session renvoyee par le serveur (changement / reinitialisation de mot de passe). */
  const appliquerSession = useCallback(({ accessToken, utilisateur: u }) => {
    setAccessToken(accessToken);
    setUtilisateur(u);
  }, []);

  const valeur = useMemo(
    () => ({
      utilisateur,
      chargement,
      estConnecte: Boolean(utilisateur),
      role: utilisateur?.role ?? null,
      aRole: (...roles) => roles.flat().includes(utilisateur?.role),
      login,
      logout,
      appliquerSession,
      setUtilisateur,
    }),
    [utilisateur, chargement, login, logout, appliquerSession]
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit etre utilise dans un AuthProvider');
  return ctx;
}
