/**
 * Regles de calcul et de permission communes aux modules notes, examens et absences.
 *
 * MOYENNE D'UN GROUPE DE NOTES — chaque note est ramenee sur 20 (une interro sur 10
 * et un devoir sur 20 pesent alors la meme chose a coefficient egal), puis ponderee
 * par le coefficient de l'evaluation. Les copies marquees "absent" sont exclues :
 * une copie non rendue n'est pas un zero merite.
 *
 * MOYENNE D'UNE MATIERE — elle ne moyenne PAS toutes les notes ensemble. Les
 * evaluations sont d'abord separees en deux groupes, chacun moyenne de son cote :
 *
 *   moyenne de classe    devoirs, interrogations, TP et projets (le controle continu)
 *   moyenne d'examen     les examens
 *
 * puis composees en donnant a l'examen le double du poids du controle continu :
 *
 *   moyenne de matiere = (moyenne d'examen x 2 + moyenne de classe) / 3
 *
 * Pourquoi separer avant de composer, plutot que de donner un gros coefficient a
 * l'examen : le poids de l'examen serait alors dilue par le NOMBRE de devoirs. Une
 * matiere a douze interrogations et une matiere a deux devoirs ne repartiraient plus
 * le meme equilibre entre controle continu et examen, alors que la regle de
 * l'etablissement est la meme partout. En moyennant chaque groupe d'abord, le rapport
 * 2/3 - 1/3 est garanti quel que soit le nombre d'evaluations de chaque cote.
 *
 * Tant qu'un des deux groupes est vide — cas normal avant la session d'examens —
 * la moyenne de matiere est celle du groupe renseigne. Appliquer la formule a un
 * groupe absent reviendrait a le compter pour zero et a afficher, en cours d'annee,
 * une moyenne effondree qui ne veut rien dire.
 */
import { Matiere } from '../models/Matiere.js';
import { Evaluation } from '../models/Evaluation.js';
import { Note } from '../models/Note.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';

/** Arrondi a deux decimales, en conservant `null` pour "pas de moyenne". */
const arrondir = (valeur) => (valeur === null ? null : Math.round(valeur * 100) / 100);

/** Moyenne ponderee d'une liste de { note, bareme, coefficient }. */
export function moyennePonderee(elements) {
  let total = 0;
  let poids = 0;

  for (const { note, bareme, coefficient } of elements) {
    if (note === null || note === undefined) continue;
    total += (note / bareme) * 20 * coefficient;
    poids += coefficient;
  }

  return poids ? arrondir(total / poids) : null;
}

/**
 * Types d'evaluation qui alimentent la moyenne de classe.
 * Tout ce qui n'est pas un examen est du controle continu.
 */
export const TYPES_TRAVAUX_DE_CLASSE = ['devoir', 'interrogation', 'tp', 'projet'];

/** Poids de l'examen relativement au controle continu, qui vaut 1. */
export const POIDS_EXAMEN = 2;

/**
 * Compose la moyenne d'une matiere a partir de ses deux composantes.
 * Un groupe absent (`null`) est ignore plutot que compte pour zero.
 */
export function moyenneMatiere(moyenneClasse, moyenneExamen) {
  if (moyenneExamen === null) return moyenneClasse;
  if (moyenneClasse === null) return moyenneExamen;

  return arrondir((moyenneExamen * POIDS_EXAMEN + moyenneClasse) / (POIDS_EXAMEN + 1));
}

