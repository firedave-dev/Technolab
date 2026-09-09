/**
 * Jeu de donnees pedagogique (Phase 3) : matieres, evaluations notees,
 * examens planifies et quelques absences. Appele par seed.js, idempotent.
 */
import { Matiere } from '../models/Matiere.js';
import { Evaluation } from '../models/Evaluation.js';
import { Note } from '../models/Note.js';
import { Examen } from '../models/Examen.js';
import { Absence, jour } from '../models/Absence.js';
import { User } from '../models/User.js';
import { Classe } from '../models/Classe.js';
import { ROLES } from '../config/roles.js';

const ANNEE = '2025-2026';

/** Generateur pseudo-aleatoire deterministe : le jeu de donnees reste stable d'un run a l'autre. */
function tirage(graine) {
  let etat = graine;
  return () => {
    etat = (etat * 1103515245 + 12345) % 2147483648;
    return etat / 2147483648;
  };
}

/** Programme par filiere : [nom, code, coefficient]. */
const PROGRAMMES = {
  Informatique: [
    ['Algorithmique', 'ALGO', 4],
    ['Base de donnees', 'BDD', 3],
    ['Developpement web', 'WEB', 3],
    ['Anglais technique', 'ANG', 2],
  ],
  Gestion: [
    ['Comptabilite generale', 'COMPTA', 4],
    ['Economie', 'ECO', 3],
    ['Droit des affaires', 'DROIT', 2],
    ['Anglais des affaires', 'ANG', 2],
  ],
};

/** Deux evaluations par matiere : une interrogation et un devoir. */
const MODELE_EVALUATIONS = [
  { titre: 'Interrogation n°1', type: 'interrogation', bareme: 10, coefficient: 1, jourDecale: -30 },
  { titre: 'Devoir surveille n°1', type: 'devoir', bareme: 20, coefficient: 2, jourDecale: -12 },
];

const dansNJours = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

export async function seedScolarite() {
  const classes = await Classe.find({ anneeScolaire: ANNEE }).lean();
  const professeurs = await User.find({ role: ROLES.PROFESSEUR, actif: true }).select('_id').lean();
  const surveillant = await User.findOne({ role: ROLES.SURVEILLANT }).select('_id').lean();

  if (!classes.length || !professeurs.length) {
    console.log('[seed] Aucune classe ou aucun professeur : partie pedagogique ignoree');
    return;
  }

  let matieresCreees = 0;
  let evaluationsCreees = 0;
  let notesCreees = 0;

  for (const [indexClasse, classe] of classes.entries()) {
    const programme = PROGRAMMES[classe.filiere] || PROGRAMMES.Informatique;

    const etudiants = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe._id })
      .select('_id')
      .lean();

    for (const [indexMatiere, [nom, code, coefficient]] of programme.entries()) {
      // Repartition des matieres entre les professeurs disponibles.
      const professeur = professeurs[(indexClasse + indexMatiere) % professeurs.length]._id;

      let matiere = await Matiere.findOne({ code, classe: classe._id, anneeScolaire: ANNEE });
      if (!matiere) {
        matiere = await Matiere.create({
          nom, code, coefficient, classe: classe._id, professeur, anneeScolaire: ANNEE,
        });
        matieresCreees += 1;
      }

      // Les evaluations ne sont creees que si la matiere n'en a pas encore.
      if (await Evaluation.exists({ matiere: matiere._id })) continue;

      for (const [indexEval, modele] of MODELE_EVALUATIONS.entries()) {
        const evaluation = await Evaluation.create({
          matiere: matiere._id,
          classe: classe._id,
          titre: modele.titre,
          type: modele.type,
          date: dansNJours(modele.jourDecale),
          bareme: modele.bareme,
          coefficient: modele.coefficient,
          periode: 'semestre1',
          publiee: indexEval === 0, // la premiere est publiee, la seconde en cours de correction
          creePar: professeur,
        });
        evaluationsCreees += 1;

        if (!etudiants.length) continue;

        // Notes reparties autour de 12/20, ramenees au bareme de l'evaluation.
        const suivant = tirage(1000 + indexClasse * 97 + indexMatiere * 13 + indexEval);

        await Note.insertMany(
          etudiants.map((etudiant, rang) => {
            const base = 8 + suivant() * 10 + (rang % 3);
            const sur20 = Math.min(20, Math.max(2, base));
            return {
              evaluation: evaluation._id,
              etudiant: etudiant._id,
              valeur: Math.round((sur20 / 20) * modele.bareme * 2) / 2, // au demi-point
              absent: false,
              saisiePar: professeur,
            };
          })
        );
        notesCreees += etudiants.length;
      }
    }
  }

  // --- Examens a venir ---
  let examensCrees = 0;
  const matieresExamen = await Matiere.find({ anneeScolaire: ANNEE }).limit(3).lean();

  for (const [index, matiere] of matieresExamen.entries()) {
    const dejaPlanifie = await Examen.exists({ matiere: matiere._id, type: 'partiel' });
    if (dejaPlanifie) continue;

    await Examen.create({
      matiere: matiere._id,
      classe: matiere.classe,
      titre: `${matiere.nom} — partiel`,
      type: 'partiel',
      date: dansNJours(10 + index * 2),
      heureDebut: ['08:00', '10:30', '14:00'][index % 3],
      heureFin: ['10:00', '12:30', '16:00'][index % 3],
      salle: `Salle ${['A1', 'B2', 'C3'][index % 3]}`,
      surveillants: surveillant ? [surveillant._id] : [],
      instructions: 'Documents non autorises. Calculatrice simple acceptee.',
    });
    examensCrees += 1;
  }

  // --- Quelques absences sur les derniers jours ---
  let absencesCreees = 0;
  const premiereClasse = classes[0];
  const eleves = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': premiereClasse._id })
    .select('_id')
    .limit(2)
    .lean();

  for (const [index, eleve] of eleves.entries()) {
    const date = jour(dansNJours(-(index + 1)));
    const existante = await Absence.findOne({ etudiant: eleve._id, date, creneau: 'journee' });
    if (existante) continue;

    await Absence.create({
      etudiant: eleve._id,
      classe: premiereClasse._id,
      date,
      creneau: 'journee',
      type: index === 0 ? 'absence' : 'retard',
      minutesRetard: index === 0 ? undefined : 20,
      justifie: index === 0,
      motif: index === 0 ? 'Certificat medical' : undefined,
      saisiePar: surveillant?._id,
    });
    absencesCreees += 1;
  }

  console.log(
    `[seed] Pedagogie : ${matieresCreees} matiere(s), ${evaluationsCreees} evaluation(s), ` +
    `${notesCreees} note(s), ${examensCrees} examen(s), ${absencesCreees} absence(s)`
  );
}
