/** 403 : l'utilisateur est connecte mais son role ne couvre pas cette page. */
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import BadgeRole from '../components/ui/BadgeRole.jsx';

export default function NonAutorise() {
  const { utilisateur } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldX className="h-7 w-7 text-retard" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-semibold text-marine">Acces refuse</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Votre profil ne dispose pas des droits necessaires pour consulter cette page.
        Contactez l administration si vous pensez qu il s agit d une erreur.
      </p>
      {utilisateur && <BadgeRole role={utilisateur.role} className="mt-4" />}
      <Link
        to="/tableau-de-bord"
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
