'use client';

/**
 * Defilement doux (Lenis).
 *
 * Lenis intercepte la molette et anime la position de la page plutot que de la
 * deplacer par sauts. L'effet est discret mais il porte tout le reste : les
 * apparitions au scroll et l'ouverture de l'ordinateur 3D de la Phase 2 sont
 * pilotees par cette meme position.
 *
 * Le composant ne rend rien. Il s'installe une fois dans la mise en page racine
 * et se retire proprement — un Lenis oublie continue d'ecouter la molette apres
 * une navigation et finit par en faire tourner deux en parallele.
 */

import { useEffect } from 'react';
import Lenis from 'lenis';
import { usePrefersReducedMotion } from '@/lib/mouvement';

export default function LisseurScroll() {
  const mouvementReduit = usePrefersReducedMotion();

  useEffect(() => {
    // Mouvement reduit : on laisse le defilement natif du navigateur, qui est
    // instantane et previsible. C'est exactement ce que la preference demande.
    if (mouvementReduit) return undefined;

    const lenis = new Lenis({
      duration: 1.1,
      // Meme courbe que les transitions CSS : depart franc, arrivee amortie.
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      // Le defilement tactile reste natif : sur telephone, l'inertie du systeme
      // est deja bonne, et la doubler donne une sensation de flottement.
      smoothWheel: true,
      syncTouch: false,
    });

    let image;
    const boucle = (temps) => {
      lenis.raf(temps);
      image = requestAnimationFrame(boucle);
    };
    image = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(image);
      lenis.destroy();
    };
  }, [mouvementReduit]);

  return null;
}
