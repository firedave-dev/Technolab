import mongoose from 'mongoose';

export const TYPES_EVALUATION = ['devoir', 'interrogation', 'examen', 'tp', 'projet'];
export const PERIODES = ['semestre1', 'semestre2'];

/**
 * Evaluation notee (devoir, interrogation, examen...).
 * `publiee` conditionne la visibilite des notes par les etudiants et leurs parents :
 * le professeur saisit tranquillement, puis publie.
 */
const evaluationSchema = new mongoose.Schema(
  {
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true, index: true },
    // Denormalise depuis la matiere : evite un lookup pour filtrer par classe.
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    titre: { type: String, required: [true, 'Le titre est obligatoire'], trim: true, maxlength: 100 },
    type: { type: String, enum: TYPES_EVALUATION, default: 'devoir' },
    date: { type: Date, required: true },
    bareme: { type: Number, min: 1, max: 100, default: 20 },
    coefficient: { type: Number, min: 0.5, max: 10, default: 1 },
    periode: { type: String, enum: PERIODES, required: true },
    publiee: { type: Boolean, default: false },
    creePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

evaluationSchema.index({ classe: 1, periode: 1, date: -1 });

export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
