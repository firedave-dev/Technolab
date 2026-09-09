/**
 * Vue etudiant / parent : historique des absences et retards, avec leur justification.
 * Un parent choisit d'abord l'enfant concerne.
 */
import { useState } from 'react';
import { CalendarX2, CheckCircle2, Clock, UserX } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import SelecteurEnfant from '../../components/SelecteurEnfant.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAbsencesEtudiant } from '../../hooks/useScolarite.js';
import { useMesEnfants } from '../../hooks/useGestion.js';
import { ROLES } from '../../utils/roles.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function MesAbsences() {
  const { utilisateur } = useAuth();
  const estParent = utilisateur?.role === ROLES.PARENT;

  const [enfant, setEnfant] = useState(null);
  const { data: enfantsData, isLoading: chargementEnfants } = useMesEnfants({ enabled: estParent });
  const enfants = enfantsData?.enfants || [];

  const idEtudiant = estParent ? enfant || enfants[0]?.id : utilisateur?.id;

  const { data, isLoading, isError } = useAbsencesEtudiant(idEtudiant);

  if (estParent && chargementEnfants) return <Chargement />;

  if (estParent && !enfants.length) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide
          icone={UserX}
          titre="Aucun enfant rattache"
          message="Le secretariat doit rattacher votre compte au dossier de votre enfant."
        />
      </div>
    );
  }

  if (isLoading) return <Chargement message="Chargement des absences..." />;

  if (isError) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide titre="Chargement impossible" message="Ces informations n ont pas pu etre recuperees." />
      </div>
    );
  }

  const { absences = [], synthese } = data || {};

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-marine">
          {estParent ? 'Absences de mon enfant' : 'Mes absences'}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Historique des absences et retards, et etat de leur justification.
        </p>
      </header>

      {estParent && <SelecteurEnfant valeur={enfant} onChanger={setEnfant} className="max-w-sm" />}

      {/* Synthese */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Absences', synthese?.absences ?? 0, UserX],
          ['Retards', synthese?.retards ?? 0, Clock],
          ['Non justifiees', synthese?.nonJustifiees ?? 0, CalendarX2],
        ].map(([libelle, valeur, Icone]) => (
          <div key={libelle} className="carte flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Icone className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xl font-semibold text-marine">{valeur}</span>
              <span className="block text-xs text-slate-500">{libelle}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Historique */}
      <div className="carte overflow-hidden">
        {absences.length ? (
          <ul className="divide-y divide-slate-100">
            {absences.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    a.type === 'retard' ? 'bg-alerte-fond text-alerte' : 'bg-retard-fond text-retard'
                  }`}
                >
                  {a.type === 'retard' ? <Clock className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {a.type === 'retard'
                      ? `Retard${a.minutesRetard ? ` de ${a.minutesRetard} min` : ''}`
                      : 'Absence'}
                    <span className="font-normal text-slate-500"> — {dateCourte(a.date)}</span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {a.creneau}
                    {a.matiere ? ` · ${a.matiere.nom}` : ''}
                    {a.motif ? ` · ${a.motif}` : ''}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.justifie ? 'bg-succes-fond text-succes' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {a.justifie && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                  {a.justifie ? 'Justifiee' : 'Non justifiee'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            icone={CheckCircle2}
            titre="Aucune absence"
            message="Aucune absence ni retard n a ete enregistre. Continuez ainsi."
          />
        )}
      </div>

      {synthese?.nonJustifiees > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {synthese.nonJustifiees} absence(s) restent a justifier. Rapprochez-vous de la surveillance
          avec un justificatif.
        </p>
      )}
    </div>
  );
}
