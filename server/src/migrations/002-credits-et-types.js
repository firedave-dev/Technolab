/**
 * Migration 002 — credits ramenes a la regle 2/3, et typage des matieres.
 *
 *     node src/migrations/002-credits-et-types.js --sauvegarde
 *     node src/migrations/002-credits-et-types.js --migrer
 *     node src/migrations/002-credits-et-types.js --verifier
 *     node src/migrations/002-credits-et-types.js --annuler
 *
 * POURQUOI ELLE EXISTE
 *
 * La migration 001 reprenait le coefficient tel quel comme nombre de credits,
 * ce qui pouvait donner 1, 4 ou 5. La regle en vigueur n'admet que 2 ou 3 :
 * coefficient <= 2 donne 2 credits, >= 3 en donne 3. Les matieres deja en base
 * doivent donc etre ramenees a cette echelle, faute de quoi l'appariement en UE
 * les ignorerait — il ne connait que deux groupes.
 *
 * LE TYPAGE EST UNE PROPOSITION, PAS UNE VERITE
 *
 * Le type gouverne l'appariement, et aucune donnee existante ne le porte. Il est
 * donc deduit de MOTS-CLES du nom de la matiere. C'est une amorce destinee a
 * faire gagner du temps a l'administration, pas un resultat fiable : une matiere
 * non reconnue reste sans type, ce qui se voit dans la verification et n'empeche
 * pas l'appariement — elle tombe simplement dans le repli.
 *
 * Le champ `coefficient` n'est jamais modifie : c'est lui la source, et le
 * retour arriere reconstruit les credits depuis lui.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB } from '../config/db.js';
import { Matiere } from '../models/Matiere.js';
import { TypeMatiere } from '../models/TypeMatiere.js';
import { creditsDepuisCoefficient, CREDITS_POSSIBLES } from '../services/appariement.service.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const SAUVEGARDES = path.resolve(DOSSIER, '../../sauvegardes');

/**
 * Mots-cles vers type, dans l'ordre d'examen.
 *
 * L'ordre compte : « base de donnees » doit etre teste avant « donnees », et
 * « anglais » avant toute regle plus large sur les intitules de langue.
 */
const INDICES = [
  [/base de don|bdd|sgbd/i, 'base-de-donnees'],
  [/algorithm|programmation|developpement|langage|python|java|web/i, 'programmation'],
  [/reseau|telecom|routage/i, 'reseaux'],
  [/systeme|exploitation|architecture materiel|maintenance/i, 'informatique'],
  [/anglais|francais|espagnol|langue/i, 'langue'],
  [/litterature|expression|redaction/i, 'litterature'],
  [/statistiq|probabilit/i, 'statistiques'],
  [/mathematiq|algebre|analyse|calcul/i, 'maths'],
  [/comptabilit|finance|fiscalit/i, 'comptabilite'],
  [/economie|macroecon|microecon/i, 'economie'],
  [/droit|juridique/i, 'droit'],
  [/marketing|commerce|vente/i, 'marketing'],
  [/communication/i, 'communication'],
  [/logistique|transport|approvisionn/i, 'logistique'],
  [/gestion|management|entreprise|ressources humaines/i, 'gestion'],
  [/methodolog|culture generale|projet professionnel/i, 'methodologie'],
];

/** Type devine depuis le nom, ou null si aucun indice ne correspond. */
function typeDevine(nom = '') {
  // Les accents sont retires pour que « Mathématiques » et « Mathematiques »
  // suivent le meme chemin.
  const normalise = nom.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [motif, type] of INDICES) if (motif.test(normalise)) return type;
  return null;
}

