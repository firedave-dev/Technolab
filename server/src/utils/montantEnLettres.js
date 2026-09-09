/**
 * Conversion d'un montant entier en toutes lettres (francais), pour les recus.
 * Regles retenues : orthographe classique (quatre-vingts, soixante-dix),
 * "cent" et "vingt" prennent un s uniquement quand ils terminent le nombre.
 */

const UNITES = [
  'zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const DIZAINES = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
  'soixante', 'quatre-vingt', 'quatre-vingt',
];

/** Nombre de 0 a 99. */
function sousCent(n) {
  if (n < 20) return UNITES[n];

  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  // 70-79 et 90-99 se construisent sur soixante-dix et quatre-vingt-dix.
  if (dizaine === 7 || dizaine === 9) {
    const reste = UNITES[10 + unite];
    const liaison = dizaine === 7 && unite === 1 ? ' et ' : '-';
    return `${DIZAINES[dizaine]}${liaison}${reste}`;
  }

  if (unite === 0) return dizaine === 8 ? 'quatre-vingts' : DIZAINES[dizaine];
  if (unite === 1 && dizaine !== 8) return `${DIZAINES[dizaine]} et un`;

  return `${DIZAINES[dizaine]}-${UNITES[unite]}`;
}

/** Nombre de 0 a 999. */
function sousMille(n) {
  if (n < 100) return sousCent(n);

  const centaines = Math.floor(n / 100);
  const reste = n % 100;
  const prefixe = centaines === 1 ? 'cent' : `${UNITES[centaines]} cent`;

  if (reste === 0) return centaines === 1 ? 'cent' : `${prefixe}s`;
  return `${prefixe} ${sousCent(reste)}`;
}

/** Paliers traites : milliards, millions, milliers, unites. */
const PALIERS = [
  [1_000_000_000, 'milliard'],
  [1_000_000, 'million'],
  [1_000, 'mille'],
];

/** Retire l'accord de "vingts" / "cents" quand ils precedent "mille". */
const sansAccord = (texte) => texte.replace(/(vingt|cent)s$/, '$1');

export function montantEnLettres(montant) {
  const entier = Math.floor(Math.abs(Number(montant) || 0));
  if (entier === 0) return 'zero';

  let reste = entier;
  const morceaux = [];

  for (const [valeur, nom] of PALIERS) {
    const quotient = Math.floor(reste / valeur);
    if (!quotient) continue;

    reste %= valeur;

    // "mille" est invariable et ne se prefixe pas de "un".
    // Devant lui, "vingts" et "cents" perdent leur s : quatre-vingt mille, trois cent mille.
    if (nom === 'mille') {
      morceaux.push(quotient === 1 ? 'mille' : `${sansAccord(sousMille(quotient))} mille`);
    } else {
      morceaux.push(`${sousMille(quotient)} ${nom}${quotient > 1 ? 's' : ''}`);
    }
  }

  if (reste) morceaux.push(sousMille(reste));

  return morceaux.join(' ');
}

/** Formatage monetaire : "150 000 FCFA". */
export const formaterMontant = (montant) =>
  `${Math.round(Number(montant) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ')} FCFA`;
