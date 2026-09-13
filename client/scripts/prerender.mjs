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

/**
 * Origine publique du site.
 *
 * CE SCRIPT TOURNE DANS UN PROCESSUS NODE SEPARE : Vite n'y injecte pas les
 * fichiers `.env`, contrairement au bundle. Sans la lecture ci-dessous, le
 * sitemap et le robots.txt annoncaient un domaine par defaut tandis que les
 * balises canoniques du HTML, elles, portaient le bon — deux verites
 * contradictoires servies par le meme site. Un moteur de recherche allait alors
 * chercher les pages sur une adresse qui n'est pas la notre.
 *
 * L'ordre de lecture reprend celui de Vite : une variable deja presente dans
 * l'environnement l'emporte sur les fichiers, `.env.production` sur `.env`.
 */
function lireEnv(nom) {
  if (process.env[nom]) return process.env[nom];

  for (const fichier of ['.env.production.local', '.env.production', '.env.local', '.env']) {
    const chemin = path.join(RACINE, fichier);
    if (!fs.existsSync(chemin)) continue;

    const ligne = fs.readFileSync(chemin, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith(`${nom}=`));

    if (ligne) return ligne.slice(ligne.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
  }
  return null;
}

const ORIGINE = (lireEnv('VITE_SITE_URL') || 'https://technolab-ista.org').replace(/\/+$/, '');

if (!lireEnv('VITE_SITE_URL')) {
  console.warn('  ! VITE_SITE_URL absente : le plan de site utilisera l origine par defaut.');
  console.warn('    Renseignez-la dans client/.env.production avant toute mise en ligne.');
}

/** Routes privees : jamais indexees, listees pour robots.txt. */
const ROUTES_PRIVEES = [
  '/tableau-de-bord', '/profil', '/utilisateurs', '/etudiants', '/classes',
  '/matieres', '/unites-enseignement', '/personnel', '/mes-enfants', '/notes',
  '/evaluation', '/examens', '/absences',
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

/**
 * Echappe un texte insere dans du XML.
 *
 * Les titres d'images portent des apostrophes typographiques et des accents. Une
 * esperluette non echappee suffit a rendre le plan de site INVALIDE, et Google
 * le rejette alors en entier — sans indiquer laquelle des URL pose probleme.
 */
const echapperXml = (texte = '') =>
  String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/9/xhtml sitemap">
</urlset>`.replace(
  /<urlset[\s\S]*<\/urlset>/,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${ROUTES_PUBLIQUES.map(({ chemin, images = [] }) => `  <url>
    <loc>${ORIGINE}${chemin}</loc>
    <lastmod>${aujourdhui}</lastmod>
    <changefreq>${chemin === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${chemin === '/' ? '1.0' : '0.8'}</priority>
${images.map((image) => `    <image:image>
      <image:loc>${ORIGINE}/photos/${image.fichier}</image:loc>
      <image:title>${echapperXml(image.titre)}</image:title>
    </image:image>`).join('\n')}
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

// --- 4. llms.txt ---
//
// Convention emergente a destination des moteurs GENERATIFS : un resume
// structure du site, en texte, a la racine.
//
// Pourquoi ce fichier plutot que de compter sur l'exploration ordinaire : un
// assistant interroge sur « ou etudier l'informatique a Mopti » ne parcourt pas
// le site, il en cite ce qu'il a retenu. Lui fournir les faits sous une forme
// breve et non promotionnelle augmente les chances qu'il les reprenne
// exactement, plutot que de les reconstituer de travers.
//
// Le contenu est volontairement FACTUEL et verifiable : chiffres, diplomes,
// coordonnees. Aucun superlatif — une affirmation invérifiable reprise par un
// assistant engage l'etablissement sans qu'il puisse l'etayer.
const llms = `# TechnoLAB-ISTA

> Institut Superieur de Technologies Appliquees, etablissement prive d'enseignement
> superieur agree par le gouvernement malien, implante a Sevare (region de Mopti, Mali).
> Fonde en 1998. Plus de 30 diplomes reconnus par le CAMES.

## Formations

Trois cycles, trois poles disciplinaires :

- **DUT** (Bac+2), **Licence** (Bac+3), **Master** (Bac+5)
- Poles : sciences economiques et de gestion, sciences et technologies,
  sciences de l'ingenieur
- Domaines couverts : gestion, finance, comptabilite, marketing, logistique,
  informatique, genie logiciel, reseaux et telecommunications, data science,
  electronique, genie electrique et energies renouvelables, genie civil et BTP,
  mines et geologie, technologies agro-alimentaires

## Reconnaissances

- Agrement du gouvernement malien : N° 0699/98 MESSRS
- CAMES (Conseil Africain et Malgache pour l'Enseignement Superieur)
- FEDE (Federation Europeenne des Ecoles)
- Academies Cisco et Huawei ICT : certifications CISCO ITE et CCNA integrees
  aux programmes informatiques
- Doubles diplomes : Groupe ESG de Paris, Universite Catholique de Milan

## Admission

- Frais d'inscription : 80 000 FCFA, dus une fois, non remboursables
- Frais academiques annuels : de 375 000 a 1 100 000 FCFA selon le niveau et
  le pole (annee ${'2026-2027'})
- Dossier : voir la page Admissions pour la liste des pieces

## Contact

- Adresse postale : B.P. E3123 Bamako, Mali
- Lieu d'enseignement : Sevare, region de Mopti
- Telephone : +223 20 29 01 54 / +223 20 29 19 43
- Courriel : technolab@technolab-ista.net

## Pages

${ROUTES_PUBLIQUES.map(({ chemin }) => `- [${chemin === '/' ? 'Accueil' : chemin.slice(1)}](${ORIGINE}${chemin})`).join('\n')}

## Note

Les montants et l'offre de formation sont repris de la brochure institutionnelle.
Verifiez aupres du secretariat les tarifs en vigueur avant toute demarche.
`;

fs.writeFileSync(path.join(DIST, 'llms.txt'), llms);

// --- Compte rendu ---
console.log('Pages pre-rendues :');
for (const [chemin, fichier, poids] of rapport) {
  console.log(`  ${chemin.padEnd(14)} -> ${fichier.padEnd(24)} ${(poids / 1024).toFixed(1)} ko`);
}
console.log(`\n  sitemap.xml     ${ROUTES_PUBLIQUES.length} URL`);
console.log(`  robots.txt      ${ROUTES_PRIVEES.length} chemins prives exclus`);
console.log('  llms.txt        resume factuel pour les moteurs generatifs');

// Le build SSR n'a servi qu'a produire le HTML : il n'a pas a etre deploye.
fs.rmSync(SSR, { recursive: true, force: true });
