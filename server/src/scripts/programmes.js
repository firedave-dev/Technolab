/**
 * Programme des quatre classes, semestre par semestre.
 *
 * POURQUOI 12 MATIERES PAR SEMESTRE, ET PAS UN AUTRE NOMBRE.
 *
 * Le serveur n'accepte qu'un semestre bouclant exactement a 30 credits, les
 * unites d'enseignement etant des PAIRES de matieres de meme valeur. Trois
 * repartitions seulement satisfont cette contrainte : 10 matieres (toutes a 3
 * credits), 12 (six a 3, six a 2) ou 14 (douze a 2, deux a 3).
 *
 * La regle de coefficient retenue par l'etablissement — coefficient 3 pour les
 * matieres du coeur de la filiere, 2 pour les autres — ne se marie qu'avec la
 * repartition du milieu : elle est la seule a employer les deux valeurs a parts
 * egales. D'ou SIX matieres de specialite et SIX matieres generales par
 * semestre.
 *
 * Le compte tombe juste une seconde fois, du cote de l'emploi du temps : les
 * cours ont lieu de 16h a 20h15 en semaine, soit deux seances par jour, et le
 * samedi matin. Cela fait douze seances hebdomadaires — une par matiere.
 *
 * `specialite` recoit donc le coefficient 3 et `generale` le coefficient 2. Les
 * credits ne sont jamais ecrits ici : le modele les deduit du coefficient.
 */

export const COEFFICIENT_SPECIALITE = 3;
export const COEFFICIENT_GENERALE = 2;

