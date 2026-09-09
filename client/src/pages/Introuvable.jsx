/** 404 : route inexistante. */
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Introuvable() {
  const { estConnecte } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-semibold text-slate-300">404</p>
      <h2 className="mt-3 text-xl font-semibold text-marine">Page introuvable</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        La page demandee n existe pas ou a ete deplacee.
      </p>
      <Link
        to={estConnecte ? '/tableau-de-bord' : '/login'}
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {estConnecte ? 'Retour au tableau de bord' : 'Aller a la connexion'}
      </Link>
    </div>
  );
}
