/**
 * Offre de formation et conditions financieres presentees sur le site public.
 *
 * PROVENANCE — transcrit de la brochure institutionnelle TechnoLAB-ISTA
 * (« Qui sommes-nous ? », « Nos cycles et filieres de formation », « Tarifs
 * annuels »). Aucune formation, aucun montant n'est invente ici.
 *
 * STRUCTURE — la brochure croise deux axes, et le site fait de meme :
 *
 *                 Sciences economiques   Sciences &        Sciences techniques
 *                    et de gestion       technologies       et ingenierie
 *   DUT (Bac+2)          ...                ...                  ...
 *   Licence (Bac+3)      ...                ...                  ...
 *   Master (Bac+5)       ...                ...                  ...
 *
 * C'est exactement la grille tarifaire : un montant par cycle et par pole. Les
 * deux tableaux partagent donc les memes cles (`gestion`, `technologies`,
 * `ingenierie`), ce qui rend impossible d'afficher un parcours sous un pole et
 * de le facturer sous un autre.
 *
 * Un ecart de vocabulaire de la brochure a ete conserve tel quel : le pole
 * technique s'y intitule « Sciences Techniques » en DUT et « Sciences de
 * l'Ingenieur » en licence et master. Le libelle affiche suit le cycle ; la cle
 * et le tarif, eux, restent uniques.
 */

/* ------------------------------------------------------------------ */
/* Identite de l'etablissement                                         */
/* ------------------------------------------------------------------ */

export const NOM_COMPLET = 'Institut Supérieur de Technologies Appliquées';
export const SIGLE = 'TechnoLAB - ISTA';
export const ANNEE_FONDATION = 1998;
export const SITE_OFFICIEL = 'https://www.technolab-ista.org';

/**
 * Identite administrative, telle qu'elle figure sur les documents officiels.
 *
 * Une precision a garder en tete : le siege est a Bamako (boite postale), et
 * l'etablissement enseigne a Sevare, dans la region de Mopti — c'est le
 * « contexte regional Mopti » de la grille tarifaire. Les deux adresses sont
 * donc portees distinctement plutot que fondues en une seule.
 *
 * Ces valeurs alimentent le pied du site public ET les donnees structurees
 * schema.org : une seule source, donc aucun risque qu'un moteur de recherche
 * lise une adresse differente de celle affichee.
 */
/**
 * Profils officiels de l'etablissement.
 *
 * Ils alimentent la propriete `sameAs` des donnees structurees, qui relie la
 * fiche du site aux comptes sociaux. C'est ce qui permet a un moteur de
 * confirmer qu'il s'agit bien de la MEME entite, plutot que de plusieurs
 * organisations portant un nom voisin — le signal le plus economique pour un
 * etablissement recemment mis en ligne.
 *
 * Aucune chaine YouTube a ce jour : declarer un profil inexistant affaiblirait
 * l'ensemble.
 */
export const RESEAUX = [
  { nom: 'Facebook', url: 'https://www.facebook.com/TechnolabIstaOfficielle' },
  { nom: 'LinkedIn', url: 'https://www.linkedin.com/company/technolab-ista' },
  { nom: 'Instagram', url: 'https://www.instagram.com/technolab_ista_officielle' },
  { nom: 'TikTok', url: 'https://www.tiktok.com/@technolabistaofficiel' },
];

export const IDENTITE = {
  boitePostale: 'B.P. E3123 Bamako, Mali',
  siteEnseignement: 'Sévaré, région de Mopti',
  telephones: ['+223 20 29 01 54', '+223 20 29 19 43'],
  email: 'technolab@technolab-ista.net',
  agrement: 'N° 0699/98 MESSRS',
  registreCommerce: 'RC 1316',
  numeroDni: '685 101 3832',
};

/**
 * Faits verifiables portes par la brochure, repris sur la page « A propos ».
 *
 * La brochure affirme aussi detenir « le taux d'insertion professionnelle le plus
 * eleve ». Ce superlatif n'est PAS republie : une comparaison entre etablissements
 * demande une source, et un site officiel qui l'avance sans mesure publiee
 * s'expose autant qu'il se valorise. A reintegrer si la direction fournit l'etude.
 */
