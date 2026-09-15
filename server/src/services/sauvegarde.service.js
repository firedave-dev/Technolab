/**
 * Sauvegarde quotidienne vers une seconde base MongoDB.
 *
 * POURQUOI DES INSTANTANES DATES PLUTOT QU'UN MIROIR. Recopier chaque nuit la
 * base par-dessus la precedente ne protege que d'une panne materielle. Une
 * suppression accidentelle, elle, serait recopiee a son tour : au matin, les
 * deux bases seraient vides. On conserve donc plusieurs jours, chacun dans ses
 * propres collections prefixees par la date, et on n'efface que les plus
 * anciens.
 *
 * FORMAT DE DESTINATION : les documents sont copies TELS QUELS, identifiants
 * compris. Restaurer revient donc a recopier une collection datee vers son nom
 * d'origine, sans transformation ni outil particulier.
 *
 * LE DISPOSITIF NE DOIT JAMAIS FAIRE TOMBER L'APPLICATION. Toute erreur est
 * consignee et rendue a l'appelant ; aucune n'est propagee jusqu'au serveur
 * HTTP. Une sauvegarde qui echoue est un probleme ; un site indisponible parce
 * que la sauvegarde a echoue en est un plus grand.
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';

/** Collection ou l'on consigne le deroulement de chaque execution. */
export const COLLECTION_JOURNAL = 'sauvegardes';

/** Separateur entre la date et le nom d'origine : « 2026-09-15__users ». */
const SEPARATEUR = '__';

/* ------------------------------------------------------------------ */
/* Fonctions PURES : planification et nommage                          */
/* ------------------------------------------------------------------ */

/** Jour au format AAAA-MM-JJ, en heure locale du serveur. */
export function jourDe(date = new Date()) {
  const deuxChiffres = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
}

export const nomInstantane = (jour, collection) => `${jour}${SEPARATEUR}${collection}`;

/** Extrait le jour d'un nom d'instantane, ou `null` si ce n'en est pas un. */
export function jourDeLInstantane(nom) {
  const separation = nom.indexOf(SEPARATEUR);
  if (separation !== 10) return null;
  const jour = nom.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : null;
}

/**
 * Prochaine execution, a l'heure demandee.
 *
 * Si l'heure est deja passee aujourd'hui, on vise demain. Le calcul se fait sur
 * une date, et non en additionnant 24 heures : un serveur qui redemarre trois
 * fois dans la journee sauvegarderait sinon trois fois.
 */
export function prochaineExecution(maintenant, heure) {
  const cible = new Date(maintenant);
  cible.setHours(heure, 0, 0, 0);
  if (cible <= maintenant) cible.setDate(cible.getDate() + 1);
  return cible;
}

/**
 * Faut-il rattraper une sauvegarde au demarrage ?
 *
 * Un hebergement qui redemarre le processus chaque nuit avant l'heure prevue ne
 * sauvegarderait jamais. On verifie donc, a chaque demarrage, qu'il en existe
 * une de moins de `intervalleHeures`.
 */
export function rattrapageNecessaire(derniereReussite, maintenant, intervalleHeures = 24) {
  if (!derniereReussite) return true;
  const ecoule = (maintenant - new Date(derniereReussite)) / 3600000;
  return ecoule >= intervalleHeures;
}

/**
 * Instantanes a supprimer : tout ce qui n'appartient pas aux `aGarder` jours
 * les plus recents.
 */
