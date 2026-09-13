import mongoose from 'mongoose';

/**
 * Types de matiere — la nomenclature disciplinaire de l'etablissement.
 *
 * EN BASE PLUTOT QU'EN ENUMERATION : les filieres evoluent, et l'ouverture d'un
 * cursus ne doit pas exiger une mise en production. Une enumeration figee dans
 * le schema obligerait aussi a migrer toutes les matieres a chaque ajout.
 *
 * Le `code` est l'identifiant stable, cite par la matrice d'affinite et par les
 * matieres ; le `libelle` est ce que lit l'utilisateur et peut etre reformule
 * sans rien casser.
 */
const typeMatiereSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Le code du type est obligatoire'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 32,
      match: [/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'],
    },
    libelle: {
      type: String,
      required: [true, 'Le libelle est obligatoire'],
      trim: true,
      maxlength: 80,
    },
    // Rang d'affichage dans les listes deroulantes de saisie.
    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

typeMatiereSchema.index({ actif: 1, ordre: 1 });

export const TypeMatiere = mongoose.model('TypeMatiere', typeMatiereSchema);
