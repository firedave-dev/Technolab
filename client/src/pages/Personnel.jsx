/**
 * Page "Personnel" : meme ecran que la gestion des comptes, restreint aux roles
 * de l'etablissement (direction, secretariat, enseignants, surveillance, entretien).
 */
import ListeUtilisateurs from './utilisateurs/ListeUtilisateurs.jsx';
import { STAFF_ROLES } from '../utils/roles.js';

export default function Personnel() {
  return (
    <ListeUtilisateurs
      titre="Personnel"
      sousTitre="Employes de l etablissement : contrats, fonctions et acces."
      rolesCibles={STAFF_ROLES}
      roleImposeCreation="professeur"
    />
  );
}
