/** Schemas de validation des modules frais, echeanciers et paiements. */
import { z } from 'zod';
import { TYPES_FRAIS } from '../models/FraisScolarite.js';
import { STATUTS_ECHEANCE } from '../models/Echeance.js';
import { MODES_PAIEMENT, STATUTS_PAIEMENT } from '../models/Paiement.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');
const anneeScolaire = z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026');
const texteOptionnel = (max) => z.string().trim().max(max).optional().or(z.literal(''));
const booleen = z.enum(['true', 'false']).transform((v) => v === 'true');

export const idParamSchema = z.object({ id: objectId });

// --- Grille tarifaire ---

export const creerFraisSchema = z.object({
  libelle: z.string().trim().min(2, 'Libelle trop court').max(80),
  type: z.enum(TYPES_FRAIS).optional(),
  montant: z.coerce.number().min(0, 'Montant invalide').max(100_000_000),
  classe: objectId,
  anneeScolaire,
  nombreTranches: z.coerce.number().int().min(1).max(12).optional(),
  premiereEcheance: z.coerce.date(),
  intervalleMois: z.coerce.number().int().min(0).max(12).optional(),
  obligatoire: z.coerce.boolean().optional(),
});

export const majFraisSchema = creerFraisSchema.partial().extend({
  actif: z.coerce.boolean().optional(),
});

export const listeFraisQuerySchema = z.object({
  classe: objectId.optional(),
  anneeScolaire: anneeScolaire.optional(),
  type: z.enum(TYPES_FRAIS).optional(),
  actif: booleen.optional(),
});

// --- Echeanciers ---

export const genererEcheancierSchema = z.object({
  anneeScolaire: anneeScolaire.optional(),
});

/** Generation en lot pour toute une classe. */
export const genererClasseSchema = z.object({
  classe: objectId,
  anneeScolaire: anneeScolaire.optional(),
});

export const listeEcheancesQuerySchema = z.object({
  etudiant: objectId.optional(),
  classe: objectId.optional(),
  statut: z.enum(STATUTS_ECHEANCE).optional(),
  anneeScolaire: anneeScolaire.optional(),
  enRetard: booleen.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(200).default(50),
});

export const majEcheanceSchema = z.object({
  montant: z.coerce.number().min(0).max(100_000_000).optional(),
  dateEcheance: z.coerce.date().optional(),
  statut: z.enum(STATUTS_ECHEANCE).optional(),
});

// --- Paiements ---

export const creerPaiementSchema = z.object({
  etudiant: objectId,
  // Facultatif : un versement libre n'est rattache a aucune echeance.
  echeance: objectId.optional().or(z.literal('')),
  montant: z.coerce.number().min(1, 'Le montant doit etre positif').max(100_000_000),
  mode: z.enum(MODES_PAIEMENT).optional(),
  reference: texteOptionnel(60),
  datePaiement: z.coerce.date().optional(),
  commentaire: texteOptionnel(300),
});

export const annulerPaiementSchema = z.object({
  motif: z.string().trim().min(3, 'Precisez le motif d annulation').max(300),
});

export const listePaiementsQuerySchema = z.object({
  etudiant: objectId.optional(),
  classe: objectId.optional(),
  statut: z.enum(STATUTS_PAIEMENT).optional(),
  mode: z.enum(MODES_PAIEMENT).optional(),
  du: z.coerce.date().optional(),
  au: z.coerce.date().optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(200).default(30),
});

export const statistiquesQuerySchema = z.object({
  classe: objectId.optional(),
  anneeScolaire: anneeScolaire.optional(),
});

export const soldeQuerySchema = z.object({
  anneeScolaire: anneeScolaire.optional(),
});

/** Numero de recu au format REC-ANNEE-SEQUENCE, tel qu'imprime sur le document. */
export const verificationRecuSchema = z.object({
  numeroRecu: z.string().regex(/^REC-\d{4}-[A-Z0-9]{4}$/, 'Numero de recu invalide'),
});

/**
 * Relance des familles sur les echeances dues.
 *
 * `simulation` permet de voir le perimetre avant d'envoyer : c'est la seule
 * protection contre une relance adressee a tort a des familles a jour.
 */
export const rappelsSchema = z.object({
  classe: objectId.optional(),
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026').optional(),
  // 0 = ne relancer que le retard avere ; 7 = prevenir une semaine avant.
  joursAvant: z.coerce.number().int().min(0).max(60).optional(),
  simulation: z.coerce.boolean().optional(),
});
