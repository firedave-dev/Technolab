/**
 * Nomenclature disciplinaire : types de matiere et matrice d'affinite.
 *
 *     node src/seed/nomenclature.seed.js
 *
 * Rejouable : les lignes existantes sont mises a jour, aucune n'est dupliquee.
 * Ces deux tables sont administrables une fois en place ; ce fichier ne sert
 * qu'a l'amorcage.
 *
 * SYMETRIE DE LA MATRICE — la table fournie par l'etablissement declare les
 * affinites DANS LES DEUX SENS, et les deux sens se contredisent parfois : les
 * statistiques declarent l'economie en affinite forte, quand l'economie ne
 * declare les statistiques qu'en moyenne. Un couple ne pouvant porter qu'un
 * seul niveau, on retient LE PLUS FORT des deux : une proximite affirmee d'un
 * cote reste une proximite. Les conflits sont journalises a l'execution, pour
 * que la direction puisse trancher si elle le souhaite.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { TypeMatiere } from '../models/TypeMatiere.js';
import { AffiniteType } from '../models/AffiniteType.js';

/** Les seize types, dans l'ordre d'affichage voulu. */
const TYPES = [
  ['langue', 'Langue'],
  ['litterature', 'Litterature / Expression'],
  ['maths', 'Mathematiques'],
  ['statistiques', 'Statistiques'],
  ['economie', 'Economie'],
  ['comptabilite', 'Comptabilite / Finance'],
  ['gestion', 'Gestion / Management'],
  ['programmation', 'Programmation'],
  ['informatique', 'Informatique / Systemes'],
  ['reseaux', 'Reseaux / Telecoms'],
  ['base-de-donnees', 'Base de donnees'],
  ['logistique', 'Logistique / Transport'],
  ['droit', 'Droit'],
  ['communication', 'Communication'],
  ['marketing', 'Marketing / Commerce'],
  ['methodologie', 'Methodologie / Culture generale'],
];

/**
 * Declarations d'affinite, telles que portees par la table de l'etablissement.
 * Elles sont volontairement reprises ligne par ligne, y compris quand deux
 * lignes se contredisent : la resolution se fait ensuite, explicitement.
 */
const DECLARATIONS = {
  maths: { forte: ['statistiques'], moyenne: ['comptabilite', 'economie', 'programmation'] },
  statistiques: { forte: ['maths', 'economie'], moyenne: ['comptabilite', 'base-de-donnees'] },
  economie: { forte: ['comptabilite', 'gestion'], moyenne: ['statistiques', 'droit', 'marketing'] },
  comptabilite: { forte: ['economie', 'gestion'], moyenne: ['maths', 'droit'] },
  gestion: { forte: ['economie', 'comptabilite'], moyenne: ['marketing', 'droit', 'logistique'] },
  programmation: { forte: ['informatique', 'base-de-donnees'], moyenne: ['maths', 'reseaux'] },
  informatique: { forte: ['programmation', 'reseaux'], moyenne: ['base-de-donnees'] },
  reseaux: { forte: ['informatique'], moyenne: ['programmation'] },
  'base-de-donnees': { forte: ['programmation', 'informatique'], moyenne: ['statistiques'] },
  langue: { forte: ['litterature', 'communication'], moyenne: ['methodologie'] },
  litterature: { forte: ['langue', 'communication'], moyenne: ['methodologie'] },
  communication: { forte: ['marketing', 'langue'], moyenne: ['litterature', 'gestion'] },
  marketing: { forte: ['communication', 'gestion'], moyenne: ['economie'] },
  logistique: { forte: ['gestion'], moyenne: ['economie', 'marketing'] },
  droit: { forte: ['gestion', 'economie'], moyenne: ['comptabilite'] },
  methodologie: { forte: ['communication'], moyenne: ['langue', 'litterature'] },
};

/** Resout les declarations en couples uniques, en retenant le niveau le plus fort. */
function resoudre() {
  const couples = new Map();
  const conflits = [];

  for (const [source, niveaux] of Object.entries(DECLARATIONS)) {
    for (const [niveau, cibles] of Object.entries(niveaux)) {
      for (const cible of cibles) {
        const [typeA, typeB] = [source, cible].sort();
        const cle = `${typeA}|${typeB}`;
        const existant = couples.get(cle);

        if (!existant) {
          couples.set(cle, { typeA, typeB, niveau });
          continue;
        }
        if (existant.niveau === niveau) continue;

        conflits.push(`${typeA} / ${typeB} : « ${existant.niveau} » vs « ${niveau} »`);
        // Le plus fort l'emporte.
        if (niveau === 'forte') couples.set(cle, { typeA, typeB, niveau });
      }
    }
  }

  return { couples: [...couples.values()], conflits };
}

async function semer() {
  // --- Types ---
  for (const [index, [code, libelle]] of TYPES.entries()) {
    await TypeMatiere.findOneAndUpdate(
      { code },
      { $set: { libelle, ordre: index, actif: true } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`[nomenclature] ${TYPES.length} types de matiere en place`);

  // --- Affinites ---
  const { couples, conflits } = resoudre();

  // Les codes cites doivent tous exister, sinon l'appariement ne les verra jamais.
  const connus = new Set(TYPES.map(([code]) => code));
  const inconnus = couples.flatMap(({ typeA, typeB }) =>
    [typeA, typeB].filter((t) => !connus.has(t))
  );
  if (inconnus.length) {
    throw new Error(`Types cites mais absents de la nomenclature : ${[...new Set(inconnus)].join(', ')}`);
  }

  for (const { typeA, typeB, niveau } of couples) {
    await AffiniteType.findOneAndUpdate(
      { typeA, typeB },
      { $set: { niveau } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log(`[nomenclature] ${couples.length} couples d affinite enregistres`);
  console.log(`[nomenclature]   dont ${couples.filter((c) => c.niveau === 'forte').length} fortes`);

  if (conflits.length) {
    console.log(`\n[nomenclature] ${conflits.length} declaration(s) contradictoire(s), `
      + 'resolues au niveau le plus fort :');
    conflits.forEach((c) => console.log(`   - ${c}`));
  }
}

await connectDB();
try {
  await semer();
  console.log('\n[nomenclature] Termine.');
} catch (erreur) {
  console.error(`[nomenclature] ECHEC : ${erreur.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
