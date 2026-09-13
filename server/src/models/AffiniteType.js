import mongoose from 'mongoose';
import { POIDS } from '../services/appariement.service.js';

export const NIVEAUX_AFFINITE = {
  forte: POIDS.affiniteForte,
  moyenne: POIDS.affiniteMoyenne,
};

/**
 * Proximite entre deux types de matiere, pour l'appariement en UE.
 *
 * SYMETRIE GARANTIE PAR LE STOCKAGE, pas par convention. Les deux codes sont
 * tries avant enregistrement, si bien qu'il n'existe qu'une seule ligne par
 * couple : « maths / stats » et « stats / maths » designent la meme. Sans cela
 * on finirait avec deux lignes divergentes et un appariement dependant du sens
 * d'interrogation.
 *
 * Administrable en base : la nomenclature disciplinaire evoluera avec les
 * filieres, et cette matrice avec elle.
 */
const affiniteSchema = new mongoose.Schema(
  {
    typeA: { type: String, required: true, trim: true, lowercase: true },
    typeB: { type: String, required: true, trim: true, lowercase: true },
    niveau: {
      type: String,
      enum: Object.keys(NIVEAUX_AFFINITE),
      required: [true, 'Le niveau d affinite est obligatoire'],
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

/*
 * Normalisation avant validation : les deux codes sont ordonnes, et un couple
 * reflexif est refuse — deux matieres du meme type relevent de la regle « meme
 * type », qui prime deja sur toute affinite.
 */
affiniteSchema.pre('validate', function ordonnerLesCodes(suite) {
  if (this.typeA && this.typeB) {
    const [a, b] = [this.typeA.toLowerCase(), this.typeB.toLowerCase()].sort();
    if (a === b) return suite(new Error('Une affinite relie deux types differents'));
    this.typeA = a;
    this.typeB = b;
  }
  return suite();
});

affiniteSchema.index({ typeA: 1, typeB: 1 }, { unique: true });

export const AffiniteType = mongoose.model('AffiniteType', affiniteSchema);

/**
 * Matrice d'affinite dans la forme attendue par appariement.service.js :
 * une Map dont la cle est « typeA|typeB », codes tries.
 */
export async function matriceAffinites() {
  const lignes = await AffiniteType.find().lean();
  return new Map(
    lignes.map((l) => [`${l.typeA}|${l.typeB}`, NIVEAUX_AFFINITE[l.niveau] ?? 0])
  );
}
