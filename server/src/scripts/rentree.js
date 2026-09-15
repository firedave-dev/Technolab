/**
 * Import des donnees reelles de la rentree : classes, enseignants, etudiants et
 * parents.
 *
 *     node src/scripts/rentree.js --verifier    (n'ecrit rien, montre ce qui serait fait)
 *     node src/scripts/rentree.js --importer
 *
 * IDEMPOTENT : relancer le script ne cree pas de doublon. Chaque personne est
 * reconnue a son adresse electronique, chaque classe a son nom et son annee.
 *
 * Le programme des quatre classes est decrit a part, dans programmes.js.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Classe } from '../models/Classe.js';
import { Matiere } from '../models/Matiere.js';
import { ROLES } from '../config/roles.js';
import { genererMatricule } from '../services/user.service.js';
import { PROGRAMMES, matieresDe, verifierSemestre } from './programmes.js';

/** Annee scolaire visee. A changer ici, et nulle part ailleurs. */
const ANNEE = '2023-2024';

/**
 * Mot de passe initial commun. Il doit etre change a la premiere connexion :
 * ce n'est pas un secret, c'est une cle de premiere entree.
 */
const MDP_INITIAL = 'Technolab@2024';

const DOMAINE = 'technolab-ista.org';

/**
 * Enseignants dont le prenom n'est pas connu : ils portent « Monsieur », qui est
 * la facon dont l'etablissement les designe. Le prenom sera renseigne depuis
 * l'application quand il sera connu — un compte nomme « Monsieur KATILE » est
 * utilisable des maintenant, un compte sans nom ne l'est pas.
 */
const CIVILITE = 'Monsieur';

// ---------------------------------------------------------------- classes
const CLASSES = [
  {
    cle: 'L1-INFO',
    nom: 'L1 Informatique Appliquée à la Gestion',
    niveau: 'L1',
    filiere: 'Informatique Appliquée à la Gestion',
    capacite: 40,
    principal: 'k.traore',
  },
  {
    cle: 'L1-FC',
    nom: 'L1 Finance Comptabilité',
    niveau: 'L1',
    filiere: 'Finance Comptabilité',
    capacite: 40,
    principal: 'sm.denou',
  },
  {
    cle: 'L2-INFO',
    nom: 'L2 Informatique Appliquée à la Gestion',
    niveau: 'L2',
    filiere: 'Informatique Appliquée à la Gestion',
    capacite: 35,
    principal: 's.toure',
  },
  {
    cle: 'L2-FC',
    nom: 'L2 Finance Comptabilité',
    niveau: 'L2',
    filiere: 'Finance Comptabilité',
    capacite: 40,
    principal: 'sm.denou',
  },
];

// ------------------------------------------------------------ enseignants
//
// `cle` sert d'identifiant interne et compose l'adresse electronique.
// `specialite` alimente la fiche du personnel.
const PROFESSEURS = [
  { cle: 's.toure', prenom: 'Saloum', nom: 'TOURE', specialite: 'Génie logiciel et bases de données' },
  { cle: 'k.traore', prenom: 'Kassim', nom: 'TRAORE', specialite: 'Algorithmique et programmation' },
  { cle: 'g.kamanguile', prenom: 'Garba', nom: 'KAMANGUILE', specialite: 'Mathématiques et statistiques' },
  { cle: 'sm.denou', prenom: 'Sanou Mathieu', nom: 'DENOU', specialite: 'Comptabilité' },
  { cle: 'i.sidibe', prenom: 'Ichaka', nom: 'SIDIBE', specialite: 'Bureautique et systèmes' },
  { cle: 'n.sissao', prenom: 'Nouhoum', nom: 'SISSAO', specialite: 'Anglais' },
  { cle: 'katile', prenom: CIVILITE, nom: 'KATILE', specialite: 'Comptabilité' },
  { cle: 'kontao', prenom: CIVILITE, nom: 'KONTAO', specialite: 'Expression et communication' },
  { cle: 'bagayoko', prenom: CIVILITE, nom: 'BAGAYOKO', specialite: 'Mathématiques financières' },
  { cle: 'doumbia', prenom: CIVILITE, nom: 'DOUMBIA', specialite: 'Économie' },
  { cle: 'diallo', prenom: CIVILITE, nom: 'DIALLO', specialite: 'Expression et communication' },
];

