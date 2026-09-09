/**
 * Journal des encaissements : filtres, validation par la direction, reçu PDF.
 * Les paiements en attente sont mis en avant : ce sont eux qui bloquent les soldes.
 */
import { useState } from 'react';
import { Ban, CheckCircle2, FileText, Receipt } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClasses } from '../../hooks/useGestion.js';
import {
  useAnnulerPaiement,
  useOuvrirRecu,
  usePaiements,
  useValiderPaiement,
} from '../../hooks/useComptabilite.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ADMIN_ROLES } from '../../utils/roles.js';
import {
  COULEUR_STATUT_PAIEMENT,
  MODES_PAIEMENT,
  STATUTS_PAIEMENT,
  formaterMontant,
  libelleMode,
  libelleStatutPaiement,
} from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function ListePaiements() {
  const { utilisateur } = useAuth();
  const peutValider = ADMIN_ROLES.includes(utilisateur?.role);

  const [recherche, setRecherche] = useState('');
  const [classe, setClasse] = useState('');
  const [statut, setStatut] = useState('');
  const [mode, setMode] = useState('');
  const [du, setDu] = useState('');
  const [page, setPage] = useState(1);
  const [aAnnuler, setAAnnuler] = useState(null);
  const [motif, setMotif] = useState('');

  const q = useDebounce(recherche);
  const { data: classesData } = useClasses();
  const { data, isLoading, isError } = usePaiements({
    q: q || undefined,
    classe: classe || undefined,
    statut: statut || undefined,
    mode: mode || undefined,
    du: du || undefined,
    page,
    limite: 30,
  });

  const valider = useValiderPaiement();
  const annuler = useAnnulerPaiement();
  const recu = useOuvrirRecu();

  const changerFiltre = (setter) => (valeur) => {
    setter(valeur);
    setPage(1);
  };

  const colonnes = [
    {
      cle: 'numeroRecu',
      libelle: 'Reçu',
      rendu: (p) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-slate-800">{p.numeroRecu}</p>
          <p className="truncate text-xs text-slate-500">{dateCourte(p.datePaiement)}</p>
        </div>
      ),
    },
    {
      cle: 'etudiant',
      libelle: 'Etudiant',
      rendu: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">
            {p.etudiant?.prenom} {p.etudiant?.nom}
          </p>
          <p className="truncate text-xs text-slate-500">
            {p.echeance?.libelle || 'Versement libre'}
          </p>
        </div>
      ),
    },
    {
      cle: 'montant',
      libelle: 'Montant',
      rendu: (p) => <span className="font-semibold text-slate-900">{formaterMontant(p.montant)}</span>,
    },
    { cle: 'mode', libelle: 'Mode', masquerMobile: true, rendu: (p) => libelleMode(p.mode) },
    {
      cle: 'statut',
      libelle: 'Statut',
      rendu: (p) => (
        <div className="min-w-0">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_PAIEMENT[p.statut]}`}
          >
            {libelleStatutPaiement(p.statut)}
          </span>
          {p.motifAnnulation && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{p.motifAnnulation}</p>
          )}
        </div>
      ),
    },
    {
      cle: 'actions',
      libelle: '',
      classe: 'text-right',
      rendu: (p) => {
        const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              className={bouton}
              title="Ouvrir le reçu PDF"
              onClick={() => recu.mutate({ id: p.id, numeroRecu: p.numeroRecu })}
            >
              <FileText className="h-4 w-4" />
            </button>

            {peutValider && p.statut === 'en_attente' && (
              <button
                type="button"
                className={bouton}
                title="Valider le paiement"
                onClick={() => valider.mutate(p.id)}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </button>
            )}

            {peutValider && p.statut !== 'annule' && (
              <button
                type="button"
                className={`${bouton} hover:text-retard`}
                title="Annuler le paiement"
                onClick={() => {
                  setAAnnuler(p);
                  setMotif('');
                }}
              >
                <Ban className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const enAttente = (data?.paiements || []).filter((p) => p.statut === 'en_attente').length;

  return (
    <div className="space-y-4">
      {peutValider && enAttente > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {enAttente} paiement(s) de cette page attendent votre validation : ils ne sont pas encore
          imputés sur les soldes.
        </p>
      )}

      {/* Filtres */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <BarreRecherche
          valeur={recherche}
          onChanger={changerFiltre(setRecherche)}
          placeholder="Numero de reçu..."
        />
        <ChampSelect
          placeholder="Toutes les classes"
          options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
          value={classe}
          onChange={(e) => changerFiltre(setClasse)(e.target.value)}
          aria-label="Filtrer par classe"
        />
        <ChampSelect
          placeholder="Tous les statuts"
          options={STATUTS_PAIEMENT}
          value={statut}
          onChange={(e) => changerFiltre(setStatut)(e.target.value)}
          aria-label="Filtrer par statut"
        />
        <ChampSelect
          placeholder="Tous les modes"
          options={MODES_PAIEMENT}
          value={mode}
          onChange={(e) => changerFiltre(setMode)(e.target.value)}
          aria-label="Filtrer par mode"
        />
        <ChampTexte
          type="date"
          value={du}
          onChange={(e) => changerFiltre(setDu)(e.target.value)}
          aria-label="Paiements a partir du"
        />
      </div>

      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="Le journal des paiements n a pas pu etre recupere." />
        ) : (
          <>
            {data?.totalEncaisse > 0 && (
              <p className="border-b border-slate-100 px-4 py-2.5 text-sm text-slate-600">
                Total encaissé (filtres appliqués) :{' '}
                <strong className="text-slate-900">{formaterMontant(data.totalEncaisse)}</strong>
              </p>
            )}

            <Tableau
              colonnes={colonnes}
              donnees={data?.paiements || []}
              chargement={isLoading}
              vide={
                <EtatVide
                  icone={Receipt}
                  titre="Aucun paiement"
                  message="Aucun encaissement ne correspond a ces criteres."
                />
              }
            />
            <Pagination pagination={data?.pagination} onChangerPage={setPage} />
          </>
        )}
      </div>

      {/* Annulation : le motif est obligatoire, il figure sur le reçu */}
      <Modale
        ouverte={Boolean(aAnnuler)}
        onFermer={() => setAAnnuler(null)}
        titre="Annuler ce paiement ?"
        description={aAnnuler ? `${aAnnuler.numeroRecu} — ${formaterMontant(aAnnuler.montant)}` : undefined}
        largeur="sm"
        pied={
          <>
            <Bouton variante="secondaire" onClick={() => setAAnnuler(null)}>
              Retour
            </Bouton>
            <Bouton
              variante="danger"
              chargement={annuler.isPending}
              disabled={motif.trim().length < 3}
              onClick={async () => {
                await annuler.mutateAsync({ id: aAnnuler.id, motif });
                setAAnnuler(null);
              }}
            >
              Annuler le paiement
            </Bouton>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Le paiement est conservé dans le journal pour la piste d audit, mais il est retiré du
          solde de l étudiant. Le motif figure sur le reçu.
        </p>
        <ChampTexte
          label="Motif de l annulation"
          className="mt-4"
          placeholder="Cheque sans provision, erreur de saisie..."
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
        />
      </Modale>
    </div>
  );
}
