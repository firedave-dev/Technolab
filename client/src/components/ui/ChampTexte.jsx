/**
 * Champ de formulaire compatible react-hook-form (via forwardRef) :
 * label, message d'erreur et bascule d'affichage du mot de passe.
 */
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const ChampTexte = forwardRef(function ChampTexte(
  { label, erreur, type = 'text', indication, className = '', ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  const estMotDePasse = type === 'password';
  const typeEffectif = estMotDePasse && visible ? 'text' : type;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={props.id || props.name} className="label">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={props.id || props.name}
          type={typeEffectif}
          aria-invalid={Boolean(erreur)}
          className={`champ ${estMotDePasse ? 'pr-10' : ''} ${erreur ? 'champ-erreur' : ''}`}
          {...props}
        />

        {estMotDePasse && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {erreur ? (
        <p className="mt-1.5 text-xs text-retard">{erreur}</p>
      ) : indication ? (
        <p className="mt-1.5 text-xs text-slate-500">{indication}</p>
      ) : null}
    </div>
  );
});

export default ChampTexte;
