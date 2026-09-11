import Reveal from '@/composants/mouvement/Reveal';

/**
 * Suite d'etapes numerotees.
 *
 * Rendue en `<ol>`, et non en grille de `<div>` : un processus d'admission a un
 * ORDRE, et cet ordre est une information. Un lecteur d'ecran annonce alors
 * « liste de 4 elements, element 2 sur 4 » — ce qu'aucune mise en page visuelle,
 * si claire soit-elle, ne transmet.
 *
 * Le trait de liaison qui relie les etapes sur grand ecran est decoratif et
 * porte `aria-hidden` ; sur telephone, la liste s'empile et le trait disparait,
 * la lecture verticale suffisant a exprimer la succession.
 */
export default function Etapes({ etapes }) {
  return (
    <ol className="grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {etapes.map(({ titre, texte }, i) => (
        <Reveal key={titre} retard={i * 0.08} as="li">
          <div className="relative">
            {/* Liaison vers l'etape suivante. */}
            {i < etapes.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-12 right-0 top-5 hidden h-px bg-filet lg:block"
              />
            )}

            <span
              aria-hidden="true"
              className="relative flex h-10 w-10 items-center justify-center rounded-full
                         bg-marine text-sm font-bold text-white"
            >
              {i + 1}
            </span>

            <h3 className="mt-6 text-lg font-bold">{titre}</h3>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-neutre">{texte}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}
