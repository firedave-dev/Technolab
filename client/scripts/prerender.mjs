/**
 * Pre-rendu des pages publiques, plan de site et robots.txt.
 *
 * Le probleme resolu : une application React classique sert un `<div id="root">`
 * vide, et le contenu n'apparait qu'apres execution du JavaScript. Ce script
 * ecrit le HTML de chaque page publique directement dans le fichier servi — le
 * contenu et les metadonnees sont donc lisibles sans executer une seule ligne de
 * script, par un moteur de recherche comme par un apercu de messagerie.
 *
 * L'application reprend ensuite la main normalement (hydratation) : la navigation
 * reste celle d'une application monopage.
 *
 * Chaine complete : `vite build` puis `vite build --ssr` puis ce script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { composerPage } from './composer-page.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(RACINE, 'dist');
const SSR = path.join(RACINE, 'dist-ssr');

const ORIGINE = process.env.VITE_SITE_URL || 'https://www.technolab-ista.net';

/** Routes privees : jamais indexees, listees pour robots.txt. */
const ROUTES_PRIVEES = [
  '/tableau-de-bord', '/profil', '/utilisateurs', '/etudiants', '/classes',
  '/matieres', '/personnel', '/mes-enfants', '/notes', '/examens', '/absences',
  '/paiements', '/planning', '/statistiques', '/login', '/mot-de-passe-oublie',
  '/reset-password',
];

// Sous Windows, un import dynamique exige une URL file:// et non un chemin absolu.
const { rendu, ROUTES_PUBLIQUES } = await import(
  pathToFileURL(path.join(SSR, 'entry-prerender.js')).href
);

const gabarit = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

// --- 1. Pages publiques ---
const rapport = [];

for (const { chemin, fichier } of ROUTES_PUBLIQUES) {
  const page = composerPage(gabarit, rendu(chemin));
  const destination = path.join(DIST, fichier);

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, page);

  rapport.push([chemin, fichier, page.length]);
}

// --- 2. Plan de site ---
const aujourdhui = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/9/xhtml sitemap">
</urlset>`.replace(
  /<urlset[\s\S]*<\/urlset>/,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES_PUBLIQUES.map(({ chemin }) => `  <url>
    <loc>${ORIGINE}${chemin}</loc>
    <lastmod>${aujourdhui}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${chemin === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`
);

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `${sitemap}\n`);

// --- 3. robots.txt ---
const robots = `# Technolab ISTA
# Seules les pages publiques sont indexables. L'espace prive est derriere
# authentification : son exploration n'apporterait rien et exposerait des URL
# de dossiers individuels.

User-agent: *
${ROUTES_PRIVEES.map((r) => `Disallow: ${r}`).join('\n')}
Disallow: /api/

Sitemap: ${ORIGINE}/sitemap.xml
`;

fs.writeFileSync(path.join(DIST, 'robots.txt'), robots);

// --- Compte rendu ---
console.log('Pages pre-rendues :');
for (const [chemin, fichier, poids] of rapport) {
  console.log(`  ${chemin.padEnd(14)} -> ${fichier.padEnd(24)} ${(poids / 1024).toFixed(1)} ko`);
}
console.log(`\n  sitemap.xml     ${ROUTES_PUBLIQUES.length} URL`);
console.log(`  robots.txt      ${ROUTES_PRIVEES.length} chemins prives exclus`);

// Le build SSR n'a servi qu'a produire le HTML : il n'a pas a etre deploye.
fs.rmSync(SSR, { recursive: true, force: true });
