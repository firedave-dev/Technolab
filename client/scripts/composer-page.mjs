/**
 * Assemblage d'une page pre-rendue : le HTML produit par React est insere dans le
 * gabarit, et les metadonnees qu'il contient sont remontees dans le `<head>`.
 *
 * React 19 hisse ces balises de lui-meme au montage cote navigateur, mais un
 * moteur de recherche qui n'execute pas le script doit les trouver deja en place.
 *
 * Les balises du gabarit que la page redefinit (titre, description) sont retirees :
 * sans cela, la page en porterait deux, et le moteur choisirait arbitrairement.
 */

/** Balises de metadonnees emises par le composant Seo, dans l'ordre du document. */
const MOTIFS = [
  /<title>[\s\S]*?<\/title>/g,
  /<meta\b[^>]*\/?>/g,
  /<link\b[^>]*\/?>/g,
  /<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g,
];

/** Extrait les metadonnees du HTML rendu et renvoie le corps nettoye. */
export function extraireMetadonnees(html) {
  const balises = [];
  let corps = html;

  for (const motif of MOTIFS) {
    corps = corps.replace(motif, (balise) => {
      balises.push(balise);
      return '';
    });
  }

  return { balises, corps };
}

/**
 * Compose la page finale.
 * @param gabarit index.html issu du build navigateur
 * @param html    markup rendu par React pour cette route
 */
export function composerPage(gabarit, html) {
  const { balises, corps } = extraireMetadonnees(html);

  const definit = (motif) => balises.some((b) => motif.test(b));

  let entete = gabarit;

  // Le titre et la description de la page priment sur ceux du gabarit.
  if (definit(/^<title>/)) {
    entete = entete.replace(/\s*<title>[\s\S]*?<\/title>/, '');
  }
  if (definit(/name="description"/)) {
    entete = entete.replace(/\s*<meta\s+name="description"[^>]*>/, '');
  }

  return entete
    .replace('</head>', `    ${balises.join('\n    ')}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${corps}</div>`);
}
