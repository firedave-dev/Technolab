'use client';

/**
 * Emplacement de l'ordinateur dans le hero : decide quoi y afficher, et pilote
 * la scene sans jamais provoquer de rendu React.
 *
 * LA SUPERPOSITION EST LE POINT CENTRAL. L'image de repli est TOUJOURS presente,
 * au fond. La scene 3D vient se poser par-dessus, et l'image ne s'efface qu'une
 * fois le modele pret. Il en decoule quatre proprietes qu'une bascule
 * « ou l'un, ou l'autre » ne donnerait pas :
 *
 * - sans JavaScript, le hero reste complet — c'est une vraie balise <img> ;
 * - le plus grand element du premier ecran s'affiche tout de suite, sans
 *   attendre le moteur 3D ni le modele ;
 * - il n'y a aucun clignotement : la scene remplace une image deja cadree de
 *   facon identique, dans un fondu ;
 * - si le telechargement du modele echoue, l'image reste. La page n'a pas de
 *   trou, et personne n'a besoin d'etre prevenu.
 *
 * LE MOUVEMENT NE PASSE PAS PAR L'ETAT REACT. Defilement et position du curseur
 * sont ecrits dans des refs, lues dans la boucle de rendu de la scene. Les
 * stocker dans un `useState` declencherait un rendu React par image, soixante
 * par seconde, pour deplacer un objet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePointeurPrecis, useRendu3D } from '@/lib/capacites';
import ReplisStatique from './ReplisStatique';
import { COURSE, OUVERTURE_INITIALE } from './pose';

/*
 * Import dynamique, sans rendu serveur : c'est lui qui isole le moteur 3D dans
 * son propre fichier. Sans `ssr: false`, Next tenterait de rendre un canevas
 * WebGL cote serveur, ou il n'y a pas de contexte graphique.
 */
const CanevasOrdinateur = dynamic(() => import('./CanevasOrdinateur'), { ssr: false });

export default function SceneOrdinateur() {
  const rendu = useRendu3D();
  const pointeurPrecis = usePointeurPrecis();

  const conteneur = useRef(null);
  const progression = useRef(OUVERTURE_INITIALE);
  const pointeur = useRef({ x: 0, y: 0 });
  const [pret, setPret] = useState(false);

  /*
   * Drapeau pose par scripts/rendre-repli.mjs avant le chargement de la page,
   * pour obtenir une image reproductible. Il n'est atteignable ni par une URL
   * ni par une interaction : seul un script qui controle le navigateur peut le
   * definir, ce qui le tient hors de portee d'un visiteur.
   */
  const [fige, setFige] = useState(false);
  useEffect(() => setFige(Boolean(window.__RENDU_REPLI__)), []);

  const surPret = useCallback(() => setPret(true), []);

  // --- Defilement -> ouverture ---
  useEffect(() => {
    if (rendu !== '3d') return undefined;

    const calculer = () => {
      const course = window.innerHeight * COURSE;
      const avance = course > 0 ? Math.min(1, window.scrollY / course) : 1;
      progression.current = OUVERTURE_INITIALE + (1 - OUVERTURE_INITIALE) * avance;
    };

    calculer();
    window.addEventListener('scroll', calculer, { passive: true });
    window.addEventListener('resize', calculer, { passive: true });
    return () => {
      window.removeEventListener('scroll', calculer);
      window.removeEventListener('resize', calculer);
    };
  }, [rendu]);

  // --- Curseur -> parallaxe ---
  useEffect(() => {
    if (rendu !== '3d' || !pointeurPrecis) return undefined;

    const surDeplacement = (e) => {
      const cadre = conteneur.current?.getBoundingClientRect();
      if (!cadre) return;
      // Position du pointeur rapportee au centre du cadre, dans [-1, 1].
      pointeur.current = {
        x: ((e.clientX - cadre.left) / cadre.width) * 2 - 1,
        y: ((e.clientY - cadre.top) / cadre.height) * 2 - 1,
      };
    };

    window.addEventListener('pointermove', surDeplacement, { passive: true });
    return () => window.removeEventListener('pointermove', surDeplacement);
  }, [rendu, pointeurPrecis]);

  return (
    <div
      ref={conteneur}
      className="relative aspect-[4/3] w-full"
      // Repere stable pour les scripts de verification.
      data-scene=""
      /*
       * La scene est DECORATIVE. Elle illustre, elle n'informe pas : tout ce
       * qu'elle montre est deja dit par le texte a sa gauche. Elle est donc
       * retiree de l'arbre d'accessibilite plutot que decrite, ce qui evite
       * d'imposer a un lecteur d'ecran une description sans valeur.
       */
      aria-hidden="true"
    >
      {/* Fond : toujours la, rendu par le serveur, jamais demonte. */}
      <ReplisStatique
        className={`absolute inset-0 transition-opacity duration-700 ease-douce ${
          pret ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {rendu === '3d' && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-douce ${
            pret ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CanevasOrdinateur
            progression={progression}
            pointeur={pointeur}
            surPret={surPret}
            fige={fige}
          />
        </div>
      )}
    </div>
  );
}
