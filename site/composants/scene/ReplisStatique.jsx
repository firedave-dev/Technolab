import Image from 'next/image';

/**
 * Image de repli de la scene 3D.
 *
 * ELLE EST RENDUE DEPUIS LA SCENE ELLE-MEME, par scripts/rendre-repli.mjs, avec
 * la meme camera, le meme eclairage et la meme ouverture d'ecran. C'est ce qui
 * garantit qu'un visiteur sur telephone modeste voit exactement le meme cadrage
 * qu'un visiteur en 3D — un export realise separement, depuis un autre outil,
 * aurait derive au premier reglage de camera.
 *
 * Elle sert dans trois situations : appareil juge trop juste, preference de
 * mouvement reduit, et le temps que le modele se telecharge. Dans ce dernier
 * cas elle porte le « Largest Contentful Paint » du hero, d'ou `priority`.
 */

/** Dimensions du fichier produit par le script de rendu. */
export const LARGEUR = 1200;
export const HAUTEUR = 900;

export default function ReplisStatique({ className = '' }) {
  return (
    <Image
      src="/images/ordinateur-repli.webp"
      alt=""
      width={LARGEUR}
      height={HAUTEUR}
      priority
      /*
       * Servie telle quelle, sans passer par l'optimiseur.
       *
       * Deux raisons, constatees et non supposees :
       *
       * - l'optimiseur REENCODE le fichier et perd le canal alpha. Les zones
       *   transparentes autour de l'ordinateur ressortaient en noir : un
       *   rectangle sombre au milieu d'un hero blanc ;
       * - il n'y a rien a optimiser. Le fichier est deja un WebP de vingt
       *   kilo-octets, produit a la taille exacte de son affichage par
       *   scripts/finaliser-repli.py. Le re-encoder ajoute une latence au
       *   premier affichage, un cache a invalider — et ce cache a effectivement
       *   servi une version perimee de l'image pendant la mise au point.
       */
      unoptimized
      className={`h-full w-full object-contain ${className}`}
    />
  );
}
