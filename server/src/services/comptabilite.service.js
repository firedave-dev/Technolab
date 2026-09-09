/**
 * Regles comptables communes : numerotation des recus, generation des echeanciers,
 * recalcul des soldes et agregats.
 *
 * Principe central : `montantPaye` d'une echeance n'est jamais incremente a la main.
 * Il est systematiquement recalcule depuis la somme des paiements VALIDES, ce qui garde
 * les soldes justes apres une annulation ou une validation tardive.
 */
import { Echeance } from '../models/Echeance.js';
import { Paiement } from '../models/Paiement.js';
import { FraisScolarite } from '../models/FraisScolarite.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';

/**
 * Numero de recu lisible et unique : REC-ANNEE-SEQUENCE (ex. REC-2026-0042).
 * La boucle absorbe une collision entre deux encaissements simultanes.
 */
export async function genererNumeroRecu(annee = new Date().getFullYear()) {
  const prefixe = `REC-${annee}`;

  const dernier = await Paiement.findOne({ numeroRecu: new RegExp(`^${prefixe}-`) })
    .sort({ numeroRecu: -1 })
    .select('numeroRecu')
    .lean();

  let sequence = dernier ? Number(dernier.numeroRecu.split('-').pop()) + 1 : 1;

  for (let essai = 0; essai < 20; essai += 1, sequence += 1) {
    const candidat = `${prefixe}-${String(sequence).padStart(4, '0')}`;
    if (!(await Paiement.exists({ numeroRecu: candidat }))) return candidat;
  }

  return `${prefixe}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Recalcule le solde d'une echeance depuis ses paiements valides.
 * Appele apres toute creation, validation ou annulation de paiement.
 */
export async function recalculerEcheance(echeanceId) {
  if (!echeanceId) return null;

  const echeance = await Echeance.findById(echeanceId);
  if (!echeance) return null;

  const [agregat] = await Paiement.aggregate([
    { $match: { echeance: echeance._id, statut: 'valide' } },
    { $group: { _id: null, total: { $sum: '$montant' } } },
  ]);

  echeance.montantPaye = agregat?.total || 0;

  if (echeance.statut !== 'annule') {
    if (echeance.montantPaye >= echeance.montant) echeance.statut = 'paye';
    else if (echeance.montantPaye > 0) echeance.statut = 'partiel';
    else echeance.statut = 'a_payer';
  }

  await echeance.save();
  return echeance;
}

/**
 * Genere (ou complete) l'echeancier d'un etudiant a partir de la grille tarifaire
 * de sa classe. L'operation est rejouable : les tranches deja creees sont conservees.
 */
export async function genererEcheancier(etudiantId, anneeScolaire) {
  const etudiant = await User.findOne({ _id: etudiantId, role: ROLES.ETUDIANT })
    .populate('infosEtudiant.classe', 'nom anneeScolaire')
    .lean();

  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');

  const classe = etudiant.infosEtudiant?.classe;
  if (!classe) throw ApiError.badRequest("Cet etudiant n'est affecte a aucune classe");

  const annee = anneeScolaire || classe.anneeScolaire;
  const frais = await FraisScolarite.find({ classe: classe._id, anneeScolaire: annee, actif: true });

  if (!frais.length) {
    throw ApiError.badRequest(`Aucun frais defini pour ${classe.nom} en ${annee}`);
  }

  const operations = [];

  for (const ligne of frais) {
    for (let numero = 1; numero <= ligne.nombreTranches; numero += 1) {
      const suffixe = ligne.nombreTranches > 1 ? ` — tranche ${numero}/${ligne.nombreTranches}` : '';

      operations.push({
        updateOne: {
          filter: { etudiant: etudiant._id, frais: ligne._id, numeroTranche: numero },
          update: {
            // Seules les donnees de reference sont mises a jour : le solde reste calcule.
            $set: {
              classe: classe._id,
              libelle: `${ligne.libelle}${suffixe}`,
              type: ligne.type,
              montant: ligne.montantTranche(numero),
              dateEcheance: ligne.dateTranche(numero),
              anneeScolaire: annee,
            },
            $setOnInsert: { montantPaye: 0, statut: 'a_payer' },
          },
          upsert: true,
        },
      });
    }
  }

  const resultat = await Echeance.bulkWrite(operations);

  return {
    creees: resultat.upsertedCount || 0,
    misesAJour: resultat.modifiedCount || 0,
    total: operations.length,
  };
}

/** Solde d'un etudiant : total du, encaisse, reste et retards. */
export async function soldeEtudiant(etudiantId, anneeScolaire) {
  const filtre = { etudiant: etudiantId, statut: { $ne: 'annule' } };
  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;

  const echeances = await Echeance.find(filtre).sort('dateEcheance').lean();
  const maintenant = new Date();

  const total = echeances.reduce((s, e) => s + e.montant, 0);
  const paye = echeances.reduce((s, e) => s + e.montantPaye, 0);
  const enRetard = echeances.filter(
    (e) => e.statut !== 'paye' && new Date(e.dateEcheance) < maintenant
  );

  return {
    total,
    paye,
    reste: Math.max(0, total - paye),
    tauxReglement: total ? Math.round((paye / total) * 100) : null,
    echeances: echeances.length,
    echeancesEnRetard: enRetard.length,
    montantEnRetard: enRetard.reduce((s, e) => s + (e.montant - e.montantPaye), 0),
  };
}

/**
 * Restreint une consultation au perimetre de l'acteur.
 * Renvoie `null` pour le personnel (aucune restriction), sinon la liste des etudiants autorises.
 */
export function perimetreFinancier(acteur) {
  if (STAFF_ROLES.includes(acteur.role)) return null;
  if (acteur.role === ROLES.ETUDIANT) return [acteur._id];
  if (acteur.role === ROLES.PARENT) return acteur.enfants || [];
  return [];
}

/** Verifie l'acces au dossier financier d'un etudiant precis. */
export function verifierAccesFinancier(acteur, etudiantId) {
  const autorises = perimetreFinancier(acteur);
  if (autorises === null) return;

  if (!autorises.some((id) => String(id) === String(etudiantId))) {
    throw ApiError.forbidden('Vous ne pouvez consulter que votre dossier ou celui de vos enfants');
  }
}

/** Agregats pour le tableau de bord comptable. */
export async function statistiquesComptables({ classe, anneeScolaire } = {}) {
  const filtreEcheance = { statut: { $ne: 'annule' } };
  if (classe) filtreEcheance.classe = classe;
  if (anneeScolaire) filtreEcheance.anneeScolaire = anneeScolaire;

  const [agregat] = await Echeance.aggregate([
    { $match: filtreEcheance },
    {
      $group: {
        _id: null,
        attendu: { $sum: '$montant' },
        encaisse: { $sum: '$montantPaye' },
        lignes: { $sum: 1 },
      },
    },
  ]);

  const maintenant = new Date();

  const [retards] = await Echeance.aggregate([
    { $match: { ...filtreEcheance, statut: { $in: ['a_payer', 'partiel'] }, dateEcheance: { $lt: maintenant } } },
    {
      $group: {
        _id: null,
        montant: { $sum: { $subtract: ['$montant', '$montantPaye'] } },
        lignes: { $sum: 1 },
      },
    },
  ]);

  const [enAttente] = await Paiement.aggregate([
    { $match: { statut: 'en_attente' } },
    { $group: { _id: null, montant: { $sum: '$montant' }, nombre: { $sum: 1 } } },
  ]);

  const attendu = agregat?.attendu || 0;
  const encaisse = agregat?.encaisse || 0;

  return {
    attendu,
    encaisse,
    reste: Math.max(0, attendu - encaisse),
    tauxRecouvrement: attendu ? Math.round((encaisse / attendu) * 100) : null,
    echeances: agregat?.lignes || 0,
    retards: { montant: retards?.montant || 0, lignes: retards?.lignes || 0 },
    paiementsEnAttente: { montant: enAttente?.montant || 0, nombre: enAttente?.nombre || 0 },
  };
}
