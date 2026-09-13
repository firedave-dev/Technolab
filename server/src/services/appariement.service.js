/**
 * Credits ECTS, bouclage du semestre a 30, et appariement des matieres en UE.
 *
 * MODULE PUR : aucune lecture de base, d'environnement ni d'horloge. Les regles
 * ci-dessous decident de la composition des bulletins ; elles doivent pouvoir
 * etre eprouvees cas par cas, y compris sur les repartitions qu'on ne sait pas
 * fabriquer commodement en base.
 *
 * La matrice d'affinite entre types n'est donc PAS definie ici : elle est passee
 * en argument. Son stockage — et son administration — relevent de
 * models/AffiniteType.js.
 */

/* ------------------------------------------------------------------ */
/* 1. Credits deduits du coefficient                                    */
/* ------------------------------------------------------------------ */

/** Credits possibles. Deux valeurs seulement, ce qui fonde toute l'arithmetique. */
export const CREDITS_POSSIBLES = [2, 3];

/**
 * Credit ECTS d'une matiere, deduit de son coefficient.
 *
 * Jamais saisi a la main : le credit est une CONSEQUENCE du poids pedagogique,
 * et deux sources de verite finiraient par diverger.
 */
export function creditsDepuisCoefficient(coefficient) {
  return Number(coefficient) >= 3 ? 3 : 2;
}

/* ------------------------------------------------------------------ */
/* 2. Bouclage du semestre a 30 credits                                 */
/* ------------------------------------------------------------------ */

export const CREDITS_PAR_SEMESTRE = 30;

/**
 * Repartitions de matieres qui bouclent exactement a 30 credits.
 *
 * Les UE etant des PAIRES, une UE vaut 4 credits (2+2) ou 6 (3+3). Boucler a 30
 * impose donc `4a + 6b = 30`, soit `2a + 3b = 15` : le nombre d'UE de 6 est
 * necessairement impair. En nombre de MATIERES, cela se traduit par
 * `2·n2 + 3·n3 = 30` avec n2 et n3 PAIRS — une matiere seule de son credit
 * resterait orpheline.
 *
 * Trois repartitions seulement satisfont ces trois conditions. Elles sont
 * calculees plutot qu'ecrites a la main : la liste reste juste si le total du
 * semestre ou les credits possibles changent un jour.
 */
export const CONFIGURATIONS = (() => {
  const trouvees = [];
  const [petit, grand] = CREDITS_POSSIBLES;

  for (let n3 = 0; n3 * grand <= CREDITS_PAR_SEMESTRE; n3 += 2) {
    const reste = CREDITS_PAR_SEMESTRE - n3 * grand;
    if (reste % petit !== 0) continue;
    const n2 = reste / petit;
    if (n2 % 2 === 0) trouvees.push({ n2, n3, matieres: n2 + n3, ue4: n2 / 2, ue6: n3 / 2 });
  }

  return trouvees.sort((a, b) => a.matieres - b.matieres);
})();

/**
 * Etat d'avancement d'un semestre en cours de saisie.
 *
 * Le point important est l'ANTICIPATION : on ne se contente pas de refuser le
 * depassement de 30, on signale des qu'aucune configuration ne reste
 * atteignable. Une repartition peut etre bloquee bien avant le plafond — (1
 * matiere a 2 credits ; 7 a 3) n'en pose que 23, et pourtant plus rien ne peut
 * la sauver, puisque toute configuration comportant un nombre impair de
 * matieres a 2 credits est exclue.
 *
 * Une configuration reste atteignable tant qu'elle DOMINE l'etat courant :
 * n2 <= a2 et n3 <= a3. On ne fait qu'ajouter des matieres, jamais en retirer.
 *
 * @param {number} n2 matieres a 2 credits deja creees
 * @param {number} n3 matieres a 3 credits deja creees
 */
