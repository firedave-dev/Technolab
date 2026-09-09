import mongoose from 'mongoose';
import { TYPES_FRAIS } from './FraisScolarite.js';

export const STATUTS_ECHEANCE = ['a_payer', 'partiel', 'paye', 'annule'];

/**
 * Ligne de l'echeancier d'un etudiant.
 * `montantPaye` n'est jamais incremente a la main : il est recalcule depuis la somme
 * des paiements valides (voir comptabilite.service.js), ce qui garde les deux en phase
 * meme apres l'annulation d'un paiement.
 */
const echeanceSchema = new mongoose.Schema(
  {
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    frais: { type: mongoose.Schema.Types.ObjectId, ref: 'FraisScolarite', required: true },
    numeroTranche: { type: Number, min: 1, default: 1 },

    libelle: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: TYPES_FRAIS, default: 'scolarite' },
    montant: { type: Number, required: true, min: 0 },
    montantPaye: { type: Number, default: 0, min: 0 },
    dateEcheance: { type: Date, required: true, index: true },
    anneeScolaire: { type: String, required: true },
    statut: { type: String, enum: STATUTS_ECHEANCE, default: 'a_payer', index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Une seule ligne par etudiant, frais et tranche : la generation est rejouable.
echeanceSchema.index({ etudiant: 1, frais: 1, numeroTranche: 1 }, { unique: true });

echeanceSchema.virtual('reste').get(function () {
  return Math.max(0, this.montant - this.montantPaye);
});

/** En retard : echeance depassee et solde non regle. */
echeanceSchema.virtual('enRetard').get(function () {
  return this.statut !== 'paye' && this.statut !== 'annule' && this.dateEcheance < new Date();
});

export const Echeance = mongoose.model('Echeance', echeanceSchema);
