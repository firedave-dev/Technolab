/**
 * Regles de calcul et de permission communes aux modules notes, examens et absences.
 *
 * MOYENNE D'UN GROUPE DE NOTES — chaque note est ramenee sur 20 (une interro sur 10
 * et un devoir sur 20 pesent alors la meme chose a coefficient egal), puis ponderee
 * par le coefficient de l'evaluation. Les copies marquees "absent" sont exclues :
 * une copie non rendue n'est pas un zero merite.
 *
 * MOYENNE D'UNE MATIERE — elle ne moyenne PAS toutes les notes ensemble. Les
 * evaluations sont d'abord separees en deux groupes, chacun moyenne de son cote :
 *
 *   moyenne de classe    devoirs, interrogations, TP et projets (le controle continu)
 *   moyenne d'examen     les examens
 *
 * puis composees en donnant a l'examen le double du poids du controle continu :
 *
 *   moyenne de matiere = (moyenne d'examen x 2 + moyenne de classe) / 3
 *
 * Pourquoi separer avant de composer, plutot que de donner un gros coefficient a
 * l'examen : le poids de l'examen serait alors dilue par le NOMBRE de devoirs. Une
 * matiere a douze interrogations et une matiere a deux devoirs ne repartiraient plus
 * le meme equilibre entre controle continu et examen, alors que la regle de
 * l'etablissement est la meme partout. En moyennant chaque groupe d'abord, le rapport
 * 2/3 - 1/3 est garanti quel que soit le nombre d'evaluations de chaque cote.
 *
 * Tant qu'un des deux groupes est vide — cas normal avant la session d'examens —
 * la moyenne de matiere est celle du groupe renseigne. Appliquer la formule a un
 * groupe absent reviendrait a le compter pour zero et a afficher, en cours d'annee,
 * une moyenne effondree qui ne veut rien dire.
 */
import { Matiere } from '../models/Matiere.js';
import { UE } from '../models/UE.js';
import { NoteMatiere } from '../models/NoteMatiere.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../config/roles.js';
import { bilanSemestre, bilanUE, noteMatiere } from './notation.service.js';
import { ordonnerUEs } from './appariement.service.js';
import { ponderationEnVigueur } from '../models/ParametrePedagogique.js';

/** Arrondi a deux decimales, en conservant `null` pour "pas de moyenne". */
const arrondir = (valeur) => (valeur === null ? null : Math.round(valeur * 100) / 100);

/** Moyenne ponderee d'une liste de { note, bareme, coefficient }. */
export function moyennePonderee(elements) {
  let total = 0;
  let poids = 0;

  for (const { note, bareme, coefficient } of elements) {
    if (note === null || note === undefined) continue;
    total += (note / bareme) * 20 * coefficient;
    poids += coefficient;
  }

  return poids ? arrondir(total / poids) : null;
}

/**
 * Types d'evaluation qui alimentent la moyenne de classe.
 * Tout ce qui n'est pas un examen est du controle continu.
 */
export const TYPES_TRAVAUX_DE_CLASSE = ['devoir', 'interrogation', 'tp', 'projet'];

/** Poids de l'examen relativement au controle continu, qui vaut 1. */
export const POIDS_EXAMEN = 2;

/**
 * Compose la moyenne d'une matiere a partir de ses deux composantes.
 * Un groupe absent (`null`) est ignore plutot que compte pour zero.
 */
export function moyenneMatiere(moyenneClasse, moyenneExamen) {
  if (moyenneExamen === null) return moyenneClasse;
  if (moyenneClasse === null) return moyenneExamen;

  return arrondir((moyenneExamen * POIDS_EXAMEN + moyenneClasse) / (POIDS_EXAMEN + 1));
}

