import { A_COMPLETER } from './etablissement';

/**
 * Processus d'admission.
 *
 * PROVENANCE — les pieces a fournir, les frais et leurs conditions viennent de
 * la brochure institutionnelle (voir contenu/donnees/formations.js). Les etapes
 * ci-dessous ne font que les mettre en ordre : chacune ne dit que ce que la
 * brochure enonce, aucune n'ajoute une formalite qui n'y figure pas.
 *
 * CE QUI MANQUE, et qui n'est pas invente : les DATES des sessions d'admission.
 * La brochure n'en porte aucune. Un calendrier approximatif sur un site
 * d'etablissement fait manquer une inscription a qui s'y fie — c'est le genre
 * d'erreur qui coute une annee a un candidat. Le bloc reste donc vide et le
 * signale, jusqu'a ce que la direction fournisse les dates.
 */

export const ETAPES = [
  {
    titre: 'Constituer le dossier',
    texte:
      'Réunir les pièces demandées, dont la demande manuscrite adressée au '
      + 'Directeur Général et la fiche d’inscription à retirer sur place.',
  },
  {
    titre: 'Déposer la candidature',
    texte:
      'Le dossier se dépose à la Direction de l’institut ou dans l’un des '
      + 'centres annexes, qui délivrent également la fiche d’inscription.',
  },
  {
    titre: 'Régler les frais d’inscription',
    texte:
      'Le versement des frais d’inscription valide la candidature. Il est distinct '
      + 'des frais académiques et n’en fait pas partie.',
  },
  {
    titre: 'Régler la scolarité',
    texte:
      'Les frais académiques dépendent du cycle et du pôle choisis. Un premier '
      + 'versement d’au moins 30 % ouvre droit aux tenues fournies par l’institut.',
  },
];

/**
 * Sessions d'admission.
 *
 * Renseigner `sessions` avec des entrees { periode, depot, rentree } le jour ou
 * la direction communique le calendrier. Tant que la valeur reste
 * `A_COMPLETER`, la page affiche une invitation a contacter le secretariat
 * plutot qu'un tableau vide ou des dates supposees.
 */
export const CALENDRIER = {
  sessions: A_COMPLETER,
};

/**
 * Lien vers le dossier de candidature.
 *
 * `A_COMPLETER` tant que le PDF n'a pas ete fourni. La page affiche alors un
 * bouton desactive assorti de la marche a suivre, plutot qu'un lien mort : un
 * bouton qui ne mene nulle part se signale a l'usage, quand il est trop tard.
 */
export const DOSSIER_CANDIDATURE = A_COMPLETER;

/**
 * Questions frequentes.
 *
 * Chaque reponse s'appuie sur une donnee de la brochure, jamais sur une
 * supposition de fonctionnement. Les questions dont la reponse n'est pas
 * documentee — delais de traitement, equivalences, bourses — sont absentes
 * plutot que remplies au jugé.
 */
export const QUESTIONS = [
  {
    question: 'Les frais d’inscription sont-ils remboursables ?',
    reponse:
      'Non. Ils sont non négociables, obligatoires et non remboursables. Ils sont '
      + 'payables au départ pour valider une inscription, et ne font pas partie '
      + 'des frais académiques.',
  },
  {
    question: 'Quelle est la différence entre frais d’inscription et frais académiques ?',
    reponse:
      'Les frais d’inscription valident la candidature et sont dus une fois. Les '
      + 'frais académiques couvrent l’année de formation et dépendent du cycle et '
      + 'du pôle disciplinaire choisis.',
  },
  {
    question: 'Les diplômes sont-ils reconnus ?',
    reponse:
      'L’institut est un établissement privé d’éducation agréé par le gouvernement '
      + 'malien. Plus de trente de ses diplômes sont reconnus par le CAMES, le '
      + 'Conseil Africain et Malgache pour l’Enseignement Supérieur. L’institut est '
      + 'également reconnu par la FEDE, Fédération Européenne des Écoles.',
  },
  {
    question: 'Peut-on obtenir un double diplôme ?',
    reponse:
      'L’institut collabore avec plusieurs universités étrangères, dont le Groupe '
      + 'ESG de Paris et l’Université Catholique de Milan, dans le cadre de '
      + 'partenariats offrant des doubles diplômes. D’autres partenariats existent '
      + 'au Maroc, en Russie et en Chine.',
  },
  {
    question: 'Les certifications informatiques sont-elles incluses ?',
    reponse:
      'Oui pour les programmes techniques informatiques : l’institut est accrédité '
      + 'Académie Cisco et Académie Huawei ICT, et les certifications CISCO ITE et '
      + 'CCNA sont directement intégrées aux programmes.',
  },
  {
    question: 'Où retirer la fiche d’inscription ?',
    reponse:
      'Au niveau de la Direction de l’institut, ainsi que dans les centres annexes.',
  },
];
