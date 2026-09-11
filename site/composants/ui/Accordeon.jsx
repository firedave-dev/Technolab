/**
 * Bloc depliant.
 *
 * Construit sur `<details>` / `<summary>` natifs, et c'est un choix, pas une
 * facilite. Ces deux balises apportent gratuitement ce qu'une version maison
 * doit reimplementer — et oublie souvent :
 *
 * - l'ouverture au clavier, Entree comme Espace ;
 * - l'etat annonce par les lecteurs d'ecran (« developpe » / « reduit ») sans
 *   qu'aucun `aria-expanded` soit a maintenir ;
 * - la recherche dans la page, qui ouvre d'elle-meme le bloc contenant le
 *   terme cherche ;
 * - le fonctionnement SANS JAVASCRIPT.
 *
 * Ce dernier point tranche a lui seul : une FAQ d'admission repliee par un
 * composant React reste fermee tant que le script n'a pas ete telecharge et
 * execute. Ici elle s'ouvre meme si rien ne s'execute jamais.
 *
 * Le triangle par defaut du navigateur est retire au profit d'un signe propre
 * a la charte ; l'element reste un `<summary>`, donc tout ce qui precede tient.
 */
export default function Accordeon({ question, children, ouvertParDefaut = false }) {
  return (
    <details
      open={ouvertParDefaut}
      className="group border-b border-filet [&_summary::-webkit-details-marker]:hidden"
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-6
                   py-6 text-left font-semibold transition-colors duration-200
                   hover:text-ista"
      >
        {question}

        {/*
          Le signe suit l'etat via `group-open`. Il est purement decoratif :
          l'etat reel est deja porte par `<details>` et annonce comme tel.
        */}
        <span
          aria-hidden="true"
          className="relative h-4 w-4 shrink-0 text-ista"
        >
          <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-current" />
          <span
            className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-current
                       transition-transform duration-300 ease-douce group-open:scale-y-0"
          />
        </span>
      </summary>

      <div className="max-w-lecture pb-8 leading-relaxed text-neutre">{children}</div>
    </details>
  );
}
