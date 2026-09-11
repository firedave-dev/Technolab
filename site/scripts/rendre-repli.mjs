/**
 * Produit l'image de repli de la scene 3D, DEPUIS la scene 3D.
 *
 *   npm run build && npm run start   (dans un autre terminal)
 *   node scripts/rendre-repli.mjs
 *
 * Pourquoi rendre plutot qu'exporter depuis un outil de modelisation : le repli
 * doit montrer exactement ce que montre la scene — meme camera, meme focale,
 * meme eclairage, meme ouverture d'ecran. Un export realise separement aurait
 * derive des le premier reglage de camera, et l'ecart ne se serait vu que sur
 * les appareils qui n'ont justement pas la 3D pour comparer.
 *
 * Le rendu se fait en WebGL logiciel (SwiftShader) : pas de carte graphique
 * necessaire, et le resultat est identique d'une machine a l'autre.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const CIBLE = process.argv[2] || 'http://localhost:4311/';
const SORTIE = 'public/images';
const INTERMEDIAIRE = path.join(SORTIE, '_repli-brut.png');

/*
 * Facteur d'echelle du rendu. On capture plus grand que la taille finale, puis
 * on reduit : c'est ce qui donne un antialiasing propre sur les aretes du
 * modele, que le rendu logiciel ne soigne pas de lui-meme.
 */
const ECHELLE = 3;

await mkdir(SORTIE, { recursive: true });

const navigateur = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-color-profile=srgb',
    // WebGL sans materiel : indispensable en environnement sans carte graphique.
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
  ],
});

const page = await navigateur.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: ECHELLE });

// Pose le drapeau AVANT tout script de la page : la scene demarre donc
// directement figee, sans passer par un etat anime qu'il faudrait attendre.
await page.evaluateOnNewDocument(() => {
  window.__RENDU_REPLI__ = true;
});

const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400) erreurs.push(`${r.status()} ${r.url()}`);
});

await page.goto(CIBLE, { waitUntil: 'load', timeout: 60000 });

/*
 * Attente de la scene.
 *
 * On NE LIT PAS les pixels du canevas pour savoir s'il est rendu : un contexte
 * WebGL cree sans `preserveDrawingBuffer` rend son tampon illisible des que
 * l'image est composee, et `drawImage` n'en rapporte que du vide. Le signal
 * fiable est ailleurs — le composant fait passer le conteneur du canevas a
 * l'opacite 1 lorsque le modele est charge et sa pose appliquee.
 */
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForFunction(
  () => {
    const c = document.querySelector('canvas');
    return c && Number(getComputedStyle(c.parentElement).opacity) > 0.99;
  },
  { timeout: 45000, polling: 200 }
);

// Quelques images de plus : le mixer doit avoir applique la pose d'ouverture.
await new Promise((r) => setTimeout(r, 700));

/*
 * Le fond de la page est rendu transparent AVANT la capture. Sans cela,
 * `omitBackground` ne sert a rien : c'est le blanc du <body> qui est capture,
 * et le repli emporte un rectangle blanc qui se verrait le jour ou la section
 * du hero changerait de fond.
 */
await page.evaluate(() => {
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
});

const canevas = await page.$('canvas');
if (!canevas) throw new Error('Aucun canevas : la scene 3D ne s’est pas montee.');

await canevas.screenshot({ path: INTERMEDIAIRE, omitBackground: true });

const cadre = await canevas.boundingBox();
console.log(`  canevas capture : ${Math.round(cadre.width)}x${Math.round(cadre.height)} css`);
console.log(`  erreurs page    : ${erreurs.length}`);
erreurs.slice(0, 3).forEach((e) => console.log('    ' + e));

await navigateur.close();
console.log(`  brut ecrit      : ${INTERMEDIAIRE}`);
