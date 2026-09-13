/**
 * Migration 001 — introduction des UE, des credits ECTS et des notes a deux
 * composantes.
 *
 *     node src/migrations/001-ue-et-notes.js --sauvegarde   (obligatoire d'abord)
 *     node src/migrations/001-ue-et-notes.js --migrer
 *     node src/migrations/001-ue-et-notes.js --verifier
 *     node src/migrations/001-ue-et-notes.js --annuler
 *
 * CE QUE FAIT LA MIGRATION
 *
 * 1. cree une UE par matiere existante. C'est volontairement grossier : nous
 *    n'avons aucune donnee permettant de deviner les vrais regroupements. Chaque
 *    matiere se retrouve seule dans son UE, l'administration reorganise ensuite.
 *    Une UE d'une matiere se comporte exactement comme l'ancien systeme — la
 *    compensation n'a rien a compenser — donc aucun resultat ne change tant que
 *    le regroupement n'est pas fait ;
 *
 * 2. reprend le COEFFICIENT existant comme nombre de credits. Le coefficient
 *    etait deja le poids de la matiere dans la moyenne ; le transformer en
 *    credit preserve exactement les rapports de force entre matieres. Les
 *    totaux ne feront pas 30 par semestre tant que l'administration n'aura pas
 *    ajuste : c'est visible, et preferable a une repartition inventee ;
 *
 * 3. condense les evaluations en deux notes par etudiant et par matiere. La
 *    moyenne des evaluations de type « examen » devient la note d'examen, celle
 *    de tous les autres types la note de classe. Les baremes sont ramenes sur 20
 *    et les coefficients d'evaluation respectes, si bien que la note de classe
 *    reproduit la moyenne du controle continu telle qu'elle etait calculee.
 *
 * CE QU'ELLE NE FAIT PAS
 *
 * Elle ne supprime RIEN. Les collections `evaluations` et `notes` restent
 * intactes : c'est ce qui rend le retour arriere possible, et la verification
 * honnete. Leur suppression fera l'objet d'une migration ulterieure, une fois la
 * nouvelle chaine eprouvee en production.
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { connectDB } from '../config/db.js';
import { Matiere } from '../models/Matiere.js';
import { Evaluation } from '../models/Evaluation.js';
import { Note } from '../models/Note.js';
import { UE } from '../models/UE.js';
import { NoteMatiere } from '../models/NoteMatiere.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const SAUVEGARDES = path.resolve(DOSSIER, '../../sauvegardes');

/** Types d'evaluation qui alimentent la note de classe : tout sauf l'examen. */
const TYPE_EXAMEN = 'examen';

/** Semestre par defaut des matieres qui n'en portent pas. */
const SEMESTRE_DEFAUT = 'semestre1';

/* ------------------------------------------------------------------ */
/* Sauvegarde                                                          */
/* ------------------------------------------------------------------ */

/**
 * Exporte les collections touchees dans un fichier JSON horodate.
 *
 * La migration refuse de s'executer sans une sauvegarde prealable : c'est la
 * seule protection contre une execution sur la mauvaise base. Le fichier reste
 * relisible par `--annuler` si la base a diverge entre-temps.
 */
async function sauvegarder() {
  fs.mkdirSync(SAUVEGARDES, { recursive: true });

  const contenu = {
    date: new Date().toISOString(),
    base: mongoose.connection.name,
    matieres: await Matiere.find().lean(),
    evaluations: await Evaluation.find().lean(),
    notes: await Note.find().lean(),
    ues: await UE.find().lean(),
    notesMatiere: await NoteMatiere.find().lean(),
  };

  const horodatage = contenu.date.replace(/[:.]/g, '-');
  const chemin = path.join(SAUVEGARDES, `avant-001-${horodatage}.json`);
  fs.writeFileSync(chemin, JSON.stringify(contenu, null, 2), 'utf8');

  console.log(`[migration] Sauvegarde ecrite : ${chemin}`);
  console.log(`            ${contenu.matieres.length} matieres, `
    + `${contenu.evaluations.length} evaluations, ${contenu.notes.length} notes`);
  return chemin;
}

/** Y a-t-il au moins une sauvegarde disponible ? */
const sauvegardeExiste = () =>
  fs.existsSync(SAUVEGARDES) && fs.readdirSync(SAUVEGARDES).some((f) => f.startsWith('avant-001-'));

