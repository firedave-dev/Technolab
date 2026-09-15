/**
 * Sauvegarde manuelle vers la base de secours.
 *
 *     node src/scripts/sauvegarder.js              (lance une sauvegarde)
 *     node src/scripts/sauvegarder.js --historique (liste les dernieres)
 *
 * La sauvegarde automatique tourne dans le serveur ; ce script sert a la
 * declencher avant une operation risquee — un import massif, une purge — sans
 * attendre le passage de nuit.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import {
  executerSauvegarde, historiqueSauvegardes, sauvegardeConfiguree,
} from '../services/sauvegarde.service.js';

if (!sauvegardeConfiguree()) {
  console.error('MONGODB_SAUVEGARDE_URI n est pas renseignee dans .env : rien a faire.');
  process.exit(1);
}

await connectDB();

try {
  if (process.argv.includes('--historique')) {
    const entrees = await historiqueSauvegardes(20);
    if (!entrees.length) console.log('Aucune sauvegarde enregistree.');
    for (const e of entrees) {
      const quand = new Date(e.date).toLocaleString('fr-FR');
      const resume = e.statut === 'reussie'
        ? `${e.collections} collections, ${e.documents} documents, ${e.dureeMs} ms`
        : e.erreur;
      console.log(`  ${quand}  ${e.statut.padEnd(8)} ${e.declencheur.padEnd(12)} ${resume}`);
    }
  } else {
    console.log(`Sauvegarde vers la base de secours (${env.sauvegarde.retention} jours conserves)...`);
    const resultat = await executerSauvegarde({ declencheur: 'manuelle' });
    if (resultat.statut !== 'reussie') process.exitCode = 1;
  }
} finally {
  await mongoose.disconnect();
}
