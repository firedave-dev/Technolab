import mongoose from 'mongoose';

export const TYPES_NOTIFICATION = ['absence', 'note', 'examen', 'paiement', 'information'];

/**
 * Notification interne (parents, etudiants, personnel).
 * L'envoi par email sera branche en Phase 6 : le modele est deja pret a le porter.
 * Les notifications sont purgees automatiquement au bout de 90 jours.
 */
const notificationSchema = new mongoose.Schema(
  {
    destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TYPES_NOTIFICATION, default: 'information' },
    titre: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    lien: { type: String, trim: true, maxlength: 200 },
    lu: { type: Boolean, default: false },
    lueLe: { type: Date },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

notificationSchema.index({ destinataire: 1, lu: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification = mongoose.model('Notification', notificationSchema);
