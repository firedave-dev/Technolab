/**
 * Catalogue des photographies.
 *
 * Un seul endroit decrit chaque cliche : ses dimensions reelles et son texte
 * alternatif.
 *
 * Les DIMENSIONS doivent etre exactes. `next/image` s'en sert pour reserver la
 * place avant le telechargement ; un chiffre faux fait sauter la mise en page
 * a l'arrivee de l'image. La source de verite est le script qui a produit ces
 * fichiers, client/scripts/preparer-photos.py.
 *
 * Le TEXTE ALTERNATIF decrit ce que la photo montre reellement. Il est relu ici,
 * en liste, plutot que disperse dans le balisage : c'est la seule facon de
 * verifier qu'aucun cliche ne porte une description flatteuse plutot que fidele.
 * Une personne au lecteur d'ecran doit recevoir la scene, pas un slogan.
 *
 * Les variantes de taille ne sont plus declarees a la main : next/image genere
 * les largeurs et les formats a la demande, a partir du WebP source.
 */

export const PHOTOS = {
  'remise-diplomes': {
    largeur: 1000,
    hauteur: 667,
    alt:
      'Une quarantaine d’étudiants et de membres du personnel en tenue de cérémonie, '
      + 'réunis pour une photographie de groupe devant la salle multifonctionnelle.',
  },

  'segou-art': {
    largeur: 708,
    hauteur: 400,
    alt:
      'Les étudiants de Technolab ISTA rassemblés au pied du monument de la région '
      + 'de Ségou, lors du festival sur le Niger.',
  },

  'campus-groupe': {
    largeur: 547,
    hauteur: 365,
    alt:
      'Grand rassemblement d’étudiants et d’enseignants dans la cour de l’établissement, '
      + 'entre les bâtiments d’enseignement.',
  },

  'salle-de-classe': {
    largeur: 292,
    hauteur: 219,
    alt: 'Étudiants suivant un cours, installés à des tables de travail dans une salle équipée.',
  },

  'ceremonie-diplomes': {
    largeur: 292,
    hauteur: 195,
    alt: 'Diplômés en toge brandissant leur parchemin pendant la cérémonie de remise.',
  },

  'diplomes-ghana': {
    largeur: 292,
    hauteur: 219,
    alt:
      'Étudiants diplômés en toge et coiffe académique présentant leur certificat, '
      + 'à l’issue d’un séjour de formation au Ghana.',
  },

  'competition-debat': {
    largeur: 292,
    hauteur: 219,
    alt:
      'Équipe d’étudiants célébrant sa victoire à une compétition inter-universitaire '
      + 'de débat, chèque et ordinateur portable remis en récompense.',
  },

  'delegation-etudiants': {
    largeur: 292,
    hauteur: 219,
    alt:
      'Groupe d’étudiants en blazer bleu posant devant un bâtiment, l’un d’eux tenant '
      + 'une attestation.',
  },
};
