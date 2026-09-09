import mongoose from 'mongoose';

export const TYPES_FRAIS = ['inscription', 'scolarite', 'examen', 'fourniture', 'autre'];

/**
 * Grille tarifaire : un frais applicable a une classe pour une annee scolaire.
 * `nombreTranches` et `intervalleMois` decrivent l'echeancier a generer :
 * une scolarite de 300 000 en 3 tranches mensuelles produira 3 echeances de 100 000.
 */
const fraisSchema = new mongoose.Schema(
  {
    libelle: { type: String, required: [true, 'Le libelle est obligatoire'], trim: true, maxlength: 80 },
    type: { type: String, enum: TYPES_FRAIS, default: 'scolarite' },
    // Montant total du frais, reparti ensuite sur les tranches.
    montant: { type: Number, required: true, min: 0 },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },
    nombreTranches: { type: Number, min: 1, max: 12, default: 1 },
    premiereEcheance: { type: Date, required: true },
    intervalleMois: { type: Number, min: 0, max: 12, default: 1 },
    obligatoire: { type: Boolean, default: true },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Un meme libelle ne peut exister qu'une fois par classe et par annee.
fraisSchema.index({ libelle: 1, classe: 1, anneeScolaire: 1 }, { unique: true });

/** Montant d'une tranche : le reliquat des arrondis est reporte sur la derniere. */
fraisSchema.methods.montantTranche = function (numero) {
  const base = Math.floor(this.montant / this.nombreTranches);
  return numero === this.nombreTranches
    ? this.montant - base * (this.nombreTranches - 1)
    : base;
};

/** Date d'echeance de la tranche demandee (1-indexee). */
fraisSchema.methods.dateTranche = function (numero) {
  const date = new Date(this.premiereEcheance);
  date.setMonth(date.getMonth() + this.intervalleMois * (numero - 1));
  return date;
};

export const FraisScolarite = mongoose.model('FraisScolarite', fraisSchema);
