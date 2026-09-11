/**
 * Configuration Next.js du site vitrine.
 *
 * Les redirections 301 depuis lab.my-istime.xyz ne figurent PAS ici : elles
 * doivent etre posees sur le projet qui sert ce domaine, c'est-a-dire
 * l'application de gestion. Une redirection declaree ici ne s'appliquerait
 * qu'aux requetes qui atteignent deja ce site — donc jamais a celles qui
 * arrivent sur l'ancien domaine. Elles seront ajoutees en Phase 7, cote client/.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * Le depot contient trois package-lock.json (racine, client/, site/). Sans
   * cette ligne, Turbopack en choisit un au hasard comme racine de projet et
   * peut resoudre les modules depuis le mauvais arbre.
   */
  turbopack: { root: import.meta.dirname },

  // Rien a gagner a annoncer le framework a chaque reponse.
  poweredByHeader: false,

  images: {
    /*
     * AVIF d'abord, WebP en repli. Les sources versionnees sont en WebP :
     * Next reencode a la volee, ce qui evite de stocker deux fois chaque
     * cliche et de maintenir les variantes de taille a la main.
     */
    formats: ['image/avif', 'image/webp'],

    // Largeurs reellement utiles ici : les photos d'origine plafonnent a 1000 px.
    imageSizes: [128, 256, 384],
    deviceSizes: [384, 640, 828, 1080, 1200, 1920],
  },

  async headers() {
    return [
      {
        // Les fichiers de /public sont immuables : leur nom ne change jamais,
        // mais leur contenu non plus. Un an de cache, revalidation inutile.
        source: '/:chemin(polices|models|marque)/:fichier*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
