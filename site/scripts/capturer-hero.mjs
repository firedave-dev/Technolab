/**
 * Capture le hero dans ses deux rendus, pour comparaison cote a cote.
 *
 *   node scripts/capturer-hero.mjs
 *
 * La seule difference entre les deux passes est le nombre de coeurs annonce par
 * le navigateur. C'est volontaire : on veut voir ce que la detection de
 * capacites produit reellement, pas deux pages construites differemment.
 */
import puppeteer from 'puppeteer';

const CIBLE = process.argv[2] || 'http://localhost:4311/';

const PASSES = [
  { nom: 'hero-3d', coeurs: 8, titre: '3D active' },
  { nom: 'hero-repli', coeurs: 2, titre: 'Repli statique' },
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

for (const passe of PASSES) {
  const page = await navigateur.newPage();

  await page.evaluateOnNewDocument((n) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => n });
  }, passe.coeurs);

  await page.setViewport({ width: 1440, height: 820, deviceScaleFactor: 2 });
  await page.goto(CIBLE, { waitUntil: 'load', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 5000));

  const hero = await page.$('section');
  await hero.screenshot({ path: `rendus/${passe.nom}.png` });

  const mode = await page.evaluate(() =>
    (document.querySelector('[data-scene] canvas') ? '3d' : 'repli'));

  console.log(`  ${passe.nom}.png  — ${passe.titre} (mode detecte : ${mode})`);
  await page.close();
}

await navigateur.close();