/** [code, intitule, cle du professeur, type de matiere] */
export const PROGRAMMES = {
  // ====================================================== L1 INFORMATIQUE
  'L1-INFO': {
    semestre1: {
      specialite: [
        ['ALGO', 'Algorithmique', 'k.traore', 'programmation'],
        ['PROGC', 'Programmation structurée C', 'k.traore', 'programmation'],
        ['ARCHI', 'Architecture des ordinateurs', 'i.sidibe', 'informatique'],
        ['SYSEXP', 'Systèmes d’exploitation', 'k.traore', 'informatique'],
        ['BUROW', 'Informatique Bureautique (Word)', 'i.sidibe', 'informatique'],
        ['RESINI', 'Introduction aux réseaux', 's.toure', 'reseaux'],
      ],
      generale: [
        ['CPTG1', 'Comptabilité Générale 1', 'katile', 'comptabilite'],
        ['ECOGEN', 'Économie Générale', 'doumbia', 'economie'],
        ['MATHGE', 'Mathématiques Générales', 'g.kamanguile', 'maths'],
        ['ANG1', 'Anglais 1', 'n.sissao', 'langue'],
        ['TEC1', 'Technique d’Expression et de Communication 1', 'diallo', 'communication'],
        ['MATHFI', 'Mathématique Financière', 'bagayoko', 'maths'],
      ],
    },
    semestre2: {
      specialite: [
        ['POOCPP', 'Programmation Orientée Objet C++', 'k.traore', 'programmation'],
        ['SHELL', 'Shell Bash', 'k.traore', 'programmation'],
        ['STRDON', 'Structures de données', 'k.traore', 'programmation'],
        ['BDINI', 'Initiation aux bases de données', 's.toure', 'base-de-donnees'],
        ['MAINT', 'Maintenance informatique', 'i.sidibe', 'informatique'],
        ['PROJ1', 'Projets tutorés', 'k.traore', 'methodologie'],
      ],
      generale: [
        ['CPTG2', 'Comptabilité Générale 2', 'katile', 'comptabilite'],
        ['MICRO1', 'Microéconomie', 'doumbia', 'economie'],
        ['PROBA', 'Probabilité', 'g.kamanguile', 'statistiques'],
        ['STATDES', 'Statistique descriptive', 'g.kamanguile', 'statistiques'],
        ['ANG2', 'Anglais 2', 'n.sissao', 'langue'],
        ['TEC2', 'Technique d’Expression et de Communication 2', 'diallo', 'communication'],
      ],
    },
  },

  // ====================================================== L2 INFORMATIQUE
  'L2-INFO': {
    semestre1: {
      specialite: [
        ['POOJAVA', 'Programmation Orientée Objet Java', 's.toure', 'programmation'],
        ['UML', 'UML', 's.toure', 'methodologie'],
        ['HTMLCSS1', 'HTML/CSS 1', 's.toure', 'programmation'],
        ['BDVB', 'Base de données VB', 'k.traore', 'base-de-donnees'],
        ['ITESS', 'IT Essentiel', 'i.sidibe', 'informatique'],
        ['BUROEX', 'Informatique Bureautique (Excel)', 'i.sidibe', 'informatique'],
      ],
      generale: [
        ['CPTGL2', 'Comptabilité Générale', 'katile', 'comptabilite'],
        ['EOE', 'Économie et Organisation des Entreprises', 'doumbia', 'gestion'],
        ['STATL2', 'Statistique', 'g.kamanguile', 'statistiques'],
        ['ANG3', 'Anglais 1', 'n.sissao', 'langue'],
        ['TEC3', 'Technique d’Expression et de Communication 1', 'diallo', 'communication'],
        ['MATHFI2', 'Mathématiques financières approfondies', 'bagayoko', 'maths'],
      ],
    },
    semestre2: {
      specialite: [
        ['MERISE', 'Mérise', 's.toure', 'methodologie'],
        ['HTMLJS2', 'HTML/CSS/JS 2', 's.toure', 'programmation'],
        ['SGBD', 'SGBD', 'k.traore', 'base-de-donnees'],
        ['GENLOG', 'Génie logiciel', 's.toure', 'methodologie'],
        ['RESTEL', 'Réseaux et télécommunications', 'k.traore', 'reseaux'],
        ['PROJ2', 'Projets tutorés', 's.toure', 'gestion'],
      ],
      generale: [
        ['CPTANA', 'Comptabilité Analytique', 'katile', 'comptabilite'],
        ['MICRO2', 'Microéconomie', 'doumbia', 'economie'],
        ['GESPRO', 'Gestion de projet', 'doumbia', 'gestion'],
        ['STATINF', 'Statistique inférentielle', 'g.kamanguile', 'statistiques'],
        ['ANG4', 'Anglais 2', 'n.sissao', 'langue'],
        ['TEC4', 'Technique d’Expression et de Communication 2', 'diallo', 'communication'],
      ],
    },
  },

  // ============================================== L1 FINANCE COMPTABILITE
  //
  // Le rapport s'inverse : la comptabilite, la finance et l'economie passent en
  // specialite, l'informatique et les langues en matieres generales.
  'L1-FC': {
    semestre1: {
      specialite: [
        ['CPTGF1', 'Comptabilité Générale 1', 'sm.denou', 'comptabilite'],
        ['MATHFIF', 'Mathématique Financière', 'bagayoko', 'maths'],
        ['ECOGENF', 'Économie Générale', 'doumbia', 'economie'],
        ['CPTSOC1', 'Introduction à la comptabilité des sociétés', 'sm.denou', 'comptabilite'],
        ['TECBANC', 'Techniques bancaires', 'bagayoko', 'comptabilite'],
        ['FISCGEN', 'Fiscalité générale', 'katile', 'droit'],
      ],
      generale: [
        ['BUROWF', 'Informatique Bureautique (Word)', 'i.sidibe', 'informatique'],
        ['ANGF1', 'Anglais 1', 'n.sissao', 'langue'],
        ['TECF1', 'Technique d’Expression et de Communication 1', 'kontao', 'communication'],
        ['MATHGEF', 'Mathématiques Générales', 'g.kamanguile', 'maths'],
        ['ALGOGES', 'Algorithmique appliquée à la gestion', 'k.traore', 'programmation'],
        ['STATDESF', 'Statistique descriptive', 'g.kamanguile', 'statistiques'],
      ],
    },
    semestre2: {
      specialite: [
        ['CPTGF2', 'Comptabilité Générale 2', 'sm.denou', 'comptabilite'],
        ['CPTSOC2', 'Comptabilité des sociétés', 'sm.denou', 'comptabilite'],
        ['MICROF', 'Microéconomie', 'doumbia', 'economie'],
        ['ANAFIN', 'Analyse financière', 'bagayoko', 'comptabilite'],
        ['FISCENT', 'Fiscalité des entreprises', 'katile', 'droit'],
        ['PROJF1', 'Projets tutorés', 'sm.denou', 'methodologie'],
      ],
      generale: [
        ['ANGF2', 'Anglais 2', 'n.sissao', 'langue'],
        ['TECF2', 'Technique d’Expression et de Communication 2', 'kontao', 'communication'],
        ['PROBAF', 'Probabilité', 'g.kamanguile', 'statistiques'],
        ['TABGES', 'Tableur appliqué à la gestion', 'i.sidibe', 'informatique'],
        ['DROITAF', 'Droit des affaires', 'katile', 'droit'],
        ['GESENT', 'Gestion d’entreprise', 'doumbia', 'gestion'],
      ],
    },
  },

  // ============================================== L2 FINANCE COMPTABILITE
  'L2-FC': {
    semestre1: {
      specialite: [
        ['CPTANAF', 'Comptabilité Analytique', 'sm.denou', 'comptabilite'],
        ['CPTGAPP', 'Comptabilité Générale approfondie', 'sm.denou', 'comptabilite'],
        ['EOEF', 'Économie et Organisation des Entreprises', 'doumbia', 'gestion'],
        ['STATFC', 'Statistique', 'bagayoko', 'statistiques'],
        ['FISCAPP', 'Fiscalité approfondie', 'katile', 'droit'],
        ['GESFIN', 'Gestion financière', 'bagayoko', 'comptabilite'],
      ],
      generale: [
        ['BUROEXF', 'Informatique Bureautique (Excel)', 'i.sidibe', 'informatique'],
        ['ANGF3', 'Anglais 1', 'n.sissao', 'langue'],
        ['TECF3', 'Technique d’Expression et de Communication 1', 'kontao', 'communication'],
        ['MICROF2', 'Microéconomie', 'doumbia', 'economie'],
        ['BDINIF', 'Initiation aux bases de données', 's.toure', 'base-de-donnees'],
        ['DROITTR', 'Droit du travail', 'katile', 'droit'],
      ],
    },
    semestre2: {
      specialite: [
        ['CPTSOCA', 'Comptabilité des sociétés approfondie', 'sm.denou', 'comptabilite'],
        ['AUDCTRL', 'Audit et contrôle de gestion', 'katile', 'comptabilite'],
        ['ANAFINA', 'Analyse financière approfondie', 'bagayoko', 'comptabilite'],
        ['CPTPUB', 'Comptabilité publique', 'sm.denou', 'comptabilite'],
        ['MARCHFI', 'Marchés financiers', 'bagayoko', 'comptabilite'],
        ['PROJF2', 'Projets tutorés', 'sm.denou', 'methodologie'],
      ],
      generale: [
        ['ANGF4', 'Anglais 2', 'n.sissao', 'langue'],
        ['TECF4', 'Technique d’Expression et de Communication 2', 'kontao', 'communication'],
        ['STATINFF', 'Statistique inférentielle', 'g.kamanguile', 'statistiques'],
        ['TABAVAN', 'Tableur avancé', 'i.sidibe', 'informatique'],
        ['ECOMON', 'Économie monétaire', 'doumbia', 'economie'],
        ['GESRH', 'Gestion des ressources humaines', 'doumbia', 'gestion'],
      ],
    },
  },
};

