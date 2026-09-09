/** Libelles et mises en forme partages par les modules pedagogiques. */

export const PERIODES = [
  { valeur: 'semestre1', libelle: 'Semestre 1' },
  { valeur: 'semestre2', libelle: 'Semestre 2' },
];

export const TYPES_EVALUATION = [
  { valeur: 'devoir', libelle: 'Devoir' },
  { valeur: 'interrogation', libelle: 'Interrogation' },
  { valeur: 'examen', libelle: 'Examen' },
  { valeur: 'tp', libelle: 'Travaux pratiques' },
  { valeur: 'projet', libelle: 'Projet' },
];

export const TYPES_EXAMEN = [
  { valeur: 'partiel', libelle: 'Partiel' },
  { valeur: 'final', libelle: 'Examen final' },
  { valeur: 'rattrapage', libelle: 'Rattrapage' },
];

export const STATUTS_EXAMEN = [
  { valeur: 'planifie', libelle: 'Planifie' },
  { valeur: 'termine', libelle: 'Termine' },
  { valeur: 'annule', libelle: 'Annule' },
];

export const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];

const libelleDepuis = (liste, valeur) =>
  liste.find((e) => e.valeur === valeur)?.libelle || valeur || '—';

export const libellePeriode = (v) => libelleDepuis(PERIODES, v);
export const libelleTypeEvaluation = (v) => libelleDepuis(TYPES_EVALUATION, v);
export const libelleTypeExamen = (v) => libelleDepuis(TYPES_EXAMEN, v);
export const libelleStatutExamen = (v) => libelleDepuis(STATUTS_EXAMEN, v);

/** Affichage d'une note : "14,5 / 20" ou un tiret si non saisie. */
export const formatNote = (valeur, bareme = 20) =>
  valeur === null || valeur === undefined
    ? '—'
    : `${valeur.toString().replace('.', ',')} / ${bareme}`;

/** Couleur d'une moyenne ramenee sur 20 (vert au-dessus de 12, rouge sous 10). */
export function couleurMoyenne(moyenne) {
  if (moyenne === null || moyenne === undefined) return 'text-slate-400';
  if (moyenne >= 14) return 'text-emerald-600';
  if (moyenne >= 12) return 'text-sky-600';
  if (moyenne >= 10) return 'text-amber-600';
  return 'text-red-600';
}

/** Annee scolaire courante : la rentree est consideree au 1er aout. */
export function anneeScolaireCourante() {
  const maintenant = new Date();
  const debut = maintenant.getMonth() >= 7 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

/** Date au format aaaa-mm-jj, utilisable dans un input type="date". */
export const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Date longue lisible : "lundi 3 mars 2026". */
export const dateLongue = (valeur) =>
  valeur
    ? new Date(valeur).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';
