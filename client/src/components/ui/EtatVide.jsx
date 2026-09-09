/** Message affiche quand une liste ne renvoie aucun resultat. */
import { Inbox } from 'lucide-react';

export default function EtatVide({ titre = 'Aucun resultat', message, icone: Icone = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
        <Icone className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-slate-700">{titre}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
