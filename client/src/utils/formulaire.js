/** Utilitaires partages par les formulaires de gestion. */

/**
 * Retire recursivement les valeurs vides d'un payload.
 * Sans cela, un champ optionnel laisse vide serait envoye comme "" et rejete
 * par la validation serveur (date, nombre, ObjectId...).
 */
export function nettoyerPayload(objet) {
  const resultat = {};

  for (const [cle, valeur] of Object.entries(objet)) {
    if (valeur === '' || valeur === undefined || valeur === null) continue;

    if (typeof valeur === 'object' && !Array.isArray(valeur) && !(valeur instanceof Date)) {
      const imbrique = nettoyerPayload(valeur);
      if (Object.keys(imbrique).length) resultat[cle] = imbrique;
      continue;
    }

    resultat[cle] = valeur;
  }

  return resultat;
}

/** Convertit une date ISO en valeur d'input type="date" (aaaa-mm-jj). */
export const dateInput = (valeur) => (valeur ? String(valeur).slice(0, 10) : '');

/** Affichage court d'une date (jj/mm/aaaa), ou tiret si absente. */
export const dateCourte = (valeur) =>
  valeur ? new Date(valeur).toLocaleDateString('fr-FR') : '—';

/** Montant en francs CFA, sans decimales. */
export const montant = (valeur) =>
  typeof valeur === 'number'
    ? `${valeur.toLocaleString('fr-FR')} FCFA`
    : '—';
