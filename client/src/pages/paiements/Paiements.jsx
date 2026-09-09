/**
 * Aiguillage du module Paiements :
 * la caisse gere frais, echeanciers et encaissements ; l'etudiant et le parent consultent.
 */
import { useAuth } from '../../context/AuthContext.jsx';
import { STAFF_ROLES } from '../../utils/roles.js';
import GestionPaiements from './GestionPaiements.jsx';
import MesPaiements from './MesPaiements.jsx';

export default function Paiements() {
  const { role } = useAuth();
  return STAFF_ROLES.includes(role) ? <GestionPaiements /> : <MesPaiements />;
}
