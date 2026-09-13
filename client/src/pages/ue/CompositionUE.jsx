/**
 * Composition des Unites d'Enseignement d'un semestre.
 *
 * L'appariement automatique est une PROPOSITION. Cet ecran la presente, permet
 * de la corriger, et ne l'enregistre que sur decision explicite. Le serveur
 * revérifie de toute facon la compatibilite des credits : ce que l'on empeche
 * ici, c'est de perdre du temps sur un echange qu'il refusera.
 *
 * L'echange manuel se fait en deux temps — on selectionne une matiere, puis sa
 * remplacante — plutot qu'en glisser-deposer : le geste reste utilisable au
 * clavier, et sur un ecran tactile.
 */
import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeftRight, Check, RefreshCw, Save, Sparkles, X,
} from 'lucide-react';
import {
  useAppliquerUE, useEtatSemestre, usePropositionUE,
} from '../../hooks/useScolarite.js';
import { useClasses } from '../../hooks/useGestion.js';
import AssistantCredits from '../../components/AssistantCredits.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';

const SEMESTRES = [
  { valeur: 'semestre1', libelle: 'Semestre 1' },
  { valeur: 'semestre2', libelle: 'Semestre 2' },
];

/** Une matiere dans une UE, selectionnable pour un echange. */
function Matiere({ matiere, selectionnee, echangeable, onClick }) {
  const etat = selectionnee
    ? 'border-ista bg-brand-50 ring-1 ring-ista'
    : echangeable
      ? 'border-ista/40 bg-white hover:border-ista hover:bg-brand-50/50'
      : 'border-slate-200 bg-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!echangeable && !selectionnee}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${etat} disabled:cursor-default disabled:opacity-100`}
      aria-pressed={selectionnee}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-marine">{matiere.nom}</span>
        <span className="text-xs text-slate-500">
          {matiere.typeMatiere || <em>type non renseigné</em>}
        </span>
      </span>
      <span className="pastille-neutre shrink-0">{matiere.creditsEcts} cr.</span>
    </button>
  );
}

