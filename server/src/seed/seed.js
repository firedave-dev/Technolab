/**
 * Jeu de donnees initial : un compte par role, des classes et une promotion d'etudiants
 * rattaches a leurs parents. Le script est idempotent (relancable sans doublon).
 * Lancement : npm run seed
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Classe } from '../models/Classe.js';
import { ROLES } from '../config/roles.js';
import { seedScolarite } from './scolarite.seed.js';
import { seedComptabilite } from './comptabilite.seed.js';
import { seedPlanning } from './planning.seed.js';

const MDP_DEMO = 'Passer@123';
const ANNEE = '2025-2026';

const comptes = [
  { nom: 'Systeme', prenom: 'Admin', email: env.seed.adminEmail, motDePasse: env.seed.adminPassword, role: ROLES.ADMIN, matricule: 'ADM-2026-0001' },
  { nom: 'Kouassi', prenom: 'Jean', email: 'directeur@technolab-ista.edu', role: ROLES.DIRECTEUR, matricule: 'DIR-2026-0001', infosPersonnel: { fonction: 'Directeur general', dateEmbauche: new Date('2018-09-01'), typeContrat: 'CDI', salaire: 1800000 } },
  { nom: 'Traore', prenom: 'Awa', email: 'secretaire@technolab-ista.edu', role: ROLES.SECRETAIRE, matricule: 'SEC-2026-0001', infosPersonnel: { fonction: 'Secretaire principale', dateEmbauche: new Date('2020-01-15'), typeContrat: 'CDI', salaire: 450000 } },
  { nom: 'Diallo', prenom: 'Moussa', email: 'professeur@technolab-ista.edu', role: ROLES.PROFESSEUR, matricule: 'PRF-2026-0001', infosPersonnel: { fonction: 'Enseignant', specialite: 'Genie logiciel', dateEmbauche: new Date('2019-10-01'), typeContrat: 'CDI', salaire: 700000 } },
  { nom: 'Sanogo', prenom: 'Fatou', email: 'surveillant@technolab-ista.edu', role: ROLES.SURVEILLANT, matricule: 'SUR-2026-0001', infosPersonnel: { fonction: 'Surveillante generale', dateEmbauche: new Date('2021-09-01'), typeContrat: 'CDI', salaire: 350000 } },
  { nom: 'Bamba', prenom: 'Aicha', email: 'etudiant@technolab-ista.edu', role: ROLES.ETUDIANT, matricule: 'ETU-2026-0001', sexe: 'F', infosEtudiant: { anneeInscription: 2025, statut: 'inscrit', nationalite: 'Malienne' } },
  { nom: 'Bamba', prenom: 'Seydou', email: 'parent@technolab-ista.edu', role: ROLES.PARENT, matricule: 'PAR-2026-0001', telephone: '+223 70 00 00 01' },
];

/** Professeurs supplementaires, pour disposer de professeurs principaux. */
const professeurs = [
  { nom: 'Keita', prenom: 'Mariam', email: 'm.keita@technolab-ista.edu', role: ROLES.PROFESSEUR, infosPersonnel: { fonction: 'Enseignante', specialite: 'Mathematiques', typeContrat: 'CDI', salaire: 680000 } },
  { nom: 'Coulibaly', prenom: 'Amadou', email: 'a.coulibaly@technolab-ista.edu', role: ROLES.PROFESSEUR, infosPersonnel: { fonction: 'Enseignant', specialite: 'Reseaux', typeContrat: 'vacataire', salaire: 400000 } },
];

const classes = [
  { nom: 'L1 Informatique A', niveau: 'L1', filiere: 'Informatique', anneeScolaire: ANNEE, capacite: 40 },
  { nom: 'L2 Informatique A', niveau: 'L2', filiere: 'Informatique', anneeScolaire: ANNEE, capacite: 35 },
  { nom: 'L1 Gestion A', niveau: 'L1', filiere: 'Gestion', anneeScolaire: ANNEE, capacite: 45 },
];

/** Promotion de demonstration : chaque entree cree l'etudiant, son parent et leur liaison. */
const promotions = [
  { etudiant: ['Sidibe', 'Oumar', 'M'], parent: ['Sidibe', 'Bakary'], classe: 'L1 Informatique A' },
  { etudiant: ['Toure', 'Kadiatou', 'F'], parent: ['Toure', 'Salimata'], classe: 'L1 Informatique A' },
  { etudiant: ['Cisse', 'Modibo', 'M'], parent: ['Cisse', 'Adama'], classe: 'L2 Informatique A' },
  { etudiant: ['Konate', 'Fanta', 'F'], parent: ['Konate', 'Mamadou'], classe: 'L1 Gestion A' },
];

