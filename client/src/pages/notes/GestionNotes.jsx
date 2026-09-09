/**
 * Ecran professeur / administration : evaluations d'une matiere et releve de classe.
 * Deux onglets — "Evaluations" pour saisir et publier, "Releve" pour la vue d'ensemble.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, FileSpreadsheet, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulaireEvaluation from './FormulaireEvaluation.jsx';
import SaisieNotes from './SaisieNotes.jsx';
import {
  useBasculerPublication,
  useEvaluations,
  useMesMatieres,
  useReleveClasse,
  useSupprimerEvaluation,
} from '../../hooks/useScolarite.js';
import {
  PERIODES,
  couleurMoyenne,
  libellePeriode,
  libelleTypeEvaluation,
} from '../../utils/scolarite.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function GestionNotes() {
  const [matiereId, setMatiereId] = useState('');
  const [periode, setPeriode] = useState('semestre1');
  const [onglet, setOnglet] = useState('evaluations');

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [saisieOuverte, setSaisieOuverte] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  const { data: matieresData, isLoading: chargementMatieres } = useMesMatieres();
  const matieres = matieresData?.matieres || [];

  // Selection automatique de la premiere matiere disponible.
  useEffect(() => {
    if (!matiereId && matieres.length) setMatiereId(matieres[0].id);
  }, [matieres, matiereId]);

  const matiere = matieres.find((m) => m.id === matiereId);
  const classeId = matiere?.classe?._id || matiere?.classe?.id;

  const { data, isLoading } = useEvaluations(
    { matiere: matiereId, periode },
    Boolean(matiereId)
  );
  const { data: releveData, isLoading: chargementReleve } = useReleveClasse(
    onglet === 'releve' ? classeId : null,
    { periode }
  );

  const publier = useBasculerPublication();
  const supprimer = useSupprimerEvaluation();

  if (!chargementMatieres && !matieres.length) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide
          icone={FileSpreadsheet}
          titre="Aucune matiere assignee"
          message="Les evaluations se rattachent a une matiere. Demandez au secretariat de vous en assigner une."
          action={
            <Link to="/matieres" className="text-sm text-brand-600 hover:underline">
              Voir les matieres
            </Link>
          }
        />
      </div>
    );
  }

  const colonnesEvaluations = [
    {
      cle: 'titre',
      libelle: 'Evaluation',
      rendu: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{e.titre}</p>
          <p className="truncate text-xs text-slate-500">
            {libelleTypeEvaluation(e.type)} · sur {e.bareme} · coef. {e.coefficient}
          </p>
        </div>
      ),
    },
    { cle: 'date', libelle: 'Date', masquerMobile: true, rendu: (e) => dateCourte(e.date) },
    {
      cle: 'notesSaisies',
      libelle: 'Notes',
      rendu: (e) => (
        <span className="text-sm text-slate-600">
          {e.notesSaisies} saisie{e.notesSaisies > 1 ? 's' : ''}
        </span>
      ),
    },
    {
      cle: 'publiee',
      libelle: 'Publication',
      rendu: (e) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            e.publiee ? 'bg-succes-fond text-succes' : 'bg-slate-200 text-slate-600'
          }`}
        >
          {e.publiee ? 'Publiee' : 'Brouillon'}
        </span>
      ),
    },
    {
      cle: 'actions',
      libelle: '',
      classe: 'text-right',
      rendu: (e) => {
        const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700';
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              className={bouton}
              title="Saisir les notes"
              onClick={() => setSaisieOuverte(e.id)}
            >
              <ListChecks className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={bouton}
              title={e.publiee ? 'Retirer la publication' : 'Publier les notes'}
              onClick={() => publier.mutate(e.id)}
            >
              {e.publiee ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className={bouton}
              title="Modifier"
              onClick={() => {
                setEnEdition(e);
                setFormulaireOuvert(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`${bouton} hover:text-retard`}
              title="Supprimer"
              onClick={() => setASupprimer(e)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const colonnesReleve = [
    {
      cle: 'rang',
      libelle: 'Rang',
      classe: 'w-16',
      rendu: (l) => <span className="font-medium text-slate-700">{l.rang ?? '—'}</span>,
    },
    {
      cle: 'etudiant',
      libelle: 'Etudiant',
      rendu: (l) => (
        <Link
          to={`/notes/bulletin/${l.etudiant.id}`}
          className="min-w-0 hover:text-brand-600"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="truncate font-medium">{l.etudiant.nomComplet}</p>
          <p className="truncate text-xs text-slate-500">{l.etudiant.matricule}</p>
        </Link>
      ),
    },
    {
      cle: 'moyenneGenerale',
      libelle: 'Moyenne',
      rendu: (l) => (
        <span className={`font-semibold ${couleurMoyenne(l.moyenneGenerale)}`}>
          {l.moyenneGenerale === null ? '—' : `${l.moyenneGenerale}/20`}
        </span>
      ),
    },
    { cle: 'mention', libelle: 'Mention', masquerMobile: true, rendu: (l) => l.mention || '—' },
  ];

  const stats = releveData?.statistiques;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header>
        <h2 className="text-lg font-semibold text-marine">Notes et bulletins</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Saisissez les notes, puis publiez-les pour les rendre visibles des etudiants et des parents.
        </p>
      </header>

      {/* Selection de la matiere et de la periode */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ChampSelect
          label="Matiere"
          className="sm:col-span-2"
          options={matieres.map((m) => ({
            valeur: m.id,
            libelle: `${m.nom} — ${m.classe?.nom || ''}`,
          }))}
          value={matiereId}
          onChange={(e) => setMatiereId(e.target.value)}
        />
        <ChampSelect
          label="Periode"
          options={PERIODES}
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        />
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          ['evaluations', 'Evaluations'],
          ['releve', 'Releve de classe'],
        ].map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => setOnglet(cle)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              onglet === cle
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === 'evaluations' ? (
        <>
          <div className="flex justify-end">
            <Bouton
              onClick={() => {
                setEnEdition(null);
                setFormulaireOuvert(true);
              }}
              disabled={!matiere}
            >
              <Plus className="h-4 w-4" />
              Nouvelle evaluation
            </Bouton>
          </div>

          <div className="carte overflow-hidden">
            <Tableau
              colonnes={colonnesEvaluations}
              donnees={data?.evaluations || []}
              chargement={isLoading}
              vide={
                <EtatVide
                  icone={FileSpreadsheet}
                  titre="Aucune evaluation"
                  message={`Aucune evaluation pour ${matiere?.nom || 'cette matiere'} en ${libellePeriode(periode).toLowerCase()}.`}
                />
              }
            />
          </div>
        </>
      ) : (
        <>
          {stats && (
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                ['Effectif', stats.effectif],
                ['Moyenne de classe', stats.moyenneClasse === null ? '—' : `${stats.moyenneClasse}/20`],
                ['Admis (≥ 10)', `${stats.admis}/${stats.notes}`],
                ['Taux de reussite', stats.tauxReussite === null ? '—' : `${stats.tauxReussite} %`],
              ].map(([libelle, valeur]) => (
                <div key={libelle} className="carte p-4">
                  <p className="text-xs text-slate-500">{libelle}</p>
                  <p className="mt-1 text-lg font-semibold text-marine">{valeur}</p>
                </div>
              ))}
            </div>
          )}

          <div className="carte overflow-hidden">
            <Tableau
              colonnes={colonnesReleve}
              donnees={releveData?.releve || []}
              cleLigne={(l) => l.etudiant.id}
              chargement={chargementReleve}
              vide={<EtatVide titre="Aucun etudiant" message="Cette classe ne compte aucun etudiant." />}
            />
          </div>
        </>
      )}

      <FormulaireEvaluation
        ouverte={formulaireOuvert}
        onFermer={() => setFormulaireOuvert(false)}
        evaluation={enEdition}
        matiere={matiere}
      />

      <SaisieNotes
        ouverte={Boolean(saisieOuverte)}
        onFermer={() => setSaisieOuverte(null)}
        evaluationId={saisieOuverte}
      />

      <Confirmation
        ouverte={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={async () => {
          await supprimer.mutateAsync(aSupprimer.id);
          setASupprimer(null);
        }}
        chargement={supprimer.isPending}
        titre="Supprimer cette evaluation ?"
        message={`"${aSupprimer?.titre}" et les ${aSupprimer?.notesSaisies || 0} note(s) associee(s) seront definitivement supprimees.`}
        libelleConfirmer="Supprimer"
      />
    </div>
  );
}
