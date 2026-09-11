'use client';

/**
 * Apparition a l'entree dans le champ de vision.
 *
 * Fondu plus montee de quelques pixels, une seule fois.
 *
 * LE POINT DELICAT — et il a ete constate, pas suppose. Passer `initial` a un
 * composant Motion fait ecrire `style="opacity:0"` DANS LE HTML DU SERVEUR.
 * Tant que le JavaScript n'a pas pris la main, les sections concernees sont donc
 * invisibles : sur une connexion lente, un appareil qui abandonne le
 * telechargement, ou simplement un chunk en erreur, le visiteur voit une page
 * vide alors que le texte est bien la. Sur le public vise — connexions limitees,
 * telephones modestes — ce n'est pas un cas theorique.
 *
 * Le composant rend donc ses enfants NUS au serveur et au premier rendu client,
 * puis bascule en mode anime depuis un effet de mise en page. Cet effet
 * s'execute avant que le navigateur ne peigne : le passage de « visible » a
 * « masque, pret a apparaitre » ne produit aucun clignotement, et le HTML livre
 * reste lisible sans JavaScript.
 *
 * L'animation ne rejoue pas au retour (`once`) : une page dont les blocs
 * refondent a chaque passage devient fatigante des la deuxieme lecture.
 */

import { useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'motion/react';
import { usePrefersReducedMotion } from '@/lib/mouvement';

// `useLayoutEffect` n'existe pas au rendu serveur : React y emet un
// avertissement. On retombe sur `useEffect`, jamais execute la de toute facon.
const useEffetAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function Reveal({
  children,
  /** Retard en secondes — sert a echelonner les elements d'une meme rangee. */
  retard = 0,
  /** Amplitude de la montee, en pixels. */
  distance = 24,
  className,
  as = 'div',
}) {
  const mouvementReduit = usePrefersReducedMotion();
  const [anime, setAnime] = useState(false);

  useEffetAvantPeinture(() => setAnime(true), []);

  // Rendu serveur, premier rendu client, et mouvement reduit : contenu nu.
  if (!anime || mouvementReduit) {
    const Simple = as;
    return <Simple className={className}>{children}</Simple>;
  }

  const Balise = motion[as] ?? motion.div;

  return (
    <Balise
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{
        once: true,
        // Le bloc se declenche quand son haut a depasse d'un quart la base de
        // l'ecran : assez tot pour que l'animation soit finie a la lecture.
        margin: '0px 0px -25% 0px',
      }}
      transition={{
        duration: 0.7,
        delay: retard,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </Balise>
  );
}
