'use client';

/**
 * L'ordinateur portable du hero.
 *
 * Trois mouvements se superposent, et ils ont chacun une raison d'etre :
 *
 * 1. L'OUVERTURE est pilotee par le defilement. Le modele porte une animation de
 *    six secondes qui fait pivoter la charniere de l'ecran (noeud `Cube.001_1`).
 *    Plutot que de la jouer, on la parcourt : `mixer.setTime()` place la tete de
 *    lecture a l'endroit correspondant a la position de la page. L'objet devient
 *    ainsi une jauge de progression, pas une decoration qui tourne en boucle.
 *
 * 2. LE FLOTTEMENT est une sinusoide lente sur l'axe vertical. Sans lui, une
 *    scene 3D immobile se distingue mal d'une image — c'est ce leger decalage
 *    qui signale que l'objet est bien en volume.
 *
 * 3. LA PARALLAXE suit le curseur, avec un amortissement. Elle ne tourne jamais
 *    l'objet au-dela de quelques degres : au-dela, le portable se met a « viser »
 *    le pointeur et l'effet devient un jouet.
 *
 * AUCUN DE CES TROIS MOUVEMENTS NE PASSE PAR UN RENDU REACT. Les valeurs sont
 * lues dans des refs mises a jour en dehors du cycle de rendu, et appliquees
 * dans `useFrame`. Faire autrement declencherait un rendu React a chaque image
 * de defilement, soit soixante par seconde, pour deplacer un objet.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, SRGBColorSpace, Vector3 } from 'three';
import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { OUVERTURE_INITIALE } from './pose';

/*
 * Le modele est servi SANS ses textures, et la texture lui est fournie a part.
 *
 * Le fichier d'origine pesait 759 Ko, dont 709 Ko d'images PNG : l'atlas du
 * clavier et de l'ecran, plus une seconde image qu'aucun materiau ne
 * referencait. La geometrie seule tient en 55 Ko, et l'atlas recompose en WebP
 * en 60 Ko — 115 Ko au lieu de 759. Sur une connexion limitee, la difference
 * separe un hero qui s'affiche d'un hero qu'on attend.
 *
 * Voir scripts/alleger-modele.py et scripts/composer-atlas.py.
 */
const CHEMIN = '/models/laptop-geometrie.glb';
const CHEMIN_TEXTURE = '/models/laptop-ecran.webp';

/** Duree de l'animation portee par le fichier, en secondes. */
const DUREE = 6;

/**
 * Sens de lecture de l'animation.
 *
 * Le modele est distribue avec une animation de FERMETURE : a t = 0 l'ecran est
 * ouvert, a t = 6 il est rabattu. Le hero veut l'inverse — ecran ferme en haut
 * de page, ouvert a mesure qu'on descend — on parcourt donc la piste a rebours.
 */
const progressionVersTemps = (p) => DUREE * (1 - p);

/**
 * Correction du cadrage, en unites de scene.
 *
 * Centrer la BOITE ENGLOBANTE sur l'axe de la camera ne centre pas l'objet a
 * l'ecran : en perspective, la silhouette projetee d'un objet asymetrique ne se
 * repartit pas autour de la projection de son centre. Ici l'ecran, haut et
 * recule, et la base, large et avancee, tirent la silhouette vers le bas et
 * vers la gauche — de neuf et quatre pour cent du cadre, mesures sur le rendu.
 *
 * Les valeurs ci-dessous compensent cet ecart, exprimees dans le repere de la
 * scene : l'axe « droite de l'ecran » vaut ici (-0,98 ; 0 ; +0,20), et l'axe
 * « haut de l'ecran » se confond avec +Y.
 *
 * A revoir si la camera bouge : la correction depend de l'angle de vue, et son
 * amplitude de la distance — rapprocher la camera de 15 % a demande de reduire
 * ces valeurs d'autant, l'ecart se mesurant en fraction du cadre.
 */
const CORRECTION_SILHOUETTE = [-0.0765, 0.1246, 0.0151];

/** Amplitude du flottement vertical, en unites de scene. */
const AMPLITUDE_FLOTTEMENT = 0.045;

/**
 * Inclinaison maximale induite par le curseur, en radians (~4°).
 *
 * Reduite en meme temps que la camera s'est rapprochee : a taille d'objet plus
 * grande, une meme rotation se lit comme un mouvement plus ample, et elargit
 * davantage la silhouette dans le cadre.
 */
const AMPLITUDE_PARALLAXE = 0.07;

/** Amplitude de l'oscillation de fond, presente meme curseur immobile. */
const AMPLITUDE_OSCILLATION = 0.05;

