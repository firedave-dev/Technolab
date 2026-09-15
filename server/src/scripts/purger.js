/**
 * Remise a zero des donnees de la plateforme.
 *
 *     node src/scripts/purger.js --sauvegarde   (obligatoire d'abord)
 *     node src/scripts/purger.js --purger
 *     node src/scripts/purger.js --etat
 *
 * CE QUI EST SUPPRIME — tout ce qui constitue des DONNEES : comptes autres que
 * l'administrateur, sessions, notifications, structure pedagogique saisie
 * (classes, matieres, UE), notes, absences, planning et comptabilite.
 *
 * CE QUI EST CONSERVE :
 *
 * - le COMPTE ADMINISTRATEUR, sans lequel plus personne ne peut se connecter
 *   pour recreer quoi que ce soit ;
 *
 * - la NOMENCLATURE : types de matiere, matrice d'affinite, parametre
 *   pedagogique. Ce sont des reglages, pas des donnees — la matrice a demande
 *   un arbitrage sur sept contradictions, et la perdre obligerait a le refaire.
 *   `--tout` l'emporte aussi, pour repartir d'une base absolument vierge.
 *
 * Les sessions de l'administrateur sont effacees elles aussi : une remise a
 * zero doit se traduire par une reconnexion, sinon un jeton emis avant la purge
 * continue de circuler.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const SAUVEGARDES = path.resolve(DOSSIER, '../../sauvegardes');

/** Collections videes entierement. */
const A_VIDER = [
  'refreshtokens', 'notifications',
  'classes', 'matieres', 'ues',
  'notematieres', 'notes', 'evaluations', 'examens', 'absences', 'creneaus',
  'fraisscolarites', 'echeances', 'paiements',
];

/** Reglages conserves par defaut, emportes par `--tout`. */
const NOMENCLATURE = ['typematieres', 'affinitetypes', 'parametrepedagogiques'];

async function sauvegarder() {
  fs.mkdirSync(SAUVEGARDES, { recursive: true });
  const db = mongoose.connection.db;

  const contenu = { date: new Date().toISOString(), base: mongoose.connection.name, collections: {} };
  let total = 0;

  for (const { name } of await db.listCollections().toArray()) {
    const docs = await db.collection(name).find({}).toArray();
    contenu.collections[name] = docs;
    total += docs.length;
  }

  const chemin = path.join(SAUVEGARDES, `avant-purge-${contenu.date.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(chemin, JSON.stringify(contenu, null, 2), 'utf8');

  console.log(`[purge] Sauvegarde : ${path.basename(chemin)}`);
  console.log(`        ${Object.keys(contenu.collections).length} collections, ${total} documents`);
}

const sauvegardeExiste = () =>
  fs.existsSync(SAUVEGARDES) && fs.readdirSync(SAUVEGARDES).some((f) => f.startsWith('avant-purge-'));

async function etat() {
  const db = mongoose.connection.db;
  const noms = (await db.listCollections().toArray()).map((c) => c.name).sort();

  for (const nom of noms) {
    const n = await db.collection(nom).countDocuments();
    const sort = A_VIDER.includes(nom) ? 'vidée'
      : NOMENCLATURE.includes(nom) ? 'conservée (réglage)'
        : nom === 'users' ? 'admin conservé'
          : 'non touchée';
    console.log(`  ${nom.padEnd(24)} ${String(n).padStart(5)}   ${sort}`);
  }
}

async function purger({ tout = false } = {}) {
  if (!sauvegardeExiste()) {
    throw new Error('Aucune sauvegarde. Lancez d abord : node src/scripts/purger.js --sauvegarde');
  }

  const db = mongoose.connection.db;

  // L'administrateur est identifie AVANT toute suppression : sans lui, plus
  // personne ne peut se connecter pour reconstruire.
  const admin = await db.collection('users').findOne({ email: env.seed.adminEmail });
  if (!admin) {
    throw new Error(
      `Compte administrateur « ${env.seed.adminEmail} » introuvable : purge annulee. `
      + 'Verifiez SEED_ADMIN_EMAIL avant de recommencer.'
    );
  }

  const supprimes = await db.collection('users').deleteMany({ _id: { $ne: admin._id } });
  console.log(`[purge] users            ${String(supprimes.deletedCount).padStart(5)} compte(s) supprime(s), admin conserve`);

  const cibles = tout ? [...A_VIDER, ...NOMENCLATURE] : A_VIDER;

  for (const nom of cibles) {
    const existe = await db.listCollections({ name: nom }).hasNext();
    if (!existe) continue;
    const { deletedCount } = await db.collection(nom).deleteMany({});
    console.log(`[purge] ${nom.padEnd(16)} ${String(deletedCount).padStart(5)} document(s)`);
  }

  if (!tout) {
    console.log('[purge] Nomenclature conservee (types, affinites, parametre pedagogique).');
  }

  console.log(`\n[purge] Termine. Reconnectez-vous avec ${admin.email}.`);
}

const action = process.argv.find((a) => ['--sauvegarde', '--purger', '--etat'].includes(a));
const tout = process.argv.includes('--tout');

if (!action) {
  console.error('Usage : node src/scripts/purger.js [--sauvegarde | --purger [--tout] | --etat]');
  process.exit(1);
}

await connectDB();
try {
  if (action === '--sauvegarde') await sauvegarder();
  else if (action === '--etat') await etat();
  else await purger({ tout });
} catch (erreur) {
  console.error(`[purge] ECHEC : ${erreur.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
