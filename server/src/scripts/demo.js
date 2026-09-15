/**
 * Jeu de donnees pedagogique : unites d'enseignement, notes, absences et
 * comptabilite pour l'annee importee par rentree.js.
 *
 *     node src/scripts/demo.js --ue         constitue les unites d'enseignement
 *     node src/scripts/demo.js --notes      saisit et publie les notes
 *     node src/scripts/demo.js --absences   releve quelques absences
 *     node src/scripts/demo.js --paiements  frais, echeances et encaissements
 *     node src/scripts/demo.js --tout       les quatre, dans l'ordre
 *
 * LES NOTES SONT CONSTRUITES POUR REPRODUIRE LES RANGS COMMUNIQUES PAR
 * L'ETABLISSEMENT. Le rang n'est pas une donnee stockee : il se deduit des
 * moyennes. Obtenir « Aichata HAIDARA, 1re de la classe » suppose donc de lui
 * donner la meilleure moyenne, et non d'ecrire « 1 » quelque part.
 *
 * CHAQUE SECTION EST REJOUABLE : elle efface ce qu'elle avait produit pour
 * l'annee visee avant de le reconstruire. Relancer le script deux fois ne
 * double donc ni les notes, ni les paiements.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Classe } from '../models/Classe.js';
import { Matiere } from '../models/Matiere.js';
import { UE } from '../models/UE.js';
import { NoteMatiere } from '../models/NoteMatiere.js';
import { Absence } from '../models/Absence.js';
import { FraisScolarite } from '../models/FraisScolarite.js';
import { Echeance } from '../models/Echeance.js';
import { Paiement } from '../models/Paiement.js';
import { TypeMatiere } from '../models/TypeMatiere.js';
import { matriceAffinites } from '../models/AffiniteType.js';
import { ROLES } from '../config/roles.js';
import { apparierSemestre, nommerUE } from '../services/appariement.service.js';
import { genererNumeroRecu, recalculerEcheance } from '../services/comptabilite.service.js';

const ANNEE = '2023-2024';
const SEMESTRES = ['semestre1', 'semestre2'];

/**
 * Moyenne visee selon le rang annonce.
 *
 * Les ecarts sont volontairement nets — environ deux points — pour que le
 * classement obtenu ne depende pas des variations aleatoires ajoutees matiere
 * par matiere.
 */
const MOYENNE_VISEE = { 1: 16.4, 2: 14.6, 3: 12.9, 4: 10.7 };

/** Frais annuels par filiere, repris de la grille tarifaire de l'etablissement. */
const SCOLARITE = {
  'Informatique Appliquée à la Gestion': 400_000,
  'Finance Comptabilité': 375_000,
};
const INSCRIPTION = 80_000;
const FRAIS_SESSION = 5_000;

/* ------------------------------------------------------------------ outils */

/**
 * Generateur pseudo-aleatoire DETERMINISTE.
 *
 * Deux executions du script doivent produire exactement les memes notes : sans
 * cela, relancer la generation changerait tous les bulletins, et le classement
 * verifie la veille ne tiendrait plus.
 */
function alea(graine) {
  let h = 2166136261;
  for (let i = 0; i < graine.length; i += 1) {
    h ^= graine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Arrondit au quart de point, comme le fait un correcteur. */
const auQuart = (valeur) => Math.round(Math.min(20, Math.max(0, valeur)) * 4) / 4;

const etudiantsDe = (classeId) =>
  User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classeId })
    .sort({ nom: 1, prenom: 1 })
    .lean();

/**
 * Rang annonce pour un etudiant, lu dans rentree.js.
 * Deux etudiants de L2 Informatique sont ex aequo au troisieme rang.
 */
