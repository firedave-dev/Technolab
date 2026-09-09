/**
 * Aiguillage du module Notes selon le profil :
 * le personnel enseignant saisit et publie, l'etudiant et le parent consultent un bulletin.
 */
import { useAuth } from '../../context/AuthContext.jsx';
import { STAFF_ROLES } from '../../utils/roles.js';
import GestionNotes from './GestionNotes.jsx';
import BulletinEtudiant from './BulletinEtudiant.jsx';

export default function Notes() {
  const { role } = useAuth();

  const saisit = STAFF_ROLES.includes(role);

  return saisit ? <GestionNotes /> : <BulletinEtudiant />;
}
