/**
 * Section de page.
 *
 * Porte le rythme vertical du site et, surtout, impose le lien entre un bloc et
 * son titre. `titreId` alimente `aria-labelledby` : une personne qui parcourt la
 * page au lecteur d'ecran entend « region : Nos formations » plutot que
 * « region » repete huit fois. Passer par un composant plutot que par une
 * convention garantit que ce lien ne s'oublie pas.
 *
 * `ton` couvre les trois fonds du site. Ils sont limites a trois exprès : la
 * charte veut le blanc dominant, et multiplier les fonds intermediaires dilue
 * l'effet d'autorite du marine quand il apparait enfin.
 */

const FONDS = {
  blanc: 'bg-white text-marine',
  doux: 'bg-fond-doux text-marine',
  marine: 'bg-marine text-white',
};

export default function Section({
  children,
  titreId,
  ton = 'blanc',
  /** Retire la largeur maximale — pour les photographies pleine largeur. */
  pleineLargeur = false,
  className = '',
  ...reste
}) {
  return (
    <section
      aria-labelledby={titreId}
      className={`${FONDS[ton]} py-section ${className}`}
      {...reste}
    >
      {pleineLargeur ? (
        children
      ) : (
        <div className="mx-auto w-full max-w-page px-6 md:px-10">{children}</div>
      )}
    </section>
  );
}
