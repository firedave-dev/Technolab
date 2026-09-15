/**
 * Planification et retention de la sauvegarde quotidienne (Phase 10).
 *
 * Suite PURE : aucune base n'est contactee. Les fonctions eprouvees ici
 * decident QUAND une sauvegarde part et CE QU'ON EFFACE ensuite — deux
 * decisions dont l'erreur ne se remarque que le jour ou l'on a besoin de
 * restaurer, c'est-a-dire trop tard.
 *
 * Une passe de MUTATION ferme le fichier : chaque garde est cassee a son tour
 * et le verdict doit changer.
 */
const SRC = new URL('../src/', import.meta.url).href;
const {
  jourDe, nomInstantane, jourDeLInstantane, prochaineExecution,
  rattrapageNecessaire, instantanesAPurger,
} = await import(SRC + 'services/sauvegarde.service.js');

const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(`${nom}${detail ? ' -> ' + detail : ''}`);
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} ${detail}`);
}

// ==================== NOMMAGE ====================

verifier('Le jour est au format AAAA-MM-JJ',
  jourDe(new Date(2026, 8, 5)) === '2026-09-05', jourDe(new Date(2026, 8, 5)));
verifier('Le mois et le jour sont completes a deux chiffres',
  jourDe(new Date(2026, 0, 1)) === '2026-01-01');

verifier('Un instantane joint la date et la collection',
  nomInstantane('2026-09-15', 'users') === '2026-09-15__users');
verifier('On relit le jour d un instantane',
  jourDeLInstantane('2026-09-15__users') === '2026-09-15');

/*
 * Une collection ordinaire ne doit JAMAIS etre prise pour un instantane : elle
 * serait purgee comme telle. Le cas « sauvegardes », journal du dispositif, est
 * le plus dangereux — l'effacer supprimerait tout l'historique.
 */
verifier('Une collection ordinaire n est pas un instantane',
  jourDeLInstantane('users') === null);
verifier('Le journal des sauvegardes n est pas un instantane',
  jourDeLInstantane('sauvegardes') === null);
verifier('Un prefixe mal forme n est pas un instantane',
  jourDeLInstantane('2026-9-15__users') === null);
verifier('Un double souligne isole ne suffit pas',
  jourDeLInstantane('mes__notes') === null);

// ==================== PROCHAINE EXECUTION ====================

const lundi14h = new Date(2026, 8, 14, 14, 30);

const ceSoir = prochaineExecution(lundi14h, 22);
verifier('Une heure encore a venir vise aujourd hui',
  ceSoir.getDate() === 14 && ceSoir.getHours() === 22);

const demainMatin = prochaineExecution(lundi14h, 2);
verifier('Une heure deja passee vise le lendemain',
  demainMatin.getDate() === 15 && demainMatin.getHours() === 2);

verifier('Les minutes et secondes sont remises a zero',
  demainMatin.getMinutes() === 0 && demainMatin.getSeconds() === 0);

/*
 * Passage de mois : viser « demain » le 30 septembre doit donner le 1er
 * octobre, et non un 31 septembre inexistant.
 */
const finDeMois = prochaineExecution(new Date(2026, 8, 30, 14, 0), 2);
verifier('Le passage de mois est correct',
  finDeMois.getMonth() === 9 && finDeMois.getDate() === 1,
  finDeMois.toISOString().slice(0, 10));

const finDAnnee = prochaineExecution(new Date(2026, 11, 31, 14, 0), 2);
verifier('Le passage d annee est correct',
  finDAnnee.getFullYear() === 2027 && finDAnnee.getMonth() === 0 && finDAnnee.getDate() === 1);

// L'heure pile est consideree comme passee : sans cela, un serveur demarre a
// 2 h 00 pile relancerait la sauvegarde immediatement, puis en boucle.
const pile = prochaineExecution(new Date(2026, 8, 14, 2, 0, 0), 2);
verifier('L heure pile renvoie au lendemain', pile.getDate() === 15);

// ==================== RATTRAPAGE ====================

const maintenant = new Date(2026, 8, 15, 10, 0);

verifier('Sans sauvegarde connue, on rattrape',
  rattrapageNecessaire(null, maintenant) === true);
verifier('Une sauvegarde de ce matin suffit',
  rattrapageNecessaire(new Date(2026, 8, 15, 2, 0), maintenant) === false);
verifier('Une sauvegarde de plus de 24 h declenche un rattrapage',
  rattrapageNecessaire(new Date(2026, 8, 13, 2, 0), maintenant) === true);
verifier('Exactement 24 h declenche un rattrapage',
  rattrapageNecessaire(new Date(2026, 8, 14, 10, 0), maintenant) === true);
verifier('Une date au format chaine est acceptee',
  rattrapageNecessaire(new Date(2026, 8, 15, 2, 0).toISOString(), maintenant) === false);

// ==================== PURGE ====================

const collections = [
  'sauvegardes',
  '2026-09-10__users', '2026-09-10__classes',
  '2026-09-11__users', '2026-09-11__classes',
  '2026-09-12__users', '2026-09-12__classes',
];

const purge2 = instantanesAPurger(collections, 2);
verifier('On ne garde que les jours les plus recents', purge2.length === 2, purge2.join(', '));
verifier('Les jours conserves sont bien les derniers',
  purge2.every((n) => n.startsWith('2026-09-10')));
verifier('Le journal des sauvegardes est epargne',
  !purge2.includes('sauvegardes'));

verifier('Une retention superieure au stock ne purge rien',
  instantanesAPurger(collections, 10).length === 0);
verifier('Une retention egale au stock ne purge rien',
  instantanesAPurger(collections, 3).length === 0);
verifier('Toutes les collections d un jour partent ensemble',
  instantanesAPurger(collections, 1).length === 4);

// ==================== MUTATION ====================

/** Version fautive : reconnait un instantane au seul double souligne. */
const jourNaif = (nom) => (nom.includes('__') ? nom.split('__')[0] : null);

verifier(
  'MUTATION — une detection laxiste prendrait « mes__notes » pour un instantane',
  jourNaif('mes__notes') === 'mes'
  && jourDeLInstantane('mes__notes') === null
);

/** Version fautive : ajoute 24 heures au lieu de viser une date. */
const prochaineNaive = (maintenant_, heure) => {
  const cible = new Date(maintenant_);
  cible.setHours(heure, 0, 0, 0);
  return cible;   // on oublie de passer au lendemain
};

verifier(
  'MUTATION — sans le report au lendemain, l heure passee donnerait un delai negatif',
  prochaineNaive(lundi14h, 2) <= lundi14h
  && prochaineExecution(lundi14h, 2) > lundi14h
);

/** Version fautive : purge par ordre alphabetique des collections, pas par jour. */
const purgeNaive = (noms, aGarder) => noms.slice(0, Math.max(0, noms.length - aGarder));

verifier(
  'MUTATION — purger par collection couperait un jour en deux',
  purgeNaive(collections, 2).includes('sauvegardes')
  && !instantanesAPurger(collections, 2).includes('sauvegardes')
);

// ==================== BILAN ====================

console.log(`
Resultat : ${ok.length} succes, ${ko.length} echec(s)`);
if (ko.length) {
  console.log('\nEchecs :');
  ko.forEach((e) => console.log(`  - ${e}`));
}
process.exit(ko.length ? 1 : 0);
