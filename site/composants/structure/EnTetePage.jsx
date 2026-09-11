/**
 * En-tete des pages interieures.
 *
 * Purement typographique : ni image, ni scene 3D. L'ordinateur du hero reste
 * reserve a l'accueil — c'est ce qui en fait une signature. Repete sur cinq
 * pages, il deviendrait un ornement, et il ferait payer le moteur 3D a des
 * visiteurs venus lire un programme de formation.
 *
 * L'en-tete porte le `<h1>` de la page. Chaque page n'en a qu'un, et il est ici :
 * cela evite qu'une section interieure s'en attribue un second, ce qui brouille
 * la hierarchie pour un lecteur d'ecran comme pour un moteur de recherche.
 */
export default function EnTetePage({ baseline, titre, chapeau, enfants }) {
  return (
    <header className="border-b border-filet">
      <div className="mx-auto w-full max-w-page px-6 pb-bloc pt-40 md:px-10 md:pt-48">
        {baseline && <p className="baseline text-ista">{baseline}</p>}

        <h1 className="mt-8 max-w-[18ch] text-affiche text-balance">{titre}</h1>

        {chapeau && (
          <p className="mt-8 max-w-lecture text-chapeau text-neutre">{chapeau}</p>
        )}

        {enfants}
      </div>
    </header>
  );
}
