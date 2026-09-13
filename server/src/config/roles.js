/**
 * Source unique de verite pour les roles de la plateforme.
 * Toute la logique RBAC (backend + navigation front) s'appuie dessus.
 */
export const ROLES = {
  ADMIN: 'admin',
  DIRECTEUR: 'directeur',
  SECRETAIRE: 'secretaire',
  PROFESSEUR: 'professeur',
  SURVEILLANT: 'surveillant',
  ETUDIANT: 'etudiant',
  PARENT: 'parent',
};

export const ROLE_VALUES = Object.values(ROLES);

/** Roles consideres comme « personnel de l'etablissement ». */
export const STAFF_ROLES = [
  ROLES.ADMIN,
  ROLES.DIRECTEUR,
  ROLES.SECRETAIRE,
  ROLES.PROFESSEUR,
  ROLES.SURVEILLANT,
];

/** Roles ayant une vision globale de l'etablissement. */
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.DIRECTEUR];

/**
 * Personnel habilite a consulter le DOSSIER d'un etudiant : bulletin complet,
 * fiche individuelle, coordonnees de la famille.
 *
 * LE PROFESSEUR EN EST EXCLU, et c'est le point de la regle. Un bulletin porte
 * les notes de TOUTES les matieres, une fiche individuelle porte l'adresse, la
 * situation familiale et la situation financiere : rien de tout cela ne concerne
 * l'enseignant d'une matiere. Il accede a la liste de ses classes et saisit ses
 * propres notes, pas davantage.
 *
 * La distinction est portee ici plutot que repetee dans chaque routeur : une
 * liste de roles recopiee finit toujours par diverger d'un fichier a l'autre.
 */
export const DOSSIER_ROLES = [
  ROLES.ADMIN,
  ROLES.DIRECTEUR,
  ROLES.SECRETAIRE,
  ROLES.SURVEILLANT,
];

/**
 * Personnel habilite a administrer l'OFFRE DE FORMATION : classes, matieres et
 * leur regroupement en unites d'enseignement.
 *
 * Le SECRETARIAT en est exclu — il gere les inscriptions, les dossiers et la
 * caisse, pas la structure pedagogique. Le SURVEILLANT y figure : c'est lui qui
 * tient les classes et les matieres au quotidien.
 *
 * Les UE relevent du meme groupe que les matieres dont elles sont faites :
 * separer les deux permettrait de creer une matiere sans pouvoir la rattacher,
 * ce qui laisserait la structure a moitie construite.
 */
export const PEDAGOGIE_ROLES = [ROLES.ADMIN, ROLES.DIRECTEUR, ROLES.SURVEILLANT];

/** Libelles affichables (utilises dans les reponses API et l'UI). */
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.DIRECTEUR]: 'Directeur',
  [ROLES.SECRETAIRE]: 'Secretaire',
  [ROLES.PROFESSEUR]: 'Professeur',
  [ROLES.SURVEILLANT]: 'Surveillant',
  [ROLES.ETUDIANT]: 'Etudiant',
  [ROLES.PARENT]: 'Parent',
};

/**
 * Matrice de delegation : quels roles un acteur a le droit de creer / modifier / supprimer.
 * Regle metier : le secretariat gere les etudiants et les parents, la direction gere le
 * personnel, seul un administrateur peut toucher a un autre administrateur.
 */
const ROLES_GERABLES = {
  [ROLES.ADMIN]: ROLE_VALUES,
  [ROLES.DIRECTEUR]: ROLE_VALUES.filter((r) => r !== ROLES.ADMIN),
  [ROLES.SECRETAIRE]: [ROLES.ETUDIANT, ROLES.PARENT],
};

/** Liste des roles qu'un acteur peut administrer (vide si aucun droit de gestion). */
export const rolesGerablesPar = (roleActeur) => ROLES_GERABLES[roleActeur] || [];

/** Un acteur peut-il agir sur un compte portant ce role ? */
export const peutGererRole = (roleActeur, roleCible) =>
  rolesGerablesPar(roleActeur).includes(roleCible);

/** Prefixe de matricule par role (utilise pour la generation automatique). */
export const PREFIXE_MATRICULE = {
  [ROLES.ADMIN]: 'ADM',
  [ROLES.DIRECTEUR]: 'DIR',
  [ROLES.SECRETAIRE]: 'SEC',
  [ROLES.PROFESSEUR]: 'PRF',
  [ROLES.SURVEILLANT]: 'SUR',
  [ROLES.ETUDIANT]: 'ETU',
  [ROLES.PARENT]: 'PAR',
};
