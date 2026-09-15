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
  /*
   * Sauvegarde automatique vers une SECONDE base MongoDB.
   *
   * Volontairement facultative : sans `MONGODB_SAUVEGARDE_URI`, le dispositif
   * reste eteint et l'application demarre normalement. Un developpement local
   * n'a pas a repliquer quoi que ce soit, et exiger la variable empecherait
   * simplement le serveur de demarrer.
   *
   * La base de destination doit etre une GRAPPE DISTINCTE, chez un fournisseur
   * distinct si possible. Sauvegarder dans la meme grappe protege d'une fausse
   * manoeuvre, pas d'une panne : les deux disparaitraient ensemble.
   */
  sauvegarde: {
    uri: process.env.MONGODB_SAUVEGARDE_URI || '',
    /** Heure locale du serveur, 0 a 23. 2 h du matin : aucune activite. */
    heure: Math.min(23, Math.max(0, Number(process.env.SAUVEGARDE_HEURE ?? 2))),
    /** Nombre de jours conserves. Au-dela, les plus anciens sont effaces. */
    retention: Math.max(1, Number(process.env.SAUVEGARDE_RETENTION ?? 7)),
  },
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
  /*
   * Messagerie.
   *
   * Le bloc garde le nom `smtp` bien que l'envoi passe desormais par l'API
   * Resend : il designe la configuration de messagerie, et le renommer
   * obligerait a toucher chaque appelant sans rien apporter. Les variables
   * SMTP_FROM / SMTP_REPLY_TO restent elles aussi valables — elles decrivent
   * l'expediteur, pas le protocole.
   */
  smtp: {
    /** Cle d'API Resend. Vide = mode degrade, rien ne part sur le reseau. */
    cleApi: process.env.RESEND_API_KEY || '',
    /** Nom lisible de l'expediteur, compose avec l'adresse ci-dessous. */
    nomExpediteur: process.env.SMTP_FROM_NAME || 'TechnoLAB-ISTA',
    /**
     * Adresse d'expedition.
     *
     * Deux ecritures circulent selon l'age du fichier .env : l'adresse nue
     * (« mails@technolab-ista.org ») ou le couple complet (« Nom <adresse> »).
     * La composition finale est faite dans email.service.js, qui accepte les
     * deux — un deploiement dont le .env n'a pas ete repris ne doit pas se
     * mettre a envoyer depuis « TechnoLAB-ISTA <TechnoLAB-ISTA <...>> ».
     */
    adresseExpediteur: process.env.SMTP_FROM || 'mails@technolab-ista.org',
    /*
     * Adresse de reponse.
     *
     * L'adresse d'expedition sert a AUTHENTIFIER le courrier : elle doit rester
     * sur le domaine verifie aupres du fournisseur d'envoi, sans quoi SPF et
     * DKIM echouent et le message part en indesirable. Or personne ne releve
     * cette boite. Sans `Reply-To`, une famille qui repond a une notification
     * d'absence ecrit donc dans le vide.
     */
    repondreA: process.env.SMTP_REPLY_TO || 'technolab@technolab-ista.net',
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
    /*
     * Coordonnees portees par le pied des emails.
     *
     * Vides par defaut plutot que renseignees en dur : une adresse ou un
     * telephone faux dans un courrier officiel est pire que leur absence, et
     * les documents omettent simplement les lignes non fournies.
     */
    telephone: process.env.ETABLISSEMENT_TELEPHONE || '',
    email: process.env.ETABLISSEMENT_EMAIL || '',
    agrement: process.env.ETABLISSEMENT_AGREMENT || '',
  },
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@technolab-ista.edu',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@1234',
  },
};