// --------------------------------------------------------------- etudiants
//
// `rang` est celui indique par l'etablissement. ATTENTION : le rang affiche sur
// un bulletin n'est PAS stocke, il se deduit des moyennes. Il est conserve ici
// pour servir de reference lorsque les notes seront saisies.
//
// `foyer` regroupe les enfants d'un MEME parent : Aminata et Moussa CISSE sont
// frere et soeur, un seul compte parent est cree et rattache aux deux. Sans
// cette cle, deux comptes homonymes seraient produits et le pere ne verrait
// qu'un seul de ses enfants.
// `civilite` distingue les meres des peres. Elle sert aussi a separer les
// homonymes : « Madame CISSE », parent de Hawa en L2 Finance Comptabilite, n'a
// rien a voir avec « Monsieur CISSE », pere d'Aminata et Moussa en L2
// Informatique.
const ETUDIANTS = [
  // --- L1 Informatique Appliquee a la Gestion
  { prenom: 'Aichata', nom: 'HAIDARA', sexe: 'F', classe: 'L1-INFO', rang: 1, parent: 'HAIDARA', civilite: 'Monsieur' },
  { prenom: 'Guillaume', nom: 'ZOURI', sexe: 'M', classe: 'L1-INFO', rang: 2, parent: 'ZOURI', civilite: 'Monsieur' },
  { prenom: 'Fatoumata', nom: 'DIOP', sexe: 'F', classe: 'L1-INFO', rang: 3, parent: 'DIOP', civilite: 'Monsieur' },
  { prenom: 'Mohamed', nom: 'KANAKOMO', sexe: 'M', classe: 'L1-INFO', rang: 4, parent: 'KANAKOMO', civilite: 'Monsieur' },

  // --- L1 Finance Comptabilite
  { prenom: 'Nindju', nom: 'TAPILY', sexe: 'M', classe: 'L1-FC', rang: 1, parent: 'TAPILY', civilite: 'Monsieur' },
  { prenom: 'Illiasse', nom: 'SAYE', sexe: 'M', classe: 'L1-FC', rang: 2, parent: 'SAYE', civilite: 'Monsieur' },
  { prenom: 'Saoudatou', nom: 'TAMBOURA', sexe: 'F', classe: 'L1-FC', rang: 3, parent: 'TAMBOURA', civilite: 'Monsieur' },
  { prenom: 'Bourema', nom: 'KOUMARE', sexe: 'M', classe: 'L1-FC', rang: 4, parent: 'KOUMARE', civilite: 'Monsieur' },

  // --- L2 Informatique Appliquee a la Gestion
  { prenom: 'Moussa', nom: 'SANOGO', sexe: 'M', classe: 'L2-INFO', rang: 1, parent: 'SANOGO', civilite: 'Monsieur' },
  { prenom: 'David', nom: 'SAYE', sexe: 'M', classe: 'L2-INFO', rang: 2, parent: 'SAYE', civilite: 'Monsieur' },
  { prenom: 'Aminata', nom: 'CISSE', sexe: 'F', classe: 'L2-INFO', rang: 3, parent: 'CISSE', civilite: 'Monsieur', foyer: 'cisse-info' },
  { prenom: 'Mahamadou Seyba', nom: 'SOGOBA', sexe: 'M', classe: 'L2-INFO', rang: 3, parent: 'SOGOBA', civilite: 'Monsieur' },
  { prenom: 'Moussa', nom: 'CISSE', sexe: 'M', classe: 'L2-INFO', rang: 4, parent: 'CISSE', civilite: 'Monsieur', foyer: 'cisse-info' },

  // --- L2 Finance Comptabilite
  { prenom: 'Hawa', nom: 'CISSE', sexe: 'F', classe: 'L2-FC', rang: 1, parent: 'CISSE', civilite: 'Madame' },
  { prenom: 'Daniel Souran', nom: 'BERTHE', sexe: 'M', classe: 'L2-FC', rang: 2, parent: 'BERTHE', civilite: 'Madame' },
  { prenom: 'Safiatou', nom: 'MARIKO', sexe: 'F', classe: 'L2-FC', rang: 3, parent: 'MARIKO', civilite: 'Monsieur' },
  { prenom: 'Amadou', nom: 'GUINDO', sexe: 'M', classe: 'L2-FC', rang: 4, parent: 'GUINDO', civilite: 'Monsieur' },
];

