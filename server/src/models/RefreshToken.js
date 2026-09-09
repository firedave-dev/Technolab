import mongoose from 'mongoose';
import crypto from 'node:crypto';

/**
 * Sessions de rafraichissement.
 * Seul le hash du token est stocke : une fuite de la base ne permet pas de rejouer les sessions.
 * L'index TTL supprime automatiquement les documents expires.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.statics.hash = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
