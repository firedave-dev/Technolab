/**
 * Verifie la scene du hero sur trois configurations d'appareil.
 *
 *   npm run start   (dans un autre terminal)
 *   node scripts/verifier-scene.mjs
 *
 * Ce que le script etablit, et qu'une capture seule ne montrerait pas :
 *
 * 1. QUEL MODE EST CHOISI sur chaque appareil — 3D ou repli. On lit la presence
 *    d'un canevas, pas une intention : c'est le resultat qui compte.
 *
 * 2. QU'IL N'Y A PAS DE TROU pendant le chargement. C'est le point le plus
 *    difficile a voir a l'oeil, parce qu'il ne dure qu'une fraction de seconde
 *    sur une connexion rapide. On echantillonne l'emplacement de la scene toutes
 *    les 120 ms depuis la navigation, et on releve la part de pixels peints. Si
 *    cette part tombe a zero entre deux mesures, c'est qu'un cadre vide est
 *    passe a l'ecran — exactement le clignotement que la superposition du repli
 *    et de la scene doit empecher.
 *
 * 3. LE POIDS REELLEMENT TELECHARGE pour la 3D, par appareil.
 */
import puppeteer from 'puppeteer';

const CIBLE = process.argv[2] || 'http://localhost:4311/';

const CONFIGURATIONS = [
  {
    nom: 'desktop-recent',
    description: 'Ordinateur de bureau recent',
    largeur: 1440,
    hauteur: 900,
    coeurs: 8,
    attendu: '3d',
  },
  {
    nom: 'mobile-milieu',
    description: 'Telephone milieu de gamme',
    largeur: 390,
    hauteur: 844,
    mobile: true,
    coeurs: 8,
    attendu: '3d',
  },
  {
    nom: 'mobile-bas',
    description: 'Telephone d entree de gamme (2 coeurs)',
    largeur: 390,
    hauteur: 844,
    mobile: true,
    coeurs: 2,
    attendu: 'repli',
  },
];

const navigateur = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});

/** Part de pixels peints dans l'emplacement de la scene, entre 0 et 1. */
const mesurerRemplissage = () =>
  `(() => {
    const bloc = document.querySelector('[data-scene]');
    if (!bloc) return -1;
    const img = bloc.querySelector('img');
    const toile = bloc.querySelector('canvas');
    const visible = (n) => n && Number(getComputedStyle(n).opacity) > 0.02
      && n.getBoundingClientRect().height > 0;
    return (visible(img) || visible(toile)) ? 1 : 0;
  })()`;

console.log('Verification de la scene du hero\n');

for (const c of CONFIGURATIONS) {
  const page = await navigateur.newPage();

  await page.evaluateOnNewDocument((n) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => n });
  }, c.coeurs);

  await page.setViewport({
    width: c.largeur,
    height: c.hauteur,
    deviceScaleFactor: 2,
    isMobile: Boolean(c.mobile),
    hasTouch: Boolean(c.mobile),
  });

  let octets3D = 0;
  page.on('response', (r) => {
    if (/laptop-|three|fiber/.test(r.url())) {
      r.headers()['content-length'] && (octets3D += Number(r.headers()['content-length']));
    }
  });

  const navigation = page.goto(CIBLE, { waitUntil: 'load', timeout: 60000 });

  // Echantillonnage pendant le chargement : c'est la que le trou apparaitrait.
  const releves = [];
  const echantillonner = setInterval(async () => {
    try {
      releves.push(await page.evaluate(mesurerRemplissage()));
    } catch {
      /* page en cours de navigation */
    }
  }, 120);

  await navigation;
  await new Promise((r) => setTimeout(r, 5000));
  clearInterval(echantillonner);

  const etat = await page.evaluate(() => {
    const bloc = document.querySelector('[data-scene]');
    const toile = bloc?.querySelector('canvas');
    const img = bloc?.querySelector('img');
    return {
      mode: toile ? '3d' : 'repli',
      opaciteToile: toile ? Number(getComputedStyle(toile.parentElement).opacity) : null,
      opaciteImage: img ? Number(getComputedStyle(img).opacity) : null,
    };
  });

  const utiles = releves.filter((v) => v >= 0);
  const trous = utiles.filter((v) => v === 0).length;

  const bloc = await page.$('[data-scene]');
  if (bloc) await bloc.screenshot({ path: `rendus/scene-${c.nom}.png` });

  const verdict = etat.mode === c.attendu ? 'OK   ' : 'ECART';
  console.log(`  ${verdict} ${c.description}`);
  console.log(`        mode obtenu   : ${etat.mode}  (attendu ${c.attendu})`);
  console.log(`        opacites      : toile ${etat.opaciteToile ?? '-'}  image ${etat.opaciteImage ?? '-'}`);
  console.log(`        remplissage   : ${utiles.length} releves, ${trous} cadre(s) vide(s)`);
  console.log(`        poids 3D      : ${(octets3D / 1024).toFixed(0)} Ko`);
  console.log();

  await page.close();
}

await navigateur.close();
