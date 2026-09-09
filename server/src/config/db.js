/** Connexion MongoDB via Mongoose. */
import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  console.log(`[db] Connecte a MongoDB (${mongoose.connection.name})`);

  mongoose.connection.on('error', (err) => console.error('[db] Erreur MongoDB :', err.message));
  mongoose.connection.on('disconnected', () => console.warn('[db] Deconnecte de MongoDB'));
}
