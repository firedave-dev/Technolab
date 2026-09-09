/**
 * Logique partagee par les controleurs utilisateurs / etudiants / personnel :
 * generation de matricule, presentation des donnees et construction des filtres de liste.
 */
import { User } from '../models/User.js';
import { ADMIN_ROLES, PREFIXE_MATRICULE, ROLE_LABELS, ROLES } from '../config/roles.js';

/**
 * Matricule lisible et unique : PREFIXE-ANNEE-SEQUENCE (ex. ETU-2026-0007).
 * La sequence est calculee depuis le dernier matricule de la meme serie ;
 * la boucle absorbe une eventuelle collision entre deux creations simultanees.
 */
export async function genererMatricule(role, annee = new Date().getFullYear()) {
  const prefixe = `${PREFIXE_MATRICULE[role] || 'USR'}-${annee}`;

  const dernier = await User.findOne({ matricule: new RegExp(`^${prefixe}-`) })
    .sort({ matricule: -1 })
    .select('matricule')
    .lean();

  let sequence = dernier ? Number(dernier.matricule.split('-').pop()) + 1 : 1;

  for (let essai = 0; essai < 20; essai += 1, sequence += 1) {
    const candidat = `${prefixe}-${String(sequence).padStart(4, '0')}`;
    if (!(await User.exists({ matricule: candidat }))) return candidat;
  }

  // Repli improbable : suffixe aleatoire plutot qu'un echec de creation.
  return `${prefixe}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Met en forme un utilisateur pour l'API.
 * Le salaire n'est expose qu'a la direction : le filtrage se fait ici, une seule fois.
 */
export function presenterUtilisateur(user, acteur = null) {
  if (!user) return null;
  const doc = typeof user.toObject === 'function' ? user.toObject({ virtuals: false }) : user;

  const {
    motDePasse, resetTokenHash, resetTokenExpire, __v, infosPersonnel, ...reste
  } = doc;

  const voitSalaire = acteur && ADMIN_ROLES.includes(acteur.role);
  let personnel = infosPersonnel;
  if (personnel && !voitSalaire) {
    const { salaire, ...sansSalaire } = personnel;
    personnel = sansSalaire;
  }

  return {
    ...reste,
    id: doc._id,
    nomComplet: `${doc.prenom} ${doc.nom}`,
    roleLabel: ROLE_LABELS[doc.role],
    ...(personnel ? { infosPersonnel: personnel } : {}),
  };
}

/**
 * Traduit les parametres de requete en filtre Mongo.
 * `q` cherche simultanement dans le nom, le prenom, l'email et le matricule.
 */
export function construireFiltre({ role, roles, actif, q, classe, statut }) {
  const filtre = {};

  if (role) filtre.role = role;
  else if (roles?.length) filtre.role = { $in: roles };

  if (actif !== undefined) filtre.actif = actif;
  if (classe) filtre['infosEtudiant.classe'] = classe;
  if (statut) filtre['infosEtudiant.statut'] = statut;

  if (q) {
    const recherche = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtre.$or = [
      { nom: recherche },
      { prenom: recherche },
      { email: recherche },
      { matricule: recherche },
    ];
  }

  return filtre;
}

/** Liste paginee + triee, avec le total pour l'affichage cote client. */
export async function listerUtilisateurs(filtre, { page = 1, limite = 20, tri = 'nom' } = {}) {
  const sauter = (page - 1) * limite;

  const [elements, total] = await Promise.all([
    User.find(filtre)
      .sort(tri)
      .skip(sauter)
      .limit(limite)
      .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire')
      .lean(),
    User.countDocuments(filtre),
  ]);

  return {
    elements,
    pagination: {
      page,
      limite,
      total,
      pages: Math.max(1, Math.ceil(total / limite)),
    },
  };
}

/** Champs specifiques au role : on n'enregistre pas un bloc etudiant sur un surveillant. */
export function nettoyerBlocsRole(donnees, role) {
  const copie = { ...donnees };
  if (role !== ROLES.ETUDIANT) delete copie.infosEtudiant;
  if (![ROLES.PROFESSEUR, ROLES.SURVEILLANT, ROLES.SECRETAIRE,
    ROLES.DIRECTEUR, ROLES.ADMIN].includes(role)) delete copie.infosPersonnel;
  return copie;
}

/**
 * Mot de passe provisoire conforme aux regles de validation (lettres + chiffres, 8+).
 * Il est renvoye une seule fois a l'administration, qui le transmet a l'interesse.
 */
export function genererMotDePasseProvisoire() {
  const lettres = 'abcdefghjkmnpqrstuvwxyz';
  const majuscules = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const chiffres = '23456789';
  const piocher = (source, n) =>
    Array.from({ length: n }, () => source[Math.floor(Math.random() * source.length)]).join('');

  return `${piocher(majuscules, 1)}${piocher(lettres, 5)}${piocher(chiffres, 4)}`;
}
