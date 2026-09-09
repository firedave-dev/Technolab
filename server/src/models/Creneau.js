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

/** Duree de la seance en minutes, utile pour la hauteur des blocs de la grille. */
creneauSchema.virtual('dureeMinutes').get(function () {
  const [hd, md] = this.heureDebut.split(':').map(Number);
  const [hf, mf] = this.heureFin.split(':').map(Number);
  return hf * 60 + mf - (hd * 60 + md);
});

export const Creneau = mongoose.model('Creneau', creneauSchema);
export { HEURE };
