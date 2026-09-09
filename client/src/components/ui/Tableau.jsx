/**
 * Tableau de liste reutilise par tous les modules.
 * Sur mobile le tableau defile horizontalement dans son propre conteneur :
 * la page elle-meme ne defile jamais lateralement.
 */
import { Loader2 } from 'lucide-react';
import EtatVide from './EtatVide.jsx';

/**
 * @param colonnes [{ cle, libelle, rendu?(ligne), classe?, masquerMobile? }]
 * @param donnees  tableau d'objets
 * @param cleLigne fonction renvoyant une cle stable
 * @param onLigneClic rend les lignes cliquables si fourni
 */
export default function Tableau({
  colonnes,
  donnees = [],
  cleLigne = (l) => l.id,
  onLigneClic,
  chargement = false,
  vide,
}) {
  if (chargement) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Chargement...
      </div>
    );
  }

  if (!donnees.length) return vide || <EtatVide />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {colonnes.map((col) => (
              <th
                key={col.cle}
                scope="col"
                className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500
                            ${col.masquerMobile ? 'hidden md:table-cell' : ''} ${col.classe || ''}`}
              >
                {col.libelle}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {donnees.map((ligne) => (
            <tr
              key={cleLigne(ligne)}
              onClick={onLigneClic ? () => onLigneClic(ligne) : undefined}
              className={onLigneClic ? 'cursor-pointer transition hover:bg-slate-50' : ''}
            >
              {colonnes.map((col) => (
                <td
                  key={col.cle}
                  className={`px-4 py-3 align-middle text-slate-700
                              ${col.masquerMobile ? 'hidden md:table-cell' : ''} ${col.classe || ''}`}
                >
                  {col.rendu ? col.rendu(ligne) : ligne[col.cle]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
