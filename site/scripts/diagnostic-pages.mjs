/**
 * Diagnostic des pages publiques.
 *
 *   npm run start   (dans un autre terminal)
 *   node scripts/diagnostic-pages.mjs
 *
 * Trois mesures par page, chacune repondant a une question qu'on ne peut pas
 * trancher a l'oeil :
 *
 * 1. LE POIDS REELLEMENT TRANSFERE, par nature de fichier. Il est lu sur les
 *    evenements reseau du protocole de debogage, et non dans l'en-tete
 *    `content-length` : Next transfere en morceaux, sans annoncer de longueur,
 *    et cet en-tete vaut alors zero — une premiere version de ce script a
 *    rapporte « 0 Ko de JavaScript » sur toutes les pages.
 *
 * 2. LE TEMPS DE CHARGEMENT sur un telephone milieu de gamme en 3G rapide —
 *    reseau bride a 1,6 Mb/s avec 150 ms de latence, processeur ralenti quatre
 *    fois. C'est le profil du public vise, et le seul chiffre qui dise quelque
 *    chose d'utile depuis une machine reliee en fibre.
 *
 * 3. LES BLOCS D'APPARITION, sur les deux points qui peuvent reellement mal
 *    tourner — et sur eux seulement :
 *
 *    - le HTML LIVRE PAR LE SERVEUR ne doit contenir aucun `opacity:0`. C'est la
 *      regression de la Phase 1 : le composant d'animation ecrivait son etat
 *      initial dans le rendu serveur, et les sections restaient invisibles tant
 *      que le JavaScript n'avait pas pris la main — donc indefiniment en cas de
 *      script en echec ;
 *    - les blocs SITUES DANS LE PREMIER ECRAN doivent etre visibles apres
 *      chargement. Qu'un bloc place douze mille pixels plus bas ne le soit pas
 *      encore n'est pas un defaut : c'est precisement ce qu'on lui demande.
 *
 *    Une premiere version comptait tous les blocs de la page, fenetre agrandie
 *    a la demesure pour tout amener dans le champ de vision. Elle signalait la
 *    page Formations comme fautive alors qu'elle mesurait surtout le plafond de
 *    hauteur de fenetre du navigateur.
 */
import puppeteer from 'puppeteer';

const CIBLE = process.argv[2] || 'http://localhost:4311';

const PAGES = [
  ['/', 'Accueil'],
  ['/formations', 'Formations'],
  ['/admissions', 'Admissions'],
  ['/a-propos', 'L’institut'],
  ['/formations/licence-data-science', 'Détail parcours'],
  ['/credits', 'Crédits'],
];

/* Profil « 3G rapide » : les valeurs usuelles des outils de mesure. */
const RESEAU = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};
const RALENTISSEMENT_PROCESSEUR = 4;

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

const ko = (n) => `${(n / 1024).toFixed(0)} Ko`;
const resultats = [];

