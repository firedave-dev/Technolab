import mongoose from 'mongoose';

export const MODES_PAIEMENT = ['especes', 'virement', 'mobile_money', 'cheque', 'carte'];
export const STATUTS_PAIEMENT = ['en_attente', 'valide', 'annule'];

/**
 * Encaissement rattache a un etudiant, et le plus souvent a une echeance precise.
 * Un paiement saisi par le secretariat reste "en_attente" jusqu'a validation par la
 * direction ; seuls les paiements valides sont comptes dans les soldes.
 */
const paiementSchema = new mongoose.Schema(
  {
    numeroRecu: { type: String, unique: true, index: true },
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Facultatif : un versement libre (avance, regularisation) n'est rattache a rien.
    echeance: { type: mongoose.Schema.Types.ObjectId, ref: 'Echeance', index: true },

    montant: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: MODES_PAIEMENT, default: 'especes' },
    reference: { type: String, trim: true, maxlength: 60 },
    datePaiement: { type: Date, default: Date.now, index: true },
    commentaire: { type: String, trim: true, maxlength: 300 },

    statut: { type: String, enum: STATUTS_PAIEMENT, default: 'en_attente', index: true },
    encaissePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    validePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dateValidation: { type: Date },
    motifAnnulation: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

paiementSchema.index({ etudiant: 1, datePaiement: -1 });

export const Paiement = mongoose.model('Paiement', paiementSchema);