/* ------------------------------------------------------------------ */
/* Migration                                                           */
/* ------------------------------------------------------------------ */

/** Moyenne ponderee d'une liste de { valeur, bareme, coefficient }, ramenee sur 20. */
function moyenneSur20(entrees) {
  let total = 0;
  let poids = 0;

  for (const { valeur, bareme, coefficient } of entrees) {
    if (valeur === null || valeur === undefined) continue;
    total += (valeur / (bareme || 20)) * 20 * (coefficient || 1);
    poids += coefficient || 1;
  }

  return poids ? Math.round((total / poids) * 100) / 100 : null;
}

async function migrer() {
  if (!sauvegardeExiste()) {
    throw new Error(
      'Aucune sauvegarde trouvee. Lancez d abord : node src/migrations/001-ue-et-notes.js --sauvegarde'
    );
  }

  const matieres = await Matiere.find().lean();
  console.log(`[migration] ${matieres.length} matieres a traiter`);

  let uesCreees = 0;
  let creditsPoses = 0;

  for (const matiere of matieres) {
    // --- 1. Une UE par matiere, si elle n'en a pas deja une ---
    if (!matiere.ue) {
      const code = `UE-${matiere.code}`.slice(0, 12);

      // `upsert` rend l'etape rejouable : une migration interrompue se relance
      // sans creer de doublon.
      const ue = await UE.findOneAndUpdate(
        {
          code,
          classe: matiere.classe,
          semestre: SEMESTRE_DEFAUT,
          anneeScolaire: matiere.anneeScolaire,
        },
        { $setOnInsert: { intitule: matiere.nom, ordre: 0 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await Matiere.updateOne({ _id: matiere._id }, { $set: { ue: ue._id } });
      uesCreees += 1;
    }

    // --- 2. Le coefficient devient le nombre de credits ---
    if (!matiere.creditsEcts) {
      await Matiere.updateOne(
        { _id: matiere._id },
        { $set: { creditsEcts: matiere.coefficient || 1 } }
      );
      creditsPoses += 1;
    }
  }

  console.log(`[migration] ${uesCreees} UE creees, ${creditsPoses} matieres creditees`);

  // --- 3. Condensation des evaluations en deux notes ---
  const evaluations = await Evaluation.find().lean();
  const parMatiere = new Map();

  for (const evaluation of evaluations) {
    const cle = String(evaluation.matiere);
    if (!parMatiere.has(cle)) parMatiere.set(cle, []);
    parMatiere.get(cle).push(evaluation);
  }

  let lignesCreees = 0;

  for (const matiere of matieres) {
    const sesEvaluations = parMatiere.get(String(matiere._id)) || [];
    if (!sesEvaluations.length) continue;

    const notes = await Note.find({
      evaluation: { $in: sesEvaluations.map((e) => e._id) },
    }).lean();

    // Regroupement par etudiant, puis par nature d'epreuve.
    const parEtudiant = new Map();
    const evaluationParId = new Map(sesEvaluations.map((e) => [String(e._id), e]));

    for (const note of notes) {
      // Une absence n'est pas un zero : elle est retiree du calcul.
      if (note.absent) continue;

      const evaluation = evaluationParId.get(String(note.evaluation));
      if (!evaluation) continue;

      const cle = String(note.etudiant);
      if (!parEtudiant.has(cle)) parEtudiant.set(cle, { classe: [], examen: [] });

      parEtudiant.get(cle)[evaluation.type === TYPE_EXAMEN ? 'examen' : 'classe'].push({
        valeur: note.valeur,
        bareme: evaluation.bareme,
        coefficient: evaluation.coefficient,
      });
    }

    for (const [etudiant, groupes] of parEtudiant) {
      const semestre = sesEvaluations[0].periode || SEMESTRE_DEFAUT;

      await NoteMatiere.findOneAndUpdate(
        {
          matiere: matiere._id,
          etudiant,
          semestre,
          anneeScolaire: matiere.anneeScolaire,
        },
        {
          $set: {
            noteClasse: moyenneSur20(groupes.classe),
            noteExamen: moyenneSur20(groupes.examen),
            // Une note reprise d'evaluations deja publiees reste publiee.
            publiee: sesEvaluations.some((e) => e.publiee),
          },
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
      lignesCreees += 1;
    }
  }

  console.log(`[migration] ${lignesCreees} lignes de notes condensees`);
}

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

/**
 * Controle qu'aucune note n'a ete perdue ni denaturee.
 *
 * On ne se contente pas de compter : pour chaque couple etudiant/matiere du
 * nouveau modele, on RECALCULE la moyenne depuis les anciennes collections et on
 * la compare. Un simple decompte laisserait passer une valeur mal reprise.
 */
async function verifier() {
  const matieres = await Matiere.find().lean();
  const anomalies = [];
  let couplesControles = 0;

  for (const matiere of matieres) {
    const sesEvaluations = await Evaluation.find({ matiere: matiere._id }).lean();
    if (!sesEvaluations.length) continue;

    const evaluationParId = new Map(sesEvaluations.map((e) => [String(e._id), e]));
    const notes = await Note.find({
      evaluation: { $in: sesEvaluations.map((e) => e._id) },
    }).lean();

    const parEtudiant = new Map();
    for (const note of notes) {
      if (note.absent) continue;
      const evaluation = evaluationParId.get(String(note.evaluation));
      if (!evaluation) continue;
      const cle = String(note.etudiant);
      if (!parEtudiant.has(cle)) parEtudiant.set(cle, { classe: [], examen: [] });
      parEtudiant.get(cle)[evaluation.type === TYPE_EXAMEN ? 'examen' : 'classe'].push({
        valeur: note.valeur, bareme: evaluation.bareme, coefficient: evaluation.coefficient,
      });
    }

    for (const [etudiant, groupes] of parEtudiant) {
      couplesControles += 1;

      const ligne = await NoteMatiere.findOne({ matiere: matiere._id, etudiant }).lean();
      if (!ligne) {
        anomalies.push(`ligne absente : matiere ${matiere.code}, etudiant ${etudiant}`);
        continue;
      }

      for (const [groupe, champ] of [['classe', 'noteClasse'], ['examen', 'noteExamen']]) {
        const attendu = moyenneSur20(groupes[groupe]);
        const obtenu = ligne[champ];
        const identiques = attendu === null
          ? obtenu === null
          : obtenu !== null && Math.abs(attendu - obtenu) < 0.005;

        if (!identiques) {
          anomalies.push(
            `${matiere.code} / ${etudiant} / ${champ} : attendu ${attendu}, trouve ${obtenu}`
          );
        }
      }
    }
  }

  const matieresSansUe = await Matiere.countDocuments({ ue: null });
  const matieresSansCredit = await Matiere.countDocuments({ creditsEcts: { $lte: 0 } });

  console.log(`[verification] ${couplesControles} couples etudiant/matiere recalcules`);
  console.log(`[verification] ${matieresSansUe} matiere(s) sans UE, `
    + `${matieresSansCredit} sans credit`);

  if (anomalies.length) {
    console.error(`[verification] ${anomalies.length} ANOMALIE(S) :`);
    anomalies.slice(0, 20).forEach((a) => console.error(`   - ${a}`));
    throw new Error('Verification en echec : la migration a denature des donnees');
  }

  console.log('[verification] Aucune anomalie : toutes les notes sont reproduites a l identique');
}

/* ------------------------------------------------------------------ */
/* Retour arriere                                                      */
/* ------------------------------------------------------------------ */

/**
 * Annule la migration.
 *
 * Les collections d'origine n'ayant jamais ete modifiees ni supprimees, il
 * suffit de retirer ce que la migration a ajoute : les UE, les lignes de notes
 * condensees, et les deux champs poses sur les matieres. Rien a restaurer depuis
 * la sauvegarde — c'est ce qui rend ce retour arriere sur.
 */
async function annuler() {
  const ues = await UE.deleteMany({});
  const lignes = await NoteMatiere.deleteMany({});
  const matieres = await Matiere.updateMany({}, { $unset: { ue: '', creditsEcts: '' } });

  console.log(`[retour] ${ues.deletedCount} UE supprimees`);
  console.log(`[retour] ${lignes.deletedCount} lignes de notes supprimees`);
  console.log(`[retour] ${matieres.modifiedCount} matieres nettoyees`);
  console.log('[retour] Les collections evaluations et notes n ont jamais ete touchees');
}

/* ------------------------------------------------------------------ */

const ACTIONS = { '--sauvegarde': sauvegarder, '--migrer': migrer, '--verifier': verifier, '--annuler': annuler };

const action = process.argv.find((a) => ACTIONS[a]);

if (!action) {
  console.error('Usage : node src/migrations/001-ue-et-notes.js '
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
