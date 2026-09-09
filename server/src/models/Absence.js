import mongoose from 'mongoose';

export const TYPES_ABSENCE = ['absence', 'retard'];

/**
 * Absence ou retard constate lors d'un cours.
 * La date est normalisee a minuit : un etudiant ne peut etre marque qu'une fois
 * par jour et par creneau, ce que garantit l'index unique ci-dessous.
 */
const absenceSchema = new mongoose.Schema(
  {
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere' },
    date: { type: Date, required: true, index: true },
    creneau: { type: String, trim: true, maxlength: 20, default: 'journee' },
    type: { type: String, enum: TYPES_ABSENCE, default: 'absence' },
    minutesRetard: { type: Number, min: 0, max: 480 },

    justifie: { type: Boolean, default: false },
    motif: { type: String, trim: true, maxlength: 300 },
    justifiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dateJustification: { type: Date },

    saisiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

absenceSchema.index({ etudiant: 1, date: 1, creneau: 1 }, { unique: true });

/** Ramene une date au debut de journee (comparaisons et unicite fiables). */
export const jour = (valeur) => {
  const d = new Date(valeur);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const Absence = mongoose.model('Absence', absenceSchema);
