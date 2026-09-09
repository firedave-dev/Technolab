/** En-tete : titre de la page courante, menu utilisateur et deconnexion. */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { NAVIGATION } from '../router/navigation.js';
import { initiales } from '../utils/roles.js';
import BadgeRole from '../components/ui/BadgeRole.jsx';
import ClocheNotifications from '../components/ClocheNotifications.jsx';
import Logo from '../components/Logo.jsx';

export default function BarreSuperieure({ onOuvrirMenu }) {
  const { utilisateur, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const ref = useRef(null);

  // Fermeture du menu au clic exterieur
  useEffect(() => {
    const gerer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOuvert(false);
    };
    document.addEventListener('mousedown', gerer);
    return () => document.removeEventListener('mousedown', gerer);
  }, []);

  const titre =
    NAVIGATION.find((n) => n.chemin === pathname)?.libelle ||
    (pathname === '/profil' ? 'Mon profil' : 'Technolab ISTA');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOuvrirMenu}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* La barre laterale est masquee sur mobile : le logo y porte l'identite. */}
      <Logo variante="clair" hauteur={30} className="lg:hidden" />

      <h1 className="hidden flex-1 truncate text-base font-semibold text-marine lg:block">{titre}</h1>
      <span className="flex-1 lg:hidden" />

      <ClocheNotifications />

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setMenuOuvert((v) => !v)}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
          aria-haspopup="menu"
          aria-expanded={menuOuvert}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ista text-xs font-semibold text-white">
            {initiales(utilisateur?.prenom, utilisateur?.nom)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-marine">{utilisateur?.nomComplet}</span>
            <span className="block text-[11px] text-slate-500">{utilisateur?.roleLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </button>

        {menuOuvert && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-marine">{utilisateur?.nomComplet}</p>
              <p className="truncate text-xs text-slate-500">{utilisateur?.email}</p>
              <BadgeRole role={utilisateur?.role} className="mt-2" />
            </div>

            <Link
              to="/profil"
              onClick={() => setMenuOuvert(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              role="menuitem"
            >
              <User className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Mon profil
            </Link>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-retard hover:bg-red-50"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Se deconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