const RANGS = {
  'HAIDARA Aichata': 1, 'ZOURI Guillaume': 2, 'DIOP Fatoumata': 3, 'KANAKOMO Mohamed': 4,
  'TAPILY Nindju': 1, 'SAYE Illiasse': 2, 'TAMBOURA Saoudatou': 3, 'KOUMARE Bourema': 4,
  'SANOGO Moussa': 1, 'SAYE David': 2, 'CISSE Aminata': 3, 'SOGOBA Mahamadou Seyba': 3,
  'CISSE Moussa': 4,
  'CISSE Hawa': 1, 'BERTHE Daniel Souran': 2, 'MARIKO Safiatou': 3, 'GUINDO Amadou': 4,
};

const cleEtudiant = (e) => `${e.nom} ${e.prenom}`;
const rangDe = (e) => RANGS[cleEtudiant(e)] ?? 3;

/* --------------------------------------------------- 1. unites d'enseignement */

async function construireUE() {
  console.log('\n=== Unites d enseignement ===');

  const [classes, affinites, types] = await Promise.all([
    Classe.find({ anneeScolaire: ANNEE }).sort({ nom: 1 }).lean(),
    matriceAffinites(),
    TypeMatiere.find().lean(),
  ]);
  const libelles = new Map(types.map((t) => [t.code, t.libelle]));

  for (const classe of classes) {
    console.log(`\n  ${classe.nom}`);

    for (const semestre of SEMESTRES) {
      const matieres = await Matiere.find({
        classe: classe._id, semestre, anneeScolaire: ANNEE, actif: true,
      }).lean();

      // Remplacement plutot que rapprochement : un appariement partiellement
      // reecrit laisserait des unites orphelines.
      await UE.deleteMany({ classe: classe._id, semestre, anneeScolaire: ANNEE });
      await Matiere.updateMany(
        { _id: { $in: matieres.map((m) => m._id) } },
        { $unset: { ue: '' } }
      );

      const resultat = apparierSemestre(matieres, affinites);
      if (resultat.erreurs?.length) {
        console.log(`    ! ${semestre} : ${resultat.erreurs.join(' | ')}`);
      }

      let rang = 0;
      for (const ue of resultat.ues) {
        rang += 1;
        const { code, intitule } = nommerUE(ue, rang, libelles);
        const doc = await UE.create({
          code, intitule, classe: classe._id, semestre, anneeScolaire: ANNEE, ordre: rang,
        });
        await Matiere.updateMany(
          { _id: { $in: ue.matieres.map((m) => m._id) } },
          { $set: { ue: doc._id } }
        );
      }
      console.log(`    ${semestre} : ${rang} unites — `
        + resultat.ues.map((u) => `${u.credits}cr`).join(' + ')
        + ` = ${resultat.ues.reduce((s, u) => s + u.credits, 0)} credits`);
    }
  }
}

/* -------------------------------------------------------------- 2. notes */

