import Link from 'next/link';

/**
 * Bouton et lien d'action.
 *
 * Un seul composant sert les deux, et choisit la bonne balise selon qu'on lui
 * passe une destination ou non : un lien doit rester un `<a>` — pour l'ouverture
 * dans un nouvel onglet, la copie d'adresse, l'exploration par un moteur — et
 * une action sans destination doit rester un `<button>`. Styler un `<div>` en
 * bouton, l'erreur la plus courante, le rend invisible au clavier.
 *
 * Le bleu ISTA est reserve a la variante `primaire`. C'est la regle de charte
 * qui fait tout tenir : si un aplat bleu peut ne pas etre cliquable, le visiteur
 * cesse de savoir ou cliquer.
 */

const VARIANTES = {
  primaire:
    'bg-ista text-white shadow-sm hover:bg-brand-700 active:bg-brand-900',
  secondaire:
    'border border-filet bg-white text-marine hover:border-marine/30 hover:bg-fond-doux',
  // Sur fond marine : le blanc devient la couleur d'action, le bleu y serait illisible.
  inverse:
    'bg-white text-marine hover:bg-brand-50',
  discret:
    'text-ista underline-offset-4 hover:underline px-0 py-0',
};

const TAILLES = {
  normale: 'px-6 py-3.5 text-[0.9375rem]',
  grande: 'px-8 py-4 text-base',
};

export default function Bouton({
  children,
  href,
  variante = 'primaire',
  taille = 'normale',
  className = '',
  ...reste
}) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold',
    'transition-[background-color,border-color,transform] duration-300 ease-douce',
    // Un enfoncement de 1 px : le bouton repond au clic sans sautiller.
    'active:translate-y-px',
    variante === 'discret' ? '' : TAILLES[taille],
    VARIANTES[variante],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (href) {
    // Les adresses externes sortent du routeur : Link prefetcherait une page
    // qui n'appartient pas a ce site.
    const externe = /^https?:\/\//.test(href);
    if (externe) {
      return (
        <a href={href} className={classes} {...reste}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...reste}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...reste}>
      {children}
    </button>
  );
}