export function instantanesAPurger(noms, aGarder) {
  const jours = [...new Set(noms.map(jourDeLInstantane).filter(Boolean))].sort();
  const condamnes = new Set(jours.slice(0, Math.max(0, jours.length - aGarder)));
  return noms.filter((nom) => condamnes.has(jourDeLInstantane(nom)));
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

/** Ecriture par paquets : un `insertMany` complet depasserait la taille limite. */
const PAQUET = 1000;

export const sauvegardeConfiguree = () => Boolean(env.sauvegarde.uri);

/**
 * Copie l'integralite de la base courante vers la base de sauvegarde.
 *
 * @param {object} options
 * @param {string} options.declencheur  'automatique' ou 'manuelle'
 * @returns {Promise<object>} compte rendu, meme en cas d'echec
 */
export async function executerSauvegarde({ declencheur = 'automatique' } = {}) {
  const debut = Date.now();
  const jour = jourDe();

  if (!sauvegardeConfiguree()) {
    return {
      statut: 'desactivee',
      message: 'MONGODB_SAUVEGARDE_URI absente : aucune sauvegarde configuree.',
    };
  }

  let connexion = null;

  try {
    connexion = await mongoose.createConnection(env.sauvegarde.uri, {
      serverSelectionTimeoutMS: 15000,
    }).asPromise();

    const source = mongoose.connection.db;
    const cible = connexion.db;

    const collections = (await source.listCollections().toArray())
      .map((c) => c.name)
      .filter((nom) => !nom.startsWith('system.'))
      .sort();

    const detail = [];
    let documents = 0;

    for (const nom of collections) {
      const lignes = await source.collection(nom).find({}).toArray();
      const destination = cible.collection(nomInstantane(jour, nom));

      // Relancer la sauvegarde le meme jour doit REMPLACER l'instantane, pas le
      // doubler : les identifiants etant conserves, un second passage echouerait
      // sinon sur des cles dupliquees.
      await destination.deleteMany({});

      for (let i = 0; i < lignes.length; i += PAQUET) {
        await destination.insertMany(lignes.slice(i, i + PAQUET), { ordered: false });
      }

      detail.push({ collection: nom, documents: lignes.length });
      documents += lignes.length;
    }

    // Purge des instantanes trop anciens.
    const existants = (await cible.listCollections().toArray()).map((c) => c.name);
    const aPurger = instantanesAPurger(existants, env.sauvegarde.retention);
    for (const nom of aPurger) await cible.dropCollection(nom).catch(() => {});

    const compteRendu = {
      statut: 'reussie',
      jour,
      declencheur,
      date: new Date(),
      collections: collections.length,
      documents,
      purges: aPurger.length,
      dureeMs: Date.now() - debut,
      detail,
    };

    await cible.collection(COLLECTION_JOURNAL).insertOne(compteRendu);
    console.log(
      `[sauvegarde] ${jour} — ${collections.length} collections, ${documents} documents, `
      + `${aPurger.length} instantane(s) purge(s), ${compteRendu.dureeMs} ms`
    );
    return compteRendu;
  } catch (erreur) {
    const echec = {
      statut: 'echec',
      jour,
      declencheur,
      date: new Date(),
      erreur: erreur.message,
      dureeMs: Date.now() - debut,
    };
    console.error(`[sauvegarde] ECHEC : ${erreur.message}`);

    // On tente tout de meme de consigner l'echec : sans trace, une sauvegarde
    // qui ne passe plus depuis trois semaines ne se remarque que le jour ou
    // l'on en a besoin.
    if (connexion?.db) {
      await connexion.db.collection(COLLECTION_JOURNAL).insertOne(echec).catch(() => {});
    }
    return echec;
  } finally {
    await connexion?.close().catch(() => {});
  }
}

/** Dernieres executions consignees, la plus recente en tete. */
export async function historiqueSauvegardes(limite = 30) {
  if (!sauvegardeConfiguree()) return [];

  let connexion = null;
  try {
    connexion = await mongoose.createConnection(env.sauvegarde.uri, {
      serverSelectionTimeoutMS: 15000,
    }).asPromise();

    return await connexion.db.collection(COLLECTION_JOURNAL)
      .find({}, { projection: { detail: 0 } })
      .sort({ date: -1 })
      .limit(limite)
      .toArray();
  } catch (erreur) {
    console.error(`[sauvegarde] Historique illisible : ${erreur.message}`);
    return [];
  } finally {
    await connexion?.close().catch(() => {});
  }
}