async function sauvegarder() {
  fs.mkdirSync(SAUVEGARDES, { recursive: true });
  const contenu = {
    date: new Date().toISOString(),
    base: mongoose.connection.name,
    matieres: await Matiere.find().lean(),
  };
  const chemin = path.join(SAUVEGARDES, `avant-002-${contenu.date.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(chemin, JSON.stringify(contenu, null, 2), 'utf8');
  console.log(`[migration] Sauvegarde ecrite : ${chemin} (${contenu.matieres.length} matieres)`);
}

const sauvegardeExiste = () =>
  fs.existsSync(SAUVEGARDES) && fs.readdirSync(SAUVEGARDES).some((f) => f.startsWith('avant-002-'));

async function migrer() {
  if (!sauvegardeExiste()) {
    throw new Error('Aucune sauvegarde trouvee. Lancez d abord --sauvegarde');
  }

  const connus = new Set((await TypeMatiere.find().lean()).map((t) => t.code));
  if (!connus.size) {
    throw new Error('Nomenclature absente. Lancez d abord : node src/seed/nomenclature.seed.js');
  }

  /*
   * Remplissage retroactif du semestre.
   *
   * Le champ vient d'etre ajoute au schema : sa valeur par defaut ne s'applique
   * qu'aux documents CREES ensuite, jamais aux lignes deja en base. Sans ce
   * remplissage, toute requete filtrant par semestre les ignore silencieusement
   * — l'assistant de saisie afficherait alors 0 credit sur un semestre plein.
   */
  const sansSemestre = await Matiere.collection.updateMany(
    { semestre: { $exists: false } },
    { $set: { semestre: 'semestre1' } }
  );
  if (sansSemestre.modifiedCount) {
    console.log(`[migration] ${sansSemestre.modifiedCount} matiere(s) rattachee(s) au semestre 1`);
  }

  const matieres = await Matiere.find().lean();
  let creditsCorriges = 0;
  let typesPoses = 0;
  const nonReconnues = [];

  for (const matiere of matieres) {
    const modifications = {};

    const attendus = creditsDepuisCoefficient(matiere.coefficient);
    if (matiere.creditsEcts !== attendus) {
      modifications.creditsEcts = attendus;
      creditsCorriges += 1;
    }

    if (!matiere.typeMatiere) {
      const devine = typeDevine(matiere.nom);
      if (devine && connus.has(devine)) {
        modifications.typeMatiere = devine;
        typesPoses += 1;
      } else {
        nonReconnues.push(matiere.nom);
      }
    }

    if (Object.keys(modifications).length) {
      // `updateOne` sans `$set` de coefficient : le crochet de derivation ne se
      // declenche pas, on ecrit donc les credits calcules ici.
      await Matiere.collection.updateOne({ _id: matiere._id }, { $set: modifications });
    }
  }

  console.log(`[migration] ${creditsCorriges} credit(s) ramene(s) a l echelle 2/3`);
  console.log(`[migration] ${typesPoses} matiere(s) typee(s) par mots-cles`);

  if (nonReconnues.length) {
    console.log(`[migration] ${nonReconnues.length} matiere(s) sans type, a renseigner a la main :`);
    [...new Set(nonReconnues)].forEach((n) => console.log(`   - ${n}`));
  }
}

async function verifier() {
  const horsRegle = await Matiere.find({ creditsEcts: { $nin: CREDITS_POSSIBLES } }).lean();
  const sansType = await Matiere.countDocuments({
    $or: [{ typeMatiere: null }, { typeMatiere: { $exists: false } }],
  });
  const sansSemestre = await Matiere.countDocuments({ semestre: { $exists: false } });
  const total = await Matiere.countDocuments();

  // Le credit doit correspondre exactement au coefficient, matiere par matiere.
  const toutes = await Matiere.find().lean();
  const incoherentes = toutes.filter(
    (m) => m.creditsEcts !== creditsDepuisCoefficient(m.coefficient)
  );

  console.log(`[verification] ${total} matieres`);
  console.log(`[verification] ${horsRegle.length} hors echelle 2/3`);
  console.log(`[verification] ${incoherentes.length} dont le credit ne suit pas le coefficient`);
  console.log(`[verification] ${sansType} sans type (appariement par repli)`);
  console.log(`[verification] ${sansSemestre} sans semestre`);
  if (sansSemestre) throw new Error('Des matieres n ont pas de semestre : le filtrage les ignorerait');

  if (horsRegle.length || incoherentes.length) {
    incoherentes.slice(0, 10).forEach((m) =>
      console.error(`   - ${m.nom} : coef ${m.coefficient} -> ${m.creditsEcts} credits`));
    throw new Error('Verification en echec');
  }
  console.log('[verification] Tous les credits suivent la regle.');
}

/**
 * Retour arriere : les credits reprennent la valeur brute du coefficient, comme
 * les laissait la migration 001, et les types poses ici sont retires.
 *
 * Les types saisis A LA MAIN depuis l'application seraient eux aussi effaces :
 * c'est pourquoi ce retour ne doit servir qu'immediatement apres la migration.
 */
async function annuler() {
  const matieres = await Matiere.find().lean();
  for (const m of matieres) {
    await Matiere.collection.updateOne(
      { _id: m._id },
      { $set: { creditsEcts: m.coefficient || 1 }, $unset: { typeMatiere: '' } }
    );
  }
  console.log(`[retour] ${matieres.length} matieres ramenees a l etat de la migration 001`);
  console.log('[retour] Attention : les types saisis manuellement sont eux aussi effaces.');
}

const ACTIONS = { '--sauvegarde': sauvegarder, '--migrer': migrer, '--verifier': verifier, '--annuler': annuler };
const action = process.argv.find((a) => ACTIONS[a]);

if (!action) {
  console.error('Usage : node src/migrations/002-credits-et-types.js '
    + '[--sauvegarde | --migrer | --verifier | --annuler]');
  process.exit(1);
}

await connectDB();
try {
  await ACTIONS[action]();
  console.log('[migration] Termine.');
} catch (erreur) {
  console.error(`[migration] ECHEC : ${erreur.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