/** Mention attribuee a une moyenne sur 20. */
export function mention(moyenne) {
  if (moyenne === null) return null;
  if (moyenne >= 16) return 'Tres bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

/**
 * Verifie qu'un acteur a le droit d'agir sur une matiere.
 * Un professeur n'intervient que sur les matieres qui lui sont assignees ;
 * la direction et le secretariat gerent l'ensemble.
 */
export function verifierAccesMatiere(acteur, matiere, { lecture = false } = {}) {
  if ([...ADMIN_ROLES, ROLES.SECRETAIRE].includes(acteur.role)) return;

  if (acteur.role === ROLES.PROFESSEUR) {
    if (String(matiere.professeur?._id || matiere.professeur) === String(acteur._id)) return;
    throw ApiError.forbidden('Cette matiere ne vous est pas assignee');
  }

  // Consultation ouverte au reste du personnel, ecriture refusee.
  if (lecture && STAFF_ROLES.includes(acteur.role)) return;

  throw ApiError.forbidden('Votre role ne permet pas cette action');
}

/**
 * Restreint une liste de dossiers aux etudiants que l'acteur a le droit de consulter.
 * Renvoie `null` quand aucune restriction ne s'applique (personnel).
 */
export async function perimetreEtudiants(acteur) {
  if (STAFF_ROLES.includes(acteur.role)) return null;
  if (acteur.role === ROLES.ETUDIANT) return [acteur._id];
  if (acteur.role === ROLES.PARENT) return acteur.enfants || [];
  return [];
}

/** Verifie l'acces a un dossier etudiant precis (personnel, parent de l'eleve, ou l'eleve). */
export async function verifierAccesEtudiant(acteur, etudiantId) {
  const autorises = await perimetreEtudiants(acteur);
  if (autorises === null) return;

  if (!autorises.some((id) => String(id) === String(etudiantId))) {
    throw ApiError.forbidden('Vous ne pouvez consulter que votre dossier ou celui de vos enfants');
  }
}

/**
 * Bulletin d'un etudiant : moyenne par matiere, moyenne generale, rang dans la classe.
 *
 * `inclureNonPubliees` permet au personnel de voir le bulletin en cours de saisie ;
 * les etudiants et parents ne voient que les evaluations publiees.
 */
export async function calculerBulletin(etudiantId, { periode, inclureNonPubliees = false } = {}) {
  const etudiant = await User.findOne({ _id: etudiantId, role: ROLES.ETUDIANT })
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire')
    .lean();

  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');

  const classe = etudiant.infosEtudiant?.classe;
  if (!classe) {
    return { etudiant, classe: null, matieres: [], moyenneGenerale: null, rang: null, effectif: 0 };
  }

  const matieres = await Matiere.find({ classe: classe._id, actif: true })
    .sort('nom')
    .populate('professeur', 'nom prenom')
    .lean();

  const filtreEvaluation = {
    classe: classe._id,
    ...(periode ? { periode } : {}),
    ...(inclureNonPubliees ? {} : { publiee: true }),
  };

  const evaluations = await Evaluation.find(filtreEvaluation).sort('date').lean();
  const evaluationsParMatiere = new Map();
  for (const ev of evaluations) {
    const cle = String(ev.matiere);
    if (!evaluationsParMatiere.has(cle)) evaluationsParMatiere.set(cle, []);
    evaluationsParMatiere.get(cle).push(ev);
  }

  // Toutes les notes de la classe en une requete : sert aussi au calcul du rang.
  const notes = await Note.find({ evaluation: { $in: evaluations.map((e) => e._id) } }).lean();
  const notesParEtudiant = new Map();
  for (const note of notes) {
    const cle = String(note.etudiant);
    if (!notesParEtudiant.has(cle)) notesParEtudiant.set(cle, new Map());
    notesParEtudiant.get(cle).set(String(note.evaluation), note);
  }

  /** Detail par matiere pour un etudiant donne. */
  const detailPour = (idEtudiant) => {
    const sesNotes = notesParEtudiant.get(String(idEtudiant)) || new Map();

    return matieres.map((matiere) => {
      const evals = evaluationsParMatiere.get(String(matiere._id)) || [];

      const lignes = evals.map((ev) => {
        const note = sesNotes.get(String(ev._id));
        return {
          evaluation: { id: ev._id, titre: ev.titre, type: ev.type, date: ev.date, bareme: ev.bareme, coefficient: ev.coefficient },
          valeur: note && !note.absent ? note.valeur : null,
          absent: Boolean(note?.absent),
          appreciation: note?.appreciation || null,
          saisie: Boolean(note),
        };
      });

      // Chaque groupe est moyenne de son cote, puis les deux sont composes.
      const peser = (predicat) =>
        moyennePonderee(
          lignes
            .map((l, i) => ({ note: l.valeur, bareme: evals[i].bareme, coefficient: evals[i].coefficient, type: evals[i].type }))
            .filter((e) => predicat(e.type))
        );

      const moyenneClasse = peser((type) => TYPES_TRAVAUX_DE_CLASSE.includes(type));
      const moyenneExamen = peser((type) => type === 'examen');
      const moyenne = moyenneMatiere(moyenneClasse, moyenneExamen);

      return {
        matiere: {
          id: matiere._id,
          nom: matiere.nom,
          code: matiere.code,
          coefficient: matiere.coefficient,
          professeur: matiere.professeur
            ? `${matiere.professeur.prenom} ${matiere.professeur.nom}`
            : null,
        },
        evaluations: lignes,
        moyenneClasse,
        moyenneExamen,
        moyenne,
        mention: mention(moyenne),
      };
    });
  };

  /** Moyenne generale : moyennes de matieres ponderees par leur coefficient. */
  const generalePour = (detail) =>
    moyennePonderee(
      detail.map((d) => ({ note: d.moyenne, bareme: 20, coefficient: d.matiere.coefficient }))
    );

  const detail = detailPour(etudiantId);
  const moyenneGenerale = generalePour(detail);

  // Rang : on calcule la moyenne generale de chaque etudiant de la classe.
  const camarades = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe._id })
    .select('_id')
    .lean();

  const moyennes = camarades
    .map((c) => generalePour(detailPour(c._id)))
    .filter((m) => m !== null)
    .sort((a, b) => b - a);

  const rang = moyenneGenerale === null ? null : moyennes.indexOf(moyenneGenerale) + 1;

  return {
    etudiant: {
      id: etudiant._id,
      nomComplet: `${etudiant.prenom} ${etudiant.nom}`,
      matricule: etudiant.matricule,
    },
    classe,
    periode: periode || 'toutes',
    matieres: detail,
    moyenneGenerale,
    mention: mention(moyenneGenerale),
    rang,
    effectif: camarades.length,
    // Moyenne de la PROMOTION, a ne pas confondre avec la moyenne de classe d'une
    // matiere ci-dessus : celle-ci compare l'etudiant a ses camarades.
    moyenneGeneraleClasse: moyennes.length
      ? arrondir(moyennes.reduce((s, m) => s + m, 0) / moyennes.length)
      : null,
  };
}
