import Section from '@/composants/structure/Section';
import Reveal from '@/composants/mouvement/Reveal';
import { CREDITS } from '@/contenu/donnees/credits';
import { metadonnees } from '@/lib/seo';

/**
 * Page des credits.
 *
 * Discrete mais obligatoire : le modele 3D du hero est sous licence CC BY 4.0,
 * qui conditionne le droit d'usage a une attribution accessible depuis le site.
 * Elle est atteignable depuis le pied de page de toutes les pages.
 *
 * Elle n'est pas mise en avant dans les resultats de recherche — elle n'a de
 * valeur que pour qui la cherche — mais elle reste indexable : une attribution
 * que les moteurs ignorent reste une attribution publiee.
 */

export const metadata = metadonnees({
  titre: 'Crédits',
  description:
    'Origine et licences des ressources utilisées sur le site : modèle 3D, '
    + 'polices de caractères et photographies.',
  chemin: '/credits',
});

export default function Credits() {
  return (
    <Section titreId="titre-credits">
      <Reveal>
        <p className="baseline text-ista">Ressources</p>
        <h1 id="titre-credits" className="mt-6 text-titre">
          Crédits
        </h1>
        <p className="mt-8 max-w-lecture leading-relaxed text-neutre">
          Les ressources tierces utilisées sur ce site, leurs auteurs et les
          licences sous lesquelles elles sont employées.
        </p>
      </Reveal>

      <div className="mt-bloc space-y-bloc">
        {CREDITS.map(({ cle, titre, entrees }) => (
          <Reveal key={cle}>
            <section aria-labelledby={`credits-${cle}`}>
              <h2 id={`credits-${cle}`} className="text-sous-titre font-bold">
                {titre}
              </h2>

              <dl className="mt-6 space-y-8">
                {entrees.map((e) => (
                  <div key={e.nom} className="border-l-2 border-filet pl-6">
                    <dt className="font-semibold">{e.nom}</dt>
                    <dd className="mt-2 text-[0.9375rem] leading-relaxed text-neutre">
                      <p>
                        Par {e.auteur}
                        {e.source && (
                          <>
                            {' — '}
                            {e.lienSource ? (
                              <a
                                href={e.lienSource}
                                className="text-ista underline-offset-4 hover:underline"
                                rel="noreferrer"
                                target="_blank"
                              >
                                {e.source}
                              </a>
                            ) : (
                              e.source
                            )}
                          </>
                        )}
                      </p>

                      <p className="mt-1">
                        Licence :{' '}
                        {e.lienLicence ? (
                          <a
                            href={e.lienLicence}
                            className="text-ista underline-offset-4 hover:underline"
                            rel="license noreferrer"
                            target="_blank"
                          >
                            {e.licence}
                          </a>
                        ) : (
                          e.licence
                        )}
                      </p>

                      {e.note && <p className="mt-3 max-w-lecture">{e.note}</p>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
