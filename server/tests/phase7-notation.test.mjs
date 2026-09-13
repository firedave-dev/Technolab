/**
 * Calcul des notes, des moyennes d'UE et des credits ECTS (Phase 7, couche B.1).
 *
 * Suite PUREMENT ARITHMETIQUE : ni base, ni serveur HTTP. Ces fonctions decident
 * de la validation d'un semestre, et les cas qui les mettent en defaut — une UE
 * vide, une matiere sans credit, une moyenne a exactement 10,00 — sont penibles
 * a fabriquer en base et triviaux a ecrire ici.
 *
 * DEUX NIVEAUX DE CONTROLE :
 *
 * 1. les assertions ordinaires, qui verifient les resultats attendus ;
 *
 * 2. une passe de MUTATION, en fin de fichier, qui casse volontairement chaque
 *    regle et exige que le resultat change. Un test peut passer sans rien
 *    verifier — la suite « charte » de ce projet en contenait un, vert alors
 *    que son extraction de flux PDF ne rendait que du bruit binaire. Sur un
 *    module qui produit des moyennes officielles, un test faussement vert est
 *    pire que pas de test du tout.
 */
const SRC = new URL('../src/', import.meta.url).href;
const {
  noteMatiere, moyenneUE, bilanUE, bilanSemestre, mention,
  SEUIL_VALIDATION, PONDERATION_PAR_DEFAUT,
} = await import(SRC + 'services/notation.service.js');

