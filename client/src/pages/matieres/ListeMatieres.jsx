/**
 * Offre de formation : matieres enseignees par classe.
 * Un professeur y retrouve uniquement les siennes (filtre applique par le serveur).
 */
import { useState } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulaireMatiere from './FormulaireMatiere.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClasses } from '../../hooks/useGestion.js';
import { useMatieres, useSupprimerMatiere } from '../../hooks/useScolarite.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ADMIN_ROLES, ROLES } from '../../utils/roles.js';

export default function ListeMatieres() {
  const { utilisateur: acteur } = useAuth();
  const peutGerer = [...ADMIN_ROLES, ROLES.SECRETAIRE].includes(acteur?.role);

  const [recherche, setRecherche] = useState('');
  const [classe, setClasse] = useState('');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  const q = useDebounce(recherche);
  const { data: classesData } = useClasses();
  const { data, isLoading, isError } = useMatieres({ q: q || undefined, classe: classe || undefined });
  const supprimer = useSupprimerMatiere();

  const ouvrirCreation = () => {
    setEnEdition(null);
    setFormulaireOuvert(true);
  };

  const colonnes = [
    {
      cle: 'nom',
      libelle: 'Matiere',
      rendu: (m) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{m.nom}</p>
          <p className="truncate text-xs text-slate-500">
            {m.code} · coefficient {m.coefficient}
          </p>
        </div>
      ),
    },
    {
      cle: 'classe',
      libelle: 'Classe',
      rendu: (m) => m.classe?.nom || '—',
    },
    {
      cle: 'professeur',
      libelle: 'Titulaire',
      masquerMobile: true,
      rendu: (m) =>
        m.professeur ? (
          `${m.professeur.prenom} ${m.professeur.nom}`
        ) : (
          <span className="text-slate-400">Non assigne</span>
        ),
    },
    {
      cle: 'anneeScolaire',
      libelle: 'Annee',
      masquerMobile: true,
    },
    ...(peutGerer
      ? [
          {
            cle: 'actions',
            libelle: '',
            classe: 'text-right',
            rendu: (m) => {
              const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
              return (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className={bouton}
                    title="Modifier"
                    onClick={() => {
                      setEnEdition(m);
                      setFormulaireOuvert(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`${bouton} hover:text-retard`}
                    title="Supprimer"
                    onClick={() => setASupprimer(m)}
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
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marine">Matieres</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {peutGerer
              ? 'Offre de formation : une matiere relie une classe a son professeur titulaire.'
              : 'Les matieres qui vous sont assignees cette annee.'}
          </p>
        </div>
        {peutGerer && (
          <Bouton onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouvelle matiere
          </Bouton>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <BarreRecherche
          valeur={recherche}
          onChanger={setRecherche}
          placeholder="Nom ou code..."
          className="sm:col-span-2"
        />
        <ChampSelect
          placeholder="Toutes les classes"
          options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          aria-label="Filtrer par classe"
        />
      </div>

      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="La liste des matieres n a pas pu etre recuperee." />
        ) : (
          <Tableau
            colonnes={colonnes}
            donnees={data?.matieres || []}
            chargement={isLoading}
            vide={
              <EtatVide
                icone={BookOpen}
                titre="Aucune matiere"
                message={
                  peutGerer
                    ? 'Creez une matiere pour pouvoir y rattacher des evaluations.'
                    : 'Aucune matiere ne vous est assignee pour le moment.'
                }
                action={peutGerer ? <Bouton onClick={ouvrirCreation}>Creer une matiere</Bouton> : null}
              />
            }
          />
        )}
      </div>

      {peutGerer && (
        <FormulaireMatiere
          ouverte={formulaireOuvert}
          onFermer={() => setFormulaireOuvert(false)}
          matiere={enEdition}
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
        titre="Supprimer cette matiere ?"
        message={`${aSupprimer?.nom} sera supprimee. L operation est refusee si des evaluations y sont rattachees.`}
        libelleConfirmer="Supprimer"
      />
    </div>
  );
}
