/**
 * Bornes des periodes de rapport.
 *
 * MODULE PUR : ni base, ni horloge implicite. La date de reference est toujours
 * passee en argument, ce qui rend les bornes reproductibles — un rapport
 * mensuel edite le 1er a 00 h 05 doit couvrir le mois demande, pas celui que le
 * serveur croit etre en cours.
 *
 * DEUX FAMILLES DE PERIODES, ET LA DISTINCTION COMPTE :
 *
 * - les periodes CIVILES (jour, semaine, mois, trimestre, semestre) servent au
 *   suivi de caisse : on veut savoir ce qui est entre entre deux dates ;
 *
 * - l'annee SCOLAIRE ne coincide avec aucune d'elles. Elle court d'octobre a
 *   septembre, et c'est la seule qui ait un sens pedagogique. La traiter comme
 *   une annee civile couperait la scolarite en deux au 31 decembre, en plein
 *   milieu du premier semestre.
 */

export const PERIODES = [
  'journalier', 'hebdomadaire', 'mensuel', 'trimestriel',
  'semestriel', 'annuel', 'general',
];

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Premier instant du jour. */
const debutJour = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Dernier instant du jour — inclusif, a la milliseconde pres. */
const finJour = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const jj = (d) => String(d.getDate()).padStart(2, '0');
const mm = (d) => String(d.getMonth() + 1).padStart(2, '0');
export const enDate = (d) => `${jj(d)}/${mm(d)}/${d.getFullYear()}`;

/**
 * Mois ou commence l'annee scolaire (0 = janvier). Octobre au Mali.
 * Isole ici : le changer suffit a deplacer toutes les bornes annuelles.
 */
export const MOIS_RENTREE = 9;

/**
 * Bornes d'une periode.
 *
 * @param {string} type       l'une des valeurs de PERIODES
 * @param {Date}   reference  date situee DANS la periode voulue
 * @param {string} [anneeScolaire] « 2023-2024 », requis pour le type annuel
 * @returns {{debut: Date|null, fin: Date|null, libelle: string}}
 */
export function bornesPeriode(type, reference = new Date(), anneeScolaire = null) {
  const ref = new Date(reference);

  switch (type) {
    case 'journalier':
      return {
        debut: debutJour(ref),
        fin: finJour(ref),
        libelle: `Journée du ${enDate(ref)}`,
      };

    case 'hebdomadaire': {
      // La semaine commence le LUNDI : getDay() rend 0 pour dimanche, qu'il
      // faut donc ramener a 6 et non a -1.
      const decalage = (ref.getDay() + 6) % 7;
      const lundi = debutJour(new Date(ref));
      lundi.setDate(lundi.getDate() - decalage);
      const dimanche = new Date(lundi);
      dimanche.setDate(dimanche.getDate() + 6);
      return {
        debut: lundi,
        fin: finJour(dimanche),
        libelle: `Semaine du ${enDate(lundi)} au ${enDate(dimanche)}`,
      };
    }

    case 'mensuel': {
      const debut = debutJour(new Date(ref.getFullYear(), ref.getMonth(), 1));
      // Le jour 0 du mois suivant EST le dernier jour du mois courant : la
      // formule vaut pour février comme pour les mois de 31 jours.
      const fin = finJour(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
      return { debut, fin, libelle: `${MOIS[ref.getMonth()]} ${ref.getFullYear()}` };
    }

    case 'trimestriel': {
      const premier = Math.floor(ref.getMonth() / 3) * 3;
      const debut = debutJour(new Date(ref.getFullYear(), premier, 1));
      const fin = finJour(new Date(ref.getFullYear(), premier + 3, 0));
      return {
        debut, fin,
        libelle: `${premier / 3 + 1}ᵉ trimestre ${ref.getFullYear()}`,
      };
    }

    case 'semestriel': {
      const premier = ref.getMonth() < 6 ? 0 : 6;
      const debut = debutJour(new Date(ref.getFullYear(), premier, 1));
      const fin = finJour(new Date(ref.getFullYear(), premier + 6, 0));
      return {
        debut, fin,
        libelle: `${premier === 0 ? '1ᵉʳ' : '2ᵉ'} semestre ${ref.getFullYear()}`,
      };
    }

    case 'annuel': {
      // L'annee scolaire prime sur l'annee civile. A defaut d'indication, on la
      // deduit de la date de reference.
      const depart = anneeScolaire
        ? Number(anneeScolaire.slice(0, 4))
        : (ref.getMonth() >= MOIS_RENTREE ? ref.getFullYear() : ref.getFullYear() - 1);

      const debut = debutJour(new Date(depart, MOIS_RENTREE, 1));
      const fin = finJour(new Date(depart + 1, MOIS_RENTREE, 0));
      return { debut, fin, libelle: `Année scolaire ${depart}-${depart + 1}` };
    }

    case 'general':
      return { debut: null, fin: null, libelle: 'Depuis l’origine' };

    default:
      throw new Error(`Periode inconnue : ${type}`);
  }
}

/** Filtre Mongo sur un champ de date, vide pour la periode « general ». */
export function filtreDates(champ, { debut, fin }) {
  if (!debut && !fin) return {};
  const contrainte = {};
  if (debut) contrainte.$gte = debut;
  if (fin) contrainte.$lte = fin;
  return { [champ]: contrainte };
}
