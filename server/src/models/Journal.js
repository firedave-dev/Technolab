import mongoose from 'mongoose';

/**
 * Journal des actions sensibles : qui a fait quoi, quand, et sur quoi.
 *
 * POURQUOI DENORMALISER L'AUTEUR. Le nom et le role de l'acteur sont recopies
 * dans l'entree, alors qu'une reference vers le compte suffirait a les
 * retrouver. C'est volontaire : un journal doit rester lisible APRES la
 * suppression du compte concerne — c'est meme le moment ou on le consulte. Une
 * simple reference laisserait des lignes anonymes precisement la ou il faut un
 * nom.
 *
 * CE QUI N'EST PAS CONSIGNE : les lectures. Tracer chaque affichage de page
 * noierait les actions reelles sous des dizaines de milliers de consultations,
 * et rendrait le journal inutilisable. Seules les ecritures qui ont abouti sont
 * enregistrees.
 *
 * AUCUN CONTENU SENSIBLE : ni mot de passe, ni note, ni montant ne figurent dans
 * `details`. Le journal dit qu'une note a ete saisie, pas laquelle — sans quoi
 * il deviendrait lui-meme une copie officieuse des donnees qu'il surveille.
 */
const journalSchema = new mongoose.Schema(
  {
    acteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    acteurNom: { type: String, trim: true, maxlength: 140 },
    acteurRole: { type: String, trim: true, maxlength: 30, index: true },

    /** Code stable, utilisable pour filtrer : « note.enregistrer », « user.creer »... */
    action: { type: String, required: true, trim: true, maxlength: 60, index: true },

    /** Phrase en francais, affichee telle quelle dans l'interface. */
    libelle: { type: String, required: true, trim: true, maxlength: 240 },

    /** Domaine concerne, pour regrouper : comptes, notes, scolarite, comptabilite... */
    domaine: { type: String, trim: true, maxlength: 40, index: true },

    methode: { type: String, trim: true, maxlength: 10 },
    chemin: { type: String, trim: true, maxlength: 200 },
    statut: { type: Number },

    /** Identifiant de l'objet touche, quand la route en designe un. */
    cible: { type: String, trim: true, maxlength: 60 },

    adresseIp: { type: String, trim: true, maxlength: 60 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Lecture dominante : les dernieres actions, eventuellement filtrees.
journalSchema.index({ createdAt: -1 });
journalSchema.index({ domaine: 1, createdAt: -1 });

/*
 * Expiration au bout de deux ans.
 *
 * Un journal qui grossit sans fin finit par couter plus cher qu'il ne rapporte,
 * et personne ne remonte a trois ans pour comprendre une modification de note.
 * Deux annees scolaires couvrent tout litige plausible.
 */
journalSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 2 });

export const Journal = mongoose.model('Journal', journalSchema);