for (const [chemin, nom] of PAGES) {
  const page = await navigateur.newPage();
  const cdp = await page.createCDPSession();

  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', RESEAU);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RALENTISSEMENT_PROCESSEUR });

  // Poids transfere, lu sur les evenements reseau.
  const types = new Map();
  const poids = { script: 0, stylesheet: 0, image: 0, font: 0, document: 0, autre: 0 };
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type?.toLowerCase()));
  cdp.on('Network.loadingFinished', (e) => {
    const t = types.get(e.requestId);
    const cle = t in poids ? t : 'autre';
    poids[cle] += e.encodedDataLength || 0;
  });

  /*
   * Cache desactive : sans cela, seule la premiere page mesuree paie le
   * JavaScript commun, et les suivantes rapportent « 0 Ko » — ce qui donne
   * l'illusion d'une page sans script plutot qu'une page dont les scripts
   * etaient deja la.
   */
  await page.setCacheEnabled(false);

  await page.setViewport({
    width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });

  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));

  const depart = Date.now();
  const reponse = await page.goto(`${CIBLE}${chemin}`, { waitUntil: 'load', timeout: 120000 });
  const chargement = Date.now() - depart;

  const debordement = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );

  /*
   * Attente avant mesure. Quatre secondes, et non deux : le processeur est
   * ralenti quatre fois, et un bloc situe a quelques pixels du seuil de
   * declenchement met plus d'une seconde a recevoir sa notification
   * d'intersection. Une attente trop courte signalait un defaut la ou il n'y
   * avait qu'une mesure prise trop tot.
   */
  await new Promise((r) => setTimeout(r, 4000));

  const mesures = await page.evaluate(() => {
    const animes = [...document.querySelectorAll('[style*="opacity"]')];
    /*
     * Le critere reprend EXACTEMENT la regle de declenchement du composant
     * Reveal : sa marge de viewport est « 0 0 -25% 0 », c'est-a-dire que le bloc
     * doit avoir depasse le quart inferieur de l'ecran. Un bloc qui affleure le
     * bas de la fenetre n'a donc pas encore a etre apparu, et le compter comme
     * fautif ferait signaler trois pages saines.
     */
    const seuil = window.innerHeight * 0.75;
    const dansLePremierEcran = animes.filter((n) => {
      const r = n.getBoundingClientRect();
      return r.top < seuil && r.bottom > 0;
    });
    return {
      animes: animes.length,
      visiblesAttendus: dansLePremierEcran.length,
      invisibles: dansLePremierEcran.filter(
        (n) => parseFloat(getComputedStyle(n).opacity) < 0.9
      ).length,
      titres: document.querySelectorAll('h1').length,
    };
  });

  await page.screenshot({
    path: `rendus/page-${chemin === '/' ? 'accueil' : chemin.slice(1).replace(/\//g, '-')}.png`,
    fullPage: true,
  });

  // Le HTML brut, tel que le serveur l'envoie — avant toute execution.
  const brut = await (await fetch(`${CIBLE}${chemin}`)).text();
  const opaciteServeur = (brut.match(/opacity:0/g) || []).length;

  resultats.push({
    nom, statut: reponse.status(), chargement, poids, debordement,
    opaciteServeur, erreurs: erreurs.length, ...mesures,
  });
  await page.close();
}

await navigateur.close();

console.log('Diagnostic — telephone milieu de gamme, 3G rapide, processeur 4x plus lent\n');
console.log('  Page              HTTP  HTML    JS      CSS     Police  Images   Total   Charge');
console.log('  ' + '-'.repeat(82));
for (const r of resultats) {
  const total = Object.values(r.poids).reduce((a, b) => a + b, 0);
  console.log(
    `  ${r.nom.padEnd(17)} ${String(r.statut).padEnd(5)} `
    + `${ko(r.poids.document).padEnd(7)} ${ko(r.poids.script).padEnd(7)} `
    + `${ko(r.poids.stylesheet).padEnd(7)} ${ko(r.poids.font).padEnd(7)} `
    + `${ko(r.poids.image).padEnd(8)} ${ko(total).padEnd(7)} ${(r.chargement / 1000).toFixed(1)} s`
  );
}

console.log('');
console.log('  Page              Blocs  Attendus  Invisibles  opacity:0 serveur  h1  Err.  Deb.');
console.log('  ' + '-'.repeat(84));
for (const r of resultats) {
  console.log(
    `  ${r.nom.padEnd(17)} ${String(r.animes).padStart(5)} `
    + `${String(r.visiblesAttendus).padStart(9)} ${String(r.invisibles).padStart(11)} `
    + `${String(r.opaciteServeur).padStart(18)} ${String(r.titres).padStart(3)} `
    + `${String(r.erreurs).padStart(5)}  ${r.debordement ? 'OUI' : 'non'}`
  );
}

const soucis = resultats.filter(
  (r) => r.invisibles > 0 || r.opaciteServeur > 0 || r.titres !== 1
    || r.debordement || r.erreurs > 0
);
console.log(
  soucis.length
    ? `\n  ${soucis.length} page(s) a examiner : ${soucis.map((r) => r.nom).join(', ')}`
    : '\n  Aucun ecart sur les six pages.'
);
