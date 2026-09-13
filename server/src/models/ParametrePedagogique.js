import mongoose from 'mongoose';
import { PONDERATION_PAR_DEFAUT, SEUIL_VALIDATION } from '../services/notation.service.js';

/**
 * Parametres du reglement pedagogique, modifiables sans redeploiement.
 *
 * POURQUOI EN BASE PLUTOT QU'EN CONSTANTE — la ponderation de la note de matiere
 * et le seuil de validation relevent du reglement de l'etablissement, pas du
 * code. Un changement de reglement ne doit pas exiger une mise en production :
 * il doit se regler depuis l'administration.
 *
 * DOCUMENT UNIQUE — il n'existe qu'une seule ligne, reperee par `cle`. L'index
 * unique l'impose plutot qu'une convention : deux lignes concurrentes
 * donneraient deux reglements selon l'ordre de lecture.
 *
 * Le module qui CALCULE (services/notation.service.js) reste pur et ignore ce
 * modele ; c'est ce modele qui lui fournit ses parametres. L'arithmetique reste
 * ainsi testable sans base.
 */
const parametreSchema = new mongoose.Schema(
  {
    cle: { type: String, default: 'pedagogie', unique: true, immutable: true },

    /** Poids de la note de classe dans la note de matiere. */
    poidsClasse: {
      type: Number,
      min: [0, 'Un poids ne peut pas etre negatif'],
      max: 10,
      default: PONDERATION_PAR_DEFAUT.poidsClasse,
    },

    /** Poids de la note d'examen. Vaut 2 au reglement en vigueur. */
    poidsExamen: {
      type: Number,
      min: [0, 'Un poids ne peut pas etre negatif'],
      max: 10,
      default: PONDERATION_PAR_DEFAUT.poidsExamen,
    },

    /** Note a partir de laquelle une UE est validee, bornes comprises. */
    seuilValidation: { type: Number, min: 0, max: 20, default: SEUIL_VALIDATION },

    /** Credits attendus par semestre — 30 dans le LMD, 60 sur l'annee. */
    creditsParSemestre: { type: Number, min: 1, max: 120, default: 30 },

    modifiePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

/*
 * Deux poids nuls rendraient toute note de matiere impossible a calculer : la
 * fonction n'aurait plus aucune composante a ponderer et renverrait null pour
 * tout le monde. On refuse la combinaison plutot que de la rattraper au calcul.
 */
const MESSAGE_PONDERATION = 'Au moins un des deux poids doit etre superieur a zero';

parametreSchema.pre('validate', function refuserPonderationNulle(suite) {
  if (!this.poidsClasse && !this.poidsExamen) return suite(new Error(MESSAGE_PONDERATION));
  return suite();
});

/*
 * La meme garde, au niveau des REQUETES.
 *
 * Le crochet `validate` ci-dessus ne s'execute que sur `save()` : une mise a
 * jour directe (`updateOne`, `findOneAndUpdate`) le contourne entierement, meme
 * avec `runValidators`, qui ne declenche que les validateurs de champ. La regle
 * porte sur la COMBINAISON des deux poids, elle doit donc etre reverifiee ici,
 * sur l'etat resultant : un `$set` ne portant que l'un des deux champs doit etre
 * confronte a la valeur deja en base pour l'autre.
 */
parametreSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], async function verifierPoids(suite) {
  const modifications = this.getUpdate()?.$set ?? this.getUpdate() ?? {};
  const touche = 'poidsClasse' in modifications || 'poidsExamen' in modifications;
  if (!touche) return suite();

  const actuel = await this.model.findOne(this.getFilter()).lean();
  const poidsClasse = modifications.poidsClasse ?? actuel?.poidsClasse ?? 0;
  const poidsExamen = modifications.poidsExamen ?? actuel?.poidsExamen ?? 0;

  if (!poidsClasse && !poidsExamen) return suite(new Error(MESSAGE_PONDERATION));
  return suite();
});

export const ParametrePedagogique = mongoose.model('ParametrePedagogique', parametreSchema);

/**
 * Parametres en vigueur, crees a la volee au premier appel.
 *
 * Renvoie toujours un objet exploitable : une base neuve, ou dont le document
 * aurait ete supprime, retombe sur les valeurs par defaut du schema plutot que
 * de faire echouer un calcul de bulletin.
 */
export async function parametresEnVigueur() {
  const existant = await ParametrePedagogique.findOne({ cle: 'pedagogie' }).lean();
  if (existant) return existant;

  const cree = await ParametrePedagogique.create({ cle: 'pedagogie' });
  return cree.toObject();
}

/** Ponderation seule, dans la forme attendue par notation.service.js. */
export async function ponderationEnVigueur() {
  const { poidsClasse, poidsExamen } = await parametresEnVigueur();
  return { poidsClasse, poidsExamen };
}
