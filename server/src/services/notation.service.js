/**
 * Calcul des notes, des moyennes d'UE et des credits ECTS.
 *
 * CE MODULE EST PUR : aucune fonction n'y lit la base, l'environnement ou
 * l'horloge. C'est deliberé. Ces calculs decident de la validation d'un
 * semestre ; ils doivent pouvoir etre eprouves cas par cas, y compris sur les
 * situations limites qu'on ne sait pas fabriquer commodement en base — une UE
 * sans matiere, une matiere sans credit, une moyenne a exactement 10,00.
 *
 * La ponderation n'est donc pas lue ici : elle est PASSEE en argument. Le
 * chargement depuis le parametre systeme se fait dans
 * models/ParametrePedagogique.js, qui n'a lui aucune arithmetique.
 *
 * Vocabulaire du reglement, respecte tel quel :
 * - « note de classe »   : synthese du travail de l'annee, faite par le professeur ;
 * - « note d'examen »    : epreuve terminale ;
 * - « note de matiere »  : composition des deux, ponderee ;
 * - « moyenne d'UE »     : moyenne des notes de matiere, ponderee par les CREDITS ;
 * - « compensation »     : une UE validee valide toutes ses matieres.
 */

/** Note plancher de validation, au sens du LMD. */
export const SEUIL_VALIDATION = 10;

/** Ponderation par defaut, appliquee tant qu'aucun parametre n'est enregistre. */
export const PONDERATION_PAR_DEFAUT = { poidsClasse: 1, poidsExamen: 2 };

/** Arrondi a deux decimales, en conservant `null` pour « pas de note ». */
const arrondir = (valeur) =>
  valeur === null || valeur === undefined ? null : Math.round(valeur * 100) / 100;

/**
 * Compose la note d'une matiere a partir de ses deux composantes.
 *
 *     note = (poidsClasse x noteClasse + poidsExamen x noteExamen) / (somme des poids)
 *
 * Une composante MANQUANTE n'est pas comptee pour zero : elle est retiree du
 * calcul, poids compris. Un etudiant qui n'a pas encore passe l'examen garde
 * ainsi sa note de classe telle quelle, au lieu de voir sa moyenne s'effondrer
 * a cause d'une epreuve qui n'a pas eu lieu.
 *
 * @param {number|null} noteClasse
 * @param {number|null} noteExamen
 * @param {{poidsClasse: number, poidsExamen: number}} [ponderation]
 * @returns {number|null} note sur 20, ou null si aucune composante n'est saisie
 */
export function noteMatiere(noteClasse, noteExamen, ponderation = PONDERATION_PAR_DEFAUT) {
  const { poidsClasse, poidsExamen } = ponderation;

  const composantes = [
    { note: noteClasse, poids: poidsClasse },
    { note: noteExamen, poids: poidsExamen },
  ].filter(({ note, poids }) => note !== null && note !== undefined && poids > 0);

  if (!composantes.length) return null;

  const total = composantes.reduce((s, { note, poids }) => s + note * poids, 0);
  const sommePoids = composantes.reduce((s, { poids }) => s + poids, 0);

  return arrondir(total / sommePoids);
}

/**
 * Moyenne d'une UE : moyenne des notes de matiere ponderee par les CREDITS.
 *
 * Ce sont bien les credits qui ponderent, et non un coefficient separe : dans le
 * LMD, le credit EST le poids de la matiere. Une matiere declaree a 0 credit ne
 * pese donc rien — elle est ignoree plutot que comptee a poids 1, sans quoi une
 * matiere optionnelle non creditee ferait bouger une moyenne officielle.
 *
 * @param {Array<{note: number|null, credits: number}>} matieres
 * @returns {number|null} moyenne sur 20, ou null si rien n'est notable
 */
export function moyenneUE(matieres = []) {
  const retenues = matieres.filter(
    ({ note, credits }) => note !== null && note !== undefined && credits > 0
  );

  if (!retenues.length) return null;

  const total = retenues.reduce((s, { note, credits }) => s + note * credits, 0);
  const sommeCredits = retenues.reduce((s, { credits }) => s + credits, 0);

  return arrondir(total / sommeCredits);
}

/**
 * Bilan d'une UE : moyenne, validation et credits acquis.
 *
 * COMPENSATION — le point qui distingue le LMD d'une notation matiere par
 * matiere : si la moyenne de l'UE atteint le seuil, l'UE est validee ET LA
 * TOTALITE de ses credits est acquise, y compris ceux des matieres restees sous
 * 10. Une bonne note compense une mauvaise a l'interieur de l'UE.
 *
 * A l'inverse, une UE non validee n'accorde AUCUN credit, meme pour les
 * matieres reussies : l'UE est l'unite indivisible d'acquisition.
 *
 * Le seuil est atteint « a partir de » 10, bornes comprises : une moyenne de
 * 10,00 pile valide.
 *
 * @param {Array<{note: number|null, credits: number}>} matieres
 */
export function bilanUE(matieres = []) {
  const moyenne = moyenneUE(matieres);
  const creditsTotal = matieres.reduce((s, { credits }) => s + (credits || 0), 0);
  const validee = moyenne !== null && moyenne >= SEUIL_VALIDATION;

  return {
    moyenne,
    creditsTotal,
    validee,
    creditsAcquis: validee ? creditsTotal : 0,
  };
}

/**
 * Bilan d'un semestre : moyenne generale, credits acquis, mention.
 *
 * La moyenne generale pondere les UE par leurs credits, exactement comme une UE
 * pondere ses matieres. Une UE sans credit ne pese rien.
 *
 * @param {Array<{moyenne: number|null, creditsTotal: number, creditsAcquis: number}>} ues
 */
export function bilanSemestre(ues = []) {
  const notables = ues.filter(
    ({ moyenne, creditsTotal }) => moyenne !== null && moyenne !== undefined && creditsTotal > 0
  );

  const moyenne = notables.length
    ? arrondir(
        notables.reduce((s, u) => s + u.moyenne * u.creditsTotal, 0)
        / notables.reduce((s, u) => s + u.creditsTotal, 0)
      )
    : null;

  return {
    moyenne,
    creditsAcquis: ues.reduce((s, u) => s + (u.creditsAcquis || 0), 0),
    creditsTotal: ues.reduce((s, u) => s + (u.creditsTotal || 0), 0),
    mention: mention(moyenne),
  };
}

/** Mention attribuee a une moyenne sur 20. */
export function mention(moyenne) {
  if (moyenne === null || moyenne === undefined) return null;
  if (moyenne >= 16) return 'Tres bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= SEUIL_VALIDATION) return 'Passable';
  return 'Insuffisant';
}
