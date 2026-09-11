'use client';

/**
 * Canevas WebGL du hero.
 *
 * Ce module est la FRONTIERE DU LOT 3D : il est le seul a importer
 * @react-three/fiber et three, et il n'est charge que par un import dynamique.
 * Tout ce qu'il tire — le moteur, le chargeur glTF — part donc dans un fichier
 * distinct, telecharge uniquement sur l'accueil et uniquement par les appareils
 * qui ont passe la detection de capacites. Les onze autres pages du site n'en
 * paient rien.
 *
 * L'eclairage se limite a deux sources, conformement a l'arbitrage rendu en
 * Phase 1 : sur un modele de 880 triangles a materiau mat et non emissif, un
 * bloom ou une profondeur de champ ajouteraient des passes plein ecran pour un
 * gain visuel quasi nul — et les paieraient sur les appareils les plus modestes,
 * qui sont justement ceux qu'on cherche a menager.
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Ordinateur from './Ordinateur';

export default function CanevasOrdinateur({ progression, pointeur, surPret, fige }) {
  return (
    <Canvas
      /*
       * Cadrage. La charniere du modele se trouve a z = +0,44 : l'ecran fait
       * donc face aux z NEGATIFS, et c'est de ce cote que doit se placer la
       * camera — la premiere version, posee en +z, ne montrait que le dos du
       * capot, noir et a contre-jour.
       *
       * Distance 2,51, soit 11 % de moins qu'au premier reglage : l'objet
       * gagne en presence sans que la mise en page bouge.
       *
       * Pourquoi pas les 15 % demandes : a cette distance, la silhouette
       * atteint 98 % du cadre en mouvement, c'est-a-dire qu'elle en touche le
       * bord. L'oscillation et la
       * parallaxe font tourner la scene de quelques degres, et une rotation en
       * lacet ELARGIT la silhouette d'un objet large et peu profond, ce qu'est
       * un portable ouvert. Le cadrage tenait a l'arret et rognait les bords des
       * que l'objet bougeait. Mesure : scripts/mesurer-debordement.mjs.
       *
       * L'angle de vue reste inchange — seule la distance varie — ce qui
       * preserve la direction de la correction de silhouette.
       */
      camera={{ position: [-0.4895, 0.2848, -2.4475], fov: 32 }}
      // `alpha` laisse passer le fond de la page : la scene n'a pas de decor,
      // elle se pose sur le blanc du hero.
      gl={{ antialias: true, alpha: true }}
      /*
       * La camera est orientee explicitement. R3F la place mais ne garantit pas
       * qu'elle vise le centre de la scene : sans cette ligne, le cadrage depend
       * d'un comportement par defaut qui a change entre deux versions.
       */
      onCreated={({ camera }) => camera.lookAt(0, 0.02, 0)}
      // Plafonner a 2 evite de rendre en 3x sur les ecrans de telephone haut de
      // gamme, ou la difference ne se voit pas mais se paie en pixels calcules.
      dpr={[1, 2]}
      // Le rendu ne tourne que lorsqu'une image est demandee. Combine au
      // declenchement ci-dessous, la boucle s'arrete quand rien ne bouge.
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={2.8} />
      {/* La source suit la camera : eclairer depuis +z mettrait la face
          visible a contre-jour. */}
      <directionalLight position={[-2, 3.5, -3]} intensity={2.2} />

      {/*
        Le Suspense interne couvre le telechargement du .glb. Il ne rend rien :
        l'image de repli, posee dessous par SceneOrdinateur, fait office
        d'attente — et elle est deja cadree comme la scene.
      */}
      <Suspense fallback={null}>
        <Ordinateur progression={progression} pointeur={pointeur} surPret={surPret} fige={fige} />
      </Suspense>
    </Canvas>
  );
}
