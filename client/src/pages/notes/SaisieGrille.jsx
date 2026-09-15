/**
 * Saisie des deux notes de matiere, par classe puis par matiere.
 *
 * LE SELECTEUR EN CASCADE — l'ecran precedent proposait une liste unique
 * « Matiere -- Filiere ». Un professeur qui enseigne quatre matieres dans six
 * classes y cherchait sa ligne parmi vingt-quatre intitules quasi identiques.
 * On demande donc d'abord la CLASSE, puis la matiere, filtree sur ce que ce
 * professeur enseigne dans cette classe precise. Le serveur n'envoie de toute
 * facon que ses propres enseignements.
 *
 * L'ENREGISTREMENT EST GROUPE. Une grille de trente etudiants deux fois notee
 * ferait soixante requetes si chaque cellule partait seule — soixante occasions
 * d'echec partiel, et un etat indechiffrable si le reseau lache au milieu. Les
 * modifications s'accumulent en memoire et partent en une fois.
 *
 * La contrepartie d'une sauvegarde differee est qu'on peut partir en laissant
 * des notes derriere soi : la page previent avant fermeture, et le bouton reste
 * visible tant qu'il reste quelque chose a enregistrer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Eye, EyeOff, Lock, Save } from 'lucide-react';
import {
  useEnregistrerGrille, useGrilleMatiere, useMesEnseignements, usePublierGrille,
} from '../../hooks/useScolarite.js';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Modale from '../../components/ui/Modale.jsx';

const SEMESTRES = [
  { valeur: 'semestre1', libelle: 'Semestre 1' },
  { valeur: 'semestre2', libelle: 'Semestre 2' },
];

/** Une note vide s'ecrit `null`, pas 0 : l'absence de note n'est pas un zero. */
const versNombre = (texte) => {
  const nettoye = String(texte).trim().replace(',', '.');
  if (nettoye === '') return null;
  const valeur = Number(nettoye);
  return Number.isFinite(valeur) ? valeur : undefined; // undefined = saisie invalide
};

const horsBornes = (valeur) => valeur !== null && (valeur === undefined || valeur < 0 || valeur > 20);

/**
 * Cellule de saisie d'une note.
 *
 * Une note deja enregistree n'est plus un champ : elle s'affiche en clair, sous
 * cadenas. Laisser l'apparence d'un champ modifiable pour refuser ensuite la
 * modification serait deloyal — l'interface doit dire la regle, pas la piéger.
 */
function CelluleNote({ valeur, onChange, onEntree, invalide, aria, inputRef, figee }) {
  if (figee) {
    return (
      <span
        className="inline-flex w-20 items-center justify-center gap-1 rounded-lg border
          border-slate-200 bg-slate-50 px-2 py-1.5 text-sm tabular-nums text-slate-600"
        title="Note enregistrée : elle ne peut plus être modifiée. Signalez toute erreur à la direction."
      >
        <Lock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
        {valeur ?? '—'}
        <span className="sr-only">{aria} — enregistrée, non modifiable</span>
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={valeur ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Entree descend d'une ligne dans la MEME colonne : on saisit une
        // colonne entiere d'affilee, ce qui est le geste reel du correcteur.
        if (e.key === 'Enter') {
          e.preventDefault();
          onEntree();
        }
      }}
      aria-label={aria}
      aria-invalid={invalide}
      className={`w-20 rounded-lg border px-2 py-1.5 text-center text-sm tabular-nums transition
        focus:outline-none focus:ring-2 focus:ring-ista/30
        ${invalide
          ? 'border-retard bg-retard-fond text-retard focus:border-retard'
          : 'border-slate-200 focus:border-ista'}`}
    />
  );
}

