/** Point d'entree du serveur : connexion base puis ecoute HTTP. */
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

async function demarrer() {
  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(env.port, () => {
      console.log(`[server] Technolab ISTA API sur https://lab.my-istime.xyz (${env.nodeEnv})`);
    });

    // Arret propre
    const arret = (signal) => {
      console.log(`[server] ${signal} recu, arret en cours...`);
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', () => arret('SIGINT'));
    process.on('SIGTERM', () => arret('SIGTERM'));
  } catch (err) {
    console.error('[server] Demarrage impossible :', err.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('[server] Rejet non gere :', err);
});

demarrer();
