/**
 * Photographie du site public.
 *
 * Trois problemes que ce composant traite une fois pour toutes :
 *
 * 1. LE FORMAT. Chaque cliche existe en AVIF et en WebP. `<picture>` laisse le
 *    navigateur prendre le premier qu'il sait lire, et l'AVIF pese environ 30 %
 *    de moins a qualite egale. Le `<img>` final porte le WebP : il n'est jamais
 *    utilise seul par un navigateur recent, mais il garantit qu'aucun visiteur
 *    ne se retrouve devant un cadre vide.
 *
 * 2. LE DECALAGE DE MISE EN PAGE. `width` et `height` portent les dimensions
 *    reelles du fichier. Le navigateur en deduit le rapport d'image et reserve
 *    la place avant le telechargement, au lieu de faire sauter le texte quand
 *    la photo arrive.
 *
 * 3. LE MOMENT DU CHARGEMENT. Tout est differe (`loading="lazy"`) sauf ce que
 *    le visiteur voit sans faire defiler la page. Pour cette image-la, et elle
 *    seule, `prioritaire` inverse la consigne : la differer retarderait
 *    l'affichage du premier ecran, qui est precisement ce que mesure un audit
 *    de performance.
 *
 * Les dimensions et le texte alternatif viennent de utils/photos.js, jamais de
 * l'appelant : une page ne peut donc pas decrire une photo autrement qu'une autre.
 */
import { PHOTOS } from '../utils/photos.js';

export default function Photo({
  nom,
  className = '',
  prioritaire = false,
  /**
   * Largeur d'affichage prevue, transmise telle quelle a l'attribut `sizes`.
   * N'a d'effet que sur les photos disposant d'une variante mobile.
   */
  tailles = '100vw',
}) {
  const photo = PHOTOS[nom];

  // Une photo absente du catalogue est une erreur de saisie : mieux vaut ne rien
  // afficher qu'un lien casse, et le signaler pendant le developpement.
  if (!photo) {
    if (import.meta.env.DEV) console.warn(`[Photo] « ${nom} » ne figure pas dans utils/photos.js`);
    return null;
  }

  const { largeur, hauteur, variante, alt } = photo;
  const source = (extension) => `/photos/${nom}.${extension}`;

  // La variante de demi-largeur n'existe que pour les cliches assez grands
  // pour que l'economie soit reelle.
  const jeuDeSources = (extension) =>
    variante
      ? `/photos/${nom}@0.5x.${extension} ${Math.round(largeur / 2)}w, ${source(extension)} ${largeur}w`
      : undefined;

  return (
    <picture>
      <source type="image/avif" srcSet={jeuDeSources('avif') || source('avif')} sizes={variante ? tailles : undefined} />
      <source type="image/webp" srcSet={jeuDeSources('webp') || source('webp')} sizes={variante ? tailles : undefined} />
      <img
        src={source('webp')}
        alt={alt}
        width={largeur}
        height={hauteur}
        loading={prioritaire ? 'eager' : 'lazy'}
        // « async » evite que le decodage de l'image bloque le rendu du texte.
        decoding="async"
        fetchPriority={prioritaire ? 'high' : undefined}
        className={className}
      />
    </picture>
  );
}
