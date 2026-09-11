import Image from 'next/image';
import { PHOTOS } from '@/contenu/donnees/photos';

/**
 * Photographie du site.
 *
 * Les dimensions et le texte alternatif viennent du catalogue, jamais de
 * l'appelant : une page ne peut donc pas decrire un cliche autrement qu'une
 * autre, et une photo ne peut pas etre publiee sans description.
 *
 * UNE CONTRAINTE PROPRE A CES CLICHES : les originaux sont petits — 292 px de
 * large pour six des huit. `next/image` ne les agrandira pas, et il ne faut pas
 * l'y forcer : un agrandissement ne cree pas de detail, il rend le flou visible.
 * Les mises en page sont donc concues autour de la taille reelle, et `pleine`
 * n'est proposee que pour les deux clichés assez grands pour la supporter.
 */

/** Au-dela de cette largeur, une photo peut occuper toute la largeur d'ecran. */
const SEUIL_PLEINE_LARGEUR = 700;

export default function Photo({
  nom,
  className = '',
  /** Ne differer le chargement que pour ce qui est hors du premier ecran. */
  prioritaire = false,
  /** Indication de largeur d'affichage transmise au navigateur. */
  tailles = '(min-width: 768px) 50vw, 100vw',
  /** Recadre la photo dans le conteneur parent, qui doit etre positionne. */
  couvrante = false,
}) {
  const photo = PHOTOS[nom];

  if (!photo) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Photo] « ${nom} » ne figure pas dans contenu/donnees/photos.js`);
    }
    return null;
  }

  const commun = {
    src: `/photos/${nom}.webp`,
    alt: photo.alt,
    sizes: tailles,
    priority: prioritaire,
    // Sans priorite, on differe ; avec, Next pose lui-meme le prechargement.
    loading: prioritaire ? undefined : 'lazy',
    quality: 82,
  };

  if (couvrante) {
    return <Image {...commun} fill className={`object-cover ${className}`} />;
  }

  return (
    <Image
      {...commun}
      width={photo.largeur}
      height={photo.hauteur}
      className={className}
    />
  );
}

/** Le cliche est-il assez defini pour une section pleine largeur ? */
export const supportePleineLargeur = (nom) =>
  (PHOTOS[nom]?.largeur ?? 0) >= SEUIL_PLEINE_LARGEUR;
