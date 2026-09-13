import mongoose from 'mongoose';
import { SEMESTRES } from './UE.js';

/**
 * Les DEUX notes d'un etudiant dans une matiere, pour un semestre.
 *
 * Ce modele remplace le couple Evaluation + Note, qui permettait un nombre
 * quelconque d'evaluations par professeur (interrogations numerotees, devoirs
 * surveilles multiples...). L'etablissement n'exploite pas cette granularite :
 * le professeur fait sa propre synthese du travail de l'annee hors plateforme et
 * ne reporte que deux valeurs.
 *
 * Tout le reste — note de matiere, moyenne d'UE, credits, moyenne generale — est
 * RECALCULE a la demande par services/notation.service.js, jamais stocke. Une
 * note de matiere figee en base deviendrait fausse le jour ou la ponderation
 * change, et le parametre qui la porte est precisement reglable.
 *
 * `publiee` separe la saisie de la diffusion : le professeur remplit
 * tranquillement, puis publie. Tant que c'est faux, ni l'etudiant ni la famille
 * ne voient quoi que ce soit.
 */
const noteMatiereSchema = new mongoose.Schema(
  {
    matiere: { type: mongoose.Schema.Types.ObjectId, ref: 'Matiere', required: true, index: true },
    etudiant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    semestre: { type: String, enum: SEMESTRES, required: true },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },

    /*
     * Les deux notes sur 20.
     *
     * `null` signifie « pas encore saisie » et n'est PAS un zero : le calcul
     * retire alors la composante au lieu de la compter pour rien, sans quoi un
     * examen non encore passe ecraserait la note de classe.
     */
    noteClasse: { type: Number, min: 0, max: 20, default: null },
    noteExamen: { type: Number, min: 0, max: 20, default: null },

    appreciation: { type: String, trim: true, maxlength: 300 },
    publiee: { type: Boolean, default: false, index: true },
    saisiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

/*
 * Une seule ligne par etudiant, matiere et semestre. L'unicite est portee par
 * l'index plutot que par une verification applicative : deux enregistrements
 * simultanes depuis la grille de saisie passeraient entre les mailles d'un
 * simple « findOne puis create ».
 */
noteMatiereSchema.index(
  { matiere: 1, etudiant: 1, semestre: 1, anneeScolaire: 1 },
  { unique: true }
);

// Lecture la plus frequente : toutes les notes d'un etudiant sur un semestre.
noteMatiereSchema.index({ etudiant: 1, anneeScolaire: 1, semestre: 1 });

export const NoteMatiere = mongoose.model('NoteMatiere', noteMatiereSchema);
