'use client';

/**
 * Socle commun a toutes les animations du site.
 *
 * Quatre composants s'animent — le defilement doux, les apparitions au scroll,
 * les compteurs et le curseur. S'ils lisaient chacun leur propre preference, il
 * faudrait verifier quatre implementations a chaque revue d'accessibilite, et il
 * suffirait qu'une seule oublie le cas pour que la page reste inconfortable.
 * Ils lisent donc tous ce hook.
 */

import { useSyncExternalStore } from 'react';

const REQUETE = '(prefers-reduced-motion: reduce)';

/**
 * `useSyncExternalStore` plutot qu'un `useEffect` + `useState` : la preference
 * existe des le premier rendu cote client, et cette API la lit sans provoquer
 * un rendu initial « anime » suivi d'une correction — ce clignotement etant
 * precisement ce que la preference cherche a eviter.
 */
function abonner(rappel) {
  const liste = window.matchMedia(REQUETE);
  liste.addEventListener('change', rappel);
  return () => liste.removeEventListener('change', rappel);
}

const lireClient = () => window.matchMedia(REQUETE).matches;

// Au rendu serveur, aucun media query n'est interrogeable. On suppose le
// mouvement autorise : le client corrigera immediatement si besoin, alors que
// l'hypothese inverse priverait la majorite des visiteurs des animations.
const lireServeur = () => false;

export function usePrefersReducedMotion() {
  return useSyncExternalStore(abonner, lireClient, lireServeur);
}

/**
 * L'appareil a-t-il de quoi faire tourner une scene 3D ?
 *
 * Deux signaux, volontairement grossiers :
 * - le nombre de coeurs logiques, qui separe correctement un telephone
 *   d'entree de gamme d'un appareil recent ;
 * - la preference de mouvement reduit, qui prime sur tout le reste.
 *
 * Le contexte compte : une part importante du public visite depuis des
 * telephones modestes et des connexions limitees. Mieux vaut refuser la 3D a
 * quelques appareils capables que l'imposer a ceux qui ne le sont pas.
 *
 * Utilise en Phase 2 par la scene du hero ; declare ici pour que la regle de
 * decision vive au meme endroit que la preference de mouvement.
 */
export function peutAfficherLa3D() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia(REQUETE).matches) return false;

  const coeurs = navigator.hardwareConcurrency;
  return typeof coeurs !== 'number' || coeurs > 4;
}
