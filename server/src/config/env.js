/**
 * Chargement et validation des variables d'environnement.
 * On echoue au demarrage (fail-fast) plutot qu'a la premiere requete.
 */
import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`[config] Variables d'environnement manquantes : ${missing.join(', ')}`);
  console.error('[config] Copiez server/.env.example vers server/.env puis renseignez-les.');
  process.exit(1);
}

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7,
  },
  /**
   * Messagerie. Sans SMTP_HOST, les emails sont journalises au lieu d'etre envoyes :
   * le developpement et les tests fonctionnent sans compte de messagerie.
   */
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    expediteur: process.env.SMTP_FROM || 'TechnoLAB-ISTA <no-reply@technolab-ista.net>',
  },
  /*
   * Identification legale portee par les documents officiels (recus, attestations).
   * Ces valeurs varient d'un etablissement a l'autre : elles sont configurees, non
   * codees en dur. Une mention non renseignee est simplement omise du document.
   */
  etablissement: {
    raisonSociale: process.env.ETABLISSEMENT_RAISON_SOCIALE || 'Technolab ISTA',
    rccm: process.env.ETABLISSEMENT_RCCM || '',
    nif: process.env.ETABLISSEMENT_NIF || '',
    adresse: process.env.ETABLISSEMENT_ADRESSE || '',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@technolab-ista.edu',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@1234',
  },
};
