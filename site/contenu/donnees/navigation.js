/**
 * Plan du site.
 *
 * Une seule declaration alimente l'en-tete, le pied de page et le plan de site
 * XML. Ajouter une page ici suffit donc a la rendre atteignable par un visiteur
 * ET par un moteur de recherche — c'est ce qui evite la page orpheline, publiee
 * mais reliee a rien.
 *
 * `principal` porte la navigation d'en-tete : elle est volontairement courte.
 * Au-dela de cinq entrees, un menu cesse d'orienter et se contente d'enumerer.
 */

export const NAVIGATION_PRINCIPALE = [
  { chemin: '/formations', libelle: 'Formations' },
  { chemin: '/admissions', libelle: 'Admissions' },
  { chemin: '/vie-etudiante', libelle: 'Vie étudiante' },
  { chemin: '/actualites', libelle: 'Actualités' },
  { chemin: '/a-propos', libelle: 'L’institut' },
];

/** Colonnes du pied de page. */
export const NAVIGATION_PIED = [
  {
    titre: 'Se former',
    liens: [
      { chemin: '/formations', libelle: 'Nos formations' },
      { chemin: '/admissions', libelle: 'Admissions et tarifs' },
      { chemin: '/formations#cycles', libelle: 'Cycles DUT, Licence, Master' },
    ],
  },
  {
    titre: 'L’institut',
    liens: [
      { chemin: '/a-propos', libelle: 'Qui sommes-nous' },
      { chemin: '/recherche', libelle: 'Recherche et innovation' },
      { chemin: '/vie-etudiante', libelle: 'Vie étudiante' },
      { chemin: '/presse', libelle: 'Espace presse' },
    ],
  },
  {
    titre: 'Actualité',
    liens: [
      { chemin: '/actualites', libelle: 'Articles' },
      { chemin: '/evenements', libelle: 'Événements' },
      { chemin: '/contact', libelle: 'Nous contacter' },
    ],
  },
];

/**
 * Liens de bas de page.
 * « Crédits » y figure parce que la licence CC BY du modele 3D impose une
 * attribution accessible depuis le site.
 */
export const LIENS_LEGAUX = [
  { chemin: '/mentions-legales', libelle: 'Mentions légales' },
  { chemin: '/politique-confidentialite', libelle: 'Confidentialité' },
  { chemin: '/credits', libelle: 'Crédits' },
];

/**
 * Toutes les routes statiques du site, pour le plan de site XML.
 * Les routes dynamiques (formations, articles) y seront ajoutees a la
 * generation, depuis leurs sources respectives.
 */
export const ROUTES_STATIQUES = [
  { chemin: '/', priorite: 1.0 },
  { chemin: '/formations', priorite: 0.9 },
  { chemin: '/admissions', priorite: 0.9 },
  { chemin: '/a-propos', priorite: 0.8 },
  { chemin: '/vie-etudiante', priorite: 0.7 },
  { chemin: '/recherche', priorite: 0.7 },
  { chemin: '/actualites', priorite: 0.8 },
  { chemin: '/evenements', priorite: 0.7 },
  { chemin: '/contact', priorite: 0.6 },
  { chemin: '/presse', priorite: 0.4 },
  { chemin: '/credits', priorite: 0.2 },
  { chemin: '/mentions-legales', priorite: 0.2 },
  { chemin: '/politique-confidentialite', priorite: 0.2 },
];
