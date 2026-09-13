/**
 * Vue parent : liste des enfants rattaches a son compte.
 * Chaque carte ouvre le dossier de l'enfant ; les modules Notes, Absences et Paiements
 * viendront s'y greffer aux phases suivantes.
 */
import { Link } from 'react-router-dom';
import { ChevronRight, UserSquare2 } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import BadgeStatut from '../../components/ui/BadgeStatut.jsx';
import { useMesEnfants } from '../../hooks/useGestion.js';
import { initiales } from '../../utils/roles.js';

export default function MesEnfants() {
  const { data, isLoading, isError } = useMesEnfants();

  if (isLoading) return <Chargement message="Chargement de vos enfants..." />;

  if (isError) {
    return (
      <EtatVide
        titre="Chargement impossible"
        message="Vos informations n ont pas pu etre recuperees. Reessayez dans un instant."
      />
    );
  }

  const enfants = data?.enfants || [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-marine">Mes enfants</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Suivez la scolarite des etudiants rattaches a votre compte.
        </p>
      </header>

      {enfants.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {enfants.map((enfant) => (
            <Link
              key={enfant.id}
              to={`/mes-enfants/${enfant.id}`}
              className="carte group flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {initiales(enfant.prenom, enfant.nom)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{enfant.nomComplet}</p>
                <p className="truncate text-xs text-slate-500">
                  {enfant.infosEtudiant?.classe?.nom || 'Non affecte a une classe'}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <BadgeStatut statut={enfant.infosEtudiant?.statut} />
                  {enfant.matricule && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {enfant.matricule}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight
                className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="carte">
          <EtatVide
            icone={UserSquare2}
            titre="Aucun enfant rattache"
            message="Le secretariat doit rattacher votre compte au dossier de votre enfant. Contactez-le pour effectuer la liaison."
          />
        </div>
      )}
    </div>
  );
}
