/** Champ de recherche avec icone et bouton d'effacement. */
import { Search, X } from 'lucide-react';

export default function BarreRecherche({ valeur, onChanger, placeholder = 'Rechercher...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={valeur}
        onChange={(e) => onChanger(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="champ pl-9 pr-9"
      />
      {valeur && (
        <button
          type="button"
          onClick={() => onChanger('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
          aria-label="Effacer la recherche"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
