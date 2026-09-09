/**
 * Ecran temporaire des modules prevus dans les phases suivantes.
 * Il permet de valider des maintenant la navigation et la matrice de permissions
 * sans coder les fonctionnalites metier.
 */
import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { NAVIGATION } from '../router/navigation.js';

export default function EnConstruction() {
  const { pathname } = useLocation();
  const module = NAVIGATION.find((n) => n.chemin === pathname);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <Hammer className="h-7 w-7 text-alerte" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-semibold text-marine">
        {module?.libelle || 'Module'} - en cours de developpement
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        Ce module sera livre lors de la phase {module?.phase ?? '2'} du projet. Votre role vous donne
        bien acces a cette section : seule l interface reste a construire.
      </p>
    </div>
  );
}
