/**
 * Gabarit des ecrans publics : connexion, mot de passe oublie, reinitialisation.
 * Le logo horizontal fond clair porte l'identite au-dessus de la carte.
 */
import { Outlet } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Seo from '../components/Seo.jsx';

export default function LayoutAuth() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-10">
      <Seo
        titre="Connexion"
        description="Acces a l espace personnel Technolab ISTA."
        indexable={false}
      />

      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo variante="clair" hauteur={52} />
        </div>

        <main className="carte p-6 sm:p-8">
          <Outlet />
        </main>

        <p className="mt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Technolab ISTA — Tous droits reserves
        </p>
      </div>
    </div>
  );
}
