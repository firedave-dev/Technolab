/**
 * Capture de rendu, pour verifier a l'oeil ce que le design system produit.
 *
 * Pilote le Chrome de test installe par puppeteer. L'Edge du systeme a ete
 * ecarte : son mode headless se detache du processus appelant et n'ecrit le
 * fichier qu'aleatoirement, ce qui rend la verification peu fiable.
 *   node capture.mjs [url]
 *
 * LES CAPTURES SONT PRISES EN « MOUVEMENT REDUIT », pour deux raisons :
 *
 * - technique : Lenis pilote le defilement image par image et ANNULE tout
 *   `window.scrollTo` programme. Un script qui fait defiler la page pour
 *   declencher les apparitions obtient donc un resultat different a chaque
 *   execution — on a vu la meme page rendre deux sections differentes vides
 *   d'un essai a l'autre. En mouvement reduit, Lenis ne s'installe pas et les
 *   blocs sont rendus tels quels : la capture devient reproductible ;
 *
 * - de fond : c'est un vrai parcours utilisateur, celui des visiteurs ayant
 *   active la preference systeme, et il merite d'etre verifie a l'oeil.
 *
 * Le declenchement des apparitions se verifie separement avec diagnostic.mjs,
 * qui mesure l'opacite calculee plutot que de la photographier.
 */
import puppeteer from 'puppeteer';

const CIBLE = process.argv[2] || 'http://localhost:4311/';

const navigateur = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
  ],
});

const VUES = [
  { nom: 'accueil-desktop', largeur: 1440, hauteur: 900 },
  { nom: 'accueil-mobile', largeur: 390, hauteur: 844, mobile: true },
];

for (const { nom, largeur, hauteur, mobile } of VUES) {
  const page = await navigateur.newPage();

  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);

  await page.setViewport({
    width: largeur,
    height: hauteur,
    deviceScaleFactor: 2,
    isMobile: Boolean(mobile),
    hasTouch: Boolean(mobile),
  });

  // « load » plutot que « networkidle » : Next garde une connexion ouverte
  // pour la navigation, si bien que le reseau n'est jamais totalement au repos.
  await page.goto(CIBLE, { waitUntil: 'load', timeout: 60000 });

  await new Promise((r) => setTimeout(r, 1200));

  await page.screenshot({ path: `rendus/${nom}.png`, fullPage: true });
  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }));
  console.log(`  ${nom}.png  ${width}x${height} css`);

  // Le debordement horizontal est le defaut de mise en page le plus courant, et
  // le plus invisible sur grand ecran : on le signale a chaque capture.
  if (width > largeur) {
    console.log(`     ATTENTION : debordement horizontal de ${width - largeur} px`);
  }

  await page.close();
}

await navigateur.close();