export default function Ordinateur({ progression, pointeur, surPret, fige = false }) {
  const groupe = useRef(null);
  const { scene, animations } = useGLTF(CHEMIN);
  const { actions, mixer } = useAnimations(animations, groupe);

  const [decalage, setDecalage] = useState([0, 0, 0]);

  /*
   * Application de la texture.
   *
   * `flipY = false` est la convention glTF : ses coordonnees partent du haut de
   * l'image, la ou three les attend par defaut depuis le bas. Sans cette ligne,
   * l'ecran s'afficherait a la place du clavier.
   *
   * `SRGBColorSpace` indique que l'image porte des couleurs deja corrigees. Sans
   * lui, three la traite comme des valeurs lineaires et le rendu part dans les
   * tons delaves.
   */
  const texture = useTexture(CHEMIN_TEXTURE);

  useMemo(() => {
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;

    scene.traverse((objet) => {
      if (!objet.isMesh || !objet.material) return;
      objet.material.map = texture;
      objet.material.needsUpdate = true;
    });
  }, [scene, texture]);

  // Position de depart de la sinusoide, conservee entre les images.
  const hauteurInitiale = useRef(null);

  useLayoutEffect(() => {
    const action = actions[Object.keys(actions)[0]];
    if (!action) return undefined;

    // L'action doit etre « en cours » pour que le mixer accepte de la
    // positionner ; on la met en pause aussitot, et c'est le defilement qui
    // deplacera la tete de lecture.
    action.play();
    action.paused = true;

    /*
     * Recentrage du modele.
     *
     * Le fichier pose l'ordinateur sur y = 0 : son centre reel est a
     * mi-hauteur, pas a l'origine, et une camera qui vise l'origine cadre donc
     * le dessous de l'objet.
     *
     * On ne mesure pas une seule pose mais la REUNION des deux extremes,
     * ecran ferme et ecran ouvert. Mesurer la seule pose d'origine centrait
     * l'objet fermé, et l'ouverture le faisait ensuite deriver hors du cadre —
     * un decalage de pres de neuf pour cent de la hauteur au bout de la course.
     * La reunion garantit que l'ordinateur reste cadre du haut de page jusqu'en
     * bas, quelle que soit la position du defilement.
     */
    const boite = new Box3();
    const etendue = new Box3();

    for (const temps of [progressionVersTemps(0), progressionVersTemps(1)]) {
      mixer.setTime(temps);
      scene.updateMatrixWorld(true);
      etendue.union(boite.setFromObject(scene));
    }

    const centre = etendue.getCenter(new Vector3());
    setDecalage([
      -centre.x + CORRECTION_SILHOUETTE[0],
      -centre.y + CORRECTION_SILHOUETTE[1],
      -centre.z + CORRECTION_SILHOUETTE[2],
    ]);
    surPret?.();

    return () => action.stop();
  }, [actions, mixer, scene, surPret]);

  useFrame((etat) => {
    const noeud = groupe.current;
    if (!noeud) return;

    if (hauteurInitiale.current === null) hauteurInitiale.current = noeud.position.y;

    /*
     * Mode fige : ecran ouvert, aucun mouvement. Il n'existe que pour le script
     * qui produit l'image de repli (scripts/rendre-repli.mjs) — flottement et
     * parallaxe donneraient sinon une image differente a chaque execution, et
     * le repli cesserait de coincider avec la scene qu'il remplace.
     */
    if (fige) {
      mixer.setTime(progressionVersTemps(OUVERTURE_INITIALE));
      noeud.position.y = hauteurInitiale.current;
      noeud.rotation.set(0, 0, 0);
      return;
    }

    // --- 1. Ouverture au defilement ---
    const p = Math.min(1, Math.max(0, progression.current));
    mixer.setTime(progressionVersTemps(p));

    // --- 2. Flottement ---
    const t = etat.clock.elapsedTime;
    noeud.position.y = hauteurInitiale.current + Math.sin(t * 0.6) * AMPLITUDE_FLOTTEMENT;

    // --- 3. Oscillation de fond, puis parallaxe au curseur ---
    // Une rotation continue transformerait le portable en objet de vitrine
    // tournante ; une oscillation lente donne la meme impression de vie sans
    // jamais presenter l'arriere de l'ecran.
    const lacetDeFond = Math.sin(t * 0.22) * AMPLITUDE_OSCILLATION;

    const viseLacet = lacetDeFond + pointeur.current.x * AMPLITUDE_PARALLAXE;
    const viseTangage = pointeur.current.y * AMPLITUDE_PARALLAXE * 0.6;

    // Amortissement : on comble une fraction de l'ecart par image, ce qui donne
    // au mouvement une inertie plutot qu'un suivi rigide du pointeur.
    noeud.rotation.y += (viseLacet - noeud.rotation.y) * 0.05;
    noeud.rotation.x += (viseTangage - noeud.rotation.x) * 0.05;
  });

  return (
    // Le groupe exterieur porte les mouvements ; l'interieur ne sert qu'au
    // recentrage, pour que rotation et flottement s'appliquent autour du
    // centre de l'objet et non de son pied.
    <group ref={groupe} dispose={null}>
      <group position={decalage}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// Le fichier part en telechargement des que ce module est evalue, sans attendre
// que le composant soit monte.
useGLTF.preload(CHEMIN);
useTexture.preload(CHEMIN_TEXTURE);
