/**
 * Bouton generique avec variantes et etat de chargement.
 *
 * Repartition des couleurs de la charte :
 * - primaire   : aplat bleu d'action (#1F6FE0), blanc dessus — 4,76:1, conforme AA ;
 * - secondaire : contour neutre, libelle en marine (couleur d'autorite) ;
 * - discret    : sans fond, pour les actions de second plan ;
 * - danger     : rouge, reserve aux actions destructrices.
 */
import { Loader2 } from 'lucide-react';

const VARIANTES = {
  primaire: 'bg-ista text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondaire: 'bg-white text-marine border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  discret: 'text-marine hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

const TAILLES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Bouton({
  variante = 'primaire',
  taille = 'md',
  chargement = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition
                  disabled:cursor-not-allowed ${VARIANTES[variante]} ${TAILLES[taille]} ${className}`}
      {...props}
    >
      {chargement && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
