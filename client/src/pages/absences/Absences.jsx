/**
 * Aiguillage du module Absences :
 * le personnel pointe et justifie, l'etudiant et le parent consultent l'historique.
 */
import { useAuth } from '../../context/AuthContext.jsx';
import { STAFF_ROLES } from '../../utils/roles.js';
import SuiviAbsences from './SuiviAbsences.jsx';
import MesAbsences from './MesAbsences.jsx';

export default function Absences() {
  const { role } = useAuth();
  return STAFF_ROLES.includes(role) ? <SuiviAbsences /> : <MesAbsences />;
}