const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(`${nom}${detail ? ' -> ' + detail : ''}`);
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} ${detail}`);
}

/** Compare deux nombres a la deuxieme decimale pres. */
const proche = (a, b) => a !== null && b !== null && Math.abs(a - b) < 0.005;

// ==================== NOTE DE MATIERE ====================

/*
 * Les quatre couples ci-dessous sont releves sur le bulletin officiel fourni par
 * l'etablissement. Ils servent de reference : la formule doit les reproduire au
 * centieme, sans quoi les bulletins edites differeraient des bulletins papier.
 */
const RELEVES_OFFICIELS = [
  { classe: 8, examen: 10, attendu: 9.33 },
  { classe: 14, examen: 16, attendu: 15.33 },
  { classe: 13, examen: 17, attendu: 15.67 },
  { classe: 11, examen: 15, attendu: 13.67 },
];

for (const { classe, examen, attendu } of RELEVES_OFFICIELS) {
  const obtenu = noteMatiere(classe, examen);
  verifier(`note de matiere ${classe}/${examen} = ${attendu}`, proche(obtenu, attendu), `obtenu ${obtenu}`);
}

verifier('ponderation par defaut : classe 1, examen 2',
  PONDERATION_PAR_DEFAUT.poidsClasse === 1 && PONDERATION_PAR_DEFAUT.poidsExamen === 2);

// La ponderation doit etre reglable sans toucher au code.
verifier('ponderation personnalisee prise en compte',
  proche(noteMatiere(10, 20, { poidsClasse: 1, poidsExamen: 1 }), 15),
  `50/50 sur 10 et 20 -> ${noteMatiere(10, 20, { poidsClasse: 1, poidsExamen: 1 })}`);

verifier('ponderation inversee donne un autre resultat',
  !proche(noteMatiere(8, 10, { poidsClasse: 2, poidsExamen: 1 }), noteMatiere(8, 10)),
  `${noteMatiere(8, 10, { poidsClasse: 2, poidsExamen: 1 })} vs ${noteMatiere(8, 10)}`);

// --- Composantes manquantes ---
verifier('examen manquant : la note de classe subsiste telle quelle',
  proche(noteMatiere(12, null), 12), `${noteMatiere(12, null)}`);
verifier('classe manquante : la note d examen subsiste telle quelle',
  proche(noteMatiere(null, 12), 12), `${noteMatiere(null, 12)}`);
verifier('aucune note saisie : resultat nul, jamais zero',
  noteMatiere(null, null) === null, String(noteMatiere(null, null)));

/*
 * Piege classique : traiter une composante absente comme un zero. Un etudiant a
 * 14 de classe sans examen passe alors a 4,67 au lieu de 14.
 */
verifier('une composante absente n est pas comptee pour zero',
  proche(noteMatiere(14, null), 14) && !proche(noteMatiere(14, null), 4.67),
  `${noteMatiere(14, null)}`);

// --- Bornes ---
verifier('zero est une note, pas une absence',
  proche(noteMatiere(0, 0), 0), String(noteMatiere(0, 0)));
verifier('note maximale', proche(noteMatiere(20, 20), 20));

// ==================== MOYENNE D UE ====================

/*
 * La ponderation se fait par les CREDITS. Avec 18 (2 credits) et 12 (4 credits),
 * une moyenne simple donnerait 15 ; la moyenne ponderee donne 14.
 */
const moy = moyenneUE([{ note: 18, credits: 2 }, { note: 12, credits: 4 }]);
verifier('moyenne d UE ponderee par les credits, non arithmetique',
  proche(moy, 14) && !proche(moy, 15), `obtenu ${moy} (simple : 15)`);

verifier('UE vide : moyenne nulle', moyenneUE([]) === null, String(moyenneUE([])));
verifier('UE sans aucune note saisie : moyenne nulle',
  moyenneUE([{ note: null, credits: 4 }]) === null);

/*
 * Une matiere a 0 credit ne pese rien. Si elle etait comptee a poids 1, la
 * moyenne ci-dessous tomberait a 11 au lieu de rester a 16.
 */
const avecZeroCredit = moyenneUE([{ note: 16, credits: 6 }, { note: 6, credits: 0 }]);
verifier('matiere sans credit ecartee de la moyenne',
  proche(avecZeroCredit, 16), `obtenu ${avecZeroCredit} (comptee a poids 1 : 11)`);

verifier('matiere non notee ecartee sans annuler l UE',
  proche(moyenneUE([{ note: 15, credits: 3 }, { note: null, credits: 3 }]), 15));

// ==================== VALIDATION ET COMPENSATION ====================

verifier(`seuil de validation fixe a ${SEUIL_VALIDATION}`, SEUIL_VALIDATION === 10);

// Le cas limite explicitement demande : 10,00 pile valide.
const pile = bilanUE([{ note: 10, credits: 6 }]);
verifier('une moyenne de 10,00 pile valide l UE', pile.validee && pile.creditsAcquis === 6,
  `moyenne ${pile.moyenne}, credits ${pile.creditsAcquis}`);

const justeEnDessous = bilanUE([{ note: 9.99, credits: 6 }]);
verifier('9,99 ne valide pas', !justeEnDessous.validee && justeEnDessous.creditsAcquis === 0,
  `credits ${justeEnDessous.creditsAcquis}`);

/*
 * COMPENSATION — une matiere sous 10 n'empeche pas la validation si la moyenne
 * de l'UE atteint le seuil, et TOUS les credits sont alors acquis, y compris
 * ceux de la matiere ratee.
 */
const compensee = bilanUE([
  { note: 14, credits: 4 }, // reussie
  { note: 8, credits: 2 },  // ratee, mais compensee
]);
verifier('compensation : une matiere sous 10 n empeche pas la validation',
  compensee.validee, `moyenne ${compensee.moyenne}`);
verifier('compensation : la totalite des credits est acquise, matiere ratee comprise',
  compensee.creditsAcquis === 6, `${compensee.creditsAcquis}/6`);

/*
 * A l'inverse, une UE non validee n'accorde AUCUN credit — pas meme ceux des
 * matieres reussies. L'UE est l'unite indivisible d'acquisition.
 */
const echouee = bilanUE([
  { note: 15, credits: 2 }, // reussie
  { note: 4, credits: 6 },  // ratee, et trop lourde pour etre compensee
]);
verifier('UE non validee : aucun credit, pas meme pour la matiere reussie',
  !echouee.validee && echouee.creditsAcquis === 0,
  `moyenne ${echouee.moyenne}, credits ${echouee.creditsAcquis}`);

const vide = bilanUE([]);
verifier('UE vide : ni validee, ni creditee',
  !vide.validee && vide.creditsAcquis === 0 && vide.moyenne === null);

// ==================== BILAN DE SEMESTRE ====================

const semestre = bilanSemestre([
  bilanUE([{ note: 14, credits: 10 }]),
  bilanUE([{ note: 12, credits: 10 }]),
  bilanUE([{ note: 16, credits: 10 }]),
]);
verifier('semestre : 30 credits acquis sur 30',
  semestre.creditsAcquis === 30 && semestre.creditsTotal === 30,
  `${semestre.creditsAcquis}/${semestre.creditsTotal}`);
verifier('semestre : moyenne generale ponderee par les credits',
  proche(semestre.moyenne, 14), `obtenu ${semestre.moyenne}`);

const partiel = bilanSemestre([
  bilanUE([{ note: 14, credits: 20 }]),
  bilanUE([{ note: 6, credits: 10 }]), // UE non validee
]);
verifier('semestre partiel : seuls les credits des UE validees sont acquis',
  partiel.creditsAcquis === 20 && partiel.creditsTotal === 30,
  `${partiel.creditsAcquis}/${partiel.creditsTotal}`);

verifier('semestre vide : moyenne nulle et aucun credit',
  bilanSemestre([]).moyenne === null && bilanSemestre([]).creditsAcquis === 0);

// ==================== MENTIONS ====================

for (const [valeur, attendue] of [
  [17, 'Tres bien'], [16, 'Tres bien'],
  [15, 'Bien'], [14, 'Bien'],
  [13, 'Assez bien'], [12, 'Assez bien'],
  [11, 'Passable'], [10, 'Passable'],
  [9.99, 'Insuffisant'], [0, 'Insuffisant'],
]) {
  verifier(`mention ${valeur} = ${attendue}`, mention(valeur) === attendue, mention(valeur));
}
verifier('mention d une moyenne absente', mention(null) === null);

// ==================== PASSE DE MUTATION ====================

/*
 * Chaque regle est cassee volontairement : le resultat DOIT changer. Une egalite
 * qui survit a la mutation signale une assertion qui ne verifiait rien.
 *
 * Les mutations sont exprimees comme des calculs concurrents plutot que par
 * reecriture du module : on compare ce que produirait une implementation fautive
 * a ce que produit l'implementation reelle.
 */
const mutations = [
  {
    nom: 'ponderation inversee (examen a poids 1, classe a 2)',
    faux: () => noteMatiere(8, 10, { poidsClasse: 2, poidsExamen: 1 }),
    vrai: () => noteMatiere(8, 10),
  },
  {
    nom: 'moyenne d UE arithmetique au lieu de ponderee',
    faux: () => (18 + 12) / 2,
    vrai: () => moyenneUE([{ note: 18, credits: 2 }, { note: 12, credits: 4 }]),
  },
  {
    nom: 'composante manquante comptee pour zero',
    faux: () => (14 * 1 + 0 * 2) / 3,
    vrai: () => noteMatiere(14, null),
  },
  {
    nom: 'matiere a 0 credit comptee a poids 1',
    faux: () => (16 + 6) / 2,
    vrai: () => moyenneUE([{ note: 16, credits: 6 }, { note: 6, credits: 0 }]),
  },
  {
    nom: 'seuil exclusif (10,00 ne validerait pas)',
    faux: () => 0,
    vrai: () => bilanUE([{ note: 10, credits: 6 }]).creditsAcquis,
  },
  {
    // Sans compensation, seuls les 4 credits de la matiere reussie seraient
    // accordes ; avec, les 6 credits de l'UE le sont.
    nom: 'credits accordes matiere par matiere, sans compensation',
    faux: () => 4,
    vrai: () => bilanUE([{ note: 14, credits: 4 }, { note: 8, credits: 2 }]).creditsAcquis,
  },
];

for (const { nom, faux, vrai } of mutations) {
  const a = faux();
  const b = vrai();
  verifier(`mutation detectee : ${nom}`, !proche(a, b), `fautif ${a} vs reel ${b}`);
}

// ============ LE PARAMETRE EN BASE PILOTE-T-IL LE CALCUL ? ============

/*
 * Le reglement exige une ponderation REGLABLE, pas une constante. Il ne suffit
 * donc pas que le calcul accepte des poids en argument : il faut prouver que le
 * parametre enregistre en base arrive bien jusqu'a lui.
 *
 * Cette section touche la base, contrairement au reste du fichier. Elle restaure
 * la valeur d'origine dans tous les cas, y compris en cas d'echec.
 */
const mongoose = (await import('mongoose')).default;
const { connectDB } = await import(SRC + 'config/db.js');
const { ParametrePedagogique, parametresEnVigueur, ponderationEnVigueur } =
  await import(SRC + 'models/ParametrePedagogique.js');

await connectDB();
let ponderationInitiale = null;

try {
  const parametres = await parametresEnVigueur();
  ponderationInitiale = { poidsClasse: parametres.poidsClasse, poidsExamen: parametres.poidsExamen };

  verifier('parametre pedagogique cree a la volee si absent',
    parametres && parametres.cle === 'pedagogie');
  verifier('seuil et credits par semestre conformes au LMD',
    parametres.seuilValidation === 10 && parametres.creditsParSemestre === 30,
    `seuil ${parametres.seuilValidation}, ${parametres.creditsParSemestre} credits`);

  const avant = await ponderationEnVigueur();
  verifier('ponderation lue depuis la base',
    avant.poidsClasse === 1 && avant.poidsExamen === 2,
    `classe ${avant.poidsClasse}, examen ${avant.poidsExamen}`);

  // On bascule sur une ponderation 50/50 et on verifie que le calcul suit.
  await ParametrePedagogique.updateOne({ cle: 'pedagogie' }, { $set: { poidsClasse: 1, poidsExamen: 1 } });
  const apres = await ponderationEnVigueur();

  const avecDefaut = noteMatiere(8, 10, avant);   // 9,33
  const avecNouvelle = noteMatiere(8, 10, apres); // 9,00

  verifier('un changement de parametre modifie la note de matiere',
    proche(avecDefaut, 9.33) && proche(avecNouvelle, 9) && !proche(avecDefaut, avecNouvelle),
    `${avecDefaut} -> ${avecNouvelle}`);

  // Deux poids nuls rendraient tout calcul impossible : le modele doit refuser.
  let refuse = false;
  try {
    await ParametrePedagogique.updateOne(
      { cle: 'pedagogie' },
      { $set: { poidsClasse: 0, poidsExamen: 0 } },
      { runValidators: true }
    );
    const controle = await ponderationEnVigueur();
    refuse = controle.poidsClasse > 0 || controle.poidsExamen > 0;
  } catch {
    refuse = true;
  }
  verifier('une ponderation entierement nulle est refusee', refuse);
} finally {
  if (ponderationInitiale) {
    await ParametrePedagogique.updateOne({ cle: 'pedagogie' }, { $set: ponderationInitiale });
  }
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