export default function SaisieGrille() {
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [semestre, setSemestre] = useState('semestre1');

  /** Modifications non encore enregistrees, indexees par identifiant d'etudiant. */
  const [brouillon, setBrouillon] = useState({});

  /** Derniere marche avant un enregistrement definitif. */
  const [confirmation, setConfirmation] = useState(false);

  const champs = useRef({});

  const { data: enseignements, isLoading: chargeEnseignements } = useMesEnseignements();
  const parametres = { matiere: matiereId, semestre };
  const { data: grille, isLoading: chargeGrille } = useGrilleMatiere(parametres, Boolean(matiereId));

  const enregistrer = useEnregistrerGrille();
  const publier = usePublierGrille();

  const classes = enseignements?.classes ?? [];
  const classe = classes.find((c) => String(c.id) === classeId);
  const matieres = classe?.matieres ?? [];

  // Changer de classe invalide la matiere choisie : elle n'appartient plus au
  // perimetre affiche.
  useEffect(() => {
    setMatiereId('');
    setBrouillon({});
  }, [classeId]);

  useEffect(() => { setBrouillon({}); }, [matiereId, semestre]);

  /** Lignes affichees : les valeurs du serveur, recouvertes par le brouillon. */
  const lignes = useMemo(() => {
    if (!grille?.lignes) return [];
    return grille.lignes.map((ligne) => ({
      ...ligne,
      ...brouillon[ligne.etudiant.id],
    }));
  }, [grille, brouillon]);

  const modifiees = Object.keys(brouillon).length;

  const invalides = lignes.filter(
    (l) => horsBornes(versNombre(l.noteClasse ?? '')) || horsBornes(versNombre(l.noteExamen ?? ''))
  ).length;

  const completes = lignes.filter(
    (l) => l.noteClasse !== null && l.noteClasse !== '' && l.noteExamen !== null && l.noteExamen !== ''
  ).length;

  /*
   * Avertissement avant fermeture de l'onglet.
   *
   * Le navigateur impose son propre libelle : on ne peut que declarer qu'il y a
   * quelque chose a perdre. Le message lisible, lui, est affiche dans la page.
   */
  useEffect(() => {
    if (!modifiees) return undefined;

    const prevenir = (evenement) => {
      evenement.preventDefault();
      evenement.returnValue = '';
    };
    window.addEventListener('beforeunload', prevenir);
    return () => window.removeEventListener('beforeunload', prevenir);
  }, [modifiees]);

  const modifier = useCallback((etudiantId, champ, valeur) => {
    setBrouillon((actuel) => ({
      ...actuel,
      [etudiantId]: { ...actuel[etudiantId], [champ]: valeur },
    }));
  }, []);

  /**
   * Descend dans la meme colonne, en SAUTANT les cases figees.
   *
   * Une note deja enregistree n'a pas de champ : s'arreter dessus casserait la
   * saisie au clavier au premier etudiant deja note, alors que c'est justement
   * la situation courante quand on complete les notes d'examen en janvier.
   */
  const descendre = (index, champ) => {
    for (let suivant = index + 1; suivant < lignes.length; suivant += 1) {
      const cellule = champs.current[`${suivant}-${champ}`];
      if (cellule && document.contains(cellule)) {
        cellule.focus();
        return;
      }
    }
  };

  /**
   * Envoi effectif, declenche seulement apres confirmation explicite.
   *
   * Annuler la confirmation NE TOUCHE PAS au brouillon : on revient a la grille
   * telle qu'on l'avait remplie. C'est tout l'interet d'une derniere marche
   * avant un enregistrement qu'on ne pourra plus defaire.
   */
  const envoyer = () => {
    const aEnvoyer = Object.entries(brouillon).map(([etudiant, valeurs]) => {
      const ligne = { etudiant };
      if ('noteClasse' in valeurs) ligne.noteClasse = versNombre(valeurs.noteClasse);
      if ('noteExamen' in valeurs) ligne.noteExamen = versNombre(valeurs.noteExamen);
      return ligne;
    });

    enregistrer.mutate(
      { matiere: matiereId, semestre, lignes: aEnvoyer },
      {
        onSuccess: () => {
          setBrouillon({});
          setConfirmation(false);
        },
      }
    );
  };

  /** Recapitulatif montre dans la confirmation : ce qui part, et pour qui. */
  const recapitulatif = useMemo(() => {
    const parEtudiant = new Map(lignes.map((l) => [String(l.etudiant.id), l]));
    return Object.entries(brouillon).map(([id, valeurs]) => {
      const ligne = parEtudiant.get(String(id));
      return {
        id,
        nom: ligne ? `${ligne.etudiant.nom} ${ligne.etudiant.prenom}` : id,
        classe: 'noteClasse' in valeurs ? versNombre(valeurs.noteClasse) : undefined,
        examen: 'noteExamen' in valeurs ? versNombre(valeurs.noteExamen) : undefined,
      };
    });
  }, [brouillon, lignes]);

  const notesAEnvoyer = recapitulatif.reduce(
    (total, r) => total + (r.classe !== undefined && r.classe !== null ? 1 : 0)
      + (r.examen !== undefined && r.examen !== null ? 1 : 0),
    0
  );

  const publiee = grille?.lignes?.some((l) => l.publiee);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Saisie des notes</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Deux notes par matière : la synthèse du travail de classe et l’examen. La note de
          matière s’en déduit automatiquement.
        </p>
      </header>

      {/* --- Selecteur en cascade --- */}
      <div className="carte grid gap-4 p-5 sm:grid-cols-3">
        <ChampSelect
          label="Classe"
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          placeholder={chargeEnseignements ? 'Chargement...' : 'Choisir une classe'}
          options={classes.map((c) => ({
            valeur: c.id,
            libelle: `${c.nom} — ${c.matieres.length} matière${c.matieres.length > 1 ? 's' : ''}`,
          }))}
          indication="Uniquement les classes où vous enseignez"
        />

        <ChampSelect
          label="Matière"
          value={matiereId}
          onChange={(e) => setMatiereId(e.target.value)}
          disabled={!classeId}
          placeholder={classeId ? 'Choisir une matière' : 'Choisissez d’abord une classe'}
          options={matieres.map((m) => ({
            valeur: m.id,
            libelle: `${m.nom} (${m.creditsEcts} cr.)`,
          }))}
          indication={classeId ? `Vos matières dans ${classe?.nom}` : undefined}
        />

        <ChampSelect
          label="Semestre"
          value={semestre}
          onChange={(e) => setSemestre(e.target.value)}
          options={SEMESTRES}
        />
      </div>

      {!matiereId ? (
        <EtatVide
          titre="Choisissez une classe puis une matière"
          message="La liste des matières se réduit à celles que vous enseignez dans la classe choisie."
        />
      ) : chargeGrille ? (
        <Chargement message="Chargement de la grille..." />
      ) : !lignes.length ? (
        <EtatVide titre="Aucun étudiant" message="Cette classe ne compte aucun étudiant inscrit." />
      ) : (
        <>
          {/* --- Barre d'etat --- */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="text-slate-600">
                <strong className="text-marine">{completes}</strong>
                <span className="text-slate-400"> / {lignes.length}</span> étudiants saisis
              </span>

              {modifiees > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-alerte">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {modifiees} modification{modifiees > 1 ? 's' : ''} non enregistrée{modifiees > 1 ? 's' : ''}
                </span>
              )}

              {invalides > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-retard">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  {invalides} note{invalides > 1 ? 's' : ''} hors de 0–20
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Bouton
                variante="secondaire"
                taille="sm"
                onClick={() => publier.mutate({ matiere: matiereId, semestre, publiee: !publiee })}
                chargement={publier.isPending}
              >
                {publiee ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {publiee ? 'Retirer la publication' : 'Publier'}
              </Bouton>

              <Bouton
                onClick={() => setConfirmation(true)}
                disabled={!modifiees || invalides > 0}
                chargement={enregistrer.isPending}
                title={invalides ? 'Corrigez les notes hors bornes' : undefined}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Enregistrer
              </Bouton>
            </div>
          </div>

          {/* --- Grille --- */}
          <div className="carte overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th scope="col" className="px-4 py-3 label-indicateur text-slate-500">Étudiant</th>
                  <th scope="col" className="px-4 py-3 label-indicateur text-slate-500">Matricule</th>
                  <th scope="col" className="px-4 py-3 label-indicateur text-slate-500">Note de classe</th>
                  <th scope="col" className="px-4 py-3 label-indicateur text-slate-500">Note d’examen</th>
                  <th scope="col" className="px-4 py-3 label-indicateur text-slate-500">Note de matière</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {lignes.map((ligne, index) => {
                  const classeVal = versNombre(ligne.noteClasse ?? '');
                  const examenVal = versNombre(ligne.noteExamen ?? '');

                  /*
                   * La note de matiere est recalculee a l'ecran avec la meme
                   * ponderation que le serveur, pour que le correcteur voie le
                   * resultat sans attendre un aller-retour. Le serveur reste
                   * seul juge : c'est lui qui la recalcule pour le bulletin.
                   */
                  const p = grille.ponderation;
                  const composantes = [
                    { note: classeVal, poids: p.poidsClasse },
                    { note: examenVal, poids: p.poidsExamen },
                  ].filter((c) => c.note !== null && c.note !== undefined && c.poids > 0);

                  const note = composantes.length
                    ? Math.round(
                        (composantes.reduce((s, c) => s + c.note * c.poids, 0)
                          / composantes.reduce((s, c) => s + c.poids, 0)) * 100
                      ) / 100
                    : null;

                  return (
                    <tr key={ligne.etudiant.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 text-sm font-medium text-marine">
                        {ligne.etudiant.nom} {ligne.etudiant.prenom}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                        {ligne.etudiant.matricule}
                      </td>

                      <td className="px-4 py-2.5">
                        <CelluleNote
                          inputRef={(el) => { champs.current[`${index}-classe`] = el; }}
                          valeur={ligne.noteClasse}
                          figee={ligne.figees?.noteClasse}
                          invalide={horsBornes(classeVal)}
                          aria={`Note de classe de ${ligne.etudiant.nom} ${ligne.etudiant.prenom}`}
                          onChange={(v) => modifier(ligne.etudiant.id, 'noteClasse', v)}
                          onEntree={() => descendre(index, 'classe')}
                        />
                      </td>

                      <td className="px-4 py-2.5">
                        <CelluleNote
                          inputRef={(el) => { champs.current[`${index}-examen`] = el; }}
                          valeur={ligne.noteExamen}
                          figee={ligne.figees?.noteExamen}
                          invalide={horsBornes(examenVal)}
                          aria={`Note d’examen de ${ligne.etudiant.nom} ${ligne.etudiant.prenom}`}
                          onChange={(v) => modifier(ligne.etudiant.id, 'noteExamen', v)}
                          onEntree={() => descendre(index, 'examen')}
                        />
                      </td>

                      <td className="px-4 py-2.5">
                        {note === null ? (
                          <span className="text-sm text-slate-300">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm font-bold tabular-nums
                              ${note >= 10 ? 'text-succes' : 'text-retard'}`}
                          >
                            {note.toFixed(2).replace('.', ',')}
                            {note >= 10 && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Entrée passe à l’étudiant suivant dans la même colonne. La note de matière vaut
            (note de classe × {grille.ponderation.poidsClasse} + note d’examen ×{' '}
            {grille.ponderation.poidsExamen}) ÷{' '}
            {grille.ponderation.poidsClasse + grille.ponderation.poidsExamen}.
          </p>

          {/* --- Derniere marche avant l'enregistrement definitif --- */}
          <Modale
            ouverte={confirmation}
            onFermer={() => setConfirmation(false)}
            titre="Confirmer l’enregistrement"
            largeur="md"
            pied={
              <>
                <Bouton
                  variante="secondaire"
                  onClick={() => setConfirmation(false)}
                  disabled={enregistrer.isPending}
                >
                  Revenir à la saisie
                </Bouton>
                <Bouton onClick={envoyer} chargement={enregistrer.isPending}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Enregistrer définitivement
                </Bouton>
              </>
            }
          >
            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border border-retard/30 bg-retard-fond p-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-retard" aria-hidden="true" />
                <p className="text-sm text-slate-700">
                  <strong className="text-retard">Une note enregistrée est définitive.</strong>{' '}
                  Vous ne pourrez plus la modifier vous-même. En cas d’erreur, il faudra la
                  signaler à la direction, seule habilitée à la corriger.
                </p>
              </div>

              <p className="text-sm text-slate-600">
                <strong>{notesAEnvoyer}</strong> note{notesAEnvoyer > 1 ? 's' : ''} pour{' '}
                <strong>{recapitulatif.length}</strong> étudiant
                {recapitulatif.length > 1 ? 's' : ''} — {grille.matiere.nom},{' '}
                {semestre === 'semestre1' ? 'semestre 1' : 'semestre 2'}.
              </p>

              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left">
                      <th scope="col" className="px-3 py-2 label-indicateur text-slate-500">Étudiant</th>
                      <th scope="col" className="px-3 py-2 label-indicateur text-slate-500">Classe</th>
                      <th scope="col" className="px-3 py-2 label-indicateur text-slate-500">Examen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recapitulatif.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-1.5 font-medium text-marine">{r.nom}</td>
                        <td className="px-3 py-1.5 tabular-nums text-slate-600">
                          {r.classe ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-slate-600">
                          {r.examen ?? <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-500">
                « Revenir à la saisie » ferme cette fenêtre sans rien envoyer : vos notes
                restent dans la grille.
              </p>
            </div>
          </Modale>
        </>
      )}
    </div>
  );
}
