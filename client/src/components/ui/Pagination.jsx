/** Pagination compacte : precedent / suivant + position courante. */
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onChangerPage }) {
  if (!pagination || pagination.pages <= 1) return null;

  const { page, pages, total, limite } = pagination;
  const debut = (page - 1) * limite + 1;
  const fin = Math.min(page * limite, total);

  const bouton = 'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        {debut}-{fin} sur {total}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={bouton}
          onClick={() => onChangerPage(page - 1)}
          disabled={page <= 1}
          aria-label="Page precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-xs text-slate-600">
          Page {page} / {pages}
        </span>

        <button
          type="button"
          className={bouton}
          onClick={() => onChangerPage(page + 1)}
          disabled={page >= pages}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
