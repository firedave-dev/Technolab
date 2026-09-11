import { notFound } from 'next/navigation';
import EnTetePage from '@/composants/structure/EnTetePage';
import Section from '@/composants/structure/Section';
import Bouton from '@/composants/ui/Bouton';
import Reveal from '@/composants/mouvement/Reveal';
import { PARCOURS, parcoursParSlug } from '@/contenu/donnees/formations';
import { metadonnees } from '@/lib/seo';

/**
 * Page de detail d'un parcours — gabarit, en attente de son contenu.
 *
 * Les 67 adresses sont DEJA generees et deja valides. C'est volontaire : la page
 * liste renvoie vers elles, et un lien qui mene a une erreur 404 coute plus cher
 * qu'une page franchement annoncee comme incomplete — aupres d'un visiteur comme
 * d'un moteur de recherche, qui retient les liens morts.
 *
 * En revanche, elles ne sont PAS INDEXABLES tant qu'elles n'ont pas de contenu
 * propre. Soixante-sept pages qui se ressemblent seraient traitees comme du
 * contenu duplique, et cette impression retomberait sur le reste du site. Le
 * `noindex` se retirera en Phase 4, quand chaque parcours aura son programme,
 * ses debouches et ses tarifs.
 */

export function generateStaticParams() {
  return PARCOURS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const parcours = parcoursParSlug(slug);
  if (!parcours) return {};

  return metadonnees({
    titre: `${parcours.nom} — ${parcours.cycleNom}`,
    description:
      `${parcours.nom}, ${parcours.niveau}, pôle ${parcours.poleNom} à Technolab ISTA.`,
    chemin: `/formations/${parcours.slug}`,
    indexable: false,
  });
}

export default async function Parcours({ params }) {
  const { slug } = await params;
  const parcours = parcoursParSlug(slug);
  if (!parcours) notFound();

  const voisins = PARCOURS
    .filter((p) => p.pole === parcours.pole && p.cycle === parcours.cycle && p.slug !== parcours.slug)
    .slice(0, 4);

  return (
    <>
      <EnTetePage
        baseline={`${parcours.cycleNom} · ${parcours.niveau}`}
        titre={parcours.nom}
        chapeau={`Pôle ${parcours.poleNom}.`}
      />

      <Section titreId="titre-construction">
        <Reveal>
          <div className="max-w-lecture rounded-2xl border border-filet bg-fond-doux p-10">
            <h2 id="titre-construction" className="text-sous-titre font-bold">
              Fiche en cours de rédaction
            </h2>
            <p className="mt-4 leading-relaxed text-neutre">
              Le programme détaillé, les compétences visées, les débouchés et les frais
              de scolarité de ce parcours seront publiés prochainement. En attendant,
              le secrétariat de l’institut répond à toute demande d’information.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Bouton href="/admissions">Conditions d’admission</Bouton>
              <Bouton href="/formations" variante="secondaire">
                Toutes les formations
              </Bouton>
            </div>
          </div>
        </Reveal>

        {voisins.length > 0 && (
          <Reveal>
            <div className="mt-bloc">
              <h2 className="text-sous-titre font-bold">
                Autres parcours du même pôle
              </h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {voisins.map((p) => (
                  <li key={p.slug}>
                    <a
                      href={`/formations/${p.slug}`}
                      className="flex h-full flex-col rounded-xl border border-filet bg-white p-6
                                 transition-[transform,box-shadow,border-color] duration-300 ease-douce
                                 hover:-translate-y-1 hover:border-transparent
                                 hover:shadow-[0_18px_40px_-24px_rgba(11,46,82,0.45)]"
                    >
                      <h3 className="flex-1 font-bold leading-snug">{p.nom}</h3>
                      <p className="mt-4 text-sm font-semibold text-ista">{p.niveau}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </Section>
    </>
  );
}
