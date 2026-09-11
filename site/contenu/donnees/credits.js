/**
 * Attribution des ressources tierces.
 *
 * Cette page n'est pas une politesse : le modele 3D du hero est distribue sous
 * licence Creative Commons BY 4.0, qui CONDITIONNE le droit d'usage a une
 * attribution accessible. Elle est donc livree en meme temps que le modele, et
 * non reportee a une phase ulterieure — le site devient publiable avant.
 *
 * Les polices et les photographies y figurent aussi, pour qu'un seul endroit
 * reponde a la question « d'ou vient ce fichier ».
 */

export const CREDITS = [
  {
    cle: 'modeles',
    titre: 'Modèles 3D',
    entrees: [
      {
        nom: 'Low-Poly Modern Laptop with Closing Animation',
        auteur: 'Renend Studio',
        source: 'Sketchfab',
        lienSource: 'https://sketchfab.com',
        licence: 'CC BY 4.0',
        lienLicence: 'https://creativecommons.org/licenses/by/4.0/',
        note:
          'Le modèle est utilisé sans modification de sa géométrie ni de son '
          + 'animation. Sa texture d’écran a été remplacée par une capture de '
          + 'la plateforme de gestion de l’institut.',
      },
    ],
  },
  {
    cle: 'polices',
    titre: 'Polices',
    entrees: [
      {
        nom: 'Archivo',
        auteur: 'Omnibus-Type',
        source: 'Google Fonts',
        lienSource: 'https://fonts.google.com/specimen/Archivo',
        licence: 'SIL Open Font License 1.1',
        lienLicence: 'https://openfontlicense.org/',
      },
    ],
  },
  {
    cle: 'photographies',
    titre: 'Photographies',
    entrees: [
      {
        nom: 'Photographies de l’institut',
        auteur: 'Technolab ISTA',
        licence: 'Tous droits réservés',
        note:
          'Clichés pris lors des cérémonies de remise de diplômes, des '
          + 'compétitions inter-universitaires et des séjours de formation.',
      },
    ],
  },
];
