import mongoose from 'mongoose';

export const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];

/**
 * Classe (promotion) : regroupe des etudiants sur une annee scolaire.
 * Sert de pivot aux phases suivantes (emploi du temps, notes, examens).
 */
const classeSchema = new mongoose.Schema(
  {
    nom: { type: String, required: [true, 'Le nom de la classe est obligatoire'], trim: true, maxlength: 60 },
    niveau: { type: String, enum: NIVEAUX, required: true },
    filiere: { type: String, required: [true, 'La filiere est obligatoire'], trim: true, maxlength: 80 },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },
    capacite: { type: Number, min: 1, max: 500, default: 40 },
    professeurPrincipal: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Un meme libelle ne peut exister qu'une fois par annee scolaire.
classeSchema.index({ nom: 1, anneeScolaire: 1 }, { unique: true });

export const Classe = mongoose.model('Classe', classeSchema);
