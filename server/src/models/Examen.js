import mongoose from 'mongoose';

export const TYPES_EXAMEN = ['partiel', 'final', 'rattrapage'];
export const STATUTS_EXAMEN = ['planifie', 'termine', 'annule'];

/** Format horaire HH:MM utilise pour les creneaux. */
const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Seance d'examen planifiee : creneau, salle et surveillants assignes.
 * Les conflits de salle et de classe sont verifies dans le controleur.
 */
const examenSchema = new mongoose.Schema(
  {
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true, index: true },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    titre: { type: String, trim: true, maxlength: 100 },
    type: { type: String, enum: TYPES_EXAMEN, default: 'partiel' },
    date: { type: Date, required: true, index: true },
    heureDebut: { type: String, required: true, match: [HEURE, 'Format attendu : HH:MM'] },
    heureFin: { type: String, required: true, match: [HEURE, 'Format attendu : HH:MM'] },
    salle: { type: String, required: [true, 'La salle est obligatoire'], trim: true, maxlength: 40 },
    surveillants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    instructions: { type: String, trim: true, maxlength: 500 },
    statut: { type: String, enum: STATUTS_EXAMEN, default: 'planifie' },
    creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

examenSchema.index({ date: 1, salle: 1 });

export const Examen = mongoose.model('Examen', examenSchema);
export { HEURE };
