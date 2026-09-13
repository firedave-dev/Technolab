/**
 * Gabarit du site public.
 *
 * Structure semantique HTML5 stricte — `header` / `nav` / `main` / `footer` — :
 * c'est ce qui permet a un moteur de recherche comme a un lecteur d'ecran de
 * distinguer la navigation du contenu.
 *
 * L'en-tete s'adapte a l'etat de session : « Se connecter » pour un visiteur,
 * « Mon espace » pour un utilisateur deja authentifie. Aucune redirection
 * automatique depuis l'accueil : les pages publiques doivent rester atteignables.
 */
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { IDENTITE, RESEAUX, SIGLE } from '../utils/formations.js';

const LIENS = [
  { chemin: '/', libelle: 'Accueil' },
  { chemin: '/formations', libelle: 'Formations' },
  { chemin: '/admissions', libelle: 'Admissions' },
  { chemin: '/a-propos', libelle: 'À propos' },
];

export default function LayoutPublic() {
  const { estConnecte } = useAuth();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const classeLien = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm transition ${
      isActive
        ? 'font-bold text-marine'
        : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-marine'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#contenu-principal" className="lien-evitement">
        Aller au contenu principal
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" aria-label="Technolab ISTA, retour à l’accueil">
            <Logo variante="clair" hauteur={40} />
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {LIENS.map(({ chemin, libelle }) => (
              <NavLink key={chemin} to={chemin} end={chemin === '/'} className={classeLien}>
                {libelle}
              </NavLink>
            ))}
          </nav>

          <Link
            to={estConnecte ? '/tableau-de-bord' : '/login'}
            className="ml-auto hidden rounded-lg bg-ista px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 sm:inline-flex md:ml-0"
          >
            {estConnecte ? 'Mon espace' : 'Se connecter'}
          </Link>

          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            className="rounded-md p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOuvert}
          >
            {menuOuvert ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation repliee sur mobile */}
        {menuOuvert && (
          <nav className="border-t border-slate-200 px-4 py-3 md:hidden" aria-label="Navigation mobile">
            <ul className="space-y-1">
              {LIENS.map(({ chemin, libelle }) => (
                <li key={chemin}>
                  <NavLink
                    to={chemin}
                    end={chemin === '/'}
                    onClick={() => setMenuOuvert(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm ${
                        isActive ? 'bg-brand-50 font-bold text-marine' : 'font-medium text-slate-600'
                      }`
                    }
                  >
                    {libelle}
                  </NavLink>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  to={estConnecte ? '/tableau-de-bord' : '/login'}
                  onClick={() => setMenuOuvert(false)}
                  className="block rounded-lg bg-ista px-3 py-2.5 text-center text-sm font-medium text-white"
                >
                  {estConnecte ? 'Mon espace' : 'Se connecter'}
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="contenu-principal" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>

      <footer className="sur-marine bg-marine">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* --- Identite --- */}
            <div className="lg:col-span-1">
              <Logo variante="marine" hauteur={40} />
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-clair-sur-fonce">
                Institut supérieur privé agréé, formant du DUT au master en sciences de
                gestion, technologies et ingénierie.
              </p>
            </div>

            {/* --- Contact --- */}
            <div>
              <h2 className="libelle-capitales text-[10px] text-clair-sur-fonce/70">Contact</h2>
              <address className="mt-3 space-y-2 text-sm not-italic text-clair-sur-fonce">
                <p>{IDENTITE.boitePostale}</p>
                <p className="text-clair-sur-fonce/80">
                  Enseignement à {IDENTITE.siteEnseignement}
                </p>

                {/*
                  Les numeros sont cliquables : sur un telephone, c'est la
                  difference entre appeler et recopier a la main. `tel:` n'admet
                  ni espace ni separateur, d'ou le nettoyage de l'attribut.
                */}
                <p className="flex flex-wrap gap-x-2">
                  {IDENTITE.telephones.map((numero, rang) => (
                    <span key={numero}>
                      <a
                        href={`tel:${numero.replace(/\s/g, '')}`}
                        className="transition hover:text-white hover:underline"
                      >
                        {numero}
                      </a>
                      {rang < IDENTITE.telephones.length - 1 && (
                        <span className="text-clair-sur-fonce/50"> /</span>
                      )}
                    </span>
                  ))}
                </p>

                <p>
                  <a
                    href={`mailto:${IDENTITE.email}`}
                    className="transition hover:text-white hover:underline"
                  >
                    {IDENTITE.email}
                  </a>
                </p>
              </address>
            </div>

            {/* --- Mentions legales --- */}
            <div>
              <h2 className="libelle-capitales text-[10px] text-clair-sur-fonce/70">
                Mentions légales
              </h2>
              <dl className="mt-3 space-y-2 text-sm text-clair-sur-fonce">
                {[
                  ['Agrément', IDENTITE.agrement],
                  ['Registre du commerce', IDENTITE.registreCommerce],
                  ['N° DNI', IDENTITE.numeroDni],
                ].map(([libelle, valeur]) => (
                  <div key={libelle}>
                    <dt className="text-clair-sur-fonce/70">{libelle}</dt>
                    <dd className="font-medium text-white">{valeur}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* --- Navigation --- */}
            <div>
              <h2 className="libelle-capitales text-[10px] text-clair-sur-fonce/70">Navigation</h2>
              <ul className="mt-3 space-y-2">
                {LIENS.map(({ chemin, libelle }) => (
                  <li key={chemin}>
                    <Link to={chemin} className="text-sm text-clair-sur-fonce transition hover:text-white">
                      {libelle}
                    </Link>
                  </li>
                ))}
                <li className="pt-2">
                  <Link to="/login" className="text-sm text-clair-sur-fonce transition hover:text-white">
                    Espace étudiants et familles
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-sm text-clair-sur-fonce transition hover:text-white">
                    Espace personnel
                  </Link>
                </li>
              </ul>

              {/*
                Profils officiels. `rel="me"` declare que ces comptes appartiennent
                a la meme entite que le site — c'est la contrepartie visible du
                `sameAs` des donnees structurees. `noopener` est de rigueur sur
                toute ouverture dans un nouvel onglet.
              */}
              <h2 className="libelle-capitales mt-6 text-[10px] text-clair-sur-fonce/70">
                Suivez-nous
              </h2>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {RESEAUX.map(({ nom, url }) => (
                  <li key={nom}>
                    <a
                      href={url}
                      rel="me noopener noreferrer"
                      target="_blank"
                      className="text-sm text-clair-sur-fonce transition hover:text-white hover:underline"
                    >
                      {nom}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
            <p className="text-xs text-clair-sur-fonce">
              &copy; {new Date().getFullYear()} {SIGLE} — Tous droits réservés
            </p>
            <p className="libelle-capitales text-[10px] text-clair-sur-fonce/70">
              Institut supérieur privé agréé
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
