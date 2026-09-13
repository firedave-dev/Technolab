/** Schemas de validation de la saisie des notes de matiere. */
import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');
const semestre = z.enum(['semestre1', 'semestre2']);

/**
 * Note sur 20, ou `null` pour « pas de note ».
 *
 * `null` doit passer explicitement : il distingue une note RETIREE d'un champ
 * simplement absent du corps, et le calcul s'appuie sur cette difference —
 * une composante nulle est ecartee de la ponderation, jamais comptee pour zero.
 */
const note = z.coerce
  .number()
  .min(0, 'La note ne peut pas etre negative')
  .max(20, 'La note ne peut pas depasser 20')
  .nullable();

export const grilleQuerySchema = z.object({
  matiere: objectId,
  semestre: semestre.optional(),
});

export const enregistrerGrilleSchema = z.object({
  matiere: objectId,
  semestre: semestre.optional(),
  lignes: z
    .array(
      z.object({
        etudiant: objectId,
        noteClasse: note.optional(),
        noteExamen: note.optional(),
        appreciation: z.string().trim().max(300).optional(),
      })
    )
    .min(1, 'Aucune ligne a enregistrer')
    .max(200, 'Grille trop volumineuse'),
});

export const publicationSchema = z.object({
  matiere: objectId,
  semestre: semestre.optional(),
  publiee: z.boolean(),
});