// ------------------------------------------------------------------ outils
const sansAccent = (texte) =>
  texte.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const identifiant = (texte) => sansAccent(texte).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const emailProf = (cle) => `${cle}@${DOMAINE}`;
const emailEtudiant = (e) => `${identifiant(e.prenom)}.${identifiant(e.nom)}@${DOMAINE}`;

/**
 * Adresse du parent, derivee du FOYER et non du nom de famille.
 *
 * Deux eleves sans lien de parente peuvent avoir un pere designe de la meme
 * facon ; inversement, un frere et une soeur partagent le meme. L'adresse est
 * donc construite sur la cle de foyer quand elle existe, et sur l'enfant sinon.
 */
const emailParent = (e) =>
  e.foyer
    ? `parent.${e.foyer}@${DOMAINE}`
    : `parent.${identifiant(e.prenom)}.${identifiant(e.nom)}@${DOMAINE}`;

let ecrit = false;

async function trouverOuCreer(modele, recherche, donnees, libelle) {
  const existant = await modele.findOne(recherche);
  if (existant) {
    console.log(`  = deja present  ${libelle}`);
    return existant;
  }
  if (!ecrit) {
    console.log(`  + a creer       ${libelle}`);
    return { _id: null, ...donnees };
  }

  /*
   * LE MATRICULE EST GENERE ICI.
   *
   * Il l'est normalement par le controleur de creation de compte, que ce script
   * contourne en ecrivant directement par le modele. Sans cet appel, les comptes
   * importes arrivent sans matricule : ils s'affichent alors sans identifiant
   * dans les listes et sur la grille de saisie, et la fiche d'inscription sort
   * incomplete.
   */
  const aCreer = { ...donnees };
  if (donnees.role && !aCreer.matricule) {
    aCreer.matricule = await genererMatricule(donnees.role, Number(ANNEE.slice(0, 4)));
  }

  const cree = await modele.create(aCreer);
  console.log(`  + cree          ${libelle}${aCreer.matricule ? `  [${aCreer.matricule}]` : ''}`);
  return cree;
}

/** Attribue un matricule a un compte deja cree qui en manque. */
async function completerMatricule(compte, role) {
  if (!ecrit || !compte?._id || compte.matricule) return;
  const matricule = await genererMatricule(role, Number(ANNEE.slice(0, 4)));
  await User.updateOne({ _id: compte._id }, { $set: { matricule } });
  console.log(`  ~ matricule     ${compte.prenom} ${compte.nom} -> ${matricule}`);
}

