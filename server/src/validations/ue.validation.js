/** Schemas de validation des Unites d'Enseignement. */
import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');
const semestre = z.enum(['semestre1', 'semestre2']);
const anneeScolaire = z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026');

export const semestreQuerySchema = z.object({
  classe: objectId,
  semestre: semestre.optional(),
  anneeScolaire: anneeScolaire.optional(),
});

export const appliquerUESchema = z.object({
  classe: objectId,
  semestre,
  anneeScolaire: anneeScolaire.optional(),
  ues: z
    .array(
      z.object({
        code: z.string().trim().max(12).optional(),
        intitule: z.string().trim().min(2, 'Intitule trop court').max(120),
        // Deux matieres au minimum : une UE d'une seule matiere ne compense rien.
        matieres: z.array(objectId).min(2, 'Une UE regroupe au moins deux matieres'),
      })
    )
    .min(1, 'Au moins une UE est attendue'),
});

export const echangeMatieresSchema = z.object({
  matiereA: objectId,
  matiereB: objectId,
});
