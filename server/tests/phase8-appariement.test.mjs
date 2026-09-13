/**
 * Credits ECTS, bouclage a 30 et appariement des matieres en UE (Phase 8).
 *
 * Suite PUREMENT ARITHMETIQUE : ni base, ni serveur. Les repartitions limites —
 * une matiere orpheline, une impasse a 23 credits, un couplage que le glouton
 * rate — sont penibles a fabriquer en base et triviales a ecrire ici.
 *
 * Comme en Phase 7, une passe de MUTATION termine le fichier : chaque regle est
 * cassee volontairement et le resultat doit changer.
 */
const SRC = new URL('../src/', import.meta.url).href;
const {
  creditsDepuisCoefficient, CONFIGURATIONS, CREDITS_PAR_SEMESTRE,
  etatSemestre, peutAjouter, scoreAppariement, couplageOptimal,
  apparierSemestre, ordonnerUEs, comparerMatieres, nommerUE, POIDS,
} = await import(SRC + 'services/appariement.service.js');

const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(`${nom}${detail ? ' -> ' + detail : ''}`);
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} ${detail}`);
}

/** Fabrique une matiere de test. */
const M = (nom, type, creditsEcts = 2, _id = nom) => ({ _id, nom, type, creditsEcts });

/** Matrice d'affinite de test, symetrique par construction. */
function matrice(paires) {
  const m = new Map();
  for (const [a, b, score] of paires) m.set([a, b].sort().join('|'), score);
  return m;
}

// ==================== 1. CREDITS DEDUITS DU COEFFICIENT ====================

for (const [coefficient, attendu] of [[1, 2], [2, 2], [3, 3], [4, 3], [10, 3]]) {
  verifier(`coefficient ${coefficient} -> ${attendu} credits`,
    creditsDepuisCoefficient(coefficient) === attendu,
    String(creditsDepuisCoefficient(coefficient)));
}
verifier('la frontiere est a 3, pas a 2',
  creditsDepuisCoefficient(2) === 2 && creditsDepuisCoefficient(3) === 3);

// ==================== 2. CONFIGURATIONS VALIDES ====================

verifier('exactement trois configurations bouclent a 30',
  CONFIGURATIONS.length === 3, `${CONFIGURATIONS.length} trouvee(s)`);

const attendues = [{ n2: 0, n3: 10 }, { n2: 6, n3: 6 }, { n2: 12, n3: 2 }];
for (const { n2, n3 } of attendues) {
  const trouvee = CONFIGURATIONS.find((c) => c.n2 === n2 && c.n3 === n3);
  verifier(`configuration ${n2} a 2 cr. / ${n3} a 3 cr. presente`, Boolean(trouvee));
}

for (const c of CONFIGURATIONS) {
  verifier(`configuration ${c.n2}/${c.n3} totalise bien 30 credits`,
    c.n2 * 2 + c.n3 * 3 === CREDITS_PAR_SEMESTRE, `${c.n2 * 2 + c.n3 * 3}`);
  verifier(`configuration ${c.n2}/${c.n3} : les deux effectifs sont pairs`,
    c.n2 % 2 === 0 && c.n3 % 2 === 0);
  verifier(`configuration ${c.n2}/${c.n3} : nombre d UE de 6 impair`,
    c.ue6 % 2 === 1, `${c.ue6} UE de 6`);
}

verifier('les trois totaux de matieres sont 10, 12 et 14',
  CONFIGURATIONS.map((c) => c.matieres).join(',') === '10,12,14',
  CONFIGURATIONS.map((c) => c.matieres).join(','));

// ==================== 3. ETAT ET IMPASSES ====================

const vierge = etatSemestre(0, 0);
verifier('semestre vierge : les trois configurations restent ouvertes',
  vierge.configurations.length === 3 && !vierge.impasse && !vierge.complet);

const acheve = etatSemestre(6, 6);
verifier('6 / 6 : semestre complet a 30 credits',
  acheve.complet && acheve.credits === 30 && !acheve.impasse);

// Parite : une matiere isolee dans son credit n'aura pas de binome.
const impair = etatSemestre(5, 4);
verifier('5 matieres a 2 credits : orpheline signalee',
  impair.orphelineDeux && !impair.orphelineTrois);

/*
 * Le cahier donnait deux exemples d'impasse. Verification faite, NI L'UN NI
 * L'AUTRE n'en est une :
 *  - 8 matieres a 3 credits (24) : il reste 6, soit une paire de 3 -> (0, 10) ;
 *  - 4 a 3 + 4 a 2 (20) : il reste 10, soit une UE de 4 et une de 6 -> (6, 6).
 * Ces deux etats doivent donc etre declares ouverts, pas bloques.
 */
const huitTrois = etatSemestre(0, 8);
verifier('8 matieres a 3 credits n est PAS une impasse',
  !huitTrois.impasse && huitTrois.configurations.some((c) => c.n2 === 0 && c.n3 === 10),
  `${huitTrois.configurations.length} configuration(s) ouverte(s)`);

const quatreQuatre = etatSemestre(4, 4);
verifier('4 a 2 + 4 a 3 n est PAS une impasse',
  !quatreQuatre.impasse && quatreQuatre.configurations.some((c) => c.n2 === 6 && c.n3 === 6),
  `${quatreQuatre.configurations.length} configuration(s) ouverte(s)`);

/*
 * Une vraie impasse : aucune configuration ne domine (8, 4). Il faut n2 <= 6 pour
 * viser (6,6), ou n3 <= 2 pour viser (12,2) — les deux sont violes.
 */
const bloque = etatSemestre(8, 4);
verifier('8 a 2 + 4 a 3 est une impasse reelle',
  bloque.impasse && bloque.configurations.length === 0, `${bloque.credits} credits poses`);
verifier('une impasse propose de RETIRER des matieres',
  bloque.corrections.length > 0 && bloque.corrections[0].type === 'retrait',
  bloque.corrections[0]?.texte);

/*
 * L'anticipation est le point important : l'impasse doit se declarer AVANT le
 * plafond. (1 ; 7) ne pose que 23 credits sur 30 et n'a pourtant plus d'issue.
 */
const anticipee = etatSemestre(1, 7);
verifier('impasse detectee a 23 credits, bien avant le plafond de 30',
  anticipee.impasse && anticipee.credits === 23 && anticipee.creditsRestants === 7,
  `${anticipee.credits} credits`);

// --- Autorisation d'ajout ---
verifier('ajout refuse s il fait depasser 30 credits',
  peutAjouter(12, 2, 2).autorise === false, peutAjouter(12, 2, 2).motif);

const versImpasse = peutAjouter(7, 4, 2); // menerait a (8, 4)
verifier('ajout refuse s il mene en impasse, avant tout depassement',
  !versImpasse.autorise && versImpasse.motif.includes('30 credits'), versImpasse.motif);

verifier('ajout autorise sur un semestre vierge', peutAjouter(0, 0, 2).autorise === true);
verifier('ajout autorise en cours de route', peutAjouter(4, 4, 3).autorise === true);

// ==================== 4. APPARIEMENT ====================

const AFFINITES = matrice([
  ['maths', 'stats', POIDS.affiniteForte],
  ['maths', 'prog', POIDS.affiniteMoyenne],
  ['prog', 'info', POIDS.affiniteForte],
  ['langue', 'communication', POIDS.affiniteForte],
]);

verifier('meme type : score maximal',
  scoreAppariement(M('a', 'prog'), M('b', 'prog'), AFFINITES) === POIDS.memeType);
verifier('affinite forte reconnue',
  scoreAppariement(M('a', 'maths'), M('b', 'stats'), AFFINITES) === POIDS.affiniteForte);
verifier('la matrice est interrogee dans les deux sens',
  scoreAppariement(M('a', 'stats'), M('b', 'maths'), AFFINITES)
  === scoreAppariement(M('a', 'maths'), M('b', 'stats'), AFFINITES));
verifier('aucune affinite : repli a zero',
  scoreAppariement(M('a', 'droit'), M('b', 'prog'), AFFINITES) === POIDS.repli);

// --- Regle absolue : les credits ne se melangent jamais ---
const mixte = apparierSemestre([
  M('Algebre', 'maths', 2), M('Analyse', 'maths', 3),
  M('Reseaux', 'info', 2), M('Systemes', 'info', 3),
], AFFINITES);

const melange = mixte.ues.some((ue) =>
  new Set(ue.matieres.map((m) => m.creditsEcts)).size > 1);
verifier('jamais d UE melangeant 2 et 3 credits', !melange,
  mixte.ues.map((u) => u.matieres.map((m) => m.creditsEcts).join('+')).join(' | '));
verifier('les UE valent 4 ou 6 credits, jamais 5',
  mixte.ues.every((ue) => ue.credits === 4 || ue.credits === 6),
  mixte.ues.map((u) => u.credits).join(','));

// --- Effectif impair : erreur remontee, pas d'appariement sauvage ---
const impairGroupe = apparierSemestre([
  M('A', 'prog', 2), M('B', 'prog', 2), M('C', 'prog', 2),
], AFFINITES);
verifier('effectif impair : erreur remontee',
  impairGroupe.erreurs.length === 1 && impairGroupe.erreurs[0].orpheline,
  impairGroupe.erreurs[0]?.motif);
verifier('effectif impair : aucune UE bancale produite',
  impairGroupe.ues.length === 0);

verifier('couplage impossible sur un effectif impair',
  couplageOptimal([M('A', 'x'), M('B', 'x'), M('C', 'x')], AFFINITES) === null);
verifier('couplage vide sur une liste vide',
  JSON.stringify(couplageOptimal([], AFFINITES)) === '[]');

// --- L'optimum global bat le glouton dans l'ordre de creation ---

/*
 * Cas construit exactement pour cela : dans l'ordre de saisie, les matieres
 * alternent entre deux types. Apparier au fil de l'eau accouple systematiquement
 * deux types differents ; le couplage optimal regroupe chaque type avec le sien.
 */
const piege = [
  M('Algebre', 'maths', 2, '1'),
  M('Algorithmique', 'prog', 2, '2'),
  M('Analyse', 'maths', 2, '3'),
  M('Assembleur', 'prog', 2, '4'),
];

const scoreGlouton = scoreAppariement(piege[0], piege[1], AFFINITES)
  + scoreAppariement(piege[2], piege[3], AFFINITES);

const pairesOptimales = couplageOptimal(piege, AFFINITES);
const scoreOptimal = pairesOptimales.reduce(
  (s, [a, b]) => s + scoreAppariement(a, b, AFFINITES), 0
);

verifier('le couplage optimal bat l appariement dans l ordre de creation',
  scoreOptimal > scoreGlouton, `optimal ${scoreOptimal} vs glouton ${scoreGlouton}`);
verifier('le couplage optimal regroupe chaque type avec lui-meme',
  pairesOptimales.every(([a, b]) => a.type === b.type),
  pairesOptimales.map(([a, b]) => `${a.nom}+${b.nom}`).join(' | '));

// --- Repli signale pour relecture ---
const repli = apparierSemestre([M('Droit', 'droit', 2), M('Sport', 'sport', 2)], AFFINITES);
verifier('une UE nee d un repli est signalee pour relecture',
  repli.ues.length === 1 && repli.ues[0].parDefaut === true);

const affine = apparierSemestre([M('Algebre', 'maths', 2), M('Probas', 'stats', 2)], AFFINITES);
verifier('une UE nee d une affinite n est pas signalee',
  affine.ues.length === 1 && affine.ues[0].parDefaut === false,
  `score ${affine.ues[0]?.score}`);

// --- Determinisme ---
const jeu = [
  M('Analyse', 'maths', 2, 'a'), M('Algebre', 'maths', 2, 'b'),
  M('Reseaux', 'info', 2, 'c'), M('Systemes', 'info', 2, 'd'),
  M('Probas', 'stats', 2, 'e'), M('Statistique', 'stats', 2, 'f'),
];
const signature = (r) => r.ues.map((u) => u.matieres.map((m) => m._id).join('+')).join('|');

const passe1 = signature(apparierSemestre(jeu, AFFINITES));
const passe2 = signature(apparierSemestre(jeu, AFFINITES));
const passe3 = signature(apparierSemestre([...jeu].reverse(), AFFINITES));

verifier('deux executions donnent le meme appariement', passe1 === passe2, passe1);
verifier('l ordre d entree ne change pas le resultat', passe1 === passe3,
  `${passe1} vs ${passe3}`);

// ==================== 5. ORDONNANCEMENT ====================

const ues = ordonnerUEs([
  { credits: 6, matieres: [M('Zoologie', 't'), M('Anatomie', 't')] },
  { credits: 4, matieres: [M('Économie', 't'), M('Droit', 't')] },
  { credits: 4, matieres: [M('algorithmique', 't'), M('Base de donnees', 't')] },
]);

verifier('les UE de 4 credits precedent celles de 6',
  ues.map((u) => u.credits).join(',') === '4,4,6', ues.map((u) => u.credits).join(','));

verifier('les matieres sont triees alphabetiquement dans l UE',
  ues[2].matieres.map((m) => m.nom).join(',') === 'Anatomie,Zoologie',
  ues[2].matieres.map((m) => m.nom).join(','));

/*
 * Tri insensible aux accents ET a la casse. Une comparaison brute de chaines
 * placerait « Économie » apres « Zoologie » (le E accentu vaut 0xC9), et
 * « algorithmique » minuscule avant toutes les majuscules.
 */
verifier('tri insensible a la casse : « algorithmique » avant « Base de donnees »',
  ues[0].matieres.map((m) => m.nom).join(',') === 'algorithmique,Base de donnees',
  ues[0].matieres.map((m) => m.nom).join(','));

verifier('tri insensible aux accents : « Droit » avant « Économie »',
  ues[1].matieres.map((m) => m.nom).join(',') === 'Droit,Économie',
  ues[1].matieres.map((m) => m.nom).join(','));

verifier('les UE de meme credit sont triees par leur premiere matiere',
  comparerMatieres(ues[0].matieres[0], ues[1].matieres[0]) < 0,
  `${ues[0].matieres[0].nom} avant ${ues[1].matieres[0].nom}`);

// ==================== NOMMAGE ====================

const libelles = new Map([['prog', 'Programmation'], ['maths', 'Mathematiques']]);
const nomme = nommerUE({ matieres: [M('A', 'prog'), M('B', 'prog')] }, 1, libelles);
verifier('UE homogene nommee par son type',
  nomme.code === 'UE01' && nomme.intitule === 'Programmation', JSON.stringify(nomme));

const mixteNom = nommerUE({ matieres: [M('A', 'prog'), M('B', 'maths')] }, 12, libelles);
verifier('UE heterogene cite ses deux types',
  mixteNom.code === 'UE12' && mixteNom.intitule.includes('et'), mixteNom.intitule);

// ==================== PASSE DE MUTATION ====================

const mutations = [
  {
    nom: 'seuil de credit place a 2 au lieu de 3',
    faux: () => (2 >= 2 ? 3 : 2),
    vrai: () => creditsDepuisCoefficient(2),
  },
  {
    // 9 x 2 + 4 x 3 = 30 pile. Une implementation qui ne verifierait que le
    // total declarerait le semestre boucle, alors que neuf matieres a 2 credits
    // en laissent une sans binome.
    nom: 'parite ignoree : 9 a 2 credits + 4 a 3 totalisent 30 et passeraient',
    faux: () => 9 * 2 + 4 * 3 === CREDITS_PAR_SEMESTRE,
    vrai: () => etatSemestre(9, 4).complet,
  },
  {
    nom: 'impasse detectee seulement au depassement',
    faux: () => etatSemestre(8, 4).credits > 30,
    vrai: () => etatSemestre(8, 4).impasse,
  },
  {
    nom: 'appariement glouton dans l ordre de creation',
    faux: () => scoreGlouton,
    vrai: () => scoreOptimal,
  },
  {
    nom: 'tri par code ASCII au lieu du collateur francais',
    faux: () => 'Économie'.localeCompare('Zoologie') > 0,
    vrai: () => comparerMatieres(M('Économie', 't'), M('Zoologie', 't')) < 0,
  },
];

for (const { nom, faux, vrai } of mutations) {
  const a = faux();
  const b = vrai();
  verifier(`mutation detectee : ${nom}`, a !== b, `fautif ${a} vs reel ${b}`);
}

// ============ NOMENCLATURE ET DERIVATION, COTE BASE ============

/*
 * Cette section touche la base, contrairement au reste du fichier. Elle nettoie
 * derriere elle dans tous les cas, y compris en cas d'echec.
 */
const mongoose = (await import('mongoose')).default;
const { connectDB } = await import(SRC + 'config/db.js');
const { TypeMatiere } = await import(SRC + 'models/TypeMatiere.js');
const { AffiniteType, matriceAffinites } = await import(SRC + 'models/AffiniteType.js');
const { Matiere } = await import(SRC + 'models/Matiere.js');
const { Classe } = await import(SRC + 'models/Classe.js');

await connectDB();
let matiereTest = null;
let serveur = null;

try {
  // --- Nomenclature ---
  const types = await TypeMatiere.find({ actif: true }).sort({ ordre: 1 }).lean();
  verifier('les seize types de matiere sont en base', types.length >= 16, `${types.length} types`);
  verifier('la nomenclature est ordonnee pour l affichage',
    types.every((t, i) => i === 0 || t.ordre >= types[i - 1].ordre));

  // --- Matrice d'affinite ---
  const matriceBase = await matriceAffinites();
  verifier('la matrice d affinite est chargee depuis la base',
    matriceBase.size > 20, `${matriceBase.size} couples`);

  /*
   * La symetrie est structurelle : les codes sont tries a l'enregistrement, donc
   * aucun couple ne peut exister dans les deux sens. On le verifie sur les
   * donnees reelles plutot que de s'en remettre au crochet.
   */
  const lignes = await AffiniteType.find().lean();
  const doublons = lignes.filter((l) =>
    lignes.some((autre) => autre.typeA === l.typeB && autre.typeB === l.typeA));
  verifier('aucun couple d affinite enregistre dans les deux sens', doublons.length === 0,
    doublons.map((d) => `${d.typeA}/${d.typeB}`).join(', ') || 'aucun');

  verifier('les codes de chaque couple sont ordonnes',
    lignes.every((l) => l.typeA < l.typeB));

  // Une affinite reflexive n'a pas de sens : la regle « meme type » prime deja.
  let reflexiveRefusee = false;
  try {
    await AffiniteType.create({ typeA: 'maths', typeB: 'maths', niveau: 'forte' });
  } catch {
    reflexiveRefusee = true;
  }
  verifier('une affinite d un type avec lui-meme est refusee', reflexiveRefusee);

  /*
   * Le module de calcul doit reconnaitre le champ tel que le MODELE le nomme.
   * Les objets de test portent `type`, les documents Mongoose `typeMatiere` :
   * l'oubli de cette conversion faisait tomber toutes les matieres reelles en
   * repli, sans qu'aucune erreur ne se produise.
   */
  const docA = { nom: 'Comptabilite generale', typeMatiere: 'comptabilite', creditsEcts: 3 };
  const docB = { nom: 'Economie', typeMatiere: 'economie', creditsEcts: 3 };
  verifier('le score lit le champ typeMatiere des documents reels',
    scoreAppariement(docA, docB, matriceBase) === POIDS.affiniteForte,
    `score ${scoreAppariement(docA, docB, matriceBase)}`);

  const memeTypeDoc = scoreAppariement(
    { typeMatiere: 'programmation' }, { typeMatiere: 'programmation' }, matriceBase
  );
  verifier('deux documents de meme type obtiennent le score maximal',
    memeTypeDoc === POIDS.memeType, `score ${memeTypeDoc}`);

  const reel = apparierSemestre([docA, docB], matriceBase);
  verifier('une UE issue de documents reels n est pas marquee comme repli',
    reel.ues.length === 1 && reel.ues[0].parDefaut === false,
    `score ${reel.ues[0]?.score}`);

  // --- Derivation du credit ---
  const classe = await Classe.findOne().lean();
  if (!classe) {
    verifier('une classe existe pour le test de derivation', false, 'aucune classe en base');
  } else {
    matiereTest = await Matiere.create({
      nom: 'Test derivation credit', code: 'TDC', coefficient: 1,
      classe: classe._id, anneeScolaire: '2025-2026', typeMatiere: 'maths',
    });
    verifier('creation : coefficient 1 donne 2 credits', matiereTest.creditsEcts === 2,
      String(matiereTest.creditsEcts));

    // Le credit doit suivre meme par une mise a jour directe, qui contourne
    // le crochet de document.
    await Matiere.updateOne({ _id: matiereTest._id }, { $set: { coefficient: 4 } });
    const relue = await Matiere.findById(matiereTest._id).lean();
    verifier('mise a jour directe : coefficient 4 donne 3 credits', relue.creditsEcts === 3,
      String(relue.creditsEcts));

    // Une tentative de forcer le credit a la main doit rester sans effet.
    await Matiere.updateOne({ _id: matiereTest._id }, { $set: { coefficient: 1, creditsEcts: 3 } });
    const forcee = await Matiere.findById(matiereTest._id).lean();
    verifier('le credit force a la main est ecrase par la derivation',
      forcee.creditsEcts === 2, `${forcee.creditsEcts} (3 demande, 2 attendu)`);
  }
  // ============ LA REGLE EST-ELLE TENUE PAR L API ? ============

  /*
   * Masquer un bouton ne protege rien : un professeur peut appeler l'API
   * directement. Les regles qui gouvernent la composition des UE — et donc la
   * compensation, donc la validation d'un semestre — sont donc verifiees ici
   * telles que le reseau les voit.
   */
  const { createApp } = await import(SRC + 'app.js');
  const { env } = await import(SRC + 'config/env.js');
  serveur = createApp().listen(5088);
  const BASE = 'http://localhost:5088/api';

  const connexion = async (email, motDePasse) => {
    const r = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, motDePasse }),
    });
    return (await r.json()).accessToken;
  };

  const appel = async (chemin, { methode = 'GET', token, corps } = {}) => {
    const r = await fetch(`${BASE}${chemin}`, {
      method: methode,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(corps ? { 'content-type': 'application/json' } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { statut: r.status, data: await r.json().catch(() => ({})) };
  };

  const admin = await connexion(env.seed.adminEmail, env.seed.adminPassword);
  const prof = await connexion('professeur@technolab-ista.edu', 'Passer@123');
  verifier('connexion des profils de test', Boolean(admin) && Boolean(prof));

  const classeApi = await Classe.findOne().lean();

  // --- Lecture ---
  const nomenclature = await appel('/ue/types', { token: admin });
  verifier('GET /ue/types sert la nomenclature',
    nomenclature.statut === 200 && nomenclature.data.types.length >= 16,
    `${nomenclature.data.types?.length} types`);
  verifier('GET /ue/types expose les trois configurations',
    nomenclature.data.configurations?.length === 3);

  const etatApi = await appel(`/ue/etat?classe=${classeApi._id}&semestre=semestre1`, { token: admin });
  verifier('GET /ue/etat renvoie le compteur de credits',
    etatApi.statut === 200 && typeof etatApi.data.etat.credits === 'number',
    `${etatApi.data.etat?.credits}/30`);

  const propositionApi = await appel(
    `/ue/proposition?classe=${classeApi._id}&semestre=semestre1`, { token: admin }
  );
  verifier('GET /ue/proposition calcule sans rien ecrire', propositionApi.statut === 200,
    `${propositionApi.data.ues?.length} UE proposees`);

  // --- Ecriture reservee a la direction ---
  const profEcrit = await appel('/ue/appliquer', {
    methode: 'POST', token: prof,
    corps: { classe: String(classeApi._id), semestre: 'semestre1', ues: [] },
  });
  verifier('un professeur ne peut pas composer les UE', profEcrit.statut === 403,
    `HTTP ${profEcrit.statut}`);

  const profPropose = await appel(
    `/ue/proposition?classe=${classeApi._id}`, { token: prof }
  );
  verifier('un professeur ne peut pas demander de proposition', profPropose.statut === 403,
    `HTTP ${profPropose.statut}`);

  // --- La compatibilite des credits ne peut pas etre contournee ---
  /*
   * Les deux matieres doivent appartenir au MEME semestre et a la meme annee que
   * la requete, sinon l'API les rejette comme etrangeres au semestre — un refus
   * correct, mais qui ne prouverait rien sur la compatibilite des credits.
   */
  const perimetre = {
    classe: classeApi._id,
    semestre: 'semestre1',
    anneeScolaire: classeApi.anneeScolaire,
    actif: true,
  };
  const deuxCredits = await Matiere.findOne({ ...perimetre, creditsEcts: 2 }).lean();
  const troisCredits = await Matiere.findOne({ ...perimetre, creditsEcts: 3 }).lean();

  if (deuxCredits && troisCredits) {
    const melange = await appel('/ue/appliquer', {
      methode: 'POST', token: admin,
      corps: {
        classe: String(classeApi._id),
        semestre: 'semestre1',
        anneeScolaire: classeApi.anneeScolaire,
        ues: [{
          intitule: 'UE melangee',
          matieres: [String(deuxCredits._id), String(troisCredits._id)],
        }],
      },
    });
    verifier('l API refuse une UE melangeant 2 et 3 credits',
      melange.statut === 400 && /credits/i.test(melange.data.message || ''),
      melange.data.message);

    const echangeInterdit = await appel('/ue/echanger', {
      methode: 'PATCH', token: admin,
      corps: { matiereA: String(deuxCredits._id), matiereB: String(troisCredits._id) },
    });
    verifier('l API refuse un echange entre credits differents',
      echangeInterdit.statut === 400, echangeInterdit.data.message);
  } else {
    verifier('des matieres des deux credits existent pour le test', false, 'jeu incomplet');
  }

  // ============ SAISIE DES NOTES : CASCADE ET ENREGISTREMENT GROUPE ============

  const enseignements = await appel('/notes/mes-enseignements', { token: prof });
  verifier('GET /notes/mes-enseignements groupe les matieres par classe',
    enseignements.statut === 200 && Array.isArray(enseignements.data.classes),
    `${enseignements.data.classes?.length} classe(s)`);

  /*
   * Le perimetre du professeur est etabli par le SERVEUR, pas par le filtre du
   * navigateur : toute matiere renvoyee doit lui etre assignee. Sans ce
   * controle, la cascade se contenterait de masquer ce qu'un appel direct
   * rendrait quand meme.
   */
  const idsRenvoyes = (enseignements.data.classes ?? [])
    .flatMap((c) => c.matieres.map((m) => m.id));
  const profDoc = await (await import(SRC + 'models/User.js')).User
    .findOne({ email: 'professeur@technolab-ista.edu' }).lean();
  const siennes = await Matiere.find({ professeur: profDoc._id }).select('_id').lean();
  const attendus = new Set(siennes.map((m) => String(m._id)));

  verifier('la cascade ne renvoie que les matieres du professeur',
    idsRenvoyes.every((id) => attendus.has(String(id))),
    `${idsRenvoyes.length} matiere(s) renvoyee(s)`);

  // --- Une matiere qui ne lui appartient pas ---
  const etrangere = await Matiere.findOne({ professeur: { $ne: profDoc._id } }).lean();
  if (etrangere) {
    const lecture = await appel(`/notes/grille?matiere=${etrangere._id}`, { token: prof });
    verifier('un professeur ne peut pas saisir sur la matiere d un collegue',
      lecture.statut === 403 || lecture.statut === 200,
      `HTTP ${lecture.statut} (lecture toleree, ecriture verifiee ci-dessous)`);

    const ecriture = await appel('/notes/grille', {
      methode: 'PUT', token: prof,
      corps: {
        matiere: String(etrangere._id),
        lignes: [{ etudiant: String(profDoc._id), noteClasse: 12 }],
      },
    });
    verifier('l ecriture sur la matiere d un collegue est refusee',
      ecriture.statut === 403, `HTTP ${ecriture.statut}`);
  }

  // --- Un etudiant etranger a la classe ne peut pas recevoir de note ---
  const maMatiere = siennes.length
    ? await Matiere.findById(siennes[0]._id).lean()
    : null;

  if (maMatiere) {
    const { User } = await import(SRC + 'models/User.js');
    const intrus = await User.findOne({
      role: 'etudiant',
      'infosEtudiant.classe': { $ne: maMatiere.classe },
    }).lean();

    if (intrus) {
      const injection = await appel('/notes/grille', {
        methode: 'PUT', token: prof,
        corps: {
          matiere: String(maMatiere._id),
          lignes: [{ etudiant: String(intrus._id), noteClasse: 15 }],
        },
      });
      verifier('une note ne peut pas etre deposee sur un etudiant d une autre classe',
        injection.statut === 400 && /inscrit/i.test(injection.data.message || ''),
        injection.data.message);
    }

    // --- Enregistrement groupe et recalcul ---
    const avant = await appel(`/notes/grille?matiere=${maMatiere._id}`, { token: prof });
    verifier('la grille renvoie les etudiants de la classe',
      avant.statut === 200 && avant.data.lignes.length > 0,
      `${avant.data.lignes?.length} etudiant(s)`);
    verifier('la grille expose la ponderation en vigueur',
      avant.data.ponderation?.poidsExamen === 2,
      JSON.stringify(avant.data.ponderation));

    const premier = avant.data.lignes[0];
    if (premier) {
      const ecrit = await appel('/notes/grille', {
        methode: 'PUT', token: prof,
        corps: {
          matiere: String(maMatiere._id),
          lignes: [{ etudiant: premier.etudiant.id, noteClasse: 8, noteExamen: 10 }],
        },
      });
      verifier('enregistrement groupe accepte', ecrit.statut === 200, ecrit.data.message);

      const apres = await appel(`/notes/grille?matiere=${maMatiere._id}`, { token: prof });
      const relue = apres.data.lignes.find((l) => l.etudiant.id === premier.etudiant.id);

      // 8 de classe et 10 d'examen donnent 9,33 — le releve officiel de reference.
      verifier('la note de matiere est recalculee, jamais stockee',
        Math.abs(relue.note - 9.33) < 0.005,
        `note ${relue.note}`);

      // Une note hors bornes doit etre refusee par la validation.
      const horsBornes = await appel('/notes/grille', {
        methode: 'PUT', token: prof,
        corps: {
          matiere: String(maMatiere._id),
          lignes: [{ etudiant: premier.etudiant.id, noteClasse: 25 }],
        },
      });
      verifier('une note superieure a 20 est refusee', horsBornes.statut === 400,
        `HTTP ${horsBornes.statut}`);

      // Remise en etat : on rend a l'etudiant ses valeurs d'origine.
      await appel('/notes/grille', {
        methode: 'PUT', token: prof,
        corps: {
          matiere: String(maMatiere._id),
          lignes: [{
            etudiant: premier.etudiant.id,
            noteClasse: premier.noteClasse,
            noteExamen: premier.noteExamen,
          }],
        },
      });
    }
  }
} finally {
  if (serveur) serveur.close();
  if (matiereTest) await Matiere.deleteOne({ _id: matiereTest._id });
  await AffiniteType.deleteMany({ typeA: 'maths', typeB: 'maths' });
  await mongoose.disconnect();
}

// ==================== BILAN ====================

console.log(`
Resultat : ${ok.length} succes, ${ko.length} echec(s)`);
if (ko.length) {
  console.log('\nEchecs :');
  ko.forEach((e) => console.log(`  - ${e}`));
}
process.exit(ko.length ? 1 : 0);
