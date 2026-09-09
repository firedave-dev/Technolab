import mongoose from 'mongoose';

/**
 * Note d'un etudiant a une evaluation.
 * `absent` distingue une copie non rendue (exclue de la moyenne) d'un zero merite.
 */
const noteSchema = new mongoose.Schema(
  {
    evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', required: true, index: true },
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    valeur: { type: Number, min: 0, default: null },
    absent: { type: Boolean, default: false },
    appreciation: { type: String, trim: true, maxlength: 200 },
    saisiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Une seule note par etudiant et par evaluation.
noteSchema.index({ evaluation: 1, etudiant: 1 }, { unique: true });

export const Note = mongoose.model('Note', noteSchema);
