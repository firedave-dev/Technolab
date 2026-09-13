/** Schemas de validation des modules matieres, evaluations, notes, examens et absences. */
import { z } from 'zod';
import { PERIODES, TYPES_EVALUATION } from '../models/Evaluation.js';
import { STATUTS_EXAMEN, TYPES_EXAMEN } from '../models/Examen.js';
import { TYPES_ABSENCE } from '../models/Absence.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');
const heure = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format attendu : HH:MM');
const anneeScolaire = z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026');
const texteOptionnel = (max) => z.string().trim().max(max).optional().or(z.literal(''));

export const idParamSchema = z.object({ id: objectId });

// --- Matieres ---

export const creerMatiereSchema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court').max(80),
  code: z.string().trim().min(2, 'Code trop court').max(12),
  coefficient: z.coerce.number().min(1).max(10).optional(),
  // Le credit n'est PAS accepte en entree : il est deduit du coefficient.
  semestre: z.enum(['semestre1', 'semestre2']).optional(),
  typeMatiere: z.string().trim().toLowerCase().max(32).optional(),
  classe: objectId,
  professeur: objectId.optional().or(z.literal('')),
  anneeScolaire,
  description: texteOptionnel(300),
});

export const majMatiereSchema = creerMatiereSchema.partial().extend({
  actif: z.coerce.boolean().optional(),
});

export const listeMatieresQuerySchema = z.object({
  classe: objectId.optional(),
  semestre: z.enum(['semestre1', 'semestre2']).optional(),
  professeur: objectId.optional(),
  anneeScolaire: anneeScolaire.optional(),
  actif: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  q: z.string().trim().max(80).optional(),
});

// --- Evaluations ---

export const creerEvaluationSchema = z.object({
  matiere: objectId,
  titre: z.string().trim().min(2, 'Titre trop court').max(100),
  type: z.enum(TYPES_EVALUATION).optional(),
  date: z.coerce.date(),
  bareme: z.coerce.number().min(1).max(100).optional(),
  coefficient: z.coerce.number().min(0.5).max(10).optional(),
  periode: z.enum(PERIODES),
});

export const majEvaluationSchema = creerEvaluationSchema.partial().omit({ matiere: true }).extend({
  publiee: z.coerce.boolean().optional(),
});

export const listeEvaluationsQuerySchema = z.object({
  matiere: objectId.optional(),
  classe: objectId.optional(),
  periode: z.enum(PERIODES).optional(),
  type: z.enum(TYPES_EVALUATION).optional(),
  publiee: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

/** Saisie en lot : un tableau de notes remplace l'ensemble des notes de l'evaluation. */
export const saisieNotesSchema = z.object({
  notes: z
    .array(
      z.object({
        etudiant: objectId,
        // null = note non saisie (la ligne est alors ignoree si l'etudiant n'est pas absent)
        valeur: z.coerce.number().min(0).nullable().optional(),
        absent: z.coerce.boolean().optional(),
        appreciation: texteOptionnel(200),
      })
    )
    .min(1, 'Aucune note transmise')
    .max(300),
});

// --- Bulletin ---

export const bulletinQuerySchema = z.object({
  periode: z.enum(PERIODES).optional(),
  anneeScolaire: anneeScolaire.optional(),
});

// --- Examens ---

export const creerExamenSchema = z
  .object({
    matiere: objectId,
    titre: texteOptionnel(100),
    type: z.enum(TYPES_EXAMEN).optional(),
    date: z.coerce.date(),
    heureDebut: heure,
    heureFin: heure,
    salle: z.string().trim().min(1, 'La salle est obligatoire').max(40),
    surveillants: z.array(objectId).max(10).optional(),
    instructions: texteOptionnel(500),
  })
  .refine((d) => d.heureFin > d.heureDebut, {
    message: 'L heure de fin doit suivre l heure de debut',
    path: ['heureFin'],
  });

export const majExamenSchema = z
  .object({
    titre: texteOptionnel(100),
    type: z.enum(TYPES_EXAMEN).optional(),
    date: z.coerce.date().optional(),
    heureDebut: heure.optional(),
    heureFin: heure.optional(),
    salle: z.string().trim().min(1).max(40).optional(),
    surveillants: z.array(objectId).max(10).optional(),
    instructions: texteOptionnel(500),
    statut: z.enum(STATUTS_EXAMEN).optional(),
  })
  .refine((d) => !d.heureDebut || !d.heureFin || d.heureFin > d.heureDebut, {
    message: 'L heure de fin doit suivre l heure de debut',
    path: ['heureFin'],
  });

export const listeExamensQuerySchema = z.object({
  classe: objectId.optional(),
  matiere: objectId.optional(),
  statut: z.enum(STATUTS_EXAMEN).optional(),
  du: z.coerce.date().optional(),
  au: z.coerce.date().optional(),
});

// --- Absences ---

export const creerAbsenceSchema = z.object({
  etudiant: objectId,
  date: z.coerce.date(),
  matiere: objectId.optional().or(z.literal('')),
  creneau: texteOptionnel(20),
  type: z.enum(TYPES_ABSENCE).optional(),
  minutesRetard: z.coerce.number().min(0).max(480).optional(),
  motif: texteOptionnel(300),
});

/** Feuille d'appel : une seule requete enregistre tous les absents d'un creneau. */
export const feuilleAppelSchema = z.object({
  classe: objectId,
  date: z.coerce.date(),
  matiere: objectId.optional().or(z.literal('')),
  creneau: texteOptionnel(20),
  lignes: z
    .array(
      z.object({
        etudiant: objectId,
        present: z.coerce.boolean(),
        type: z.enum(TYPES_ABSENCE).optional(),
        minutesRetard: z.coerce.number().min(0).max(480).optional(),
      })
    )
    .min(1, 'Aucune ligne transmise')
    .max(300),
});

export const justifierAbsenceSchema = z.object({
  justifie: z.coerce.boolean(),
  motif: texteOptionnel(300),
});

export const listeAbsencesQuerySchema = z.object({
  etudiant: objectId.optional(),
  classe: objectId.optional(),
  matiere: objectId.optional(),
  type: z.enum(TYPES_ABSENCE).optional(),
  justifie: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  du: z.coerce.date().optional(),
  au: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(200).default(30),
});

// --- Notifications ---

export const listeNotificationsQuerySchema = z.object({
  lu: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export const etatAppelQuerySchema = z.object({
  classe: objectId,
  date: z.coerce.date().optional(),
  matiere: objectId.optional(),
  creneau: texteOptionnel(20),
});

export const statistiquesAbsencesQuerySchema = z.object({
  classe: objectId.optional(),
  du: z.coerce.date().optional(),
  au: z.coerce.date().optional(),
});

export const releveQuerySchema = z.object({
  periode: z.enum(PERIODES).optional(),
});
