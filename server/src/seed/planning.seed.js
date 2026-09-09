/**
 * Emploi du temps de demonstration (Phase 5).
 * Chaque matiere recoit deux seances hebdomadaires, placees dans des creneaux libres
 * en respectant les contraintes de classe, de professeur et de salle.
 */
import { Creneau, JOURS } from '../models/Creneau.js';
import { Matiere } from '../models/Matiere.js';
import { detecterConflitCreneau } from '../services/planning.service.js';

const ANNEE = '2025-2026';

/** Creneaux type d'une journee : deux le matin, deux l'apres-midi. */
const PLAGES = [
  ['08:00', '10:00'],
  ['10:15', '12:15'],
  ['14:00', '16:00'],
  ['16:15', '18:15'],
];

const SALLES = ['Salle A1', 'Salle A2', 'Salle B1', 'Salle B2', 'Amphi 1'];

export async function seedPlanning() {
  const matieres = await Matiere.find({ anneeScolaire: ANNEE, actif: true })
    .sort('classe nom')
    .lean();

  if (!matieres.length) {
    console.log('[seed] Aucune matiere : emploi du temps ignore');
    return;
  }

  if (await Creneau.countDocuments({ anneeScolaire: ANNEE })) {
    console.log('[seed] Emploi du temps deja en place');
    return;
  }

  let crees = 0;
  let ignores = 0;
  let curseur = 0;

  for (const matiere of matieres) {
    // Deux seances par matiere, espacees dans la semaine.
    for (let seance = 0; seance < 2; seance += 1) {
      let place = false;

      // On balaie les creneaux possibles jusqu'a en trouver un sans conflit.
      for (let essai = 0; essai < JOURS.length * PLAGES.length && !place; essai += 1) {
        const position = curseur + essai;
        const jour = JOURS[position % JOURS.length];
        const [heureDebut, heureFin] = PLAGES[Math.floor(position / JOURS.length) % PLAGES.length];
        const salle = SALLES[position % SALLES.length];

        const donnees = {
          matiere: matiere._id,
          classe: matiere.classe,
          professeur: matiere.professeur,
          jour,
          heureDebut,
          heureFin,
          salle,
          anneeScolaire: ANNEE,
        };

        if (await detecterConflitCreneau(donnees)) continue;

        await Creneau.create(donnees);
        crees += 1;
        place = true;
        // Pas de 7 : premier avec les 6 jours de la semaine, donc chaque seance
        // suivante tombe un jour different plutot que d'alterner entre deux.
        curseur = position + 7;
      }

      if (!place) ignores += 1;
    }
  }

  console.log(`[seed] Planning : ${crees} creneau(x)${ignores ? `, ${ignores} non place(s)` : ''}`);
}
