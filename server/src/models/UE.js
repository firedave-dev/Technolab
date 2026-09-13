import mongoose from 'mongoose';

export const SEMESTRES = ['semestre1', 'semestre2'];

/**
 * Unite d'Enseignement : le regroupement de matieres du systeme LMD.
 *
 *     Classe
 *      └── UE (code, intitule)
 *           ├── Matiere (credits ECTS)
 *           └── Matiere (credits ECTS)
 *
 * L'UE est l'unite d'ACQUISITION : ses credits s'obtiennent en bloc, par
 * compensation entre ses matieres, et jamais matiere par matiere. C'est ce qui
 * justifie de l'introduire comme entite a part entiere plutot que comme simple
 * etiquette posee sur une matiere.
 *
 * Le TOTAL DE CREDITS DE L'UE N'EST PAS STOCKE : il est la somme des credits de
 * ses matieres, et le dupliquer ici creerait deux verites qui divergeraient des
 * la premiere matiere ajoutee. Le projet applique la meme regle aux bulletins et
 * aux soldes de paiement.
 */
const ueSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Le code de l UE est obligatoire'],
      trim: true,
      uppercase: true,
      maxlength: 12,
    },
    intitule: {
      type: String,
      required: [true, 'L intitule de l UE est obligatoire'],
      trim: true,
      maxlength: 120,
    },
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe', required: true, index: true },
    semestre: { type: String, enum: SEMESTRES, required: true },
    anneeScolaire: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'],
    },
    // Rang d'affichage sur le bulletin : l'ordre des UE y est significatif.
    ordre: { type: Number, default: 0 },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

// Un code d'UE est unique au sein d'une classe, pour un semestre et une annee.
ueSchema.index({ code: 1, classe: 1, semestre: 1, anneeScolaire: 1 }, { unique: true });
ueSchema.index({ classe: 1, semestre: 1, ordre: 1 });

/** Matieres rattachees, pour peupler l'UE sans requete separee. */
ueSchema.virtual('matieres', {
  ref: 'Matiere',
  localField: '_id',
  foreignField: 'ue',
});

export const UE = mongoose.model('UE', ueSchema);
