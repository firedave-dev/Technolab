/**
 * Vue etudiant / parent : echeancier, solde et reçus telechargeables.
 * Un parent choisit d'abord l'enfant concerne.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Wallet } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import SelecteurEnfant from '../../components/SelecteurEnfant.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMesEnfants } from '../../hooks/useGestion.js';
import { useEcheancierEtudiant, useOuvrirRecu } from '../../hooks/useComptabilite.js';
import { ROLES } from '../../utils/roles.js';
import {
  COULEUR_STATUT_ECHEANCE,
  formaterMontant,
  libelleMode,
  libelleStatutEcheance,
} from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function MesPaiements() {
  const { utilisateur } = useAuth();
  const estParent = utilisateur?.role === ROLES.PARENT;

  const [enfant, setEnfant] = useState(null);
  const { data: enfantsData, isLoading: chargementEnfants } = useMesEnfants({ enabled: estParent });
  const enfants = enfantsData?.enfants || [];

  const idEtudiant = estParent ? enfant || enfants[0]?.id : utilisateur?.id;
  const { data, isLoading, isError } = useEcheancierEtudiant(idEtudiant);
  const recu = useOuvrirRecu();

  if (estParent && chargementEnfants) return <Chargement />;

  if (estParent && !enfants.length) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide
          icone={Wallet}
          titre="Aucun enfant rattache"
          message="Le secretariat doit rattacher votre compte au dossier de votre enfant."
        />
      </div>
    );
  }

  if (isLoading) return <Chargement message="Chargement de votre situation..." />;

  if (isError || !data) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide titre="Chargement impossible" message="Ces informations n ont pas pu etre recuperees." />
      </div>
    );
  }

  const { echeances = [], paiements = [], solde } = data;
  const aJour = solde.reste === 0 && solde.total > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-marine">
          {estParent ? 'Frais de scolarite' : 'Mes paiements'}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Echeancier, reglements effectues et reçus a telecharger.
        </p>
      </header>

      {estParent && <SelecteurEnfant valeur={enfant} onChanger={setEnfant} className="max-w-sm" />}

      {/* Solde */}
      <section className="carte p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Total du', formaterMontant(solde.total), 'text-slate-900'],
            ['Deja regle', formaterMontant(solde.paye), 'text-succes'],
            ['Reste a payer', formaterMontant(solde.reste), solde.reste > 0 ? 'text-retard' : 'text-succes'],
            ['Avancement', solde.tauxReglement === null ? '—' : `${solde.tauxReglement} %`, 'text-slate-900'],
          ].map(([libelle, valeur, couleur]) => (
            <div key={libelle} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{libelle}</p>
              <p className={`mt-0.5 text-sm font-semibold ${couleur}`}>{valeur}</p>
            </div>
          ))}
        </div>

        {/* Barre d'avancement */}
        {solde.total > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all ${aJour ? 'bg-emerald-500' : 'bg-brand-500'}`}
              style={{ width: `${Math.min(100, solde.tauxReglement || 0)}%` }}
            />
          </div>
        )}

        {solde.echeancesEnRetard > 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {solde.echeancesEnRetard} echeance(s) en retard, soit{' '}
              {formaterMontant(solde.montantEnRetard)}. Rapprochez-vous du secretariat.
            </span>
          </p>
        ) : aJour ? (
          <p className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-succes">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Scolarite entierement reglee. Merci.
          </p>
        ) : null}
      </section>

      {/* Echeancier */}
      <section className="carte overflow-hidden">
        <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-marine">
          Echeancier
        </h3>

        {echeances.length ? (
          <ul className="divide-y divide-slate-100">
            {echeances.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{e.libelle}</p>
                  <p className="truncate text-xs text-slate-500">
                    Echue le {dateCourte(e.dateEcheance)}
                    {e.enRetard && <span className="ml-1 font-medium text-retard">· en retard</span>}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formaterMontant(e.montant)}</p>
                  {e.reste > 0 && e.montantPaye > 0 && (
                    <p className="text-xs text-slate-500">reste {formaterMontant(e.reste)}</p>
                  )}
                </div>

                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_ECHEANCE[e.statut]}`}
                >
                  {libelleStatutEcheance(e.statut)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            icone={Wallet}
            titre="Aucune echeance"
            message="Votre echeancier n a pas encore ete etabli par le secretariat."
          />
        )}
      </section>

      {/* Reçus */}
      <section className="carte overflow-hidden">
        <h3 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-marine">
          Reçus de paiement
        </h3>

        {paiements.length ? (
          <ul className="divide-y divide-slate-100">
            {paiements.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {formaterMontant(p.montant)}
                    <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                      {p.numeroRecu}
                    </span>
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {dateCourte(p.datePaiement)} · {libelleMode(p.mode)}
                  </p>
                </div>

                {p.statut === 'en_attente' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-alerte">
                    En attente
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => recu.mutate({ id: p.id, numeroRecu: p.numeroRecu })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Reçu PDF
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            icone={FileText}
            titre="Aucun paiement"
            message="Aucun reglement n a encore ete enregistre."
          />
        )}
      </section>
    </div>
  );
}