async function saisirNotes() {
  console.log('\n=== Notes ===');

  const classes = await Classe.find({ anneeScolaire: ANNEE }).sort({ nom: 1 }).lean();

  for (const classe of classes) {
    const etudiants = await etudiantsDe(classe._id);
    const matieres = await Matiere.find({
      classe: classe._id, anneeScolaire: ANNEE, actif: true,
    }).lean();

    await NoteMatiere.deleteMany({ matiere: { $in: matieres.map((m) => m._id) } });

    const notesPar = new Map();   // etudiant -> matiere -> { classe, examen }

    for (const etudiant of etudiants) {
      const cible = MOYENNE_VISEE[rangDe(etudiant)];
      const sien = new Map();

      for (const matiere of matieres) {
        const graine = `${etudiant._id}-${matiere._id}`;
        // Ecart de -2 a +2 points autour de la moyenne visee.
        const ecart = (alea(graine) - 0.5) * 4;
        const base = cible + ecart;

        // L'examen est legerement plus severe que la note de classe : c'est ce
        // qu'on observe, et cela rend la ponderation 1/3 - 2/3 visible.
        sien.set(String(matiere._id), {
          classe: auQuart(base + 0.6),
          examen: auQuart(base - 0.4),
        });
      }
      notesPar.set(String(etudiant._id), sien);
    }

    /*
     * EX AEQUO.
     *
     * Deux etudiants de L2 Informatique partagent le troisieme rang. Le rang se
     * deduisant de la moyenne, il leur faut la MEME au centieme pres. On ne
     * recopie pas les notes de l'un sur l'autre — les bulletins seraient
     * identiques, ce qui se verrait : on ECHANGE, a l'interieur de chaque
     * unite, les notes de ses deux matieres. La moyenne de l'unite ne change
     * pas d'un centieme, puisque les deux matieres pesent le meme nombre de
     * credits, et la moyenne generale non plus.
     */
    const exAequo = etudiants.filter((e) => rangDe(e) === 3);
    if (exAequo.length === 2) {
      const [modele, jumeau] = exAequo;
      const source = notesPar.get(String(modele._id));
      const copie = new Map();

      const parUE = new Map();
      for (const m of matieres) {
        const cle = String(m.ue || `sans-ue-${m._id}`);
        if (!parUE.has(cle)) parUE.set(cle, []);
        parUE.get(cle).push(m);
      }

      for (const membres of parUE.values()) {
        const valeurs = membres.map((m) => source.get(String(m._id)));
        // Rotation d'un cran : chaque matiere recoit la note de sa voisine.
        membres.forEach((m, i) => {
          copie.set(String(m._id), valeurs[(i + 1) % valeurs.length]);
        });
      }
      notesPar.set(String(jumeau._id), copie);
      console.log(`  ex aequo : ${cleEtudiant(jumeau)} recoit les notes de `
        + `${cleEtudiant(modele)} permutees dans chaque unite`);
    }

    const lignes = [];
    for (const etudiant of etudiants) {
      const sien = notesPar.get(String(etudiant._id));
      for (const matiere of matieres) {
        const { classe: nc, examen: ne } = sien.get(String(matiere._id));
        lignes.push({
          matiere: matiere._id,
          etudiant: etudiant._id,
          semestre: matiere.semestre,
          anneeScolaire: ANNEE,
          noteClasse: nc,
          noteExamen: ne,
          publiee: true,
        });
      }
    }

    await NoteMatiere.insertMany(lignes);
    console.log(`  ${classe.nom.padEnd(40)} ${lignes.length} notes pour ${etudiants.length} etudiants`);
  }
}

/* ----------------------------------------------------------- 3. absences */

/**
 * Profil d'assiduite par rang : les etudiants les plus en difficulte sont aussi
 * les plus souvent absents. Le lien n'est pas une loi, mais il rend le jeu de
 * donnees vraisemblable et les statistiques lisibles.
 */
const ABSENCES_PAR_RANG = { 1: 0, 2: 1, 3: 3, 4: 6 };

async function releverAbsences() {
  console.log('\n=== Absences ===');

  const classes = await Classe.find({ anneeScolaire: ANNEE }).lean();
  const surveillant = await User.findOne({ role: ROLES.SURVEILLANT }).lean();

  let total = 0;

  for (const classe of classes) {
    const etudiants = await etudiantsDe(classe._id);
    const matieres = await Matiere.find({ classe: classe._id, anneeScolaire: ANNEE }).lean();

    await Absence.deleteMany({ etudiant: { $in: etudiants.map((e) => e._id) } });

    const aCreer = [];
    for (const etudiant of etudiants) {
      const nombre = ABSENCES_PAR_RANG[rangDe(etudiant)] ?? 0;

      for (let i = 0; i < nombre; i += 1) {
        const graine = `${etudiant._id}-abs-${i}`;
        const tirage = alea(graine);
        const matiere = matieres[Math.floor(alea(`${graine}-m`) * matieres.length)];

        // Reparties entre octobre et mai, jours ouvres uniquement.
        const jour = new Date(2023, 9, 2 + Math.floor(alea(`${graine}-j`) * 210));
        if (jour.getDay() === 0) jour.setDate(jour.getDate() + 1);

        const retard = tirage > 0.65;
        aCreer.push({
          etudiant: etudiant._id,
          classe: classe._id,
          matiere: matiere?._id,
          date: jour,
          creneau: alea(`${graine}-c`) > 0.5 ? '16:00-18:00' : '18:15-20:15',
          type: retard ? 'retard' : 'absence',
          minutesRetard: retard ? 10 + Math.floor(alea(`${graine}-r`) * 40) : undefined,
          justifie: tirage < 0.4,
          motif: tirage < 0.4 ? 'Certificat médical présenté' : undefined,
          saisiePar: surveillant?._id,
        });
      }
    }

    if (aCreer.length) await Absence.insertMany(aCreer);
    total += aCreer.length;
    console.log(`  ${classe.nom.padEnd(40)} ${aCreer.length} absences et retards`);
  }
  console.log(`  total : ${total}`);
}