export function etatSemestre(n2 = 0, n3 = 0) {
  const credits = n2 * 2 + n3 * 3;

  const atteignables = CONFIGURATIONS
    .filter((c) => n2 <= c.n2 && n3 <= c.n3)
    .map((c) => ({ ...c, ajoutN2: c.n2 - n2, ajoutN3: c.n3 - n3 }));

  const complet = atteignables.some((c) => c.ajoutN2 === 0 && c.ajoutN3 === 0);

  return {
    credits,
    creditsRestants: CREDITS_PAR_SEMESTRE - credits,
    n2,
    n3,
    // Une matiere isolee dans son credit ne trouvera pas de binome.
    orphelineDeux: n2 % 2 === 1,
    orphelineTrois: n3 % 2 === 1,
    configurations: atteignables,
    impasse: atteignables.length === 0,
    complet,
    corrections: complet ? [] : suggerer(n2, n3, atteignables),
  };
}

/**
 * Corrections proposees a la saisie.
 *
 * En impasse, la seule issue est de RETIRER : on cherche la configuration la
 * moins couteuse a rejoindre, et on dit combien de matieres supprimer. Hors
 * impasse, on enumere ce qu'il reste a ajouter.
 */
function suggerer(n2, n3, atteignables) {
  if (atteignables.length) {
    return atteignables.map(({ ajoutN2, ajoutN3, matieres }) => ({
      type: 'ajout',
      n2: ajoutN2,
      n3: ajoutN3,
      texte: `ajouter ${ajoutN2} matiere(s) a 2 credits et ${ajoutN3} a 3 credits `
        + `(total ${matieres} matieres)`,
    }));
  }

  return CONFIGURATIONS
    .map((c) => {
      const retirerN2 = Math.max(0, n2 - c.n2);
      const retirerN3 = Math.max(0, n3 - c.n3);
      return {
        type: 'retrait',
        n2: retirerN2,
        n3: retirerN3,
        cout: retirerN2 + retirerN3,
        texte: `retirer ${retirerN2} matiere(s) a 2 credits et ${retirerN3} a 3 credits, `
          + `puis viser ${c.n2} / ${c.n3}`,
      };
    })
    .sort((a, b) => a.cout - b.cout);
}

/**
 * Une matiere supplementaire de ce credit est-elle acceptable ?
 * Refuse aussi bien le depassement que l'entree en impasse.
 */
export function peutAjouter(n2, n3, credits) {
  const suivant = credits === 3 ? etatSemestre(n2, n3 + 1) : etatSemestre(n2 + 1, n3);

  if (suivant.credits > CREDITS_PAR_SEMESTRE) {
    return { autorise: false, motif: `le total depasserait ${CREDITS_PAR_SEMESTRE} credits` };
  }
  if (suivant.impasse) {
    return {
      autorise: false,
      motif: 'cette repartition ne permettrait plus d atteindre 30 credits',
      corrections: suivant.corrections,
    };
  }
  return { autorise: true };
}

/* ------------------------------------------------------------------ */
/* 3. Appariement en UE                                                 */
/* ------------------------------------------------------------------ */

/** Poids des arêtes, du plus fort au plus faible. */
export const POIDS = {
  memeType: 100,
  affiniteForte: 50,
  affiniteMoyenne: 25,
  repli: 0,
};

/**
 * Type disciplinaire d'une matiere.
 *
 * Deux noms de champ coexistent, et c'est assume : le modele Mongoose stocke
 * `typeMatiere`, parce qu'un champ nomme `type` y serait ambigu — Mongoose lit
 * `{ type: String }` comme une DECLARATION de type, pas comme un sous-document.
 * Les objets de test, eux, portent simplement `type`.
 *
 * Lire les deux ici evite d'imposer une conversion a chaque appelant. Cette
 * conversion avait ete oubliee une fois : toutes les matieres reelles etaient
 * alors appariees par repli, y compris celles unies par une affinite forte, sans
 * qu'aucune erreur ne se produise.
 */
const typeDe = (matiere) => matiere?.type ?? matiere?.typeMatiere ?? null;

