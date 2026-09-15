/** Schemas de validation des modules planning et statistiques. */
import { z } from 'zod';
import { JOURS, TYPES_SEANCE } from '../models/Creneau.js';
import { PERIODES } from '../models/Evaluation.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');
const heure = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format attendu : HH:MM');
const anneeScolaire = z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026');
const texteOptionnel = (max) => z.string().trim().max(max).optional().or(z.literal(''));

export const idParamSchema = z.object({ id: objectId });

export const creerCreneauSchema = z
  .object({
    matiere: objectId,
    jour: z.enum(JOURS, { message: 'Jour invalide' }),
    heureDebut: heure,
    heureFin: heure,
    salle: texteOptionnel(40),
    type: z.enum(TYPES_SEANCE).optional(),
    /*
     * Classes reunies avec la classe principale pour un cours mutualise.
     * Plafonnees a cinq : au-dela, il ne s'agit plus d'un cours commun mais
     * d'un amphitheatre, qui releve d'une autre organisation.
     */
    classesAssociees: z.array(objectId).max(5).optional(),
    anneeScolaire: anneeScolaire.optional(),
  })
  .refine((d) => d.heureFin > d.heureDebut, {
    message: 'L heure de fin doit suivre l heure de debut',
    path: ['heureFin'],
  });

export const majCreneauSchema = z
  .object({
    jour: z.enum(JOURS).optional(),
    heureDebut: heure.optional(),
    heureFin: heure.optional(),
    salle: texteOptionnel(40),
    type: z.enum(TYPES_SEANCE).optional(),
    classesAssociees: z.array(objectId).max(5).optional(),
    actif: z.coerce.boolean().optional(),
  })
  .refine((d) => !d.heureDebut || !d.heureFin || d.heureFin > d.heureDebut, {
    message: 'L heure de fin doit suivre l heure de debut',
    path: ['heureFin'],
  });

export const listePlanningQuerySchema = z.object({
  classe: objectId.optional(),
  professeur: objectId.optional(),
  jour: z.enum(JOURS).optional(),
  salle: z.string().trim().max(40).optional(),
  anneeScolaire: anneeScolaire.optional(),
});

/** Recopie d'un emploi du temps d'une classe vers une autre. */
export const dupliquerSchema = z
  .object({ source: objectId, cible: objectId })
  .refine((d) => d.source !== d.cible, {
    message: 'La classe cible doit differer de la source',
    path: ['cible'],
  });

export const statistiquesQuerySchema = z.object({
  periode: z.enum(PERIODES).optional(),
  anneeScolaire: anneeScolaire.optional(),
});
