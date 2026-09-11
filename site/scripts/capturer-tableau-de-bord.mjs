/**
 * Capture le tableau de bord reel de la plateforme, pour servir de texture
 * d'ecran a l'ordinateur du hero.
 *
 *   node scripts/capturer-tableau-de-bord.mjs
 *
 * Pourquoi le vrai ecran plutot qu'une maquette : le hero fait le lien entre la
 * vitrine et l'outil. Un visuel invente ferait une promesse que le produit ne
 * tient pas necessairement ; une capture montre ce qui existe.
 */
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const APPLICATION = process.env.URL_APPLICATION || 'https://lab.my-istime.xyz';

/**
 * Identifiants du compte de demonstration.
 *
 * Ils sont lus dans server/.env — le fichier qui les definit deja, et que git
 * ignore. Ni la ligne de commande ni le depot ne les voient donc passer : une
 * commande reste dans l'historique du terminal, un fichier versionne reste dans
 * l'historique du depot.
 */
function depuisEnvServeur(cle, defaut) {
  if (process.env[cle]) return process.env[cle];
  try {
    const fichier = readFileSync(new URL('../../server/.env', import.meta.url), 'utf8');
    const ligne = fichier
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.startsWith(`${cle}=`));
    if (ligne) return ligne.slice(cle.length + 1).trim();
  } catch {
    /* fichier absent : on retombe sur le defaut */
  }
  return defaut;
}

const COURRIEL = depuisEnvServeur('SEED_ADMIN_EMAIL', 'admin@ista.org');
const MOT_DE_PASSE = depuisEnvServeur('SEED_ADMIN_PASSWORD', null);

if (!MOT_DE_PASSE) {
  console.error('Mot de passe introuvable : renseignez SEED_ADMIN_PASSWORD dans server/.env.');
  process.exit(1);
}

/* Le rapport 16/9 est celui de la zone d'ecran de l'atlas (1024 x 574). */
const LARGEUR = 1920;
const HAUTEUR = 1080;

const navigateur = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'],
});

const page = await navigateur.newPage();
await page.setViewport({ width: LARGEUR, height: HAUTEUR, deviceScaleFactor: 1 });

/*
 * On entre par l'accueil, puis on suit le lien de connexion, au lieu d'attaquer
 * /login directement.
 *
 * La raison est un defaut de l'hebergement, pas un choix : faute de regle de
 * reecriture, l'adresse /login demandee directement renvoie un 404 de Vercel.
 * La navigation interne, elle, passe par le routeur cote client et fonctionne.
 * Une fois client/vercel.json deploye, les deux chemins se vaudront.
 */
await page.goto(`${APPLICATION}/`, { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate(() => {
  const lien = [...document.querySelectorAll('a')]
    .find((a) => a.getAttribute('href') === '/login');
  lien?.click();
});

// L'application est une page unique : le formulaire n'existe qu'apres
// l'hydratation, que « networkidle » ne garantit pas.
await page.waitForSelector('input[type="email"]', { timeout: 30000 }).catch(async () => {
  const ou = await page.evaluate(() => ({
    url: window.location.href,
    titre: document.title,
    corps: document.body.innerText.slice(0, 300),
  }));
  console.error('Formulaire introuvable. Page atteinte :', ou);
  throw new Error('Connexion impossible');
});

await page.type('input[type="email"]', COURRIEL, { delay: 12 });
await page.type('input[type="password"]', MOT_DE_PASSE, { delay: 12 });
await page.click('button[type="submit"]');

// L'application ne recharge pas la page : on attend que l'espace prive soit la.
await page.waitForFunction(
  () => window.location.pathname.startsWith('/tableau-de-bord'),
  { timeout: 45000 }
);

// Les graphiques arrivent apres les donnees : on attend un trace, pas un delai.
await page
  .waitForSelector('svg.recharts-surface', { timeout: 20000 })
  .catch(() => console.log('  (aucun graphique detecte, on capture tout de meme)'));
await new Promise((r) => setTimeout(r, 2500));

await page.screenshot({ path: 'travail/tableau-de-bord.png' });

const titre = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
console.log(`  page capturee : « ${titre || '?'} »`);
console.log('  travail/tableau-de-bord.png');

await navigateur.close();
