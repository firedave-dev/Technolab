/**
 * Bornes des periodes de rapport (Phase 11).
 *
 * Suite PURE. Ces bornes decident de ce qui entre dans un rapport financier :
 * une erreur d'un jour fait disparaitre un encaissement du mois, ou l'y compte
 * deux fois. Les cas eprouves sont ceux qui se trompent en pratique — fin de
 * mois, annee bissextile, dimanche, passage d'annee — et non le cas moyen.
 *
 * Passe de MUTATION en fin de fichier.
 */
const SRC = new URL('../src/', import.meta.url).href;
const {
  PERIODES, bornesPeriode, filtreDates, enDate, MOIS_RENTREE,
} = await import(SRC + 'services/periode.service.js');

const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(`${nom}${detail ? ' -> ' + detail : ''}`);
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} ${detail}`);
}

const d = (a, m, j, h = 12) => new Date(a, m - 1, j, h);

// ==================== CATALOGUE ====================

verifier('Sept periodes declarees', PERIODES.length === 7, String(PERIODES.length));
verifier('Une periode inconnue leve une erreur', (() => {
  try { bornesPeriode('trimestre'); return false; } catch { return true; }
})());

// ==================== JOUR ====================

const j = bornesPeriode('journalier', d(2024, 2, 29));
verifier('Le jour commence a minuit',
  j.debut.getHours() === 0 && j.debut.getMinutes() === 0);
verifier('Le jour finit a 23:59:59.999',
  j.fin.getHours() === 23 && j.fin.getMilliseconds() === 999);
verifier('Le 29 fevrier d une annee bissextile est un jour valide',
  j.debut.getDate() === 29 && j.debut.getMonth() === 1);

// ==================== SEMAINE ====================

// Le 15 septembre 2026 est un mardi.
const sem = bornesPeriode('hebdomadaire', d(2026, 9, 15));
verifier('La semaine commence le lundi', sem.debut.getDay() === 1, enDate(sem.debut));
verifier('La semaine finit le dimanche', sem.fin.getDay() === 0, enDate(sem.fin));
// Du lundi 00:00:00.000 au dimanche 23:59:59.999 : sept jours moins une
// milliseconde. C'est bien une semaine COMPLETE, bornes incluses.
verifier('La semaine couvre sept jours entiers',
  Math.round((sem.fin - sem.debut) / 86400000) === 7
  && sem.fin - sem.debut === 7 * 86400000 - 1);

/*
 * DIMANCHE. `getDay()` rend 0 pour dimanche : une soustraction naive le
 * rattacherait a la semaine SUIVANTE, et le rapport hebdomadaire du dimanche
 * soir serait vide. Le 20 septembre 2026 est un dimanche.
 */
const dim = bornesPeriode('hebdomadaire', d(2026, 9, 20));
verifier('Un dimanche appartient a la semaine qui vient de s ecouler',
  dim.debut.getDate() === 14 && dim.fin.getDate() === 20,
  `${enDate(dim.debut)} au ${enDate(dim.fin)}`);

const lun = bornesPeriode('hebdomadaire', d(2026, 9, 14));
verifier('Un lundi ouvre sa propre semaine', lun.debut.getDate() === 14);

// ==================== MOIS ====================

const fev = bornesPeriode('mensuel', d(2024, 2, 10));
verifier('Fevrier bissextile compte 29 jours', fev.fin.getDate() === 29, enDate(fev.fin));

const fev2026 = bornesPeriode('mensuel', d(2026, 2, 10));
verifier('Fevrier ordinaire compte 28 jours', fev2026.fin.getDate() === 28);

const dec = bornesPeriode('mensuel', d(2026, 12, 31));
verifier('Decembre ne deborde pas sur janvier',
  dec.fin.getMonth() === 11 && dec.fin.getDate() === 31);
verifier('Le mois porte son nom en francais',
  dec.libelle === 'décembre 2026', dec.libelle);

// ==================== TRIMESTRE ====================

for (const [mois, attendu] of [[1, 1], [3, 1], [4, 2], [6, 2], [7, 3], [9, 3], [10, 4], [12, 4]]) {
  const t = bornesPeriode('trimestriel', d(2026, mois, 15));
  verifier(`Le mois ${mois} tombe au trimestre ${attendu}`,
    t.libelle.startsWith(`${attendu}`), t.libelle);
}

const t1 = bornesPeriode('trimestriel', d(2026, 2, 15));
verifier('Le trimestre couvre trois mois pleins',
  t1.debut.getMonth() === 0 && t1.fin.getMonth() === 2 && t1.fin.getDate() === 31);

// ==================== SEMESTRE ====================

const s1 = bornesPeriode('semestriel', d(2026, 3, 1));
verifier('Le premier semestre va de janvier a juin',
  s1.debut.getMonth() === 0 && s1.fin.getMonth() === 5 && s1.fin.getDate() === 30);

const s2 = bornesPeriode('semestriel', d(2026, 11, 1));
verifier('Le second semestre va de juillet a decembre',
  s2.debut.getMonth() === 6 && s2.fin.getMonth() === 11 && s2.fin.getDate() === 31);

// ==================== ANNEE SCOLAIRE ====================

/*
 * L'annee SCOLAIRE court d'octobre a septembre. La confondre avec l'annee
 * civile couperait la scolarite au 31 decembre, en plein premier semestre.
 */
const an = bornesPeriode('annuel', d(2024, 3, 12), '2023-2024');
verifier('L annee scolaire demarre au mois de la rentree',
  an.debut.getMonth() === MOIS_RENTREE && an.debut.getFullYear() === 2023,
  enDate(an.debut));
verifier('L annee scolaire se termine juste avant la rentree suivante',
  an.fin.getFullYear() === 2024 && an.fin.getMonth() === MOIS_RENTREE - 1,
  enDate(an.fin));
verifier('Le libelle porte les deux millesimes',
  an.libelle === 'Année scolaire 2023-2024', an.libelle);

// Une date de novembre appartient a l'annee qui vient de commencer.
const deduiteNov = bornesPeriode('annuel', d(2024, 11, 5));
verifier('Novembre 2024 releve de l annee 2024-2025',
  deduiteNov.libelle === 'Année scolaire 2024-2025', deduiteNov.libelle);

// Une date de mars appartient a l'annee commencee l'automne precedent.
const deduiteMars = bornesPeriode('annuel', d(2024, 3, 5));
verifier('Mars 2024 releve de l annee 2023-2024',
  deduiteMars.libelle === 'Année scolaire 2023-2024', deduiteMars.libelle);

// ==================== GENERAL ====================

const gen = bornesPeriode('general');
verifier('La periode generale n a pas de bornes', gen.debut === null && gen.fin === null);
verifier('La periode generale ne produit aucun filtre',
  Object.keys(filtreDates('datePaiement', gen)).length === 0);

// ==================== FILTRE ====================

const filtre = filtreDates('datePaiement', bornesPeriode('mensuel', d(2026, 5, 10)));
verifier('Le filtre porte sur le champ demande',
  Object.keys(filtre)[0] === 'datePaiement');
verifier('Le filtre est inclusif aux deux bouts',
  filtre.datePaiement.$gte instanceof Date && filtre.datePaiement.$lte instanceof Date);

// ==================== MUTATION ====================

/** Version fautive : semaine calculee sans corriger le dimanche. */
const lundiNaif = (date) => {
  const copie = new Date(date);
  copie.setDate(copie.getDate() - (copie.getDay() - 1));
  return copie;
};

verifier(
  'MUTATION — sans la correction du dimanche, la semaine partirait du lendemain',
  lundiNaif(d(2026, 9, 20)).getDate() === 21
  && bornesPeriode('hebdomadaire', d(2026, 9, 20)).debut.getDate() === 14
);

/** Version fautive : fin de mois posee au 30, quel que soit le mois. */
const finDeMoisNaive = (date) => new Date(date.getFullYear(), date.getMonth(), 30);

verifier(
  'MUTATION — une fin de mois figee perdrait le 31 janvier',
  finDeMoisNaive(d(2026, 1, 10)).getDate() === 30
  && bornesPeriode('mensuel', d(2026, 1, 10)).fin.getDate() === 31
);

/** Version fautive : annee scolaire assimilee a l'annee civile. */
const anneeCivile = (date) => date.getFullYear();

verifier(
  'MUTATION — l annee civile rattacherait novembre a la mauvaise annee',
  anneeCivile(d(2024, 11, 5)) === 2024
  && bornesPeriode('annuel', d(2024, 11, 5)).debut.getFullYear() === 2024
  && bornesPeriode('annuel', d(2024, 3, 5)).debut.getFullYear() === 2023
);

// ==================== BILAN ====================

console.log(`
Resultat : ${ok.length} succes, ${ko.length} echec(s)`);
if (ko.length) {
  console.log('\nEchecs :');
  ko.forEach((e) => console.log(`  - ${e}`));
}
process.exit(ko.length ? 1 : 0);