/* -------------------------------------------------------- 4. comptabilite */

/**
 * Part de la scolarite reglee, selon le rang.
 *
 * L'etablissement voulait des situations contrastees : certains a jour, d'autres
 * non. On relie la aussi au rang, ce qui donne des tableaux de bord parlants —
 * et un impaye a suivre sur les derniers de chaque classe.
 */
const PART_REGLEE = { 1: 1, 2: 1, 3: 0.66, 4: 0 };

async function genererComptabilite() {
  console.log('\n=== Comptabilite ===');

  const classes = await Classe.find({ anneeScolaire: ANNEE }).sort({ nom: 1 }).lean();
  const secretaire = await User.findOne({ role: ROLES.SECRETAIRE }).lean();
  const caissier = secretaire || await User.findOne({ role: ROLES.ADMIN }).lean();

  for (const classe of classes) {
    const etudiants = await etudiantsDe(classe._id);
    const ids = etudiants.map((e) => e._id);

    await Paiement.deleteMany({ etudiant: { $in: ids } });
    await Echeance.deleteMany({ etudiant: { $in: ids } });
    await FraisScolarite.deleteMany({ classe: classe._id, anneeScolaire: ANNEE });

    const montantScolarite = SCOLARITE[classe.filiere] ?? 400_000;

    const fraisInscription = await FraisScolarite.create({
      libelle: 'Frais d’inscription',
      type: 'inscription',
      montant: INSCRIPTION,
      classe: classe._id,
      anneeScolaire: ANNEE,
      nombreTranches: 1,
      premiereEcheance: new Date(2023, 9, 1),
      intervalleMois: 0,
      obligatoire: true,
    });

    const fraisScolarite = await FraisScolarite.create({
      libelle: 'Frais académiques',
      type: 'scolarite',
      montant: montantScolarite,
      classe: classe._id,
      anneeScolaire: ANNEE,
      nombreTranches: 3,
      premiereEcheance: new Date(2023, 10, 5),
      intervalleMois: 3,
      obligatoire: true,
    });

    /*
     * FRAIS DE SESSION.
     *
     * Ils ne concernent que les derniers de chaque classe. Le bareme des frais
     * etant defini au niveau de la CLASSE, la selection ne peut pas s'y jouer :
     * le frais est declare NON OBLIGATOIRE, et seules les echeances des
     * etudiants concernes sont creees.
     */
    const fraisSession = await FraisScolarite.create({
      libelle: 'Frais de session',
      type: 'examen',
      montant: FRAIS_SESSION,
      classe: classe._id,
      anneeScolaire: ANNEE,
      nombreTranches: 1,
      premiereEcheance: new Date(2024, 4, 15),
      intervalleMois: 0,
      obligatoire: false,
    });

    let echeancesCreees = 0;
    let encaisse = 0;
    let concernesSession = 0;

    for (const etudiant of etudiants) {
      const rang = rangDe(etudiant);
      const part = PART_REGLEE[rang] ?? 0.5;
      const aSession = rang >= 4;
      if (aSession) concernesSession += 1;

      const echeances = [
        {
          frais: fraisInscription, numeroTranche: 1,
          libelle: 'Frais d’inscription', type: 'inscription',
          montant: INSCRIPTION, dateEcheance: new Date(2023, 9, 1),
        },
      ];

      const tranche = Math.round(montantScolarite / 3);
      for (let t = 0; t < 3; t += 1) {
        echeances.push({
          frais: fraisScolarite, numeroTranche: t + 1,
          libelle: `Frais académiques — tranche ${t + 1}/3`, type: 'scolarite',
          // La derniere tranche absorbe l'arrondi, sans quoi le total ne tombe
          // pas juste sur un montant non divisible par trois.
          montant: t === 2 ? montantScolarite - 2 * tranche : tranche,
          dateEcheance: new Date(2023, 10 + t * 3, 5),
        });
      }

      if (aSession) {
        echeances.push({
          frais: fraisSession, numeroTranche: 1,
          libelle: 'Frais de session', type: 'examen',
          montant: FRAIS_SESSION, dateEcheance: new Date(2024, 4, 15),
        });
      }

      for (const e of echeances) {
        const doc = await Echeance.create({
          etudiant: etudiant._id,
          classe: classe._id,
          frais: e.frais._id,
          numeroTranche: e.numeroTranche,
          libelle: e.libelle,
          type: e.type,
          montant: e.montant,
          dateEcheance: e.dateEcheance,
          anneeScolaire: ANNEE,
        });
        echeancesCreees += 1;

        /*
         * L'inscription est toujours reglee : sans elle l'etudiant n'aurait pas
         * de dossier. Le reste depend du profil.
         */
        /*
         * Un etudiant a jour paie le montant EXACT.
         *
         * Arrondir aussi les reglements complets faisait verser 500 F de trop :
         * la tranche de scolarite ne tombe pas sur un multiple de 500, et le
         * total encaisse depassait alors le total du. L'arrondi ne vaut que pour
         * les reglements partiels, ou il imite un versement fait en billets.
         */
        const regle = e.type === 'inscription' || part === 1
          ? e.montant
          : Math.round((e.montant * part) / 500) * 500;

        if (regle > 0) {
          await Paiement.create({
            numeroRecu: await genererNumeroRecu(2023),
            etudiant: etudiant._id,
            echeance: doc._id,
            montant: regle,
            mode: alea(`${etudiant._id}-${e.libelle}`) > 0.55 ? 'mobile_money' : 'especes',
            datePaiement: new Date(e.dateEcheance.getTime() + 86400000 * 3),
            statut: 'valide',
            encaissePar: caissier?._id,
            validePar: caissier?._id,
            dateValidation: new Date(e.dateEcheance.getTime() + 86400000 * 3),
          });
          encaisse += regle;
          await recalculerEcheance(doc._id);
        }
      }
    }

    console.log(`  ${classe.nom}`);
    console.log(`     scolarite ${montantScolarite.toLocaleString('fr-FR')} F  ·  `
      + `${echeancesCreees} echeances  ·  ${encaisse.toLocaleString('fr-FR')} F encaisses  ·  `
      + `${concernesSession} frais de session`);
  }
}

/* ------------------------------------------------------------ lancement */

const options = process.argv.slice(2);
const tout = options.includes('--tout');
const veut = (nom) => tout || options.includes(nom);

if (!options.length) {
  console.error('Usage : node src/scripts/demo.js [--ue] [--notes] [--absences] [--paiements] [--tout]');
  process.exit(1);
}

await connectDB();
try {
  if (veut('--ue')) await construireUE();
  if (veut('--notes')) await saisirNotes();
  if (veut('--absences')) await releverAbsences();
  if (veut('--paiements')) await genererComptabilite();
  console.log('\nTermine.');
} catch (erreur) {
  console.error(`\n[demo] ECHEC : ${erreur.message}`);
  console.error(erreur.stack);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
