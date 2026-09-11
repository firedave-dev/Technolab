/**
 * Mise en forme des nombres.
 *
 * Ce module n'est PAS marque « use client » : il est appele aussi bien par le
 * rendu serveur des pages que par le composant de compteur, qui, lui, est un
 * composant client. Une fonction exportee depuis un module client ne peut pas
 * etre appelee par le serveur — Next refuse le build — d'ou ce fichier neutre.
 */

/** « 16 000 » — espaces insecables normalisees, comme partout dans le projet. */
export const formater = (n) =>
  Math.round(n)
    .toLocaleString('fr-FR')
    .replace(/[  ]/g, ' ');

/**
 * Separe « 28 ans » en 28 et « ans », sans perdre l'espace qui les relie.
 *
 * Le piege est que l'espace joue deux roles opposes dans ces libelles : il
 * separe les milliers dans « 16 000 », et il separe le nombre de son unite dans
 * « 28 ans ». Retirer les espaces de tete produisait « 28ans » ; les garder tous
 * couperait « 16 000 » en deux. Le motif ne consomme donc un espace que s'il est
 * suivi d'exactement trois chiffres.
 */
const MOTIF = /^(\d{1,3}(?:[\s  ]\d{3})+|\d+)(.*)$/s;

export function separer(texte) {
  const trouve = MOTIF.exec(String(texte).trim());
  if (!trouve) return { nombre: null, suffixe: String(texte) };

  return {
    nombre: Number(trouve[1].replace(/[\s  ]/g, '')),
    suffixe: trouve[2],
  };
}
