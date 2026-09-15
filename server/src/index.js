/** Point d'entree du serveur : connexion base puis ecoute HTTP. */
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { arreterOrdonnanceur, demarrerOrdonnanceur } from './services/ordonnanceur.service.js';

async function demarrer() {
  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(env.port, () => {
      // L'adresse journalisee est celle OU L'API ECOUTE, pas celle du site :
      // afficher l'URL du client ici avait deja induit en erreur pendant un
      // diagnostic de deploiement.
      console.log(`[server] API TechnoLAB-ISTA a l ecoute sur le port ${env.port} (${env.nodeEnv})`);
    });

    /*
     * Sauvegarde quotidienne.
     *
     * Mise en place APRES l'ouverture du port, et sans `await` : une base de
     * sauvegarde injoignable ne doit pas retarder — encore moins empecher — la
     * mise en service de l'API.
     */
    demarrerOrdonnanceur().catch((err) =>
      console.error('[sauvegarde] Mise en place impossible :', err.message)
    );

    // Arret propre
    const arret = (signal) => {
      console.log(`[server] ${signal} recu, arret en cours...`);
      arreterOrdonnanceur();
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
