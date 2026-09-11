/**
 * Identite de l'etablissement.
 *
 * Transcrit de la brochure institutionnelle TechnoLAB-ISTA. Aucun chiffre,
 * aucune reconnaissance n'est invente ici : ce fichier alimente a la fois les
 * pages publiques et les donnees structurees schema.org, si bien qu'une
 * approximation ecrite ici se retrouverait telle quelle dans les resultats de
 * recherche de Google.
 */

/* ------------------------------------------------------------------ */
/* Identite de l'etablissement                                         */
/* ------------------------------------------------------------------ */

export const NOM_COMPLET = 'Institut Supérieur de Technologies Appliquées';
export const SIGLE = 'TechnoLAB - ISTA';
export const ANNEE_FONDATION = 1998;
export const SITE_OFFICIEL = 'https://www.technolab-ista.net';

/**
 * Faits verifiables portes par la brochure, repris sur la page « A propos ».
 *
 * La brochure affirme aussi detenir « le taux d'insertion professionnelle le plus
 * eleve ». Ce superlatif n'est PAS republie : une comparaison entre etablissements
 * demande une source, et un site officiel qui l'avance sans mesure publiee
 * s'expose autant qu'il se valorise. A reintegrer si la direction fournit l'etude.
 */
export const CHIFFRES = [
  { valeur: `${new Date().getFullYear() - ANNEE_FONDATION} ans`, libelle: 'd’expérience' },
  { valeur: '16 000+', libelle: 'diplômés dans le monde' },
  { valeur: '30+', libelle: 'diplômes reconnus par le CAMES' },
  { valeur: '3', libelle: 'cycles, du Bac+2 au Bac+5' },
];

/** Agrements et reconnaissances institutionnelles. */
export const RECONNAISSANCES = [
  {
    nom: 'Gouvernement malien',
    detail: 'Établissement privé d’éducation agréé.',
  },
  {
    nom: 'CAMES',
    detail:
      'Conseil Africain et Malgache pour l’Enseignement Supérieur — plus de trente '
      + 'diplômes reconnus par cette institution panafricaine.',
  },
  {
    nom: 'FEDE',
    detail: 'Fédération Européenne des Écoles.',
  },
  {
    nom: 'Académie Cisco et Académie Huawei ICT',
    detail:
      'Accréditations obtenues : les certifications CISCO ITE et CCNA sont '
      + 'directement intégrées aux programmes techniques informatiques.',
  },
];

/** Partenariats universitaires, dont les doubles diplomes. */
export const PARTENARIATS = {
  doublesDiplomes: ['Groupe ESG de Paris', 'Université Catholique de Milan'],
  pays: ['Maroc', 'Russie', 'Chine'],
};

/* ------------------------------------------------------------------ */
/* Coordonnees                                                         */
/* ------------------------------------------------------------------ */

/**
 * Implantation et contacts.
 *
 * Les valeurs marquees A_COMPLETER sont volontairement absentes : elles
 * alimenteront le schema.org `EducationalOrganization` et la page Contact.
 * Une adresse approximative ou un telephone errone dans des donnees
 * structurees se propage aux fiches Google et devient tres difficile a
 * corriger — mieux vaut un champ vide qu'une valeur inventee.
 *
 * Le garde-fou ci-dessous empeche une valeur non renseignee de partir en
 * production sans qu'on s'en apercoive.
 */
export const A_COMPLETER = Symbol('valeur a fournir par la direction');

export const CONTACT = {
  ville: 'Sévaré',
  region: 'Mopti',
  pays: 'Mali',
  codePays: 'ML',
  adresse: A_COMPLETER,
  codePostal: A_COMPLETER,
  telephone: A_COMPLETER,
  email: A_COMPLETER,
  latitude: A_COMPLETER,
  longitude: A_COMPLETER,
};

/** Adresse publique de l'application de gestion (espace prive). */
export const URL_APPLICATION =
  process.env.NEXT_PUBLIC_URL_APPLICATION || 'https://app.technolab-ista.org';

/** Origine canonique du site vitrine. */
export const ORIGINE = process.env.NEXT_PUBLIC_SITE_URL || 'https://technolab-ista.org';

/** Vrai si la valeur est encore a fournir : a tester avant tout affichage. */
export const estRenseigne = (valeur) => valeur !== A_COMPLETER && Boolean(valeur);

/**
 * Liste des coordonnees encore manquantes.
 * Utilisee par le build pour refuser un deploiement silencieusement incomplet.
 */
export const COORDONNEES_MANQUANTES = Object.entries(CONTACT)
  .filter(([, v]) => !estRenseigne(v))
  .map(([cle]) => cle);
