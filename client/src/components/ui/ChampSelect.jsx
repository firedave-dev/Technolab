/** Liste deroulante compatible react-hook-form (meme API que ChampTexte). */
import { forwardRef } from 'react';

const ChampSelect = forwardRef(function ChampSelect(
  { label, erreur, options = [], placeholder, indication, className = '', ...props },
  ref
) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={props.id || props.name} className="label">
          {label}
        </label>
      )}

      <select
        ref={ref}
        id={props.id || props.name}
        aria-invalid={Boolean(erreur)}
        className={`champ appearance-none bg-white ${erreur ? 'champ-erreur' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(({ valeur, libelle }) => (
          <option key={valeur} value={valeur}>
            {libelle}
          </option>
        ))}
      </select>

      {erreur ? (
        <p className="mt-1.5 text-xs text-retard">{erreur}</p>
      ) : indication ? (
        <p className="mt-1.5 text-xs text-slate-500">{indication}</p>
      ) : null}
    </div>
  );
});

export default ChampSelect;