export const CHIFFRES = [
  { nombre: new Date().getFullYear() - ANNEE_FONDATION, suffixe: ' ans', libelle: 'd’expérience' },
  { nombre: 16000, suffixe: '+', libelle: 'diplômés dans le monde' },
  { nombre: 30, suffixe: '+', libelle: 'diplômes reconnus par le CAMES' },
  { nombre: 3, suffixe: '', libelle: 'cycles, du Bac+2 au Bac+5' },
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
/* Poles et cycles                                                     */
/* ------------------------------------------------------------------ */

/**
 * Les trois poles disciplinaires, dans l'ordre de la grille tarifaire.
 * `nomDut` porte l'intitule specifique employe par la brochure sur ce cycle.
 */
export const POLES = [
  {
    cle: 'gestion',
    nom: 'Sciences économiques et de gestion',
    resume:
      'Finance, comptabilité, ressources humaines, logistique et communication : '
      + 'les métiers qui pilotent l’activité d’une entreprise ou d’une administration.',
  },
  {
    cle: 'technologies',
    nom: 'Sciences et technologies',
    resume:
      'Développement logiciel, réseaux, données, électronique et énergie — avec les '
      + 'certifications CISCO intégrées aux programmes informatiques.',
  },
  {
    cle: 'ingenierie',
    nom: 'Sciences de l’ingénieur',
    nomDut: 'Sciences techniques',
    resume:
      'Génie civil, ressources minières et agro-industrie : les filières d’ingénierie '
      + 'appliquée aux grands secteurs productifs.',
  },
];

/**
 * Les trois cycles, du plus court au plus long.
 * `programmes` est indexe par la cle de pole.
 */
export const CYCLES = [
  {
    cle: 'dut',
    nom: 'DUT',
    niveau: 'Bac + 2',
    resume: 'Deux années professionnalisantes, ouvertes sur la poursuite en licence.',
    programmes: {
      gestion: [
        'Assistant de direction',
        'Finance et comptabilité',
        'Marketing et management',
        'Gestion logistique et transport',
        'Gestion des ressources humaines',
        'Archivage et informatique documentaire',
        'Hygiène, qualité, sécurité et environnement (HQSE)',
      ],
      technologies: [
        'Informatique de gestion',
        'Analyse et programmation',
        'Réseaux et télécommunication',
        'Électronique et maintenance informatique',
        'Génie électrique et énergies renouvelables',
      ],
      ingenierie: [
        'Génie civil',
        'Mine et géologie',
        'Technologies agro-alimentaires',
      ],
    },
  },
  {
    cle: 'licence',
    nom: 'Licence',
    niveau: 'Bac + 3',
    resume: 'Le cycle principal, sanctionné par un projet professionnel encadré.',
    programmes: {
      gestion: [
        'Agro-économie',
        'Marketing digital',
        'Finance et gestion',
        'Logistique humanitaire',
        'Finance, banque et assurance',
        'Comptabilité, contrôle et audit',
        'Gestion des entreprises et des administrations',
        'Gestion logistique et transport',
        'Gestion des ressources humaines',
        'Communication d’entreprise et des organisations',
        'Sciences et techniques comptables et financières',
        'Marketing, communication et commerce international',
        'Hygiène, qualité, sécurité et environnement (HQSE)',
      ],
      technologies: [
        'Data science',
        'Géomatique et SIG',
        'Systèmes et réseaux informatiques',
        'Méthodes informatiques appliquées à la gestion des entreprises (MIAGE)',
        'Archivage et informatique documentaire',
        'Électronique, IoT et systèmes embarqués',
        'Génie électrique et énergies renouvelables',
        'Génie logiciel et développement d’applications web',
        'Réseaux et télécommunication',
      ],
      ingenierie: [
        'Génie civil',
        'Mine et géologie',
        'Technologies agro-alimentaires',
      ],
    },
  },
  {
    cle: 'master',
    nom: 'Master',
    niveau: 'Bac + 5',
    resume: 'La spécialisation, en deux ans après la licence.',
    programmes: {
      gestion: [
        'Marketing digital',
        'Finance, banque et assurance',
        'Comptabilité, contrôle et audit',
        'Gestion des ressources humaines',
        'Communication d’entreprise et des organisations',
        'Marketing, communication et commerce international',
        'Gestion comptable, financière et fiscalité',
        'Logistique et management des opérations',
        'Management des projets et des organisations',
        'Gestion des entreprises et des administrations',
        'Gestion de l’information et de la documentation',
        'Hygiène, qualité, sécurité et environnement (HQSE)',
      ],
      technologies: [
        'Géomatique et SIG',
        'Intelligence artificielle',
        'Ingénierie des systèmes, réseaux informatiques et sécurité',
        'Génie logiciel et technologies du web',
        'Data science et modélisation statistique',
        'Méthodes informatiques appliquées à la gestion des entreprises (MIAGE)',
        'Électronique, IoT et systèmes embarqués',
        'Génie électrique et énergies renouvelables',
        'Cybersécurité et ingénierie de la blockchain',
        'Réseaux informatiques et télécommunication',
        'Électronique et maintenance des systèmes de production',
      ],
      ingenierie: [
        'Génie civil',
        'Géologie (exploration minière)',
        'Génie minier (exploitation minière)',
        'Technologies agro-alimentaires',
      ],
    },
  },
];

/** Intitule du pole tel qu'il doit s'afficher sur un cycle donne. */
export const nomPole = (pole, cleCycle) =>
  (cleCycle === 'dut' && pole.nomDut) || pole.nom;

/** Nombre total de parcours au catalogue, tous cycles et poles confondus. */
export const NOMBRE_PARCOURS = CYCLES.reduce(
  (total, cycle) =>
    total + POLES.reduce((n, pole) => n + cycle.programmes[pole.cle].length, 0),
  0
);

/* ------------------------------------------------------------------ */
/* Admission                                                           */
/* ------------------------------------------------------------------ */

/** Pieces a fournir pour l'inscription, reprises mot pour mot de la brochure. */
export const PIECES_INSCRIPTION = [
  'Un extrait d’acte de naissance',
  'Deux photos d’identité récentes',
  'Les copies légalisées des diplômes obtenus, avec les relevés de notes',
  'Une demande manuscrite timbrée adressée au Directeur Général de TechnoLAB-ISTA',
  'Une fiche d’inscription à remplir, disponible au niveau de la Direction et dans les centres annexes',
];

/* ------------------------------------------------------------------ */
/* Conditions financieres                                              */
/* ------------------------------------------------------------------ */

/**
 * Annee de reference de la grille.
 *
 * Elle est AFFICHEE au visiteur, pas seulement stockee : une grille sans millesime
 * laisse croire qu'elle est a jour, indefiniment. Mettre a jour cette constante et
 * les montants ci-dessous suffit a rafraichir la page Admissions.
 */
export const ANNEE_TARIFAIRE = '2026-2027';

/** Perimetre geographique de la grille, tel qu'imprime sur la brochure. */
export const PERIMETRE_TARIFAIRE = 'Contexte régional : Mopti et environs';

/** Frais d'inscription, dus une fois. */
export const FRAIS_INSCRIPTION = {
  montant: 80_000,
  mention:
    'Non négociables, obligatoires et non remboursables, payables au départ pour '
    + 'valider une inscription. Ce montant ne fait pas partie des frais académiques.',
};

/**
 * Frais academiques annuels, en FCFA.
 * Une ligne par niveau, une colonne par pole — c'est la grille de la brochure.
 */
export const TARIFS = [
  { niveau: 'Licence 1 / DUT 1', gestion: 375_000, technologies: 400_000, ingenierie: 550_000 },
  { niveau: 'Licence 2 / DUT 2', gestion: 375_000, technologies: 400_000, ingenierie: 550_000 },
  { niveau: 'Licence 3', gestion: 600_000, technologies: 675_000, ingenierie: 700_000 },
  { niveau: 'Master 1', gestion: 750_000, technologies: 860_000, ingenierie: 900_000 },
  { niveau: 'Master 2', gestion: 750_000, technologies: 860_000, ingenierie: 900_000 },
];

/** Cas particulier : tarif unique, hors grille par pole. */
export const TARIF_MAITRISE_MASTER2 = {
  libelle: 'Détenteurs d’une maîtrise souhaitant faire un Master 2',
  montant: 1_100_000,
};

/** Avantage attache a un paiement anticipe, porte par la brochure. */
export const AVANTAGE_PAIEMENT = {
  seuil: 0.3,
  texte:
    'Le paiement d’au moins 30 % des frais académiques donne droit à deux costumes '
    + 'fournis comme tenues.',
};

/** Bornes de la grille, calculees plutot que recopiees : elles ne peuvent pas diverger. */
const MONTANTS = TARIFS.flatMap((l) => POLES.map((p) => l[p.cle]));
export const MONTANT_MIN = Math.min(...MONTANTS);
export const MONTANT_MAX = Math.max(...MONTANTS);


/**
 * Questions frequentes sur l'admission.
 *
 * DEUX REGLES, et la seconde est une consigne formelle de Google :
 *
 * 1. chaque reponse est CONSTRUITE a partir des constantes ci-dessus. Recopier
 *    un montant a la main creerait une seconde verite, qui divergerait de la
 *    grille a la premiere revalorisation ;
 *
 * 2. chaque question est AFFICHEE sur la page. Declarer en donnees structurees
 *    une reponse absente du contenu visible fait perdre les resultats enrichis,
 *    et peut valoir une action manuelle.
 *
 * Elles servent aussi les moteurs generatifs : interroges sur « les frais
 * d'inscription a TechnoLAB-ISTA », ils reprennent une reponse explicitement
 * formulee bien plus volontiers qu'un chiffre isole dans un tableau.
 */
export const QUESTIONS_ADMISSION = [
  {
    question: 'Quels sont les frais d’inscription à TechnoLAB-ISTA ?',
    reponse:
      `Les frais d’inscription s’élèvent à ${FRAIS_INSCRIPTION.montant.toLocaleString('fr-FR')} FCFA. `
      + 'Ils sont dus une seule fois, à l’inscription, et ne font pas partie des frais '
      + 'académiques annuels.',
  },
  {
    question: 'Combien coûte une année d’études ?',
    reponse:
      `Les frais académiques annuels vont de ${MONTANT_MIN.toLocaleString('fr-FR')} à `
      + `${MONTANT_MAX.toLocaleString('fr-FR')} FCFA selon le niveau et le pôle disciplinaire, `
      + `pour l’année ${ANNEE_TARIFAIRE}. Les sciences économiques et de gestion sont au tarif `
      + 'le plus bas, les sciences de l’ingénieur au plus élevé.',
  },
  {
    question: 'Quelles pièces faut-il fournir pour s’inscrire ?',
    reponse: `Le dossier comprend ${PIECES_INSCRIPTION.length} pièces : `
      + `${PIECES_INSCRIPTION.join(' ; ')}.`,
  },
  {
    question: 'Quels diplômes prépare TechnoLAB-ISTA ?',
    reponse:
      `L’institut prépare ${NOMBRE_PARCOURS} parcours répartis sur trois cycles : le DUT `
      + '(Bac+2), la licence (Bac+3) et le master (Bac+5), dans trois pôles — sciences '
      + 'économiques et de gestion, sciences et technologies, sciences de l’ingénieur.',
  },
  {
    question: 'Les diplômes sont-ils reconnus ?',
    reponse:
      'L’établissement est agréé par le gouvernement malien et plus de trente de ses diplômes '
      + 'sont reconnus par le CAMES, le Conseil Africain et Malgache pour l’Enseignement '
      + 'Supérieur. Il est également membre de la Fédération Européenne des Écoles.',
  },
  {
    question: 'Où se situe TechnoLAB-ISTA ?',
    reponse:
      `L’enseignement se déroule à ${IDENTITE.siteEnseignement}, au Mali. L’adresse postale `
      + `de l’établissement est ${IDENTITE.boitePostale}. Le secrétariat est joignable au `
      + `${IDENTITE.telephones.join(' ou au ')}.`,
  },
  {
    question: 'Peut-on échelonner le paiement de la scolarité ?',
    reponse: AVANTAGE_PAIEMENT.texte
      + ' Les modalités d’échelonnement sont fixées par le secrétariat lors de l’inscription.',
  },
];
