/**
 * Regles de l'emploi du temps : detection des conflits et mise en forme de la grille.
 *
 * Un creneau entre en conflit avec un autre du meme jour des lors que les plages horaires
 * se chevauchent (debut1 < fin2 et debut2 < fin1) et qu'ils partagent une ressource :
 * la meme classe, le meme professeur ou la meme salle.
 */
import { Creneau, JOURS } from '../models/Creneau.js';

/** Deux plages HH:MM se chevauchent-elles ? */
export const seChevauchent = (debut1, fin1, debut2, fin2) => debut1 < fin2 && debut2 < fin1;

/**
 * Cherche un conflit pour le creneau propose.
 * @returns un message explicite, ou null si le creneau est libre.
 */
export async function detecterConflitCreneau({ id, jour, heureDebut, heureFin, classe, professeur, salle, anneeScolaire }) {
  const ressources = [{ classe }];
  if (professeur) ressources.push({ professeur });
  if (salle) ressources.push({ salle });

  const candidats = await Creneau.find({
    _id: { $ne: id || null },
    jour,
    anneeScolaire,
    actif: true,
    $or: ressources,
  })
    .populate('classe', 'nom')
    .populate('professeur', 'nom prenom')
    .populate('matiere', 'nom')
    .lean();

  const conflit = candidats.find((c) => seChevauchent(heureDebut, heureFin, c.heureDebut, c.heureFin));
  if (!conflit) return null;

  const plage = `${conflit.heureDebut}-${conflit.heureFin}`;

  if (String(conflit.classe?._id) === String(classe)) {
    return `La classe ${conflit.classe.nom} a deja "${conflit.matiere?.nom}" le ${jour} de ${plage}`;
  }
  if (professeur && String(conflit.professeur?._id) === String(professeur)) {
    return `${conflit.professeur.prenom} ${conflit.professeur.nom} enseigne deja le ${jour} de ${plage}`;
  }
  return `La salle ${conflit.salle} est occupee le ${jour} de ${plage}`;
}

/**
 * Organise une liste de creneaux en grille hebdomadaire.
 * Renvoie aussi la plage horaire reellement utilisee, pour dimensionner l'affichage
 * sans afficher des heures vides du matin au soir.
 */
export function construireGrille(creneaux) {
  const parJour = Object.fromEntries(JOURS.map((jour) => [jour, []]));

  for (const creneau of creneaux) {
    if (parJour[creneau.jour]) parJour[creneau.jour].push(creneau);
  }

  for (const jour of JOURS) {
    parJour[jour].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  }

  const heures = creneaux.flatMap((c) => [c.heureDebut, c.heureFin]).sort();

  return {
    jours: JOURS,
    grille: parJour,
    plage: heures.length
      ? { debut: heures[0], fin: heures[heures.length - 1] }
      : { debut: '08:00', fin: '18:00' },
    total: creneaux.length,
  };
}

/** Index du jour de la semaine au format de nos creneaux (dimanche exclu). */
export function jourCourant(date = new Date()) {
  const index = date.getDay(); // 0 = dimanche
  return index === 0 ? null : JOURS[index - 1];
}

/**
 * Seances du jour pour un ensemble de filtres, triees par heure.
 * Alimente le tableau de bord ("vos cours aujourd'hui").
 */
export async function seancesDuJour(filtre, date = new Date()) {
  const jour = jourCourant(date);
  if (!jour) return { jour: null, seances: [] };

  const seances = await Creneau.find({ ...filtre, jour, actif: true })
    .sort('heureDebut')
    .populate('matiere', 'nom code')
    .populate('classe', 'nom niveau')
    .populate('professeur', 'nom prenom')
    .lean();

  return { jour, seances: seances.map((s) => ({ ...s, id: s._id })) };
}
