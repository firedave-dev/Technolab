/**
 * Navigation laterale pilotee par le role.
 * Chaque entree declare les roles autorises : la sidebar, les gardes de route et le
 * tableau de bord s'appuient sur la meme source, impossible d'afficher un lien inaccessible.
 */
import {
  BarChart3, BookOpen, CalendarClock, CalendarDays, ClipboardList, CreditCard,
  FileSpreadsheet, GraduationCap, LayoutDashboard, School, UserCog, Users, UserSquare2, Layers,
} from 'lucide-react';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../utils/roles.js';

/** Derniere phase livree : sert a distinguer les modules actifs des placeholders. */

export const NAVIGATION = [
  {
    chemin: '/tableau-de-bord',
    libelle: 'Tableau de bord',
    icone: LayoutDashboard,
    roles: Object.values(ROLES),
    groupe: 'accueil',
  },
  {
    chemin: '/utilisateurs',
    libelle: 'Utilisateurs',
    icone: Users,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE],
    groupe: 'administration',
  },
  {
    chemin: '/etudiants',
    libelle: 'Etudiants',
    icone: GraduationCap,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.PROFESSEUR, ROLES.SURVEILLANT],
    groupe: 'administration',
  },
  {
    chemin: '/classes',
    libelle: 'Classes',
    icone: School,
    roles: [...ADMIN_ROLES, ROLES.SURVEILLANT, ROLES.PROFESSEUR],
    groupe: 'administration',
  },
  {
    chemin: '/matieres',
    libelle: 'Matieres',
    icone: BookOpen,
    roles: [...ADMIN_ROLES, ROLES.SURVEILLANT, ROLES.PROFESSEUR],
    groupe: 'administration',
  },
  {
    /*
     * Composer les UE, c'est decider de la compensation entre matieres, donc de
     * ce qui valide un semestre : l'ecran est reserve a la direction et au
     * secretariat, comme l'ecriture cote API.
     */
    chemin: '/unites-enseignement',
    libelle: 'Unites d enseignement',
    icone: Layers,
    roles: [...ADMIN_ROLES, ROLES.SURVEILLANT],
    groupe: 'administration',
  },
  {
    chemin: '/personnel',
    libelle: 'Personnel',
    icone: UserCog,
    roles: ADMIN_ROLES,
    groupe: 'administration',
  },
  {
    chemin: '/mes-enfants',
    libelle: 'Mes enfants',
    icone: UserSquare2,
    roles: [ROLES.PARENT],
    groupe: 'accueil',
  },
  {
    chemin: '/notes',
    libelle: 'Notes et bulletins',
    icone: FileSpreadsheet,
    roles: [...ADMIN_ROLES, ROLES.PROFESSEUR, ROLES.SECRETAIRE, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'scolarite',
  },
  {
    chemin: '/evaluation',
    libelle: 'Evaluations',
    icone: CalendarClock,
    roles: [...ADMIN_ROLES, ROLES.PROFESSEUR, ROLES.SURVEILLANT, ROLES.SECRETAIRE, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'scolarite',
  },
  {
    chemin: '/absences',
    libelle: 'Absences',
    icone: ClipboardList,
    roles: [...ADMIN_ROLES, ROLES.PROFESSEUR, ROLES.SURVEILLANT, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'scolarite',
  },
  {
    chemin: '/paiements',
    libelle: 'Paiements',
    icone: CreditCard,
    roles: [...ADMIN_ROLES, ROLES.SECRETAIRE, ROLES.ETUDIANT, ROLES.PARENT],
    groupe: 'pilotage',
  },
  {
    chemin: '/planning',
    libelle: 'Planning',
    icone: CalendarDays,
    roles: Object.values(ROLES),
    groupe: 'scolarite',
  },
  {
    chemin: '/statistiques',
    libelle: 'Statistiques',
    icone: BarChart3,
    roles: ADMIN_ROLES,
    groupe: 'pilotage',
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


export { STAFF_ROLES };