/**
 * Score d'appariement entre deux matieres.
 * @param {{type?: string, typeMatiere?: string}} a
 * @param {{type?: string, typeMatiere?: string}} b
 * @param {Map<string, number>} affinites cle « typeA|typeB » -> score
 */
export function scoreAppariement(a, b, affinites = new Map()) {
  const typeA = typeDe(a);
  const typeB = typeDe(b);

  if (typeA && typeB && typeA === typeB) return POIDS.memeType;
  if (!typeA || !typeB) return POIDS.repli;

  // La matrice est symetrique : on interroge la cle ordonnee.
  return affinites.get([typeA, typeB].sort().join('|')) ?? POIDS.repli;
}

/**
 * Couplage parfait de poids maximal, par programmation dynamique sur masque.
 *
 * POURQUOI PAS UN GLOUTON — apparier au fil de l'eau en prenant a chaque fois la
 * meilleure paire disponible laisse des restes incoherents : deux matieres qui
 * s'appariaient bien sont consommees tot, et les orphelines finissent ensemble
 * par defaut. On cherche donc l'optimum GLOBAL.
 *
 * La taille du probleme le permet largement : au plus 12 matieres par groupe de
 * credit, soit 4096 etats. Le blossom d'Edmonds serait ici de la sur-ingenierie.
 *
 * DETERMINISME — deux executions sur les memes donnees doivent produire le meme
 * appariement, faute de quoi les bulletins changeraient d'une generation a
 * l'autre. Deux precautions : les matieres sont triees avant traitement, et les
 * egalites de score sont tranchees par le plus petit indice (comparaison
 * strictement superieure, qui conserve la premiere solution trouvee).
 *
 * @returns {Array<[object, object]>} paires, ou null si le couplage est impossible
 */
export function couplageOptimal(matieres, affinites = new Map()) {
  if (matieres.length % 2 !== 0) return null;
  if (!matieres.length) return [];

  const liste = [...matieres].sort(comparerMatieres);
  const n = liste.length;

  // scores[i][j] : poids de l'arete entre i et j.
  const scores = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      scores[i][j] = scoreAppariement(liste[i], liste[j], affinites);
      scores[j][i] = scores[i][j];
    }
  }

  const COMPLET = (1 << n) - 1;
  const meilleur = new Array(1 << n).fill(-1);
  /*
   * Paire retenue pour atteindre chaque masque, encodee `i * n + j`.
   *
   * Les DEUX indices sont memorises, et non le seul `j` : `i` est le plus petit
   * indice libre du masque PRECEDENT, qu'on ne sait pas retrouver depuis le
   * masque d'arrivee — tous ses bits y sont deja poses.
   */
  const choix = new Array(1 << n).fill(-1);
  meilleur[0] = 0;

  for (let masque = 0; masque <= COMPLET; masque += 1) {
    if (meilleur[masque] < 0) continue;

    // On traite toujours la plus petite matiere non appariee : chaque couplage
    // n'est ainsi enumere qu'une fois.
    let i = 0;
    while (i < n && (masque & (1 << i))) i += 1;
    if (i === n) continue;

    for (let j = i + 1; j < n; j += 1) {
      if (masque & (1 << j)) continue;

      const suivant = masque | (1 << i) | (1 << j);
      const total = meilleur[masque] + scores[i][j];

      // « > » et non « >= » : a score egal, la premiere paire trouvee gagne.
      if (total > meilleur[suivant]) {
        meilleur[suivant] = total;
        choix[suivant] = i * n + j;
      }
    }
  }

  if (meilleur[COMPLET] < 0) return null;

  // Reconstruction a rebours, en defaisant chaque paire memorisee.
  const paires = [];
  let masque = COMPLET;
  while (masque) {
    const code = choix[masque];
    if (code < 0) return null;

    const i = Math.floor(code / n);
    const j = code % n;
    paires.push([liste[i], liste[j]]);
    masque &= ~((1 << i) | (1 << j));
  }

  return paires.reverse();
}

