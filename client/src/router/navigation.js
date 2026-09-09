/**
 * Navigation laterale pilotee par le role.
 * Chaque entree declare les roles autorises : la sidebar, les gardes de route et le
 * tableau de bord s'appuient sur la meme source, impossible d'afficher un lien inaccessible.
 * `phase` indique la phase de livraison ; au-dela de PHASE_ACTUELLE, l'ecran est un placeholder.
 */
import {
  BarChart3, BookOpen, CalendarClock, CalendarDays, ClipboardList, CreditCard,
  FileSpreadsheet, GraduationCap, LayoutDashboard, School, UserCog, Users, UserSquare2,
} from 'lucide-react';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../utils/roles.js';

/** Derniere phase livree : sert a distinguer les modules actifs des placeholders. */
export const PHASE_ACTUELLE = 5;

export const NAVIGATION = [
  {
    chemin: '/tableau-de-bord',
    libelle: 'Tableau de bord',
    icone: LayoutDashboard,
    roles: Object.values(ROLES),
    groupe: 'accueil',
    phase: 1,
  },
  {
    chemin: '/utilisateurs',
    libelle: 'Utilisateurs',
    icone: Users,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE],
    groupe: 'administration',
    phase: 2,
  },
  {
    chemin: '/etudiants',
    libelle: 'Etudiants',
    icone: GraduationCap,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR, ROLES.SURVEILLANT],
    groupe: 'administration',
    phase: 2,
  },
  {
    chemin: '/classes',
    libelle: 'Classes',
    icone: School,
    roles: STAFF_ROLES,
    groupe: 'administration',
    phase: 2,
  },
  {
    chemin: '/matieres',
    libelle: 'Matieres',
    icone: BookOpen,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR],
    groupe: 'administration',
    phase: 3,
  },
  {
    chemin: '/personnel',
    libelle: 'Personnel',
    icone: UserCog,
    roles: ADMIN_ROLES,
    groupe: 'administration',
    phase: 2,
  },
  {
    chemin: '/mes-enfants',
    libelle: 'Mes enfants',
    icone: UserSquare2,
    roles: [ROLES.PARENT],
    groupe: 'accueil',
    phase: 2,
  },
  {
    chemin: '/notes',
    libelle: 'Notes et bulletins',
    icone: FileSpreadsheet,
    roles: [...ADMIN_ROLES, ROLES.PROFESSEUR, ROLES.SECRETAIRE, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'scolarite',
    phase: 3,
  },
  {
    chemin: '/examens',
    libelle: 'Examens',
    icone: CalendarClock,
    roles: [...ADMIN_ROLES, ROLES.PROFESSEUR, ROLES.SURVEILLANT, ROLES.SECRETAIRE, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'scolarite',
    phase: 3,
  },
  {
    chemin: '/absences',
    libelle: 'Absences',
    icone: ClipboardList,
    roles: [...ADMIN_ROLES, ROLES.PROFESSEUR, ROLES.SURVEILLANT, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'scolarite',
    phase: 3,
  },
  {
    chemin: '/paiements',
    libelle: 'Paiements',
    icone: CreditCard,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'pilotage',
    phase: 4,
  },
  {
    chemin: '/planning',
    libelle: 'Planning',
    icone: CalendarDays,
    roles: Object.values(ROLES),
    groupe: 'scolarite',
    phase: 5,
  },
  {
    chemin: '/statistiques',
    libelle: 'Statistiques',
    icone: BarChart3,
    roles: ADMIN_ROLES,
    groupe: 'pilotage',
    phase: 5,
  },
];

/**
 * Groupes de la barre laterale, dans l'ordre d'affichage.
 * Le premier n'a pas de titre : il porte les points d'entree evidents.
 */
export const GROUPES = [
  { cle: 'accueil', titre: null },
  { cle: 'scolarite', titre: 'Vie scolaire' },
  { cle: 'administration', titre: 'Administration' },
  { cle: 'pilotage', titre: 'Pilotage' },
];

/**
 * Navigation d'un role, regroupee par section.
 * Un groupe sans entree visible n'est pas renvoye : la barre laterale d'un parent
 * ne montre donc aucun intitule vide.
 */
export const navigationGroupee = (role) => {
  const visibles = navigationPourRole(role);

  return GROUPES
    .map((groupe) => ({
      ...groupe,
      entrees: visibles.filter((entree) => entree.groupe === groupe.cle),
    }))
    .filter((groupe) => groupe.entrees.length > 0);
};

/** Entrees visibles pour un role donne. */
export const navigationPourRole = (role) =>
  NAVIGATION.filter((item) => item.roles.includes(role));

/** Chemin de l'accueil de l'espace prive. La racine est reservee au site public. */
export const ACCUEIL_PRIVE = '/tableau-de-bord';

/** Le module est-il reellement implemente ? */
export const estDisponible = (item) => item.phase <= PHASE_ACTUELLE;

export { STAFF_ROLES };
