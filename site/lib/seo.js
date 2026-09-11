import { ORIGINE, SIGLE } from '@/contenu/donnees/etablissement';

/**
 * Fabrique des metadonnees d'une page.
 *
 * Next construit lui-meme les balises a partir de l'objet `metadata` exporte
 * par une page. Passer par cette fabrique plutot que d'ecrire l'objet a la main
 * garantit trois choses qu'on oublie autrement une page sur deux :
 *
 * - l'URL CANONIQUE est absolue et pointe sur le domaine de production. Une
 *   canonique relative ou pointant sur un domaine de preversion fait indexer la
 *   mauvaise adresse ;
 * - les metadonnees OPEN GRAPH reprennent le titre et la description, au lieu
 *   de les laisser vides — c'est ce qui s'affiche quand un lien est partage
 *   dans WhatsApp, le premier canal de diffusion ici ;
 * - le titre suit un GABARIT unique, defini une fois dans la mise en page
 *   racine.
 */

export const NOM_SITE = SIGLE;

export function metadonnees({
  titre,
  description,
  chemin = '/',
  image,
  indexable = true,
  type = 'website',
}) {
  const url = `${ORIGINE}${chemin}`;

  return {
    title: titre,
    description,
    alternates: { canonical: url },
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type,
      siteName: NOM_SITE,
      title: titre,
      description,
      url,
      locale: 'fr_FR',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: titre,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
