import Photo, { supportePleineLargeur } from './Photo';
import { PHOTOS } from '@/contenu/donnees/photos';

/**
 * Photographie en pleine largeur.
 *
 * UNE CONTRAINTE HERITEE DES CLICHES, pas un parti pris esthetique : six des
 * huit photographies fournies ne font que 292 px de large. Etalees sur un ecran
 * de 1440 px, elles seraient agrandies cinq fois — le flou remplacerait le
 * detail, et une bande pleine largeur floue fait plus de mal qu'une image
 * absente.
 *
 * Le composant refuse donc les cliches trop petits, et le dit pendant le
 * developpement plutot que de livrer une image degradee. Seuls `remise-diplomes`
 * (1000 px) et `segou-art` (708 px) passent le seuil aujourd'hui.
 *
 * La hauteur est bornee : une photographie qui occupe tout l'ecran oblige a
 * defiler pour retrouver le texte, ce qui coupe la lecture au lieu de la
 * ponctuer.
 */
export default function BandePhoto({ nom, legende, hauteur = 'moyenne' }) {
  if (!supportePleineLargeur(nom)) {
    if (process.env.NODE_ENV !== 'production') {
      const l = PHOTOS[nom]?.largeur ?? 0;
      console.warn(
        `[BandePhoto] « ${nom} » ne fait que ${l} px de large : trop peu pour une `
        + 'bande pleine largeur. Utilisez <Photo> dans une colonne.'
      );
    }
    return null;
  }

  const hauteurs = {
    basse: 'h-[clamp(14rem,26vw,20rem)]',
    moyenne: 'h-[clamp(18rem,38vw,30rem)]',
  };

  return (
    <figure className="relative">
      <div className={`relative w-full overflow-hidden ${hauteurs[hauteur]}`}>
        <Photo nom={nom} couvrante tailles="100vw" />
      </div>

      {legende && (
        <figcaption className="mx-auto max-w-page px-6 pt-4 text-sm text-neutre md:px-10">
          {legende}
        </figcaption>
      )}
    </figure>
  );
}