/** Mention attribuee a une moyenne sur 20. */
export function mention(moyenne) {
  if (moyenne === null) return null;
  if (moyenne >= 16) return 'Tres bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

/**
 * Verifie qu'un acteur a le droit d'agir sur une matiere.
 * Un professeur n'intervient que sur les matieres qui lui sont assignees ;
 * la direction et le secretariat gerent l'ensemble.
 */
export function verifierAccesMatiere(acteur, matiere, { lecture = false } = {}) {
  if ([...ADMIN_ROLES, ROLES.SECRETAIRE].includes(acteur.role)) return;

  if (acteur.role === ROLES.PROFESSEUR) {
    if (String(matiere.professeur?._id || matiere.professeur) === String(acteur._id)) return;
    throw ApiError.forbidden('Cette matiere ne vous est pas assignee');
  }

  // Consultation ouverte au reste du personnel, ecriture refusee.
  if (lecture && STAFF_ROLES.includes(acteur.role)) return;

  throw ApiError.forbidden('Votre role ne permet pas cette action');
}

/**
 * Restreint une liste de dossiers aux etudiants que l'acteur a le droit de consulter.
 * Renvoie `null` quand aucune restriction ne s'applique (personnel).
 */
export async function perimetreEtudiants(acteur) {
  if (STAFF_ROLES.includes(acteur.role)) return null;
  if (acteur.role === ROLES.ETUDIANT) return [acteur._id];
  if (acteur.role === ROLES.PARENT) return acteur.enfants || [];
  return [];
}

/** Verifie l'acces a un dossier etudiant precis (personnel, parent de l'eleve, ou l'eleve). */
export async function verifierAccesEtudiant(acteur, etudiantId) {
  const autorises = await perimetreEtudiants(acteur);
  if (autorises === null) return;

  if (!autorises.some((id) => String(id) === String(etudiantId))) {
    throw ApiError.forbidden('Vous ne pouvez consulter que votre dossier ou celui de vos enfants');
  }
}

/**
 * Bulletin d'un etudiant, au format LMD : matieres groupees en UE, credits
 * acquis par compensation, moyenne generale ponderee par les credits.
 *
 * CE QUI A CHANGE — cette fonction lisait Evaluation + Note, c'est-a-dire un
 * nombre quelconque d'epreuves par matiere. Elle lit desormais NoteMatiere, les
 * deux notes que le professeur reporte. Sans cette bascule, les notes saisies
 * dans la nouvelle grille n'apparaissaient sur aucun bulletin : la chaine
 * saisie -> document etait rompue.
 *
 * RIEN N'EST STOCKE. Note de matiere, moyenne d'UE, credits et rang sont
 * recalcules a chaque lecture. C'est ce qui permet a un changement de
 * ponderation — parametre reglable — de se repercuter sur les bulletins.
 *
 * `inclureNonPubliees` laisse le personnel voir le bulletin en cours de saisie ;
 * l'etudiant et sa famille ne voient que ce qui est publie.
 */
export async function calculerBulletin(etudiantId, { periode, inclureNonPubliees = false } = {}) {
  const etudiant = await User.findOne({ _id: etudiantId, role: ROLES.ETUDIANT })
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire')
    .lean();

  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');

  const identite = {
    id: etudiant._id,
    nomComplet: `${etudiant.prenom} ${etudiant.nom}`,
    matricule: etudiant.matricule,
  };

  const classe = etudiant.infosEtudiant?.classe;
  if (!classe) {
    return {
      etudiant: identite, classe: null, ues: [], matieres: [],
      moyenneGenerale: null, mention: null, rang: null, effectif: 0,
      creditsAcquis: 0, creditsTotal: 0, moyenneGeneraleClasse: null,
    };
  }

  const semestre = periode && periode !== 'toutes' ? periode : undefined;

  const [matieres, unites, ponderation] = await Promise.all([
    Matiere.find({ classe: classe._id, actif: true, ...(semestre ? { semestre } : {}) })
      .populate('professeur', 'nom prenom')
      .lean(),
    UE.find({ classe: classe._id, ...(semestre ? { semestre } : {}) }).sort({ ordre: 1 }).lean(),
    ponderationEnVigueur(),
  ]);

  // Toutes les notes de la classe en une requete : elles servent aussi au rang.
  const toutesLesNotes = await NoteMatiere.find({
    matiere: { $in: matieres.map((m) => m._id) },
    ...(semestre ? { semestre } : {}),
    ...(inclureNonPubliees ? {} : { publiee: true }),
  }).lean();

  const notesParEtudiant = new Map();
  for (const ligne of toutesLesNotes) {
    const cle = String(ligne.etudiant);
    if (!notesParEtudiant.has(cle)) notesParEtudiant.set(cle, new Map());
    notesParEtudiant.get(cle).set(String(ligne.matiere), ligne);
  }

  const uniteParId = new Map(unites.map((u) => [String(u._id), u]));

  /** Detail complet pour un etudiant : lignes de matiere, UE, bilan du semestre. */
  const detailPour = (idEtudiant) => {
    const sesNotes = notesParEtudiant.get(String(idEtudiant)) || new Map();

    const lignes = matieres.map((matiere) => {
      const saisie = sesNotes.get(String(matiere._id));
      const noteClasse = saisie?.noteClasse ?? null;
      const noteExamen = saisie?.noteExamen ?? null;
      const credits = matiere.creditsEcts ?? 0;

      return {
        matiere: {
          id: matiere._id,
          nom: matiere.nom,
          code: matiere.code,
          typeMatiere: matiere.typeMatiere || null,
          creditsEcts: credits,
          professeur: matiere.professeur
            ? `${matiere.professeur.prenom} ${matiere.professeur.nom}`
            : null,
        },
        ue: matiere.ue ? String(matiere.ue) : null,
        noteClasse,
        noteExamen,
        note: noteMatiere(noteClasse, noteExamen, ponderation),
        credits,
        appreciation: saisie?.appreciation || null,
      };
    });

    /*
     * Regroupement par UE. Les matieres SANS UE ne sont pas perdues : elles sont
     * rassemblees dans une entree sans code, visible sur le bulletin. Les
     * escamoter masquerait une structure incomplete au lieu de la signaler.
     */
    const groupes = new Map();
    for (const ligne of lignes) {
      const cle = ligne.ue || 'hors-ue';
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(ligne);
    }

    const ues = [...groupes.entries()].map(([cle, membres]) => {
      const unite = uniteParId.get(cle);
      const bilan = bilanUE(membres.map((m) => ({ note: m.note, credits: m.credits })));

      return {
        id: cle === 'hors-ue' ? null : cle,
        code: unite?.code ?? null,
        intitule: unite?.intitule ?? 'Matieres non rattachees a une unite',
        matieres: membres,
        ...bilan,
      };
    });

    return { lignes, ues, bilan: bilanSemestre(ues) };
  };

  const { lignes, ues, bilan } = detailPour(etudiantId);

  /*
   * Ordre d'apparition sur le document : UE par credit croissant, puis par ordre
   * alphabetique de leur premiere matiere ; matieres triees alphabetiquement a
   * l'interieur de chaque UE. `ordonnerUEs` porte deja cette regle, accents et
   * casse compris.
   */
  const ordreUE = ordonnerUEs(
    ues.map((ue) => ({
      cle: ue.id ?? 'hors-ue',
      credits: ue.creditsTotal,
      matieres: ue.matieres.map((m) => m.matiere),
    }))
  );

  const uesOrdonnees = ordreUE.map((ordonnee, index) => {
    const origine = ues.find((u) => (u.id ?? 'hors-ue') === ordonnee.cle);
    const parId = new Map(origine.matieres.map((l) => [String(l.matiere.id), l]));

    return {
      ...origine,
      rang: index + 1,
      matieres: ordonnee.matieres.map((m) => parId.get(String(m.id))).filter(Boolean),
    };
  });

  // Rang : la moyenne de chaque etudiant de la classe, calculee a l'identique.
  const camarades = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe._id })
    .select('_id')
    .lean();

  const moyennes = camarades
    .map((c) => detailPour(c._id).bilan.moyenne)
    .filter((m) => m !== null)
    .sort((a, b) => b - a);

  const rang = bilan.moyenne === null ? null : moyennes.indexOf(bilan.moyenne) + 1;

  return {
    etudiant: identite,
    classe,
    periode: periode || 'toutes',
    ponderation,
    ues: uesOrdonnees,
    // Liste a plat, conservee pour les ecrans qui n'affichent pas les UE.
    matieres: lignes,
    moyenneGenerale: bilan.moyenne,
    mention: bilan.mention,
    creditsAcquis: bilan.creditsAcquis,
    creditsTotal: bilan.creditsTotal,
    rang,
    effectif: camarades.length,
    // Moyenne de la PROMOTION, a ne pas confondre avec la note de classe d'une
    // matiere : celle-ci compare l'etudiant a ses camarades.
    moyenneGeneraleClasse: moyennes.length
      ? Math.round((moyennes.reduce((s, m) => s + m, 0) / moyennes.length) * 100) / 100
      : null,
  };
}
