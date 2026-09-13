/**
 * Tableau de bord.
 * La charge utile vient de /api/statistiques/mon-tableau : c'est le serveur qui decide
 * des indicateurs auxquels chaque role a droit. L'interface se contente de choisir la
 * mise en forme correspondante.
 */
import { Link } from 'react-router-dom';
import { ArrowRight} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { navigationPourRole } from '../router/navigation.js';
import { useMonTableau } from '../hooks/usePlanning.js';
import BadgeRole from '../components/ui/BadgeRole.jsx';
import EtatVide from '../components/ui/EtatVide.jsx';
import { ADMIN_ROLES, ROLES } from '../utils/roles.js';
import {
  ResumeEtudiant, VueDirection, VueParent, VueProfesseur, VueSecretariat, VueSurveillant,
} from './tableau/vues.jsx';

const dateDuJour = () =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });


/** Choisit la vue correspondant au role, a partir de la charge utile recue. */
function VuePourRole({ role, tableau }) {
  if (ADMIN_ROLES.includes(role)) return <VueDirection tableau={tableau} />;
  if (role === ROLES.SECRETAIRE) return <VueSecretariat tableau={tableau} />;
  if (role === ROLES.PROFESSEUR) return <VueProfesseur tableau={tableau} />;
  if (role === ROLES.SURVEILLANT) return <VueSurveillant tableau={tableau} />;
  if (role === ROLES.ETUDIANT) return <ResumeEtudiant resume={tableau} />;
  if (role === ROLES.PARENT) return <VueParent tableau={tableau} />;
  return null;
}

export default function TableauDeBord() {
  const { utilisateur } = useAuth();
  const role = utilisateur?.role;

  const { data, isLoading, isError } = useMonTableau();
  const modules = navigationPourRole(role).filter((m) => m.chemin !== '/');

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Bandeau d'accueil */}
      <header className="carte p-6 sm:p-8">
        <p className="libelle-capitales text-[10px] text-slate-400">{dateDuJour()}</p>
        <h1 className="titre-page mt-2">Bonjour {utilisateur?.prenom}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BadgeRole role={role} />
          {utilisateur?.matricule && (
            <span className="pastille-neutre">Matricule {utilisateur.matricule}</span>
          )}
        </div>
      </header>

      {/* Indicateurs propres au role */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="carte h-36 animate-pulse bg-slate-50" aria-hidden="true" />
          ))}
        </div>
      ) : isError ? (
        <div className="carte">
          <EtatVide
            titre="Indicateurs indisponibles"
            message="Vos indicateurs n ont pas pu etre recuperes. Les modules ci-dessous restent accessibles."
          />
        </div>
      ) : (
        <VuePourRole role={data.role} tableau={data.tableau} />
      )}

      {/* Modules accessibles au role */}
      <section>
        <h2 className="titre-section mb-4">Vos modules</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const { chemin, libelle, icone: Icone } = module;

            return (
              <Link
                key={chemin}
                to={chemin}
                className="carte-interactive group flex items-start gap-4 p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-ista">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-marine">
                    {libelle}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ista" />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">Ouvrir le module</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

    </div>
  );
}
