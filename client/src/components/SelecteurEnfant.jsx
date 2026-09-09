/**
 * Selecteur d'enfant pour les comptes parents.
 * Se selectionne automatiquement sur le premier enfant, et disparait si le parent
 * n'en a qu'un seul (l'information serait redondante).
 */
import { useEffect } from 'react';
import ChampSelect from './ui/ChampSelect.jsx';
import { useMesEnfants } from '../hooks/useGestion.js';

export default function SelecteurEnfant({ valeur, onChanger, className = '' }) {
  const { data } = useMesEnfants();
  const enfants = data?.enfants || [];

  // Selection initiale des le chargement de la liste.
  useEffect(() => {
    if (!valeur && enfants.length) onChanger(enfants[0].id);
  }, [enfants, valeur, onChanger]);

  if (enfants.length <= 1) return null;

  return (
    <ChampSelect
      label="Enfant"
      className={className}
      options={enfants.map((e) => ({
        valeur: e.id,
        libelle: `${e.nomComplet}${e.infosEtudiant?.classe ? ` — ${e.infosEtudiant.classe.nom}` : ''}`,
      }))}
      value={valeur || ''}
      onChange={(e) => onChanger(e.target.value)}
    />
  );
}
