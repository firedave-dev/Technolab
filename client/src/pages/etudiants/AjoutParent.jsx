/**
 * Rattachement d'un parent existant a un etudiant.
 * La recherche interroge uniquement les comptes de role "parent" ; les parents
 * deja rattaches sont ecartes de la liste pour eviter une erreur de doublon.
 */
import { useMemo, useState } from 'react';
import { Loader2, UserSquare2 } from 'lucide-react';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useLierParent, useUtilisateurs } from '../../hooks/useGestion.js';
import { ROLES, initiales } from '../../utils/roles.js';

export default function AjoutParent({ ouverte, onFermer, etudiant }) {
  const [recherche, setRecherche] = useState('');
  const q = useDebounce(recherche);

  const lier = useLierParent();
  const { data, isFetching } = useUtilisateurs({
    role: ROLES.PARENT,
    q: q || undefined,
    limite: 10,
    actif: 'true',
  });

  const dejaRattaches = useMemo(
    () => new Set((etudiant?.parents || []).map((p) => String(p._id))),
    [etudiant]
  );

  const candidats = (data?.utilisateurs || []).filter((p) => !dejaRattaches.has(String(p.id)));

  const rattacher = async (parent) => {
    await lier.mutateAsync({ id: etudiant.id, parentId: parent.id });
    setRecherche('');
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Rattacher un parent"
      description={`Choisissez le compte parent a lier a ${etudiant?.nomComplet}.`}
      largeur="md"
      pied={<Bouton variante="secondaire" onClick={onFermer}>Fermer</Bouton>}
    >
      <BarreRecherche
        valeur={recherche}
        onChanger={setRecherche}
        placeholder="Rechercher un parent par nom ou email..."
      />

      <div className="mt-4">
        {isFetching && !candidats.length ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Recherche...
          </div>
        ) : candidats.length ? (
          <ul className="divide-y divide-slate-100">
            {candidats.map((parent) => (
              <li key={parent.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-semibold text-pink-700">
                  {initiales(parent.prenom, parent.nom)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{parent.nomComplet}</p>
                  <p className="truncate text-xs text-slate-500">{parent.email}</p>
                </div>

                <Bouton
                  taille="sm"
                  variante="secondaire"
                  onClick={() => rattacher(parent)}
                  chargement={lier.isPending}
                >
                  Rattacher
                </Bouton>
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            icone={UserSquare2}
            titre="Aucun parent disponible"
            message={
              q
                ? 'Aucun compte parent ne correspond a cette recherche.'
                : 'Creez d abord un compte de role "parent" depuis la gestion des utilisateurs.'
            }
          />
        )}
      </div>
    </Modale>
  );
}
