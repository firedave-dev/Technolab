/** Liste des etudiants : recherche, filtre par classe et par statut de scolarite. */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, GraduationCap } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import BadgeStatut from '../../components/ui/BadgeStatut.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClasses, useEtudiants } from '../../hooks/useGestion.js';

export default function ListeEtudiants() {
  const navigate = useNavigate();

  // La liste des classes renvoie ici avec ?classe=... : le filtre est pre-rempli.
  const [params] = useSearchParams();

  const [recherche, setRecherche] = useState('');
  const [classe, setClasse] = useState(params.get('classe') || '');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);

  const q = useDebounce(recherche);
  const { data: classesData } = useClasses();
  const { data, isLoading, isError } = useEtudiants({
    page,
    limite: 20,
    q: q || undefined,
    classe: classe || undefined,
    statut: statut || undefined,
  });

  const changerFiltre = (setter) => (valeur) => {
    setter(valeur);
    setPage(1);
  };

  const colonnes = [
    {
      cle: 'nom',
      libelle: 'Etudiant',
      rendu: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{e.nomComplet}</p>
          <p className="truncate text-xs text-slate-500">{e.email}</p>
        </div>
      ),
    },
    { cle: 'matricule', libelle: 'Matricule', masquerMobile: true, rendu: (e) => e.matricule || '—' },
    {
      cle: 'classe',
      libelle: 'Classe',
      rendu: (e) =>
        e.infosEtudiant?.classe ? (
          <span className="text-slate-700">{e.infosEtudiant.classe.nom}</span>
        ) : (
          <span className="text-slate-400">Non affecte</span>
        ),
    },
    {
      cle: 'statut',
      libelle: 'Scolarite',
      rendu: (e) => <BadgeStatut statut={e.infosEtudiant?.statut} />,
    },
    {
      cle: 'chevron',
      libelle: '',
      classe: 'text-right w-10',
      rendu: () => <ChevronRight className="ml-auto h-4 w-4 text-slate-300" aria-hidden="true" />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-marine">Etudiants</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Ouvrez un dossier pour consulter la scolarite et les parents rattaches.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BarreRecherche
          valeur={recherche}
          onChanger={changerFiltre(setRecherche)}
          placeholder="Nom, email, matricule..."
          className="lg:col-span-2"
        />
        <ChampSelect
          placeholder="Toutes les classes"
          options={(classesData?.classes || []).map((c) => ({
            valeur: c.id,
            libelle: `${c.nom} (${c.effectif})`,
          }))}
          value={classe}
          onChange={(e) => changerFiltre(setClasse)(e.target.value)}
          aria-label="Filtrer par classe"
        />
        <ChampSelect
          placeholder="Tous les statuts"
          options={[
            { valeur: 'inscrit', libelle: 'Inscrit' },
            { valeur: 'suspendu', libelle: 'Suspendu' },
            { valeur: 'diplome', libelle: 'Diplome' },
            { valeur: 'abandon', libelle: 'Abandon' },
          ]}
          value={statut}
          onChange={(e) => changerFiltre(setStatut)(e.target.value)}
          aria-label="Filtrer par statut de scolarite"
        />
      </div>

      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="La liste des etudiants n a pas pu etre recuperee." />
        ) : (
          <>
            <Tableau
              colonnes={colonnes}
              donnees={data?.etudiants || []}
              chargement={isLoading}
              onLigneClic={(e) => navigate(`/etudiants/${e.id}`)}
              vide={
                <EtatVide
                  icone={GraduationCap}
                  titre="Aucun etudiant trouve"
                  message="Ajustez vos filtres, ou inscrivez un etudiant depuis le module Utilisateurs."
                />
              }
            />
            <Pagination pagination={data?.pagination} onChangerPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
