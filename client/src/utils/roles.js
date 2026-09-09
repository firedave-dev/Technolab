/** Miroir cote client de server/src/config/roles.js (garder les deux synchronises). */
export const ROLES = {
  ADMIN: 'admin',
  DIRECTEUR: 'directeur',
  SECRETAIRE: 'secretaire',
  PROFESSEUR: 'professeur',
  SURVEILLANT: 'surveillant',
  ETUDIANT: 'etudiant',
  PARENT: 'parent',
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.DIRECTEUR]: 'Directeur',
  [ROLES.SECRETAIRE]: 'Secretaire',
  [ROLES.PROFESSEUR]: 'Professeur',
  [ROLES.SURVEILLANT]: 'Surveillant',
  [ROLES.ETUDIANT]: 'Etudiant',
  [ROLES.PARENT]: 'Parent',
};

export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.DIRECTEUR];
export const STAFF_ROLES = [
  ROLES.ADMIN, ROLES.DIRECTEUR, ROLES.SECRETAIRE,
  ROLES.PROFESSEUR, ROLES.SURVEILLANT,
];

/** Couleur du badge de role (usage : classes Tailwind). */
export const ROLE_BADGE = {
  [ROLES.ADMIN]: 'bg-slate-800 text-white',
  [ROLES.DIRECTEUR]: 'bg-brand-100 text-brand-800',
  [ROLES.SECRETAIRE]: 'bg-violet-100 text-violet-700',
  [ROLES.PROFESSEUR]: 'bg-emerald-100 text-emerald-700',
  [ROLES.SURVEILLANT]: 'bg-amber-100 text-amber-700',
  [ROLES.ETUDIANT]: 'bg-sky-100 text-sky-700',
  [ROLES.PARENT]: 'bg-pink-100 text-pink-700',
};

export const initiales = (prenom = '', nom = '') =>
  `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
