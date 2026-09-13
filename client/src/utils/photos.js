/**
 * Catalogue des photographies du site public.
 *
 * Un seul endroit decrit chaque cliche : ses dimensions reelles, l'existence
 * d'une variante mobile, et son texte alternatif.
 *
 * Pourquoi centraliser plutot que de poser les attributs dans chaque page :
 *
 * - les DIMENSIONS doivent etre exactes. Elles sont ecrites dans les attributs
 *   `width`/`height` de l'image, ce qui permet au navigateur de reserver la
 *   place avant meme d'avoir telecharge le fichier — sans cela, le texte saute
 *   au moment de l'affichage. Un chiffre faux ici reserve une mauvaise place :
 *   la source de verite est client/scripts/preparer-photos.py, qui les imprime
 *   a chaque execution ;
 *
 * - le TEXTE ALTERNATIF decrit ce que la photo montre reellement. Il est relu
 *   ici, en liste, plutot que dissemine dans le balisage : c'est la seule facon
 *   de verifier qu'aucun cliche ne porte une description approximative ou
 *   flatteuse. Une personne qui navigue au lecteur d'ecran doit recevoir la
 *   scene, pas un slogan.
 *
 * Les fichiers vivent dans client/public/photos/, en AVIF et en WebP.
 */

export const PHOTOS = {
  /* ---------------- Ceremonies de remise de diplomes ---------------- */

  'remise-diplomes': {
    largeur: 1000,
    hauteur: 667,
    variante: true,
    alt:
      'Un diplômé en toge reçoit son parchemin des mains d’un responsable de '
      + 'l’établissement, devant le décor de la cérémonie.',
  },

  'diplomes-groupe': {
    largeur: 950,
    hauteur: 633,
    variante: true,
    alt:
      'Quatre diplômées en toge jaune et bleue présentent leur parchemin devant '
      + 'le mur des partenaires de l’établissement.',
  },

  'remise-certificat': {
    largeur: 1000,
    hauteur: 667,
    variante: true,
    alt: 'Deux diplômés présentent ensemble leur certificat à l’issue de la cérémonie.',
  },

  'ceremonie': {
    largeur: 606,
    hauteur: 402,
    variante: false,
    alt:
      'Plusieurs diplômés en toge, alignés sur scène avec leur parchemin, '
      + 'entourés de responsables de l’établissement.',
  },

  'diplomes-scene': {
    largeur: 603,
    hauteur: 402,
    variante: false,
    alt: 'Groupe de diplômés en toge brandissant leur parchemin pendant la cérémonie.',
  },

  'remise-directeur': {
    largeur: 900,
    hauteur: 600,
    variante: true,
    alt:
      'Remise d’un diplôme par un responsable de l’établissement, devant le '
      + 'panneau de l’Institut Supérieur de Technologies Appliquées.',
  },

  /* ---------------- Vie academique ---------------- */

  'seance-travail': {
    largeur: 900,
    hauteur: 600,
    variante: true,
    alt:
      'Quatre étudiants en blazer bleu réunis autour d’une table de travail, '
      + 'penchés sur un même document.',
  },

  'etudiants-groupe': {
    largeur: 900,
    hauteur: 600,
    variante: true,
    alt: 'Quatre étudiants en blazer bleu de l’établissement, documents à la main.',
  },

  'salle-de-classe': {
    largeur: 568,
    hauteur: 426,
    variante: false,
    alt: 'Étudiants suivant un cours, installés à des tables de travail dans une salle équipée.',
  },

  'assemblee-generale': {
    largeur: 900,
    hauteur: 506,
    variante: true,
    alt:
      'Photographie de groupe d’une assemblée générale, en salle de conférence, '
      + 'réunissant de nombreux participants.',
  },

  /* ---------------- Vie etudiante et sorties ---------------- */

  'segou-art': {
    largeur: 764,
    hauteur: 364,
    variante: true,
    alt:
      'Les étudiants rassemblés au pied du monument de la région de Ségou, '
      + 'lors du festival sur le Niger.',
  },

  'dakar-plage': {
    largeur: 1440,
    hauteur: 832,
    variante: true,
    alt:
      'Groupe d’étudiants posant sur une plage de Dakar sous un ciel dégagé, '
      + 'lors d’une journée de détente.',
  },

  'lac-rose': {
    largeur: 1440,
    hauteur: 828,
    variante: true,
    alt:
      'Étudiants réunis près de quads sur le sable, lors d’une visite au lac Rose '
      + 'dans la région de Dakar.',
  },
};
