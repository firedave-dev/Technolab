/** Mise en forme des montants et libelles comptables. */

export const MODES_PAIEMENT = [
  { valeur: 'especes', libelle: 'Especes' },
  { valeur: 'virement', libelle: 'Virement bancaire' },
  { valeur: 'mobile_money', libelle: 'Mobile Money' },
  { valeur: 'cheque', libelle: 'Cheque' },
  { valeur: 'carte', libelle: 'Carte bancaire' },
];

export const TYPES_FRAIS = [
  { valeur: 'inscription', libelle: 'Inscription' },
  { valeur: 'scolarite', libelle: 'Scolarite' },
  { valeur: 'examen', libelle: 'Examen' },
  { valeur: 'fourniture', libelle: 'Fournitures' },
  { valeur: 'autre', libelle: 'Autre' },
];

export const STATUTS_PAIEMENT = [
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'valide', libelle: 'Valide' },
  { valeur: 'annule', libelle: 'Annule' },
];

export const STATUTS_ECHEANCE = [
  { valeur: 'a_payer', libelle: 'A payer' },
  { valeur: 'partiel', libelle: 'Partiel' },
  { valeur: 'paye', libelle: 'Paye' },
  { valeur: 'annule', libelle: 'Annule' },
];

const libelleDepuis = (liste, valeur) =>
  liste.find((e) => e.valeur === valeur)?.libelle || valeur || '—';

export const libelleMode = (v) => libelleDepuis(MODES_PAIEMENT, v);
export const libelleTypeFrais = (v) => libelleDepuis(TYPES_FRAIS, v);
export const libelleStatutPaiement = (v) => libelleDepuis(STATUTS_PAIEMENT, v);
export const libelleStatutEcheance = (v) => libelleDepuis(STATUTS_ECHEANCE, v);

/** "450 000 FCFA" — espaces insecables normalisees pour un rendu homogene. */
export const formaterMontant = (valeur) =>
  valeur === null || valeur === undefined
    ? '—'
    : `${Math.round(valeur).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;

/** Forme compacte pour les vignettes du tableau de bord : "1,2 M" / "450 k". */
export function formaterMontantCourt(valeur) {
  if (valeur === null || valeur === undefined) return '—';
  if (Math.abs(valeur) >= 1_000_000) return `${(valeur / 1_000_000).toFixed(1).replace('.', ',')} M`;
  if (Math.abs(valeur) >= 1_000) return `${Math.round(valeur / 1_000)} k`;
  return String(Math.round(valeur));
}

/** Couleurs de badge par statut. */
export const COULEUR_STATUT_PAIEMENT = {
  en_attente: 'bg-amber-100 text-amber-700',
  valide: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-700',
};

export const COULEUR_STATUT_ECHEANCE = {
  a_payer: 'bg-slate-200 text-slate-600',
  partiel: 'bg-amber-100 text-amber-700',
  paye: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-700',
};
