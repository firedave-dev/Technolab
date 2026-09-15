/**
 * Regle d'immuabilite des notes saisies.
 *
 * MODULE PUR : aucune lecture de base, d'environnement ni d'horloge.
 *
 * POURQUOI CETTE REGLE. Un enseignant qui peut revenir indefiniment sur une note
 * deja enregistree est un enseignant qu'on peut aller voir apres coup. Figer la
 * note des son enregistrement retire l'objet meme de la sollicitation : il n'y a
 * plus rien a negocier, puisque l'enseignant lui-meme ne peut plus rien changer.
 *
 * La correction d'erreur reste evidemment possible, mais elle remonte a la
 * direction : elle laisse donc une trace et passe par un tiers.
 *
 * Ce que la regle NE FAIT PAS : elle n'empeche pas de completer. Une case encore
 * vide peut etre remplie a tout moment — un professeur qui saisit ses notes de
 * classe en octobre et ses notes d'examen en janvier travaille normalement.
 * Seule la MODIFICATION d'une valeur deja posee est refusee.
 */
import { ROLES } from '../config/roles.js';

/** Seule la direction corrige une note deja enregistree. */
export const ROLES_CORRECTION = [ROLES.ADMIN, ROLES.DIRECTEUR];

export const peutCorriger = (role) => ROLES_CORRECTION.includes(role);

/** Une valeur est-elle deja posee ? `null` et `undefined` signifient « vide ». */
const estPosee = (valeur) => valeur !== null && valeur !== undefined;

/**
 * Cellules figees pour cet acteur, pour une ligne donnee.
 * Sert a l'affichage : le formulaire rend ces champs non modifiables.
 */
export function cellulesFigees(existant, role) {
  if (peutCorriger(role)) return { noteClasse: false, noteExamen: false };
  return {
    noteClasse: estPosee(existant?.noteClasse),
    noteExamen: estPosee(existant?.noteExamen),
  };
}

/**
 * Tentatives de modification d'une note deja enregistree.
 *
 * @param {Array}  lignes   lignes recues, portant `etudiant`, `noteClasse`, `noteExamen`
 * @param {Map}    deja     notes existantes, indexees par identifiant d'etudiant (chaine)
 * @param {string} role     role de l'acteur
 * @returns {Array} conflits ; vide si la saisie est recevable
 */
export function conflitsDeSaisie(lignes, deja, role) {
  if (peutCorriger(role)) return [];

  const conflits = [];

  for (const ligne of lignes) {
    const existant = deja.get(String(ligne.etudiant));
    if (!existant) continue;

    for (const champ of ['noteClasse', 'noteExamen']) {
      const ancienne = existant[champ];
      if (!estPosee(ancienne)) continue;           // case vide : libre

      const proposee = ligne[champ];
      if (proposee === undefined) continue;        // champ non transmis : inchange

      // `null` est une demande de SUPPRESSION. Elle doit etre refusee comme une
      // modification : sans ce cas explicite, effacer une note de 0 passerait,
      // Number(null) valant 0.
      if (proposee === null) {
        conflits.push({ etudiant: String(ligne.etudiant), champ, ancienne, proposee: null });
        continue;
      }

      if (Number(proposee) !== Number(ancienne)) {
        conflits.push({ etudiant: String(ligne.etudiant), champ, ancienne, proposee });
      }
    }
  }

  return conflits;
}

/** Message unique adresse a l'enseignant dont la saisie est refusee. */
export function messageRefus(conflits) {
  const cases = conflits.length;
  return `${cases} note(s) déjà enregistrée(s) ne peuvent plus être modifiées. `
    + 'Une note saisie est définitive : en cas d’erreur, signalez-la à la direction, '
    + 'seule habilitée à la corriger.';
}
