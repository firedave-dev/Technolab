/** Schemas de validation des modules utilisateurs, etudiants et classes. */
import { z } from 'zod';
import { ROLE_VALUES } from '../config/roles.js';
import { STATUTS_ETUDIANT, TYPES_CONTRAT } from '../models/User.js';
import { NIVEAUX } from '../models/Classe.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');
const texteOptionnel = (max) => z.string().trim().max(max).optional().or(z.literal(''));

const motDePasse = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
  .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

const infosEtudiant = z.object({
  classe: objectId.optional().or(z.literal('')),
  anneeInscription: z.coerce.number().int().min(2000).max(2100).optional(),
  statut: z.enum(STATUTS_ETUDIANT).optional(),
  lieuNaissance: texteOptionnel(80),
  nationalite: texteOptionnel(60),
});

const infosPersonnel = z.object({
  fonction: texteOptionnel(80),
  specialite: texteOptionnel(80),
  dateEmbauche: z.coerce.date().optional(),
  typeContrat: z.enum(TYPES_CONTRAT).optional(),
  salaire: z.coerce.number().min(0).optional(),
});

/** Creation d'un compte par l'administration. */
export const creerUtilisateurSchema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court').max(60),
  prenom: z.string().trim().min(2, 'Prenom trop court').max(60),
  email: z.string().trim().toLowerCase().email('Format email invalide'),
  role: z.enum(ROLE_VALUES, { message: 'Role invalide' }),
  // Optionnel : un mot de passe provisoire est genere si le champ est absent.
  motDePasse: motDePasse.optional(),
  matricule: texteOptionnel(30),
  telephone: texteOptionnel(25),
  adresse: texteOptionnel(200),
  dateNaissance: z.coerce.date().optional(),
  sexe: z.enum(['M', 'F', 'autre']).optional(),
  infosEtudiant: infosEtudiant.optional(),
  infosPersonnel: infosPersonnel.optional(),
});

/** Mise a jour : tous les champs sont optionnels, le role et l'email restent modifiables. */
export const majUtilisateurSchema = z.object({
  nom: z.string().trim().min(2).max(60).optional(),
  prenom: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().toLowerCase().email('Format email invalide').optional(),
  role: z.enum(ROLE_VALUES).optional(),
  telephone: texteOptionnel(25),
  adresse: texteOptionnel(200),
  dateNaissance: z.coerce.date().optional(),
  sexe: z.enum(['M', 'F', 'autre']).optional(),
  actif: z.coerce.boolean().optional(),
  infosEtudiant: infosEtudiant.optional(),
  infosPersonnel: infosPersonnel.optional(),
});

export const idParamSchema = z.object({ id: objectId });

export const listeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  tri: z.string().max(40).default('nom'),
  q: z.string().trim().max(80).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  // Liste separee par des virgules : permet de cibler par exemple tout le personnel.
  roles: z.string()
    .transform((v) => v.split(',').map((r) => r.trim()).filter(Boolean))
    .pipe(z.array(z.enum(ROLE_VALUES)).min(1))
    .optional(),
  actif: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  classe: objectId.optional(),
  statut: z.enum(STATUTS_ETUDIANT).optional(),
});

export const nouveauMotDePasseSchema = z.object({
  motDePasse: motDePasse.optional(), // absent => mot de passe provisoire genere
});

export const lienParentSchema = z.object({
  parentId: objectId,
});

export const affecterClasseSchema = z.object({
  classe: objectId.nullable(),
});

// --- Classes ---
export const creerClasseSchema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court').max(60),
  niveau: z.enum(NIVEAUX, { message: 'Niveau invalide' }),
  filiere: z.string().trim().min(2, 'Filiere trop courte').max(80),
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'),
  capacite: z.coerce.number().int().min(1).max(500).optional(),
  professeurPrincipal: objectId.optional().or(z.literal('')),
});

export const majClasseSchema = creerClasseSchema.partial().extend({
  actif: z.coerce.boolean().optional(),
});

export const listeClassesQuerySchema = z.object({
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  niveau: z.enum(NIVEAUX).optional(),
  actif: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  q: z.string().trim().max(80).optional(),
});

/** Params combines pour le detachement d'un parent. */
export const idEtParentParamSchema = z.object({
  id: objectId,
  parentId: objectId,
});
