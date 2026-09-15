/**
 * Immuabilite des notes enregistrees (Phase 9).
 *
 * Suite PURE : ni base, ni serveur HTTP. La regle testee ici est une regle de
 * probite — un enseignant ne peut pas revenir sur une note qu'il a deja posee —
 * et c'est exactement le genre de controle qu'on croit avoir ecrit alors qu'il
 * ne s'applique jamais. La passe de MUTATION en fin de fichier casse chaque
 * garde une par une et exige que le verdict change.
 */
const SRC = new URL('../src/', import.meta.url).href;
const {
  cellulesFigees, conflitsDeSaisie, peutCorriger, messageRefus, ROLES_CORRECTION,
} = await import(SRC + 'services/saisieNotes.service.js');
const { ROLES } = await import(SRC + 'config/roles.js');

const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(`${nom}${detail ? ' -> ' + detail : ''}`);
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} ${detail}`);
}

/** Construit la table des notes deja en base. */
const existantes = (entrees) => new Map(Object.entries(entrees));

const PROF = ROLES.PROFESSEUR;

// ==================== QUI PEUT CORRIGER ====================

verifier('Le professeur ne corrige pas', peutCorriger(PROF) === false);
verifier('Le surveillant ne corrige pas', peutCorriger(ROLES.SURVEILLANT) === false);
verifier('Le secretaire ne corrige pas', peutCorriger(ROLES.SECRETAIRE) === false);
verifier('Le directeur corrige', peutCorriger(ROLES.DIRECTEUR) === true);
verifier("L'administrateur corrige", peutCorriger(ROLES.ADMIN) === true);
verifier('Exactement deux roles correcteurs', ROLES_CORRECTION.length === 2,
  `${ROLES_CORRECTION.length}`);

// ==================== CASES FIGEES ====================

const posee = { noteClasse: 12, noteExamen: null };

verifier('Une note posee est figee pour le professeur',
  cellulesFigees(posee, PROF).noteClasse === true);
verifier('Une case vide reste ouverte pour le professeur',
  cellulesFigees(posee, PROF).noteExamen === false);
verifier('Rien n est fige pour la direction',
  cellulesFigees(posee, ROLES.DIRECTEUR).noteClasse === false);
verifier('Une ligne inexistante n est pas figee',
  cellulesFigees(undefined, PROF).noteClasse === false);

/*
 * Un zero est une note comme une autre. Le confondre avec « pas de note » est
 * l'erreur classique de ce genre de code : elle rouvrirait precisement la case
 * de l'etudiant le plus susceptible de vouloir la faire changer.
 */
verifier('Un zero est une note posee, donc figee',
  cellulesFigees({ noteClasse: 0, noteExamen: null }, PROF).noteClasse === true);

// ==================== CONFLITS DE SAISIE ====================

const deja = existantes({ e1: { noteClasse: 12, noteExamen: null } });

verifier('Modifier une note posee est refuse',
  conflitsDeSaisie([{ etudiant: 'e1', noteClasse: 18 }], deja, PROF).length === 1);
verifier('Completer une case vide est accepte',
  conflitsDeSaisie([{ etudiant: 'e1', noteExamen: 15 }], deja, PROF).length === 0);
verifier('Renvoyer la meme valeur est accepte',
  conflitsDeSaisie([{ etudiant: 'e1', noteClasse: 12 }], deja, PROF).length === 0);
verifier('La meme valeur en chaine est acceptee',
  conflitsDeSaisie([{ etudiant: 'e1', noteClasse: '12' }], deja, PROF).length === 0);
verifier('Effacer une note posee est refuse',
  conflitsDeSaisie([{ etudiant: 'e1', noteClasse: null }], deja, PROF).length === 1);
verifier('Un champ non transmis ne declenche rien',
  conflitsDeSaisie([{ etudiant: 'e1' }], deja, PROF).length === 0);
verifier('Un etudiant sans note existante passe',
  conflitsDeSaisie([{ etudiant: 'inconnu', noteClasse: 9 }], deja, PROF).length === 0);
verifier('La direction modifie sans conflit',
  conflitsDeSaisie([{ etudiant: 'e1', noteClasse: 18 }], deja, ROLES.DIRECTEUR).length === 0);

const zero = existantes({ e2: { noteClasse: 0, noteExamen: 5 } });
verifier('Effacer un zero est refuse',
  conflitsDeSaisie([{ etudiant: 'e2', noteClasse: null }], zero, PROF).length === 1);
verifier('Remplacer un zero est refuse',
  conflitsDeSaisie([{ etudiant: 'e2', noteClasse: 14 }], zero, PROF).length === 1);

const deuxLignes = existantes({
  e1: { noteClasse: 10, noteExamen: 11 },
  e2: { noteClasse: null, noteExamen: null },
});
const melange = conflitsDeSaisie([
  { etudiant: 'e1', noteClasse: 15, noteExamen: 16 },
  { etudiant: 'e2', noteClasse: 8, noteExamen: 9 },
], deuxLignes, PROF);
verifier('Les deux champs d une meme ligne sont comptes', melange.length === 2,
  `${melange.length} conflits`);
verifier('Le conflit nomme le champ fautif',
  melange.every((c) => ['noteClasse', 'noteExamen'].includes(c.champ)));
verifier('Le conflit porte l ancienne valeur',
  melange.some((c) => c.ancienne === 10) && melange.some((c) => c.ancienne === 11));

verifier('Le message de refus cite le nombre de notes',
  messageRefus(melange).includes('2'));
verifier('Le message oriente vers la direction',
  /direction/i.test(messageRefus(melange)));

// ==================== MUTATION ====================
//
// Chaque garde est cassee a son tour ; le verdict DOIT changer. Une assertion
// qui survit a la suppression de la regle qu'elle teste ne teste rien.

/** Version fautive : compare sans traiter `null` a part. */
const conflitsSansGardeNull = (lignes, table) => {
  const conflits = [];
  for (const ligne of lignes) {
    const existant = table.get(String(ligne.etudiant));
    if (!existant) continue;
    for (const champ of ['noteClasse', 'noteExamen']) {
      const ancienne = existant[champ];
      if (ancienne === null || ancienne === undefined) continue;
      const proposee = ligne[champ];
      if (proposee === undefined) continue;
      if (Number(proposee) !== Number(ancienne)) {
        conflits.push({ champ, ancienne, proposee });
      }
    }
  }
  return conflits;
};

verifier(
  'MUTATION — sans la garde `null`, effacer un zero passerait',
  conflitsSansGardeNull([{ etudiant: 'e2', noteClasse: null }], zero).length === 0
  && conflitsDeSaisie([{ etudiant: 'e2', noteClasse: null }], zero, PROF).length === 1
);

/** Version fautive : ne distingue pas les roles. */
const conflitsSansRole = (lignes, table) => conflitsDeSaisie(lignes, table, PROF);

verifier(
  'MUTATION — sans le controle de role, la direction serait bloquee',
  conflitsSansRole([{ etudiant: 'e1', noteClasse: 18 }], deja).length === 1
  && conflitsDeSaisie([{ etudiant: 'e1', noteClasse: 18 }], deja, ROLES.DIRECTEUR).length === 0
);

/** Version fautive : traite `undefined` comme un effacement. */
const figeesSansDistinction = (existant) => ({
  noteClasse: Boolean(existant?.noteClasse),
  noteExamen: Boolean(existant?.noteExamen),
});

verifier(
  'MUTATION — un test de verite simple laisserait le zero modifiable',
  figeesSansDistinction({ noteClasse: 0 }).noteClasse === false
  && cellulesFigees({ noteClasse: 0 }, PROF).noteClasse === true
);

// ==================== BILAN ====================

console.log(`
Resultat : ${ok.length} succes, ${ko.length} echec(s)`);
if (ko.length) {
  console.log('\nEchecs :');
  ko.forEach((e) => console.log(`  - ${e}`));
}
process.exit(ko.length ? 1 : 0);
