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
 *   au moment de l'affichage (« decalage cumule de mise en page »). Un chiffre
 *   faux ici reserve une mauvaise place : la source de verite est le script
 *   client/scripts/preparer-photos.py, qui a produit ces fichiers ;
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
  'remise-diplomes': {
    largeur: 1000,
    hauteur: 667,
    variante: true,
    alt:
      'Une quarantaine d’étudiants et de membres du personnel en tenue de cérémonie, '
      + 'réunis pour une photographie de groupe devant la salle multifonctionnelle.',
  },

  'segou-art': {
    largeur: 708,
    hauteur: 400,
    variante: true,
    alt:
      'Les étudiants de Technolab ISTA rassemblés au pied du monument de la région '
      + 'de Ségou, lors du festival sur le Niger.',
  },

  'campus-groupe': {
    largeur: 547,
    hauteur: 365,
    variante: false,
    alt:
      'Grand rassemblement d’étudiants et d’enseignants dans la cour de l’établissement, '
      + 'entre les bâtiments d’enseignement.',
  },

  'salle-de-classe': {
    largeur: 292,
    hauteur: 219,
    variante: false,
    alt: 'Étudiants suivant un cours, installés à des tables de travail dans une salle équipée.',
  },

  'ceremonie-diplomes': {
    largeur: 292,
    hauteur: 195,
    variante: false,
    alt: 'Diplômés en toge brandissant leur parchemin pendant la cérémonie de remise.',
  },

  'diplomes-ghana': {
    largeur: 292,
    hauteur: 219,
    variante: false,
    alt:
      'Étudiants diplômés en toge et coiffe académique présentant leur certificat, '
      + 'à l’issue d’un séjour de formation au Ghana.',
  },

  'competition-debat': {
    largeur: 292,
    hauteur: 219,
    variante: false,
    alt:
      'Équipe d’étudiants célébrant sa victoire à une compétition inter-universitaire '
      + 'de débat, chèque et ordinateur portable remis en récompense.',
  },

  'delegation-etudiants': {
    largeur: 292,
    hauteur: 219,
    variante: false,
    alt:
      'Groupe d’étudiants en blazer bleu posant devant un bâtiment, l’un d’eux tenant '
      + 'une attestation.',
  },
};
