/**
 * Suivi des absences pour le personnel : liste filtrable, justification et correction.
 * Le bouton "Faire l appel" ouvre la feuille de pointage.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, Trash2, UserX, XCircle } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FeuilleAppel from './FeuilleAppel.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClasses } from '../../hooks/useGestion.js';
import {
  useAbsences,
  useJustifierAbsence,
  useStatistiquesAbsences,
  useSupprimerAbsence,
} from '../../hooks/useScolarite.js';
import { ADMIN_ROLES, ROLES } from '../../utils/roles.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function SuiviAbsences() {
  const { utilisateur } = useAuth();
  const role = utilisateur?.role;

  const peutPointer = [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR, ROLES.SURVEILLANT].includes(role);
  const peutJustifier = [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.SURVEILLANT].includes(role);

  // Le dossier etudiant renvoie ici avec ?etudiant=... : le suivi est alors cible.
  const [params, setParams] = useSearchParams();
  const etudiantCible = params.get('etudiant');

  const [classe, setClasse] = useState('');
  const [type, setType] = useState('');
  const [justifie, setJustifie] = useState('');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [page, setPage] = useState(1);

  const [appelOuvert, setAppelOuvert] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);

  const filtres = {
    etudiant: etudiantCible || undefined,
    classe: classe || undefined,
    type: type || undefined,
    justifie: justifie || undefined,
    du: du || undefined,
    au: au || undefined,
  };

  const { data: classesData } = useClasses();
  const { data, isLoading, isError } = useAbsences({ ...filtres, page, limite: 30 });
  const { data: statsData } = useStatistiquesAbsences({ classe: classe || undefined, du: du || undefined, au: au || undefined });

  const justifier = useJustifierAbsence();
  const supprimer = useSupprimerAbsence();

  const changerFiltre = (setter) => (valeur) => {
    setter(valeur);
    setPage(1);
  };

  const stats = statsData?.statistiques;

  const colonnes = [
    {
      cle: 'etudiant',
      libelle: 'Etudiant',
      rendu: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">
            {a.etudiant?.prenom} {a.etudiant?.nom}
          </p>
          <p className="truncate text-xs text-slate-500">
            {a.classe?.nom} {a.matiere ? `· ${a.matiere.nom}` : ''}
          </p>
        </div>
      ),
    },
    { cle: 'date', libelle: 'Date', rendu: (a) => dateCourte(a.date) },
    {
      cle: 'type',
      libelle: 'Type',
      rendu: (a) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            a.type === 'retard' ? 'bg-alerte-fond text-alerte' : 'bg-red-100 text-red-700'
          }`}
        >
          {a.type === 'retard' ? `Retard${a.minutesRetard ? ` ${a.minutesRetard} min` : ''}` : 'Absence'}
        </span>
      ),
    },
    { cle: 'creneau', libelle: 'Creneau', masquerMobile: true, rendu: (a) => a.creneau || '—' },
    {
      cle: 'justifie',
      libelle: 'Justification',
      rendu: (a) => (
        <div className="min-w-0">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              a.justifie ? 'bg-succes-fond text-succes' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {a.justifie ? 'Justifiee' : 'Non justifiee'}
          </span>
          {a.motif && <p className="mt-0.5 truncate text-xs text-slate-500">{a.motif}</p>}
        </div>
      ),
    },
    ...(peutJustifier
      ? [
          {
            cle: 'actions',
            libelle: '',
            classe: 'text-right',
            rendu: (a) => {
              const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
              return (
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className={bouton}
                    title={a.justifie ? 'Retirer la justification' : 'Justifier'}
                    onClick={() =>
                      justifier.mutate({
                        id: a.id,
                        donnees: {
                          justifie: !a.justifie,
                          motif: a.justifie ? '' : 'Justifiee par l administration',
                        },
                      })
                    }
                  >
                    {a.justifie ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={`${bouton} hover:text-retard`}
                    title="Supprimer la saisie"
                    onClick={() => setASupprimer(a)}
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
          <h2 className="text-lg font-semibold text-marine">Absences</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Pointage, justificatifs et suivi. Chaque saisie notifie les parents.
          </p>
        </div>
        {peutPointer && (
          <Bouton onClick={() => setAppelOuvert(true)}>
            <ClipboardCheck className="h-4 w-4" />
            Faire l appel
          </Bouton>
        )}
      </header>

      {etudiantCible && data?.absences?.[0] && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-800">
          <span>
            Suivi cible sur{' '}
            <strong>
              {data.absences[0].etudiant?.prenom} {data.absences[0].etudiant?.nom}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => setParams({})}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Voir tous les etudiants
          </button>
        </div>
      )}

      {/* Synthese */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Saisies sur la periode', stats.total],
            ['Justifiees', stats.justifiees],
            ['Non justifiees', stats.nonJustifiees],
          ].map(([libelle, valeur]) => (
            <div key={libelle} className="carte p-4">
              <p className="text-xs text-slate-500">{libelle}</p>
              <p className="mt-1 text-lg font-semibold text-marine">{valeur}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ChampSelect
          placeholder="Toutes les classes"
          options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
          value={classe}
          onChange={(e) => changerFiltre(setClasse)(e.target.value)}
          aria-label="Filtrer par classe"
        />
        <ChampSelect
          placeholder="Absences et retards"
          options={[
            { valeur: 'absence', libelle: 'Absences seules' },
            { valeur: 'retard', libelle: 'Retards seuls' },
          ]}
          value={type}
          onChange={(e) => changerFiltre(setType)(e.target.value)}
          aria-label="Filtrer par type"
        />
        <ChampSelect
          placeholder="Toutes justifications"
          options={[
            { valeur: 'false', libelle: 'Non justifiees' },
            { valeur: 'true', libelle: 'Justifiees' },
          ]}
          value={justifie}
          onChange={(e) => changerFiltre(setJustifie)(e.target.value)}
          aria-label="Filtrer par justification"
        />
        <ChampTexte
          type="date"
          value={du}
          onChange={(e) => changerFiltre(setDu)(e.target.value)}
          aria-label="Date de debut"
        />
        <ChampTexte
          type="date"
          value={au}
          onChange={(e) => changerFiltre(setAu)(e.target.value)}
          aria-label="Date de fin"
        />
      </div>

      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="La liste des absences n a pas pu etre recuperee." />
        ) : (
          <>
            <Tableau
              colonnes={colonnes}
              donnees={data?.absences || []}
              chargement={isLoading}
              vide={
                <EtatVide
                  icone={UserX}
                  titre="Aucune absence"
                  message="Aucune saisie ne correspond a ces criteres — bonne nouvelle."
                />
              }
            />
            <Pagination pagination={data?.pagination} onChangerPage={setPage} />
          </>
        )}
      </div>

      {/* Etudiants les plus concernes */}
      {stats?.parEtudiant?.length > 0 && (
        <section className="carte p-5">
          <h3 className="text-sm font-semibold text-marine">Etudiants les plus concernes</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            {stats.parEtudiant.slice(0, 5).map((ligne) => (
              <li key={ligne.etudiant.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {ligne.etudiant.nomComplet}
                </span>
                <span className="text-xs text-slate-500">
                  {ligne.absences} absence(s) · {ligne.retards} retard(s) ·{' '}
                  <strong className={ligne.nonJustifiees ? 'text-retard' : 'text-slate-600'}>
                    {ligne.nonJustifiees} non justifiee(s)
                  </strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {peutPointer && <FeuilleAppel ouverte={appelOuvert} onFermer={() => setAppelOuvert(false)} />}

      <Confirmation
        ouverte={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={async () => {
          await supprimer.mutateAsync(aSupprimer.id);
          setASupprimer(null);
        }}
        chargement={supprimer.isPending}
        titre="Supprimer cette saisie ?"
        message="La saisie sera definitivement retiree du dossier de l etudiant. Utilisez cette action pour corriger une erreur de pointage."
        libelleConfirmer="Supprimer"
      />
    </div>
  );
}