/**
 * Apparie toutes les matieres d'un semestre en UE.
 *
 * Les deux groupes de credit sont traites SEPAREMENT et ne communiquent jamais :
 * c'est la regle absolue, une matiere a 2 credits ne peut pas rejoindre une
 * matiere a 3. La separation en amont rend la violation structurellement
 * impossible, plutot que de compter sur une verification.
 */
export function apparierSemestre(matieres, affinites = new Map()) {
  const groupes = { 2: [], 3: [] };
  const horsRegle = [];

  for (const matiere of matieres) {
    if (groupes[matiere.creditsEcts]) groupes[matiere.creditsEcts].push(matiere);
    else horsRegle.push(matiere);
  }

  const resultat = { ues: [], erreurs: [], horsRegle };

  for (const credits of CREDITS_POSSIBLES) {
    const groupe = groupes[credits];
    const paires = couplageOptimal(groupe, affinites);

    if (paires === null) {
      resultat.erreurs.push({
        credits,
        motif: `${groupe.length} matiere(s) a ${credits} credits : un nombre impair `
          + 'ne peut pas etre appariee',
        orpheline: groupe.length % 2 === 1,
      });
      continue;
    }

    for (const [a, b] of paires) {
      const score = scoreAppariement(a, b, affinites);
      resultat.ues.push({
        credits: credits * 2,
        matieres: [a, b].sort(comparerMatieres),
        score,
        // Une UE nee d'un repli merite une relecture humaine.
        parDefaut: score === POIDS.repli,
      });
    }
  }

  resultat.ues = ordonnerUEs(resultat.ues);
  return resultat;
}

/* ------------------------------------------------------------------ */
/* 4. Ordonnancement et nommage                                         */
/* ------------------------------------------------------------------ */

/**
 * Comparateur de matieres, insensible a la casse et aux accents.
 *
 * `localeCompare` avec sensibilite « base » place « Économie » a sa vraie place
 * alphabetique, la ou une comparaison brute de chaines la rejetterait apres
 * « Zoologie » — le E accentue valant 0xC9 en Unicode. L'identifiant tranche les
 * homonymes, pour que le tri reste total et donc reproductible.
 */
const collateur = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

export function comparerMatieres(a, b) {
  const parNom = collateur.compare(a.nom || '', b.nom || '');
  if (parNom !== 0) return parNom;
  return String(a._id ?? a.id ?? '').localeCompare(String(b._id ?? b.id ?? ''));
}

/**
 * Ordre d'apparition des UE sur le bulletin :
 *   1. par credit croissant — les UE de 4 avant celles de 6 ;
 *   2. a credit egal, par ordre alphabetique de leur premiere matiere.
 * Les matieres d'une UE sont elles-memes triees alphabetiquement.
 */
export function ordonnerUEs(ues) {
  return [...ues]
    .map((ue) => ({ ...ue, matieres: [...ue.matieres].sort(comparerMatieres) }))
    .sort((a, b) => {
      if (a.credits !== b.credits) return a.credits - b.credits;
      return comparerMatieres(a.matieres[0] ?? {}, b.matieres[0] ?? {});
    });
}

/**
 * Code et intitule proposes pour une UE.
 *
 * Deriver l'intitule du TYPE dominant plutot que des noms de matieres : deux
 * matieres de programmation donnent « Programmation », ce qui reste juste meme
 * si l'une est renommee. Quand les deux types different, les deux sont cites.
 *
 * Le code suit le rang d'affichage, ce qui donne une numerotation continue et
 * previsible sur le bulletin.
 */
export function nommerUE(ue, rang, libellesParType = new Map()) {
  const types = [...new Set(ue.matieres.map(typeDe).filter(Boolean))];
  const libelle = (t) => libellesParType.get(t) || t;

  const intitule = types.length === 0
    ? ue.matieres.map((m) => m.nom).join(' et ')
    : types.map(libelle).join(' et ');

  return {
    code: `UE${String(rang).padStart(2, '0')}`,
    intitule: intitule.charAt(0).toUpperCase() + intitule.slice(1),
  };
}