export default function CompositionUE() {
  const [classe, setClasse] = useState('');
  const [semestre, setSemestre] = useState('semestre1');
  const [intitules, setIntitules] = useState({});
  const [selection, setSelection] = useState(null);
  const [permutations, setPermutations] = useState([]);

  const { data: classesData } = useClasses();
  const parametres = { classe, semestre };

  const { data: etatData, isLoading: chargeEtat } = useEtatSemestre(parametres, Boolean(classe));
  const { data: propositionData, isLoading: chargeProposition, refetch } =
    usePropositionUE(parametres, Boolean(classe));

  const appliquer = useAppliquerUE();

  /**
   * Proposition telle que l'utilisateur l'a remaniee.
   *
   * Les echanges sont conserves a part et rejoues sur la proposition d'origine :
   * une nouvelle proposition du serveur repart ainsi d'une base propre, sans
   * qu'on ait a demeler ce qui venait de l'algorithme de ce qui venait de la main.
   */
  const ues = useMemo(() => {
    if (!propositionData?.ues) return [];

    const copie = propositionData.ues.map((ue) => ({ ...ue, matieres: [...ue.matieres] }));

    for (const [idA, idB] of permutations) {
      const ueA = copie.find((u) => u.matieres.some((m) => m.id === idA));
      const ueB = copie.find((u) => u.matieres.some((m) => m.id === idB));
      if (!ueA || !ueB || ueA === ueB) continue;

      const iA = ueA.matieres.findIndex((m) => m.id === idA);
      const iB = ueB.matieres.findIndex((m) => m.id === idB);
      [ueA.matieres[iA], ueB.matieres[iB]] = [ueB.matieres[iB], ueA.matieres[iA]];
    }

    return copie;
  }, [propositionData, permutations]);

  /** Une matiere est echangeable avec la selection si elle a le meme credit. */
  const estEchangeable = (matiere) => {
    if (!selection) return false;
    if (selection.id === matiere.id) return false;
    return selection.creditsEcts === matiere.creditsEcts;
  };

  const cliquerMatiere = (matiere, ue) => {
    if (!selection) {
      setSelection({ ...matiere, ue: ue.code });
      return;
    }
    if (selection.id === matiere.id) {
      setSelection(null);
      return;
    }
    if (!estEchangeable(matiere)) return;

    setPermutations((p) => [...p, [selection.id, matiere.id]]);
    setSelection(null);
  };

  const enregistrer = () => {
    appliquer.mutate({
      classe,
      semestre,
      ues: ues.map((ue) => ({
        code: ue.code,
        intitule: intitules[ue.code] ?? ue.intitule,
        matieres: ue.matieres.map((m) => m.id),
      })),
    });
  };

  const reinitialiser = () => {
    setPermutations([]);
    setSelection(null);
    setIntitules({});
    refetch();
  };

  const erreurs = propositionData?.erreurs ?? [];
  const modifiee = permutations.length > 0 || Object.keys(intitules).length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Composition des unités d’enseignement</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Les matières sont appariées deux à deux, à crédits égaux, en regroupant en priorité
          celles de même discipline. La proposition ci-dessous n’est enregistrée que lorsque
          vous l’appliquez.
        </p>
      </header>

      {/* --- Perimetre --- */}
      <div className="carte grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <ChampSelect
          label="Classe"
          value={classe}
          onChange={(e) => { setClasse(e.target.value); reinitialiser(); }}
          options={[
            { valeur: '', libelle: 'Choisir une classe...' },
            ...(classesData?.classes ?? []).map((c) => ({ valeur: c.id, libelle: c.nom })),
          ]}
        />
        <ChampSelect
          label="Semestre"
          value={semestre}
          onChange={(e) => { setSemestre(e.target.value); reinitialiser(); }}
          options={SEMESTRES}
        />
        <div className="flex items-end">
          <Bouton
            variante="secondaire"
            onClick={reinitialiser}
            disabled={!classe}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Recalculer
          </Bouton>
        </div>
      </div>

      {!classe ? (
        <EtatVide
          titre="Choisissez une classe"
          message="L’appariement se calcule par classe et par semestre."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          <AssistantCredits
            etat={etatData?.etat}
            total={etatData?.total ?? 30}
            chargement={chargeEtat}
          />

          <div className="space-y-4">
            {/* --- Matieres non appariables --- */}
            {erreurs.length > 0 && (
              <div className="rounded-lg border border-alerte bg-alerte-fond p-4" role="alert">
                <p className="flex items-center gap-2 text-sm font-bold text-alerte">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Appariement incomplet
                </p>
                <ul className="mt-2 space-y-1 pl-6">
                  {erreurs.map((e) => (
                    <li key={e.credits} className="text-sm text-alerte/90">{e.motif}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* --- Barre d'echange --- */}
            {selection && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ista bg-brand-50 p-3">
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-ista" aria-hidden="true" />
                <p className="flex-1 text-sm text-marine">
                  <strong>{selection.nom}</strong> sélectionnée — choisissez une matière
                  à {selection.creditsEcts} crédits dans une autre UE pour les échanger.
                </p>
                <button
                  type="button"
                  onClick={() => setSelection(null)}
                  className="rounded-md p-1 text-slate-500 transition hover:bg-white hover:text-marine"
                  aria-label="Annuler la sélection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {chargeProposition ? (
              <Chargement message="Calcul de l’appariement..." />
            ) : !ues.length ? (
              <EtatVide
                titre="Aucune UE proposée"
                message="Ajoutez des matières à ce semestre pour que l’appariement puisse se faire."
              />
            ) : (
              <>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {ues.map((ue) => (
                    <li key={ue.code} className="carte p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="pastille-neutre font-bold">{ue.code}</span>
                        <span className="flex items-center gap-2">
                          {ue.parDefaut && (
                            <span
                              className="pastille-alerte"
                              title="Aucune affinité entre ces disciplines : à relire"
                            >
                              par défaut
                            </span>
                          )}
                          <span className="pastille-succes">{ue.credits} crédits</span>
                        </span>
                      </div>

                      <input
                        type="text"
                        value={intitules[ue.code] ?? ue.intitule}
                        onChange={(e) =>
                          setIntitules((i) => ({ ...i, [ue.code]: e.target.value }))}
                        className="mt-3 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-bold text-marine transition hover:border-slate-200 focus:border-ista focus:bg-white focus:outline-none"
                        aria-label={`Intitulé de l’unité ${ue.code}`}
                      />

                      <ul className="mt-3 space-y-2">
                        {ue.matieres.map((m) => (
                          <li key={m.id}>
                            <Matiere
                              matiere={m}
                              selectionnee={selection?.id === m.id}
                              echangeable={estEchangeable(m)}
                              onClick={() => cliquerMatiere(m, ue)}
                            />
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-500">
                    {modifiee ? (
                      <span className="flex items-center gap-1.5 text-alerte">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        Proposition modifiée — non enregistrée
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        Proposition de l’algorithme, telle quelle
                      </span>
                    )}
                  </p>

                  <Bouton
                    onClick={enregistrer}
                    chargement={appliquer.isPending}
                    disabled={erreurs.length > 0}
                    title={erreurs.length ? 'Corrigez d’abord les matières non appariables' : undefined}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Appliquer ces {ues.length} UE
                  </Bouton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
