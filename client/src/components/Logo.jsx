/**
 * Logo Technolab ISTA.
 *
 * Les fichiers servis sont les SVG de la charte : nets a toute taille et sur tout
 * ecran, et deux fois plus legers a poids transfere (5,8 ko contre 13,3 ko gzippes
 * pour le lockup horizontal). Le rendu bitmap reste utilise la ou le vectoriel n'est
 * pas exploitable — icones PWA, en-tete des emails, documents PDF.
 *
 * Regles de la charte encapsulees ici, pour qu'aucun ecran n'ait a les connaitre :
 * - « clair »            : lockup horizontal bichrome, fond transparent, sur fond clair ;
 * - « marine »           : lockup horizontal sur aplat marine, pour les zones foncees ;
 * - « vertical »         : lockup vertical marine, fond transparent, sur fond clair ;
 * - « vertical-inverse » : lockup vertical blanc sur aplat sombre ;
 * - « icone »            : marque seule sur aplat marine, pour les espaces contraints.
 *
 * La zone de protection (marge = hauteur de l'icone / 2) est integree au `viewBox` de
 * chaque fichier : aucune marge supplementaire n'est necessaire.
 * Les fichiers ne sont jamais reetires : seule la hauteur est pilotee, la largeur suit.
 *
 * Taille minimale du lockup : 28 mm, soit environ 106 px a 96 dpi. Le lockup occupe
 * 88 % de la largeur du `viewBox` en horizontal et 77 % en vertical, d'ou les hauteurs
 * plancher ci-dessous.
 */

const FICHIERS = {
  clair: '/marque/logo-horizontal.svg',
  marine: '/marque/logo-horizontal-marine.svg',
  vertical: '/marque/logo-vertical.svg',
  'vertical-inverse': '/marque/logo-vertical-inverse.svg',
  icone: '/marque/icone-marine.svg',
};

/** Rapport largeur/hauteur du `viewBox`, pour reserver la place avant chargement. */
const RATIOS = {
  clair: 4.192,
  marine: 4.211,
  vertical: 1.082,
  'vertical-inverse': 1.085,
  icone: 1,
};

/** Hauteur plancher par variante, deduite du minimum de 28 mm de la charte. */
const HAUTEURS_MINIMALES = {
  clair: 29,
  marine: 29,
  vertical: 128,
  'vertical-inverse': 128,
  icone: 16,
};

export default function Logo({ variante = 'clair', hauteur = 40, className = '', ...props }) {
  const hauteurEffective = Math.max(HAUTEURS_MINIMALES[variante] ?? 29, hauteur);

  return (
    <img
      src={FICHIERS[variante]}
      alt="Technolab ISTA — Université privée"
      height={hauteurEffective}
      width={Math.round(hauteurEffective * RATIOS[variante])}
      style={{ height: hauteurEffective, width: 'auto' }}
      className={`select-none ${className}`}
      draggable="false"
      {...props}
    />
  );
}