const sansAccent = (t) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Cree le compte s'il n'existe pas encore, sinon renvoie l'existant. */
async function creerSiAbsent(donnees, silencieux = false) {
  const existant = await User.findOne({ email: donnees.email });
  if (existant) {
    if (!silencieux) console.log(`[seed] Deja present : ${donnees.email}`);
    return existant;
  }
  const cree = await User.create({ motDePasse: MDP_DEMO, ...donnees });
  if (!silencieux) console.log(`[seed] Cree : ${donnees.email} (${donnees.role})`);
  return cree;
}

async function seed() {
  await connectDB();

  // 1. Comptes de reference (un par role)
  for (const donnees of comptes) await creerSiAbsent(donnees);
  for (const donnees of professeurs) await creerSiAbsent(donnees);

  // 2. Classes, avec un professeur principal
  const profPrincipal = await User.findOne({ email: 'professeur@technolab-ista.edu' });
  const classesCreees = {};

  for (const donnees of classes) {
    let classe = await Classe.findOne({ nom: donnees.nom, anneeScolaire: donnees.anneeScolaire });
    if (!classe) {
      classe = await Classe.create({ ...donnees, professeurPrincipal: profPrincipal?._id });
      console.log(`[seed] Classe creee : ${classe.nom}`);
    }
    classesCreees[classe.nom] = classe;
  }

  // 3. Etudiant de reference rattache a une classe
  const etudiantRef = await User.findOne({ email: 'etudiant@technolab-ista.edu' });
  const parentRef = await User.findOne({ email: 'parent@technolab-ista.edu' });

  if (etudiantRef && !etudiantRef.infosEtudiant?.classe) {
    etudiantRef.infosEtudiant = {
      ...(etudiantRef.infosEtudiant?.toObject?.() || {}),
      classe: classesCreees['L1 Informatique A']._id,
    };
    await etudiantRef.save();
    console.log('[seed] Etudiant de reference affecte a L1 Informatique A');
  }

  if (etudiantRef && parentRef) {
    await Promise.all([
      User.updateOne({ _id: etudiantRef._id }, { $addToSet: { parents: parentRef._id } }),
      User.updateOne({ _id: parentRef._id }, { $addToSet: { enfants: etudiantRef._id } }),
    ]);
  }

  // 4. Promotion de demonstration : etudiant + parent + liaison
  for (const { etudiant: [nom, prenom, sexe], parent: [nomP, prenomP], classe } of promotions) {
    const emailEtu = `${sansAccent(prenom)}.${sansAccent(nom)}@etu.technolab-ista.edu`;
    const emailPar = `${sansAccent(prenomP)}.${sansAccent(nomP)}@parent.technolab-ista.edu`;

    const eleve = await creerSiAbsent({
      nom, prenom, sexe, email: emailEtu, role: ROLES.ETUDIANT,
      infosEtudiant: {
        classe: classesCreees[classe]._id,
        anneeInscription: 2025,
        statut: 'inscrit',
        nationalite: 'Malienne',
      },
    }, true);

    const tuteur = await creerSiAbsent({
      nom: nomP, prenom: prenomP, email: emailPar, role: ROLES.PARENT,
    }, true);

    await Promise.all([
      User.updateOne({ _id: eleve._id }, { $addToSet: { parents: tuteur._id } }),
      User.updateOne({ _id: tuteur._id }, { $addToSet: { enfants: eleve._id } }),
    ]);
  }

  // 5. Matricules manquants (comptes crees sans matricule explicite)
  const { genererMatricule } = await import('../services/user.service.js');
  for (const sansMatricule of await User.find({ matricule: { $in: [null, ''] } })) {
    sansMatricule.matricule = await genererMatricule(sansMatricule.role);
    await sansMatricule.save({ validateBeforeSave: false });
  }

  // 6. Donnees pedagogiques (matieres, evaluations, notes, examens, absences)
  await seedScolarite();

  // 7. Donnees comptables (tarifs, echeanciers, paiements)
  await seedComptabilite();

  // 8. Emploi du temps hebdomadaire
  await seedPlanning();

  console.log(`\n[seed] Termine : ${await User.countDocuments()} comptes, ${await Classe.countDocuments()} classes`);
  console.log(`[seed] Admin : ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  console.log(`[seed] Autres comptes : ${MDP_DEMO}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] Echec :', err);
  process.exit(1);
});
