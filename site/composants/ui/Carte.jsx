import Link from 'next/link';

/**
 * Carte de contenu.
 *
 * L'elevation au survol ne porte que sur les cartes qui MENENT quelque part. Une
 * carte purement informative qui se souleve promet un clic qu'elle n'honore pas ;
 * la presence de `href` suffit donc a decider du comportement, sans qu'un
 * appelant ait a y penser.
 *
 * Quand la carte est un lien, c'est la carte entiere qui devient cliquable —
 * pas seulement le titre. La cible est plus grande, ce qui compte surtout sur
 * telephone, et un seul element focusable apparait dans l'ordre de tabulation
 * au lieu de trois.
 */

const BASE =
  'relative flex flex-col rounded-2xl border border-filet bg-white p-8 md:p-10';

const INTERACTIVE =
  'transition-[transform,box-shadow,border-color] duration-300 ease-douce '
  + 'hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-24px_rgba(11,46,82,0.45)]';

export default function Carte({ children, href, className = '', ...reste }) {
  const classes = `${BASE} ${href ? INTERACTIVE : ''} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${classes} no-underline`} {...reste}>
        {children}
      </Link>
    );
  }

  return (
    <div className={classes} {...reste}>
      {children}
    </div>
  );
}
