/** Grille tarifaire : frais applicables par classe et par annee scolaire. */
import { useState } from 'react';
import { Coins, Pencil, Plus, Trash2 } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulaireFrais from './FormulaireFrais.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClasses } from '../../hooks/useGestion.js';
import { useFrais, useSupprimerFrais } from '../../hooks/useComptabilite.js';
import { ADMIN_ROLES } from '../../utils/roles.js';
import { TYPES_FRAIS, formaterMontant, libelleTypeFrais } from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function GrilleTarifaire() {
  const { utilisateur } = useAuth();
  const peutGerer = ADMIN_ROLES.includes(utilisateur?.role);

  const [classe, setClasse] = useState('');
  const [type, setType] = useState('');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  const { data: classesData } = useClasses();
  const { data, isLoading, isError } = useFrais({ classe: classe || undefined, type: type || undefined });
  const supprimer = useSupprimerFrais();

  const frais = data?.frais || [];
  const totalParClasse = frais.reduce((somme, f) => somme + f.montant, 0);

  const colonnes = [
    {
      cle: 'libelle',
      libelle: 'Frais',
      rendu: (f) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{f.libelle}</p>
          <p className="truncate text-xs text-slate-500">
            {libelleTypeFrais(f.type)}
            {f.obligatoire ? '' : ' · facultatif'}
            {f.actif ? '' : ' · desactive'}
          </p>
        </div>
      ),
    },
    { cle: 'classe', libelle: 'Classe', rendu: (f) => f.classe?.nom || '—' },
    {
      cle: 'montant',
      libelle: 'Montant',
      rendu: (f) => <span className="font-semibold text-slate-900">{formaterMontant(f.montant)}</span>,
    },
    {
      cle: 'nombreTranches',
      libelle: 'Echeancier',
      masquerMobile: true,
      rendu: (f) => (
        <span className="text-sm text-slate-600">
          {f.nombreTranches > 1
            ? `${f.nombreTranches} tranches / ${f.intervalleMois} mois`
            : 'Paiement unique'}
          <span className="block text-xs text-slate-400">a partir du {dateCourte(f.premiereEcheance)}</span>
        </span>
      ),
    },
    { cle: 'anneeScolaire', libelle: 'Annee', masquerMobile: true },
    ...(peutGerer
      ? [
          {
            cle: 'actions',
            libelle: '',
            classe: 'text-right',
            rendu: (f) => {
              const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
              return (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className={bouton}
                    title="Modifier"
                    onClick={() => {
                      setEnEdition(f);
                      setFormulaireOuvert(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`${bouton} hover:text-retard`}
                    title="Supprimer"
                    onClick={() => setASupprimer(f)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-lg">
          <ChampSelect
            placeholder="Toutes les classes"
            options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            aria-label="Filtrer par classe"
          />
          <ChampSelect
            placeholder="Tous les types"
            options={TYPES_FRAIS}
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filtrer par type"
          />
        </div>

        {peutGerer && (
          <Bouton
            onClick={() => {
              setEnEdition(null);
              setFormulaireOuvert(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nouveau frais
          </Bouton>
        )}
      </div>

      {/* Coût total : utile quand un filtre de classe est actif */}
      {classe && frais.length > 0 && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
          Coût annuel total pour cette classe :{' '}
          <strong className="text-slate-900">{formaterMontant(totalParClasse)}</strong>
        </p>
      )}

      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="La grille tarifaire n a pas pu etre recuperee." />
        ) : (
          <Tableau
            colonnes={colonnes}
            donnees={frais}
            chargement={isLoading}
            vide={
              <EtatVide
                icone={Coins}
                titre="Aucun frais defini"
                message="Definissez les frais d une classe pour pouvoir generer les echeanciers de ses etudiants."
                action={
                  peutGerer ? (
                    <Bouton
                      onClick={() => {
                        setEnEdition(null);
                        setFormulaireOuvert(true);
                      }}
                    >
                      Creer un frais
                    </Bouton>
                  ) : null
                }
              />
            }
          />
        )}
      </div>

      {peutGerer && (
        <FormulaireFrais
          ouverte={formulaireOuvert}
          onFermer={() => setFormulaireOuvert(false)}
          frais={enEdition}
        />
      )}

      <Confirmation
        ouverte={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={async () => {
          await supprimer.mutateAsync(aSupprimer.id);
          setASupprimer(null);
        }}
        chargement={supprimer.isPending}
        titre="Supprimer ce frais ?"
        message={`"${aSupprimer?.libelle}" sera retire de la grille. L operation est refusee si des echeances en dependent : desactivez-le plutot.`}
        libelleConfirmer="Supprimer"
      />
    </div>
  );
}
