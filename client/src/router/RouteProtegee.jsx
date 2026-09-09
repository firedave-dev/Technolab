/**
 * Garde de route.
 * - Non connecte  -> redirection vers /login (l'URL demandee est memorisee).
 * - Role interdit -> page 403.
 * Rappel : cette protection est cosmetique, l'autorisation reelle est faite par l'API.
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Chargement from '../components/ui/Chargement.jsx';

export default function RouteProtegee({ roles }) {
  const { estConnecte, chargement, role } = useAuth();
  const location = useLocation();

  if (chargement) return <Chargement message="Verification de la session..." />;

  if (!estConnecte) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to="/non-autorise" replace />;
  }

  return <Outlet />;
}

/** Empeche un utilisateur deja connecte de revenir sur /login. */
export function RoutePublique() {
  const { estConnecte, chargement } = useAuth();
  if (chargement) return <Chargement />;
  return estConnecte ? <Navigate to="/tableau-de-bord" replace /> : <Outlet />;
}
