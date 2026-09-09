/**
 * Regles de calcul et de permission communes aux modules notes, examens et absences.
 *
 * Calcul d'une moyenne : chaque note est ramenee sur 20 (une interro sur 10 et un
 * devoir sur 20 pesent alors la meme chose a coefficient egal), puis ponderee par le
 * coefficient de l'evaluation. Les copies marquees "absent" sont exclues du calcul.
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

      const moyenne = moyennePonderee(
        lignes.map((l, i) => ({ note: l.valeur, bareme: evals[i].bareme, coefficient: evals[i].coefficient }))
      );

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
    moyenneClasse: moyennes.length
      ? arrondir(moyennes.reduce((s, m) => s + m, 0) / moyennes.length)
      : null,
  };
}
