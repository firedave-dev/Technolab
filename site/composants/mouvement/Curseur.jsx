'use client';

/**
 * Cercle qui suit le pointeur, et grossit au survol des elements cliquables.
 *
 * UN PARTI PRIS D'ACCESSIBILITE : le curseur natif n'est PAS masque. La plupart
 * des mises en oeuvre le cachent pour le remplacer, ce qui a deux couts reels —
 * le cercle accuse toujours un retard sur le pointeur, si bien que la cible
 * pointee devient imprecise ; et en cas d'erreur JavaScript, l'utilisateur se
 * retrouve sans curseur du tout. Ici le cercle s'ajoute au pointeur au lieu de
 * s'y substituer : il decore, il ne remplace rien.
 *
 * Le composant ne s'installe que sur un pointeur de precision — souris ou
 * pave tactile. Sur un ecran tactile, il n'y a pas de survol, donc rien a
 * suivre.
 */

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/mouvement';

/** Ce qui declenche l'agrandissement : tout ce qui se clique ou se saisit. */
const CIBLES = 'a, button, [role="button"], input, textarea, select, summary';

export default function Curseur() {
  const cercle = useRef(null);
  const mouvementReduit = usePrefersReducedMotion();
  const [actif, setActif] = useState(false);

  // Le montage ne se decide qu'au client : `matchMedia` n'existe pas au rendu
  // serveur, et un cercle rendu puis retire ferait clignoter la page.
  useEffect(() => {
    setActif(window.matchMedia('(pointer: fine)').matches);
  }, []);

  useEffect(() => {
    if (!actif || mouvementReduit) return undefined;

    const noeud = cercle.current;
    if (!noeud) return undefined;

    // Position visee (le pointeur) et position rendue (le cercle). L'ecart
    // entre les deux, rattrape a chaque image, produit la traine.
    let viseX = window.innerWidth / 2;
    let viseY = window.innerHeight / 2;
    let x = viseX;
    let y = viseY;
    let echelle = 1;
    let echelleVisee = 1;
    let image;

    const surDeplacement = (e) => {
      viseX = e.clientX;
      viseY = e.clientY;
      echelleVisee = e.target.closest?.(CIBLES) ? 2.4 : 1;
    };

    // Le cercle disparait quand le pointeur quitte la fenetre, plutot que de
    // rester fige sur un bord.
    const surSortie = () => { noeud.style.opacity = '0'; };
    const surEntree = () => { noeud.style.opacity = '1'; };

    const rendre = () => {
      // Interpolation simple : on comble 18 % de l'ecart par image. Assez pour
      // suivre, assez peu pour que la traine se voie.
      x += (viseX - x) * 0.18;
      y += (viseY - y) * 0.18;
      echelle += (echelleVisee - echelle) * 0.18;
      noeud.style.transform =
        `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${echelle})`;
      image = requestAnimationFrame(rendre);
    };

    window.addEventListener('pointermove', surDeplacement, { passive: true });
    document.addEventListener('pointerleave', surSortie);
    document.addEventListener('pointerenter', surEntree);
    image = requestAnimationFrame(rendre);

    return () => {
      window.removeEventListener('pointermove', surDeplacement);
      document.removeEventListener('pointerleave', surSortie);
      document.removeEventListener('pointerenter', surEntree);
      cancelAnimationFrame(image);
    };
  }, [actif, mouvementReduit]);

  if (!actif || mouvementReduit) return null;

  return (
    <div
      ref={cercle}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] h-6 w-6 rounded-full
                 border border-ista/60 opacity-0 mix-blend-multiply
                 transition-opacity duration-300 will-change-transform"
    />
  );
}
