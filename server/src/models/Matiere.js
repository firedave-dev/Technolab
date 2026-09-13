import mongoose from 'mongoose';
import { creditsDepuisCoefficient } from '../services/appariement.service.js';
import { SEMESTRES } from './UE.js';

/**
 * Matiere enseignee : pivot entre une classe et un professeur.
 * Toutes les evaluations, examens et absences s'y rattachent.
 */
const matiereSchema = new mongoose.Schema(
  {
    nom: { type: String, required: [true, 'Le nom de la matiere est obligatoire'], trim: true, maxlength: 80 },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    /*
     * Ancien poids de la matiere dans la moyenne.
     *
     * Conserve pour la periode de transition : dans le LMD, c'est le CREDIT qui
     * fait office de poids, et `creditsEcts` ci-dessous le remplace. Le champ
     * reste lisible par les ecrans non encore bascules ; plus aucun calcul ne
     * s'y appuie.
     */
    coefficient: { type: Number, min: 1, max: 10, default: 1 },

    /**
     * Unite d'Enseignement de rattachement.
     *
     * Facultatif a dessein : la migration cree une UE par matiere existante, mais
     * une matiere saisie hors de ce circuit ne doit pas etre rejetee. Elle
     * apparait alors hors UE sur le bulletin, ce qui se voit et se corrige.
     */
    ue: { type: mongoose.Schema.Types.ObjectId, ref: 'UE', index: true },

    /**
     * Semestre d'enseignement.
     *
     * Porte par la MATIERE et non deduit de son UE : la contrainte des 30
     * credits s'applique par semestre, et doit donc pouvoir etre evaluee avant
     * qu'aucune UE n'existe — c'est precisement pendant la saisie des matieres
     * que l'assistant doit avertir d'une impasse.
     */
    semestre: { type: String, enum: SEMESTRES, default: 'semestre1', index: true },

    /**
     * Type disciplinaire, qui gouverne l'appariement en UE.
     * Reference le `code` de TypeMatiere — nomenclature administrable en base.
     */
    typeMatiere: { type: String, trim: true, lowercase: true, index: true },

    /**
     * Credits ECTS. Poids de la matiere dans la moyenne de son UE.
     *
     * JAMAIS SAISI : deduit du coefficient par les crochets ci-dessous
     * (coefficient <= 2 donne 2 credits, >= 3 en donne 3). Le laisser modifiable
     * creerait deux sources de verite pour un meme poids pedagogique, qui
     * divergeraient a la premiere correction de coefficient.
     */
    creditsEcts: { type: Number, min: 0, max: 30, default: 2 },

    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    professeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },
    description: { type: String, trim: true, maxlength: 300 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Un code de matiere est unique au sein d'une classe pour une annee donnee.
matiereSchema.index({ code: 1, classe: 1, anneeScolaire: 1 }, { unique: true });

/*
 * Le credit suit le coefficient, a la creation comme a la modification.
 *
 * La regle est posee aux DEUX niveaux — document et requete — parce qu'ils ne se
 * declenchent pas dans les memes cas : `pre('save')` ignore les `updateOne` et
 * `findOneAndUpdate`, par lesquels passent la plupart des ecrans d'edition. Une
 * correction de coefficient faite par ce chemin laisserait sinon le credit
 * derriere elle, et la matiere basculerait silencieusement d'une UE de 6 vers
 * une UE de 4 au prochain appariement.
 */
matiereSchema.pre('validate', function deduireLesCredits(suite) {
  this.creditsEcts = creditsDepuisCoefficient(this.coefficient);
  return suite();
});

matiereSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function suivreLeCoefficient(suite) {
  const modifications = this.getUpdate();
  const cible = modifications?.$set ?? modifications;
  if (!cible || cible.coefficient === undefined) return suite();

  cible.creditsEcts = creditsDepuisCoefficient(cible.coefficient);
  return suite();
});

export const Matiere = mongoose.model('Matiere', matiereSchema);
