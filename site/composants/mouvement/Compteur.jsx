'use client';

/**
 * Chiffre cle qui se compte a l'entree dans le champ de vision.
 *
 * Le point delicat n'est pas l'animation, c'est de ne pas casser le chiffre
 * pour ceux qui ne la verront pas. Trois cas cohabitent :
 *
 * - SANS JAVASCRIPT, ou au rendu serveur : l'etat initial porte deja la valeur
 *   finale. Le HTML livre contient « 16 000 », pas « 0 ». Un moteur de
 *   recherche indexe donc le vrai chiffre ;
 * - AU LECTEUR D'ECRAN : le nombre qui defile est masque (`aria-hidden`) et
 *   double d'un libelle complet. Sans cela, la synthese vocale annoncerait une
 *   valeur intermediaire, prise au hasard du moment ou elle passe ;
 * - EN MOUVEMENT REDUIT : rien ne bouge, la valeur s'affiche directement.
 */

import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';
import { usePrefersReducedMotion } from '@/lib/mouvement';
import { formater } from '@/lib/nombres';

export default function Compteur({ valeur, prefixe = '', suffixe = '', duree = 1.8 }) {
  const ancre = useRef(null);
  const visible = useInView(ancre, { once: true, margin: '0px 0px -20% 0px' });
  const mouvementReduit = usePrefersReducedMotion();

  // Valeur finale des le depart : c'est elle qui part dans le HTML du serveur.
  const [affiche, setAffiche] = useState(valeur);

  useEffect(() => {
    if (!visible || mouvementReduit) return undefined;

    const controles = animate(0, valeur, {
      duration: duree,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setAffiche,
    });

    // Si le composant disparait en cours de route, on remet la valeur juste :
    // une animation interrompue laisserait un chiffre faux a l'ecran.
    return () => {
      controles.stop();
      setAffiche(valeur);
    };
  }, [visible, mouvementReduit, valeur, duree]);

  const complet = `${prefixe}${formater(valeur)}${suffixe}`;

  return (
    <span ref={ancre}>
      <span aria-hidden="true">
        {prefixe}
        {formater(affiche)}
        {suffixe}
      </span>
      <span className="sr-only">{complet}</span>
    </span>
  );
}
