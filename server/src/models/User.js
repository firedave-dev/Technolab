import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { ROLE_VALUES, ROLES } from '../config/roles.js';

const SALT_ROUNDS = 12;

export const STATUTS_ETUDIANT = ['inscrit', 'suspendu', 'diplome', 'abandon'];
export const TYPES_CONTRAT = ['CDI', 'CDD', 'vacataire', 'stage'];

/** Donnees propres au dossier d'un etudiant. */
const infosEtudiantSchema = new mongoose.Schema(
  {
    classe: { type: mongoose.Schema.Types.ObjectId, ref: 'Classe' },
    anneeInscription: { type: Number, min: 2000, max: 2100 },
    statut: { type: String, enum: STATUTS_ETUDIANT, default: 'inscrit' },
    lieuNaissance: { type: String, trim: true, maxlength: 80 },
    nationalite: { type: String, trim: true, maxlength: 60 },
  },
  { _id: false }
);

/** Donnees propres a un membre du personnel. */
const infosPersonnelSchema = new mongoose.Schema(
  {
    fonction: { type: String, trim: true, maxlength: 80 },
    specialite: { type: String, trim: true, maxlength: 80 },
    dateEmbauche: { type: Date },
    typeContrat: { type: String, enum: TYPES_CONTRAT },
    // Donnee sensible : filtree par le presentateur sauf pour la direction.
    salaire: { type: Number, min: 0 },
  },
  { _id: false }
);

/**
 * Utilisateur unique pour tous les profils (personnel, etudiant, parent).
 * Les champs specifiques a un role restent optionnels : les Phases 2+ ajouteront
 * les collections metier (Classe, Note, Paiement...) qui referenceront ce modele.
 */
const userSchema = new mongoose.Schema(
  {
    matricule: { type: String, unique: true, sparse: true, trim: true, uppercase: true },
    nom: { type: String, required: [true, 'Le nom est obligatoire'], trim: true, maxlength: 60 },
    prenom: { type: String, required: [true, 'Le prenom est obligatoire'], trim: true, maxlength: 60 },
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Format email invalide'],
    },
    telephone: { type: String, trim: true, maxlength: 25 },
    motDePasse: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: 8,
      select: false, // jamais renvoye par defaut
    },
    role: { type: String, enum: ROLE_VALUES, required: true, index: true },
    actif: { type: Boolean, default: true },
    dateNaissance: { type: Date },
    sexe: { type: String, enum: ['M', 'F', 'autre'] },
    adresse: { type: String, trim: true, maxlength: 200 },
    photoUrl: { type: String, trim: true },

    // Liaison parent <-> enfants : les deux sens sont maintenus pour eviter
    // une requete inverse a chaque consultation d'un dossier.
    enfants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Blocs specifiques au role (absents pour les autres profils)
    infosEtudiant: { type: infosEtudiantSchema, default: undefined },
    infosPersonnel: { type: infosPersonnelSchema, default: undefined },

    // Securite
    derniereConnexion: { type: Date },
    motDePasseModifieLe: { type: Date },
    resetTokenHash: { type: String, select: false },
    resetTokenExpire: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.motDePasse;
        delete ret.resetTokenHash;
        delete ret.resetTokenExpire;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.virtual('nomComplet').get(function () {
  return `${this.prenom} ${this.nom}`.trim();
});

/** Hash automatique du mot de passe a chaque modification. */
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, SALT_ROUNDS);
  this.motDePasseModifieLe = new Date();
  next();
});

userSchema.methods.verifierMotDePasse = function (motDePasseClair) {
  return bcrypt.compare(motDePasseClair, this.motDePasse);
};

/** Genere un jeton de reinitialisation : le clair part par email, le hash est stocke. */
userSchema.methods.creerTokenReset = function (dureeMinutes = 30) {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  this.resetTokenExpire = new Date(Date.now() + dureeMinutes * 60 * 1000);
  return token;
};

/** Invalide les tokens d'acces emis avant un changement de mot de passe. */
userSchema.methods.motDePasseChangeApres = function (jwtIatSeconds) {
  if (!this.motDePasseModifieLe) return false;
  return Math.floor(this.motDePasseModifieLe.getTime() / 1000) > jwtIatSeconds;
};

userSchema.index({ nom: 1, prenom: 1 });
userSchema.index({ 'infosEtudiant.classe': 1 });

export const User = mongoose.model('User', userSchema);
export { ROLES };
