'use client';

/**
 * Faut-il afficher la scene 3D, ou son repli ?
 *
 * La decision a TROIS etats, et pas deux. Le troisieme — « indetermine » — dure
 * le temps d'un rendu, mais il est indispensable : le serveur ne connait ni le
 * materiel ni les preferences du visiteur. S'il tranchait, il se tromperait une
 * fois sur deux, et le client corrigerait ensuite a l'ecran. C'est exactement le
 * clignotement qu'on veut eviter.
 *
 * Pendant l'etat indetermine, on sert l'IMAGE DE REPLI. Ce choix n'est pas
 * neutre :
 *
 * - le HTML livre contient donc une vraie image, pas un cadre vide. Sans
 *   JavaScript, le hero reste complet ;
 * - cette image est le plus grand element du premier ecran, donc celui que
 *   mesure « Largest Contentful Paint ». La servir immediatement, plutot
 *   qu'apres le telechargement de trois cents kilo-octets de moteur 3D, est ce
 *   qui permet de tenir le budget de performance ;
 * - quand la 3D prend le relais, elle se superpose a une image deja cadree de
 *   facon identique. Le remplacement ne deplace rien.
 */

import { useEffect, useLayoutEffect, useState } from 'react';

// `useLayoutEffect` n'existe pas au rendu serveur : React y emet un
// avertissement. On retombe sur `useEffect`, jamais execute la de toute facon.
const useEffetAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Seuil de coeurs logiques en deca duquel on renonce a la 3D. */
const COEURS_MINIMUM = 4;

/**
 * Evalue l'appareil. Deux signaux, volontairement grossiers :
 *
 * - la PREFERENCE DE MOUVEMENT REDUIT, qui prime sur tout le reste. Un objet
 *   qui flotte et s'ouvre au defilement est precisement ce qu'elle refuse ;
 * - le NOMBRE DE COEURS LOGIQUES, qui separe assez bien un telephone d'entree
 *   de gamme d'un appareil recent. Le signal est imparfait — il ne dit rien du
 *   GPU — mais c'est le seul disponible sans mesurer, et mesurer supposerait
 *   d'avoir deja lance la scene.
 *
 * Le contexte tranche les cas douteux : une part importante du public visite
 * depuis des telephones modestes et des connexions limitees. Mieux vaut priver
 * de 3D quelques appareils capables que l'imposer a ceux qui ne le sont pas.
 */
function evaluer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'repli';

  const coeurs = navigator.hardwareConcurrency;
  if (typeof coeurs === 'number' && coeurs <= COEURS_MINIMUM) return 'repli';

  return '3d';
}

/** Renvoie « indetermine », « 3d » ou « repli ». */
export function useRendu3D() {
  const [rendu, setRendu] = useState('indetermine');

  useEffetAvantPeinture(() => {
    setRendu(evaluer());

    // La preference peut changer en cours de visite — reglages systeme ouverts
    // dans une autre fenetre, par exemple. La scene doit suivre.
    const liste = window.matchMedia('(prefers-reduced-motion: reduce)');
    const surChangement = () => setRendu(evaluer());
    liste.addEventListener('change', surChangement);
    return () => liste.removeEventListener('change', surChangement);
  }, []);

  return rendu;
}

/**
 * Le pointeur est-il precis (souris, pave tactile) ?
 * La parallaxe au curseur n'a de sens que la : un ecran tactile n'a pas de survol.
 */
export function usePointeurPrecis() {
  const [precis, setPrecis] = useState(false);

  useEffect(() => {
    const liste = window.matchMedia('(pointer: fine)');
    setPrecis(liste.matches);
    const surChangement = (e) => setPrecis(e.matches);
    liste.addEventListener('change', surChangement);
    return () => liste.removeEventListener('change', surChangement);
  }, []);

  return precis;
}
