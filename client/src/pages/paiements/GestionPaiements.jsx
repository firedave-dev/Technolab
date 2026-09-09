/**
 * Module comptable pour le personnel de caisse : synthese, journal des paiements,
 * echeanciers etudiants et grille tarifaire.
 */
import { useState } from 'react';
import { AlertTriangle, Clock, TrendingUp, Wallet } from 'lucide-react';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import ListePaiements from './ListePaiements.jsx';
import Echeanciers from './Echeanciers.jsx';
import GrilleTarifaire from './GrilleTarifaire.jsx';
import { useClasses } from '../../hooks/useGestion.js';
import { useStatistiquesComptables } from '../../hooks/useComptabilite.js';
import { formaterMontant } from '../../utils/montant.js';

const ONGLETS = [
  ['paiements', 'Paiements'],
  ['echeanciers', 'Echeanciers'],
  ['tarifs', 'Grille tarifaire'],
];

/** Vignette de synthese comptable. */
function Indicateur({ icone: Icone, libelle, valeur, detail, accent = 'text-slate-900' }) {
  return (
    <div className="carte flex items-start gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icone className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className={`block truncate text-lg font-semibold ${accent}`}>{valeur}</span>
        <span className="block truncate text-xs text-slate-500">{libelle}</span>
        {detail && <span className="mt-0.5 block truncate text-[11px] text-slate-400">{detail}</span>}
      </span>
    </div>
  );
}

export default function GestionPaiements() {
  const [onglet, setOnglet] = useState('paiements');
  const [classe, setClasse] = useState('');

  const { data: classesData } = useClasses();
  const { data } = useStatistiquesComptables({ classe: classe || undefined });
  const stats = data?.statistiques;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marine">Comptabilite</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Frais, echeanciers, encaissements et reçus.
          </p>
        </div>

        <ChampSelect
          placeholder="Tout l etablissement"
          className="w-full sm:w-56"
          options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          aria-label="Restreindre la synthese a une classe"
        />
      </header>

      {/* Synthese */}
      {stats && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicateur
            icone={Wallet}
            libelle="Attendu sur l annee"
            valeur={formaterMontant(stats.attendu)}
            detail={`${stats.echeances} echeance(s)`}
          />
          <Indicateur
            icone={TrendingUp}
            libelle="Encaisse"
            valeur={formaterMontant(stats.encaisse)}
            detail={stats.tauxRecouvrement === null ? undefined : `${stats.tauxRecouvrement} % de recouvrement`}
            accent="text-succes"
          />
          <Indicateur
            icone={AlertTriangle}
            libelle="Impayes en retard"
            valeur={formaterMontant(stats.retards.montant)}
            detail={`${stats.retards.lignes} echeance(s) depassee(s)`}
            accent={stats.retards.montant > 0 ? 'text-retard' : 'text-slate-900'}
          />
          <Indicateur
            icone={Clock}
            libelle="En attente de validation"
            valeur={formaterMontant(stats.paiementsEnAttente.montant)}
            detail={`${stats.paiementsEnAttente.nombre} paiement(s)`}
            accent={stats.paiementsEnAttente.nombre > 0 ? 'text-alerte' : 'text-slate-900'}
          />
        </section>
      )}

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {ONGLETS.map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => setOnglet(cle)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
              onglet === cle
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === 'paiements' && <ListePaiements />}
      {onglet === 'echeanciers' && <Echeanciers />}
      {onglet === 'tarifs' && <GrilleTarifaire />}
    </div>
  );
}
