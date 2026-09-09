import mongoose from 'mongoose';

/**
 * Matiere enseignee : pivot entre une classe et un professeur.
 * Toutes les evaluations, examens et absences s'y rattachent.
 */
const matiereSchema = new mongoose.Schema(
  {
    nom: { type: String, required: [true, 'Le nom de la matiere est obligatoire'], trim: true, maxlength: 80 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    // Poids de la matiere dans la moyenne generale du bulletin.
    coefficient: { type: Number, min: 1, max: 10, default: 1 },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    professeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },
    description: { type: String, trim: true, maxlength: 300 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Un code de matiere est unique au sein d'une classe pour une annee donnee.
matiereSchema.index({ code: 1, classe: 1, anneeScolaire: 1 }, { unique: true });

export const Matiere = mongoose.model('Matiere', matiereSchema);