// ------------------------------------------------------------------ import
async function importer() {
  console.log(`\nAnnee scolaire : ${ANNEE}`);
  console.log(ecrit ? 'Mode : ECRITURE\n' : 'Mode : VERIFICATION (aucune ecriture)\n');

  // 1. Enseignants — crees avant les classes, qui referencent leur titulaire.
  console.log('Enseignants');
  const profs = {};
  for (const p of PROFESSEURS) {
    const email = emailProf(p.cle);
    profs[p.cle] = await trouverOuCreer(User, { email }, {
      nom: p.nom,
      prenom: p.prenom,
      email,
      motDePasse: MDP_INITIAL,
      role: ROLES.PROFESSEUR,
      infosPersonnel: { fonction: 'Enseignant', specialite: p.specialite, typeContrat: 'vacataire' },
    }, `${p.prenom} ${p.nom}`);
    await completerMatricule(profs[p.cle], ROLES.PROFESSEUR);
  }

  // 2. Classes
  console.log('\nClasses');
  const classes = {};
  for (const c of CLASSES) {
    const principal = c.principal ? profs[c.principal] : null;
    classes[c.cle] = await trouverOuCreer(Classe, { nom: c.nom, anneeScolaire: ANNEE }, {
      nom: c.nom,
      niveau: c.niveau,
      filiere: c.filiere,
      anneeScolaire: ANNEE,
      capacite: c.capacite,
      professeurPrincipal: principal?._id || undefined,
    }, `${c.nom}${principal ? ` — principal : ${principal.prenom} ${principal.nom}` : ''}`);
  }

  // 3. Etudiants et parents
  console.log('\nEtudiants et parents');
  const foyersVus = new Map();
  for (const e of ETUDIANTS) {
    const courrielEtudiant = emailEtudiant(e);
    const etudiant = await trouverOuCreer(User, { email: courrielEtudiant }, {
      nom: e.nom,
      prenom: e.prenom,
      email: courrielEtudiant,
      motDePasse: MDP_INITIAL,
      role: ROLES.ETUDIANT,
      sexe: e.sexe,
      /*
       * LA CLASSE SE RANGE DANS `infosEtudiant`, PAS A LA RACINE.
       *
       * Le schema n'accepte le champ qu'a cet endroit, et Mongoose ecarte
       * silencieusement ce qu'il ne connait pas : place a la racine, la classe
       * disparaissait sans le moindre message, et les dix-sept etudiants
       * arrivaient en base sans affectation. Tout ce qui interroge la scolarite
       * — grille de saisie, bulletin, effectifs — filtre sur
       * `infosEtudiant.classe` et ne renvoyait donc rien.
       */
      infosEtudiant: {
        classe: classes[e.classe]?._id || undefined,
        anneeInscription: Number(ANNEE.slice(0, 4)),
        statut: 'inscrit',
        nationalite: 'Malienne',
      },
    }, `${e.prenom} ${e.nom} — ${CLASSES.find((c) => c.cle === e.classe).nom}`);
    await completerMatricule(etudiant, ROLES.ETUDIANT);

    /*
     * Reconciliation de l'affectation.
     *
     * Le script ne se contente pas de creer : il REPARE. Un compte deja present
     * mais rattache a la mauvaise classe — ou a aucune — est corrige au passage,
     * ce qui rend le script rejouable apres une correction du programme.
     */
    const classeVoulue = classes[e.classe]?._id;
    if (ecrit && etudiant._id && classeVoulue
        && String(etudiant.infosEtudiant?.classe || '') !== String(classeVoulue)) {
      await User.updateOne(
        { _id: etudiant._id },
        { $set: { 'infosEtudiant.classe': classeVoulue } }
      );
      console.log(`  ~ rattache      ${e.prenom} ${e.nom} a ${CLASSES.find((c) => c.cle === e.classe).nom}`);
    }

    const courrielParent = emailParent(e);
    // Un foyer deja traite ne redonne pas lieu a un compte : le frere et la
    // soeur partagent le meme parent.
    const parent = foyersVus.has(courrielParent)
      ? foyersVus.get(courrielParent)
      : await trouverOuCreer(User, { email: courrielParent }, {
        nom: e.parent,
        prenom: e.civilite,
        email: courrielParent,
        motDePasse: MDP_INITIAL,
        role: ROLES.PARENT,
      }, `  parent de ${e.prenom} ${e.nom} : ${e.civilite} ${e.parent}`);

    if (foyersVus.has(courrielParent)) {
      console.log(`  = meme foyer    ${e.prenom} ${e.nom} partage le parent de son frere ou sa soeur`);
    }
    await completerMatricule(parent, ROLES.PARENT);
    foyersVus.set(courrielParent, parent);

    // Liaison reciproque : l'espace parental interroge `enfants`, la fiche de
    // l'etudiant affiche `parents`. Les deux sens doivent etre poses.
    if (ecrit && etudiant._id && parent._id) {
      await User.updateOne({ _id: parent._id }, { $addToSet: { enfants: etudiant._id } });
      await User.updateOne({ _id: etudiant._id }, { $addToSet: { parents: parent._id } });
    }
  }

  // 4. Matieres
  console.log('\nMatieres');
  let creees = 0;
  let types = 0;
  for (const c of CLASSES) {
    const matieres = matieresDe(c.cle);
    console.log(`\n  ${c.nom}`);

    for (const semestre of ['semestre1', 'semestre2']) {
      const duSemestre = matieres.filter((m) => m.semestre === semestre);
      const bilan = verifierSemestre(duSemestre);
      const marque = bilan.valide ? 'OK' : 'INVALIDE';
      console.log(`    ${semestre} : ${bilan.total} matieres — ${bilan.n3} a 3 credits, `
        + `${bilan.n2} a 2 — total ${bilan.credits}/30  [${marque}]`);
      if (!bilan.valide) {
        throw new Error(
          `${c.nom} / ${semestre} ne boucle pas a 30 credits : ce semestre ne pourra pas `
          + 'etre regroupe en unites d enseignement. Corrigez programmes.js.'
        );
      }

      for (const m of duSemestre) {
        const prof = profs[m.professeur];
        if (!prof) throw new Error(`Professeur inconnu dans programmes.js : ${m.professeur}`);

        const existante = await Matiere.findOne({
          code: m.code, classe: classes[c.cle]?._id, anneeScolaire: ANNEE,
        });
        if (existante) {
          // Rattrapage du type, qui conditionne l'appariement en unites.
          if (ecrit && existante.typeMatiere !== m.typeMatiere) {
            await Matiere.updateOne({ _id: existante._id }, { $set: { typeMatiere: m.typeMatiere } });
            types += 1;
          }
          continue;
        }
        if (ecrit) {
          await Matiere.create({
            code: m.code,
            nom: m.nom,
            coefficient: m.coefficient,
            semestre: m.semestre,
            typeMatiere: m.typeMatiere,
            classe: classes[c.cle]._id,
            professeur: prof._id,
            anneeScolaire: ANNEE,
          });
        }
        creees += 1;
      }
    }
  }
  console.log(`\n  ${creees} matieres ${ecrit ? 'creees' : 'a creer'}.`);

  console.log('\nRecapitulatif');
  console.log(`  ${PROFESSEURS.length} enseignants`);
  console.log(`  ${CLASSES.length} classes`);
  console.log(`  ${ETUDIANTS.length} etudiants, ${new Set(ETUDIANTS.map(emailParent)).size} parents`);
  console.log(`  ${Object.keys(PROGRAMMES).length * 24} matieres au programme`);
  const sansPrenom = PROFESSEURS.filter((p) => p.prenom === CIVILITE).length;
  if (sansPrenom) {
    console.log(`\n  ! ${sansPrenom} enseignants sont enregistres sous « ${CIVILITE} + nom », `
      + 'faute de prenom connu. A completer depuis l application.');
  }
  if (!ecrit) {
    console.log('\n  Rien n a ete ecrit. Relancez avec --importer pour appliquer.');
  } else {
    console.log(`\n  Mot de passe initial de tous les comptes crees : ${MDP_INITIAL}`);
    console.log('  Il doit etre change a la premiere connexion.');
  }
}

const action = process.argv.find((a) => ['--verifier', '--importer'].includes(a));
if (!action) {
  console.error('Usage : node src/scripts/rentree.js [--verifier | --importer]');
  process.exit(1);
}
ecrit = action === '--importer';

await connectDB();
try {
  await importer();
} catch (erreur) {
  console.error(`\n[rentree] ECHEC : ${erreur.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
