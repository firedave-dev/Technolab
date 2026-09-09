/**
 * Navigation laterale : liens filtres par role, regroupes par section, repliable
 * sur mobile.
 *
 * Zone d'autorite au sens de la charte : fond marine, logo sur aplat marine, texte
 * secondaire en bleu clair — le seul endroit ou ce bleu est autorise.
 *
 * L'etat actif combine trois signaux plutot qu'un seul aplat : un liseré vertical,
 * un fond soutenu et un libelle en gras. Il reste ainsi identifiable meme pour un
 * oeil qui distingue mal le bleu du marine.
 */
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { estDisponible, navigationGroupee } from '../router/navigation.js';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/Logo.jsx';

export default function BarreLaterale({ ouverte, onFermer }) {
  const { role } = useAuth();
  const groupes = navigationGroupee(role);

  const contenu = (
    <div className="sur-marine flex h-full flex-col bg-marine">
      {/* Identite de l'etablissement */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <Logo variante="marine" hauteur={38} className="rounded" />

        <button
          type="button"
          onClick={onFermer}
          className="rounded-md p-1 text-clair-sur-fonce transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
        {groupes.map((groupe, index) => (
          <div key={groupe.cle} className={index > 0 ? 'mt-6' : ''}>
            {groupe.titre && (
              <h2 className="libelle-capitales mb-2 px-3 text-[10px] text-clair-sur-fonce/70">
                {groupe.titre}
              </h2>
            )}

            <ul className="space-y-0.5">
              {groupe.entrees.map(({ chemin, libelle, icone: Icone, phase }) => (
                <li key={chemin}>
                  <NavLink
                    to={chemin}
                    end={chemin === '/'}
                    onClick={onFermer}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-lg py-2.5 pl-4 pr-3 text-sm transition ${
                        isActive
                          ? 'bg-ista font-bold text-white'
                          : 'font-medium text-clair-sur-fonce hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Lisere : troisieme signal d'etat, independant de la couleur du fond */}
                        {isActive && (
                          <span
                            className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-white"
                            aria-hidden="true"
                          />
                        )}

                        <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate">{libelle}</span>

                        {/* Reperage des modules pas encore livres */}
                        {!estDisponible({ phase }) && (
                          <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium">
                            P{phase}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <p className="libelle-capitales shrink-0 border-t border-white/10 px-4 py-3 text-[10px] text-clair-sur-fonce/70">
        Version 1.0
      </p>
    </div>
  );

  return (
    <>
      {/* Mobile : tiroir superpose */}
      <div
        className={`fixed inset-0 z-40 bg-marine/50 transition-opacity lg:hidden ${
          ouverte ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onFermer}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform lg:hidden ${
          ouverte ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {contenu}
      </aside>

      {/* Desktop : colonne fixe */}
      <aside className="hidden w-64 shrink-0 lg:block">{contenu}</aside>
    </>
  );
}
