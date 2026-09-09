/**
 * Boite de dialogue accessible.
 *
 * Comportement clavier (Phase 6) :
 * - a l'ouverture, le focus entre dans la boite ;
 * - Tab et Maj+Tab bouclent a l'interieur : le focus ne peut pas partir derriere
 *   le voile, ou l'utilisateur naviguerait a l'aveugle ;
 * - Echap ferme ;
 * - a la fermeture, le focus revient sur l'element qui a ouvert la boite.
 *
 * Le defilement de la page est bloque tant que la boite est ouverte.
 */
import { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const LARGEURS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** Elements atteignables au clavier, dans l'ordre du document. */
const SELECTEUR_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function Modale({
  ouverte,
  onFermer,
  titre,
  description,
  largeur = 'md',
  children,
  pied,
}) {
  const boite = useRef(null);
  const declencheur = useRef(null);
  const idTitre = useId();

  const focusables = useCallback(
    () => Array.from(boite.current?.querySelectorAll(SELECTEUR_FOCUSABLE) || []),
    []
  );

  // Memorise l'element actif avant ouverture, puis lui rend le focus a la fermeture.
  useEffect(() => {
    if (!ouverte) return undefined;

    declencheur.current = document.activeElement;
    const aRendre = declencheur.current;

    return () => {
      if (aRendre instanceof HTMLElement && document.contains(aRendre)) aRendre.focus();
    };
  }, [ouverte]);

  // Place le focus sur le premier element interactif de la boite.
  useEffect(() => {
    if (!ouverte) return;
    const cibles = focusables();
    (cibles[0] || boite.current)?.focus();
  }, [ouverte, focusables]);

  // Echap ferme, Tab reste captif de la boite.
  useEffect(() => {
    if (!ouverte) return undefined;

    const surTouche = (e) => {
      if (e.key === 'Escape') {
        onFermer();
        return;
      }
      if (e.key !== 'Tab') return;

      const cibles = focusables();
      if (!cibles.length) {
        e.preventDefault();
        return;
      }

      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];

      // Le focus reboucle aux deux extremites.
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener('keydown', surTouche);

    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = overflowInitial;
    };
  }, [ouverte, onFermer, focusables]);

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        className="fixed inset-0 bg-marine/40 backdrop-blur-[1px]"
        onClick={onFermer}
        aria-hidden="true"
      />

      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        tabIndex={-1}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${LARGEURS[largeur]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={idTitre} className="text-base font-semibold text-marine">
              {titre}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="-mr-1 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {pied && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {pied}
          </div>
        )}
      </div>
    </div>
  );
}
