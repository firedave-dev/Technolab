/**
 * Jeu de donnees comptable (Phase 4) : grille tarifaire, echeanciers generes
 * et quelques paiements deja encaisses. Appele par seed.js, idempotent.
 */
import { FraisScolarite } from '../models/FraisScolarite.js';
import { Echeance } from '../models/Echeance.js';
import { Paiement } from '../models/Paiement.js';
import { Classe } from '../models/Classe.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/roles.js';
import { genererEcheancier, genererNumeroRecu, recalculerEcheance } from '../services/comptabilite.service.js';

const ANNEE = '2025-2026';

/** Rentree de reference pour l'echeancier : 1er octobre de l'annee de debut. */
const rentree = () => new Date(`${ANNEE.slice(0, 4)}-10-01T00:00:00.000Z`);

/** Tarifs par filiere : [libelle, type, montant, tranches, intervalle en mois]. */
const TARIFS = {
  Informatique: [
    ['Frais d inscription', 'inscription', 75_000, 1, 0],
    ['Scolarite annuelle', 'scolarite', 450_000, 3, 3],
    ['Frais d examen', 'examen', 25_000, 1, 0],
  ],
  Gestion: [
    ['Frais d inscription', 'inscription', 60_000, 1, 0],
    ['Scolarite annuelle', 'scolarite', 360_000, 3, 3],
    ['Frais d examen', 'examen', 25_000, 1, 0],
  ],
};

export async function seedComptabilite() {
  const classes = await Classe.find({ anneeScolaire: ANNEE }).lean();
  if (!classes.length) {
    console.log('[seed] Aucune classe : partie comptable ignoree');
    return;
  }

  // --- 1. Grille tarifaire ---
  let fraisCrees = 0;

  for (const classe of classes) {
    const tarifs = TARIFS[classe.filiere] || TARIFS.Informatique;

    for (const [libelle, type, montant, nombreTranches, intervalleMois] of tarifs) {
      const existe = await FraisScolarite.exists({ libelle, classe: classe._id, anneeScolaire: ANNEE });
      if (existe) continue;

      await FraisScolarite.create({
        libelle, type, montant, nombreTranches, intervalleMois,
        classe: classe._id,
        anneeScolaire: ANNEE,
        premiereEcheance: rentree(),
      });
      fraisCrees += 1;
    }
  }

  // --- 2. Echeanciers de tous les etudiants affectes a une classe ---
  const etudiants = await User.find({
    role: ROLES.ETUDIANT,
    'infosEtudiant.classe': { $in: classes.map((c) => c._id) },
  }).select('_id prenom nom').lean();

  let echeancesCreees = 0;
  for (const etudiant of etudiants) {
    const resultat = await genererEcheancier(etudiant._id, ANNEE);
    echeancesCreees += resultat.creees;
  }

  // --- 3. Paiements de demonstration ---
  // Le premier etudiant solde son inscription et la premiere tranche,
  // le deuxieme ne regle qu'une partie : le tableau de bord montre alors des impayes.
  const caissier = await User.findOne({ email: 'secretaire@technolab-ista.edu' }).select('_id').lean();
  const directeur = await User.findOne({ email: 'directeur@technolab-ista.edu' }).select('_id').lean();

  let paiementsCrees = 0;

  for (const [index, etudiant] of etudiants.slice(0, 3).entries()) {
    const echeances = await Echeance.find({ etudiant: etudiant._id, anneeScolaire: ANNEE })
      .sort('dateEcheance')
      .limit(index === 0 ? 2 : 1);

    for (const echeance of echeances) {
      if (await Paiement.exists({ echeance: echeance._id })) continue;

      // Le troisieme etudiant ne verse qu'un acompte de 40 %.
      const montant = index === 2
        ? Math.round(echeance.montant * 0.4)
        : echeance.montant;

      await Paiement.create({
        numeroRecu: await genererNumeroRecu(),
        etudiant: etudiant._id,
        echeance: echeance._id,
        montant,
        mode: index === 1 ? 'mobile_money' : 'especes',
        datePaiement: new Date(),
        statut: 'valide',
        encaissePar: caissier?._id,
        validePar: directeur?._id,
        dateValidation: new Date(),
      });

      await recalculerEcheance(echeance._id);
      paiementsCrees += 1;
    }
  }

  console.log(
    `[seed] Comptabilite : ${fraisCrees} frais, ${echeancesCreees} echeance(s) generee(s), `
    + `${paiementsCrees} paiement(s)`
  );
}
