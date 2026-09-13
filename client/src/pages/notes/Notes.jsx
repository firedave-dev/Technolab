/**
 * Aiguillage du module Notes selon le profil :
 * le personnel enseignant saisit, l'etudiant et le parent consultent un bulletin.
 *
 * La saisie passe desormais par SaisieGrille — deux notes par matiere, choisies
 * par cascade classe puis matiere. L'ancien ecran GestionNotes reposait sur le
 * couple Evaluation + Note, qui admettait un nombre quelconque d'epreuves ;
 * ces fichiers ne sont plus atteints, mais ils sont CONSERVES tant que les
 * collections `evaluations` et `notes` le sont elles aussi — c'est ce qui rend
 * la migration 001 reversible. Ils partiront avec elles.
 */
import { useAuth } from '../../context/AuthContext.jsx';
import { STAFF_ROLES } from '../../utils/roles.js';
import SaisieGrille from './SaisieGrille.jsx';
import BulletinEtudiant from './BulletinEtudiant.jsx';

export default function Notes() {
  const { role } = useAuth();

  const saisit = STAFF_ROLES.includes(role);

  return saisit ? <SaisieGrille /> : <BulletinEtudiant />;
}