/**
 * Deplie le programme en une liste de matieres pretes a etre creees.
 * @returns {{classe, code, nom, coefficient, semestre, professeur, typeMatiere}[]}
 */
export function matieresDe(cleClasse) {
  const programme = PROGRAMMES[cleClasse];
  if (!programme) throw new Error(`Programme inconnu : ${cleClasse}`);

  const liste = [];
  for (const [semestre, groupes] of Object.entries(programme)) {
    for (const [nature, matieres] of Object.entries(groupes)) {
      const coefficient = nature === 'specialite' ? COEFFICIENT_SPECIALITE : COEFFICIENT_GENERALE;
      for (const [code, nom, professeur, typeMatiere] of matieres) {
        liste.push({
          classe: cleClasse, code, nom, coefficient, semestre, professeur, typeMatiere, nature,
        });
      }
    }
  }
  return liste;
}

/**
 * Verifie qu'un semestre boucle bien a 30 credits.
 * Le controle est fait AVANT toute ecriture : une matiere refusee en cours
 * d'import laisserait la base a moitie remplie.
 */
export function verifierSemestre(matieres) {
  const n2 = matieres.filter((m) => m.coefficient < 3).length;
  const n3 = matieres.filter((m) => m.coefficient >= 3).length;
  const credits = n2 * 2 + n3 * 3;
  return {
    n2, n3, total: matieres.length, credits,
    valide: credits === 30 && n2 % 2 === 0 && n3 % 2 === 0,
  };
}
