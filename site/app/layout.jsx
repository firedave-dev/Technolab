import './globals.css';
import EnTete from '@/composants/structure/EnTete';
import PiedDePage from '@/composants/structure/PiedDePage';
import LisseurScroll from '@/composants/mouvement/LisseurScroll';
import Curseur from '@/composants/mouvement/Curseur';
import { ORIGINE, NOM_COMPLET, SIGLE } from '@/contenu/donnees/etablissement';

/**
 * Mise en page racine.
 *
 * `metadataBase` est ce qui rend absolues toutes les adresses relatives des
 * pages filles — canoniques, images de partage, plan de site. Sans elle, un lien
 * partage sur une messagerie n'affiche aucune vignette.
 *
 * Le gabarit de titre est declare ici et nulle part ailleurs : chaque page
 * n'ecrit que sa propre moitie.
 */
export const metadata = {
  metadataBase: new URL(ORIGINE),
  title: {
    default: `${SIGLE} — ${NOM_COMPLET}`,
    template: `%s — ${SIGLE}`,
  },
  description:
    'Établissement privé d’enseignement supérieur à Sévaré : 67 parcours du '
    + 'Bac+2 au Bac+5 en gestion, technologies et ingénierie. Diplômes reconnus CAMES.',
  applicationName: SIGLE,
  authors: [{ name: NOM_COMPLET }],
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/marque/icone-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/marque/icone-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/marque/icone-180.png',
  },
};

export const viewport = {
  themeColor: '#0B2E52',
  colorScheme: 'light',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/*
          La police latine porte la quasi-totalite du texte visible au premier
          ecran. La precharger evite le bref instant ou le titre s'affiche dans
          une police de repli, puis saute quand Archivo arrive.
          Le subset latin-ext n'est PAS precharge : il ne sert que quelques
          caracteres, et le precharger couterait une requete pour rien.
        */}
        <link
          rel="preload"
          href="/polices/archivo-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <a href="#contenu" className="lien-evitement">
          Aller au contenu principal
        </a>

        <LisseurScroll />
        <Curseur />

        <EnTete />

        {/*
          `tabIndex={-1}` rend la cible du lien d'evitement focusable : sans lui,
          le saut deplace la vue mais pas le focus clavier, et la tabulation
          suivante repart du haut de la page.
        */}
        <main id="contenu" tabIndex={-1}>
          {children}
        </main>

        <PiedDePage />
      </body>
    </html>
  );
}
