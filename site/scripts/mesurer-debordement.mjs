/**
 * L'ordinateur sort-il de son cadre pendant le mouvement ?
 *
 *   node scripts/mesurer-debordement.mjs
 *
 * Le cadrage se regle sur une image fixe, mais l'objet bouge : flottement
 * vertical, oscillation de fond et parallaxe au curseur font tourner la scene de
 * quelques degres. Une rotation en lacet ELARGIT la silhouette d'un objet large
 * et peu profond — c'est le cas d'un portable ouvert — si bien qu'un cadrage
 * confortable a l'arret peut rogner les bords en mouvement.
 *
 * On echantillonne donc le rendu sur plusieurs secondes, pointeur deplace aux
 * extremes, et on releve la plus grande emprise observee.
 */
import { execFileSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import puppeteer from 'puppeteer';

const CIBLE = process.argv[2] || 'http://localhost:4311/';
const IMAGES = 14;

/** Lu par Pillow : emprise des pixels peints, en fraction des dimensions. */
const LECTEUR = `
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
if bb is None:
    print('0 0')
else:
    x0, y0, x1, y1 = bb
    print((x1 - x0) / im.width, (y1 - y0) / im.height)
`;

function mesurer(chemin) {
  const sortie = execFileSync('python', ['-c', LECTEUR, chemin], { encoding: 'utf8' });
  const [largeur, hauteur] = sortie.trim().split(' ').map(Number);
  return { largeur, hauteur };
}

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

const page = await navigateur.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(CIBLE, { waitUntil: 'load', timeout: 60000 });
await page.waitForSelector('[data-scene] canvas', { timeout: 45000 });

/*
 * Fond de page transparent AVANT toute mesure. Sans cela, `omitBackground` ne
 * retire que le fond par defaut du navigateur : le blanc du <body> reste, la
 * capture est integralement opaque, et la boite englobante vaut mecaniquement
 * 100 % — une mesure qui ne dit plus rien.
 */
await page.evaluate(() => {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
});

await new Promise((r) => setTimeout(r, 1500));

const cadre = await (await page.$('[data-scene]')).boundingBox();

let largeurMax = 0;
let hauteurMax = 0;

for (let i = 0; i < IMAGES; i += 1) {
  // Le pointeur balaye les coins du cadre pour atteindre les extremes de
  // parallaxe, pendant que l'oscillation de fond suit son propre cycle.
  await page.mouse.move(
    cadre.x + cadre.width * (i % 4 < 2 ? 0.02 : 0.98),
    cadre.y + cadre.height * (i % 2 ? 0.02 : 0.98)
  );
  await new Promise((r) => setTimeout(r, 420));

  const chemin = `travail/_debordement-${i}.png`;
  await (await page.$('[data-scene] canvas')).screenshot({
    path: chemin,
    omitBackground: true,
  });

  const { largeur, hauteur } = mesurer(chemin);
  largeurMax = Math.max(largeurMax, largeur);
  hauteurMax = Math.max(hauteurMax, hauteur);
  unlinkSync(chemin);
}

console.log(`  emprise maximale sur ${IMAGES} images :`);
console.log(`    largeur : ${(largeurMax * 100).toFixed(1)} % du cadre`);
console.log(`    hauteur : ${(hauteurMax * 100).toFixed(1)} % du cadre`);
console.log(
  largeurMax > 0.97 || hauteurMax > 0.97
    ? '    ATTENTION : la silhouette touche le bord, l objet sera rogne.'
    : '    marge suffisante.'
);

await navigateur.close();
