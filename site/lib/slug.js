/**
 * Fabrication des identifiants d'URL.
 *
 * Les intitules de parcours portent des accents, des apostrophes typographiques,
 * des parentheses et des virgules — « Methodes informatiques appliquees a la
 * gestion des entreprises (MIAGE) ». Rien de tout cela n'a sa place dans une
 * adresse : les caracteres non ASCII y seraient encodes en pourcentages, ce qui
 * donne une URL illisible dans un resultat de recherche et impossible a dicter.
 *
 * La decomposition Unicode separe chaque lettre accentuee de son accent, qu'on
 * retire ensuite : « é » devient « e » plutot que de disparaitre.
 */

export function slug(texte) {
  return String(texte)
    .normalize('NFD')
    // Marques diacritiques laissees par la decomposition.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // L'apostrophe separe deux mots : elle devient un tiret, pas rien.
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
