/** Gestion des classes : effectifs, professeur principal, creation et archivage. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Plus, School, Trash2 } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulaireClasse from './FormulaireClasse.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClasses, useSupprimerClasse } from '../../hooks/useGestion.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ADMIN_ROLES, ROLES } from '../../utils/roles.js';

export default function ListeClasses() {
  const navigate = useNavigate();
  const { utilisateur: acteur } = useAuth();

  const [recherche, setRecherche] = useState('');
  const [niveau, setNiveau] = useState('');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  const q = useDebounce(recherche);
  const { data, isLoading, isError } = useClasses({ q: q || undefined, niveau: niveau || undefined });
  const supprimer = useSupprimerClasse();

  const peutGerer = [...ADMIN_ROLES, ROLES.SECRETAIRE].includes(acteur?.role);
  const peutSupprimer = ADMIN_ROLES.includes(acteur?.role);

  const ouvrirCreation = () => {
    setEnEdition(null);
    setFormulaireOuvert(true);
  };

  /** Barre de remplissage : verte tant qu'il reste de la place, ambre a l'approche du plein. */
  const remplissage = (classe) => {
    const ratio = Math.min(1, classe.effectif / classe.capacite);
    const couleur = ratio >= 1 ? 'bg-red-500' : ratio >= 0.85 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
      <div className="min-w-[110px]">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">{classe.effectif}</span>
          <span className="text-slate-400">/ {classe.capacite}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full ${couleur}`} style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
    );
  };

  const colonnes = [
    {
      cle: 'nom',
      libelle: 'Classe',
      rendu: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{c.nom}</p>
          <p className="truncate text-xs text-slate-500">
            {c.filiere} · {c.anneeScolaire}
          </p>
        </div>
      ),
    },
    { cle: 'niveau', libelle: 'Niveau' },
    { cle: 'effectif', libelle: 'Effectif', rendu: remplissage },
    {
      cle: 'professeurPrincipal',
      libelle: 'Professeur principal',
      masquerMobile: true,
      rendu: (c) =>
        c.professeurPrincipal ? (
          `${c.professeurPrincipal.prenom} ${c.professeurPrincipal.nom}`
        ) : (
          <span className="text-slate-400">Non designe</span>
        ),
    },
    ...(peutGerer
      ? [
          {
            cle: 'actions',
            libelle: '',
            classe: 'text-right',
            rendu: (c) => {
              const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
              return (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className={bouton}
                    title="Modifier"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnEdition(c);
                      setFormulaireOuvert(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {peutSupprimer && (
                    <button
                      type="button"
                      className={`${bouton} hover:text-retard`}
                      title="Supprimer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setASupprimer(c);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
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
          <h2 className="text-lg font-semibold text-marine">Classes</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Promotions de l etablissement et leur effectif actuel.
          </p>
        </div>
        {peutGerer && (
          <Bouton onClick={ouvrirCreation}>
            <Plus className="h-4 w-4" />
            Nouvelle classe
          </Bouton>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <BarreRecherche
          valeur={recherche}
          onChanger={setRecherche}
          placeholder="Nom ou filiere..."
          className="sm:col-span-2"
        />
        <ChampSelect
          placeholder="Tous les niveaux"
          options={['L1', 'L2', 'L3', 'M1', 'M2'].map((n) => ({ valeur: n, libelle: n }))}
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          aria-label="Filtrer par niveau"
        />
      </div>

      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="La liste des classes n a pas pu etre recuperee." />
        ) : (
          <Tableau
            colonnes={colonnes}
            donnees={data?.classes || []}
            chargement={isLoading}
            onLigneClic={(c) => navigate(`/etudiants?classe=${c.id}`)}
            vide={
              <EtatVide
                icone={School}
                titre="Aucune classe"
                message="Creez une classe pour pouvoir y affecter des etudiants."
                action={peutGerer ? <Bouton onClick={ouvrirCreation}>Creer une classe</Bouton> : null}
              />
            }
          />
        )}
      </div>

      {peutGerer && (
        <FormulaireClasse
          ouverte={formulaireOuvert}
          onFermer={() => setFormulaireOuvert(false)}
          classe={enEdition}
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
        titre="Supprimer cette classe ?"
        message={`${aSupprimer?.nom} sera definitivement supprimee. La suppression est refusee si des etudiants y sont encore rattaches.`}
        libelleConfirmer="Supprimer"
      />
    </div>
  );
}
