import mongoose from 'mongoose';

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export const TYPES_SEANCE = ['cours', 'td', 'tp', 'conference'];

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Seance hebdomadaire recurrente de l'emploi du temps.
 * `classe` et `professeur` sont denormalises depuis la matiere : la detection des
 * conflits (classe / professeur / salle) interroge alors une seule collection.
 */
const creneauSchema = new mongoose.Schema(
  {
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true, index: true },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    professeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    /**
     * COURS MUTUALISE : classes qui suivent la seance en plus de `classe`.
     *
     * Certains enseignements sont communs a plusieurs filieres — l'anglais,
     * l'economie generale, la bureautique. Un seul professeur, une seule salle,
     * une seule heure, mais deux ou trois classes reunies.
     *
     * POURQUOI UN SEUL CRENEAU PLUTOT QU'UN PAR CLASSE. Creer un creneau par
     * classe decrirait la meme seance plusieurs fois : la detection de conflits
     * verrait alors le professeur enseigner a deux endroits a la fois et la
     * salle occupee deux fois, et refuserait la saisie. Une seance mutualisee
     * est UNE seance ; elle mobilise une fois le professeur et une fois la
     * salle, et concerne plusieurs classes.
     *
     * `classe` reste la classe PRINCIPALE — celle de la matiere enseignee et
     * celle qui porte les notes. Les classes associees assistent au cours.
     */
    classesAssociees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Classe' }],

    jour: { type: String, enum: JOURS, required: true, index: true },
    heureDebut: { type: String, required: true, match: [HEURE, 'Format attendu : HH:MM'] },
    heureFin: { type: String, required: true, match: [HEURE, 'Format attendu : HH:MM'] },

    salle: { type: String, trim: true, maxlength: 40 },
    type: { type: String, enum: TYPES_SEANCE, default: 'cours' },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

creneauSchema.index({ classe: 1, jour: 1, heureDebut: 1 });
creneauSchema.index({ professeur: 1, jour: 1 });
// L'emploi du temps d'une classe associee se lit par cet index.
creneauSchema.index({ classesAssociees: 1, jour: 1, heureDebut: 1 });

/**
 * Toutes les classes concernees par la seance, la principale comprise.
 * Point unique de verite : la detection de conflits et la lecture de l'emploi du
 * temps s'appuient dessus, et n'ont pas a refaire l'assemblage chacune de leur
 * cote.
 */
creneauSchema.virtual('toutesLesClasses').get(function () {
  return [this.classe, ...(this.classesAssociees || [])].filter(Boolean);
});

/** Meme regle, applicable a un objet brut issu de `.lean()`. */
export const classesDuCreneau = (creneau) =>
  [creneau?.classe, ...(creneau?.classesAssociees || [])]
    .filter(Boolean)
    .map((c) => String(c?._id ?? c));

/** Duree de la seance en minutes, utile pour la hauteur des blocs de la grille. */
creneauSchema.virtual('dureeMinutes').get(function () {
  const [hd, md] = this.heureDebut.split(':').map(Number);
  const [hf, mf] = this.heureFin.split(':').map(Number);
  return hf * 60 + mf - (hd * 60 + md);
});

export const Creneau = mongoose.model('Creneau', creneauSchema);
export { HEURE };
