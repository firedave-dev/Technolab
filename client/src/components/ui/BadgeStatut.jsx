/**
 * Pastille d'etat : compte actif/inactif et statut de scolarite.
 * S'appuie sur les tokens semantiques du design system, dont les contrastes sont
 * verifies (5,5:1 succes, 5,0:1 alerte, 6,5:1 retard sur blanc).
 */
const CLASSES = {
  actif: 'pastille-succes',
  inactif: 'pastille-neutre',
  inscrit: 'pastille-succes',
  suspendu: 'pastille-alerte',
  diplome: 'pastille-succes',
  abandon: 'pastille-retard',
};

const LIBELLES = {
  actif: 'Actif',
  inactif: 'Inactif',
  inscrit: 'Inscrit',
  suspendu: 'Suspendu',
  diplome: 'Diplome',
  abandon: 'Abandon',
};

export default function BadgeStatut({ statut, className = '' }) {
  if (!statut) return null;

  return (
    <span className={`${CLASSES[statut] || 'pastille-neutre'} ${className}`}>
      {LIBELLES[statut] || statut}
    </span>
  );
}
