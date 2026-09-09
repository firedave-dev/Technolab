/** Schemas de validation des payloads d'authentification. */
import { z } from 'zod';
import { ROLE_VALUES } from '../config/roles.js';

const motDePasse = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
  .regex(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');

export const loginSchema = z.object({
  email: z.string({ error: "L email est obligatoire" }).trim().toLowerCase().email('Format email invalide'),
  motDePasse: z.string({ error: 'Le mot de passe est obligatoire' }).min(1, 'Le mot de passe est obligatoire'),
});

export const registerSchema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court').max(60),
  prenom: z.string().trim().min(2, 'Prenom trop court').max(60),
  email: z.string().trim().toLowerCase().email('Format email invalide'),
  motDePasse,
  role: z.enum(ROLE_VALUES, { message: 'Role invalide' }),
  telephone: z.string().trim().max(25).optional(),
  matricule: z.string().trim().max(30).optional(),
  dateNaissance: z.coerce.date().optional(),
  adresse: z.string().trim().max(200).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Format email invalide'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Jeton invalide'),
  motDePasse,
});

export const changePasswordSchema = z.object({
  ancienMotDePasse: z.string().min(1, "L ancien mot de passe est obligatoire"),
  nouveauMotDePasse: motDePasse,
});

export const updateMeSchema = z.object({
  nom: z.string().trim().min(2).max(60).optional(),
  prenom: z.string().trim().min(2).max(60).optional(),
  telephone: z.string().trim().max(25).optional(),
  adresse: z.string().trim().max(200).optional(),
  photoUrl: z.string().trim().url('URL invalide').optional(),
});
