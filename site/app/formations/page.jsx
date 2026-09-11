import EnTetePage from '@/composants/structure/EnTetePage';
import Section from '@/composants/structure/Section';
import Reveal from '@/composants/mouvement/Reveal';
import Bouton from '@/composants/ui/Bouton';
import ListeParcours from '@/composants/formations/ListeParcours';
import { CYCLES, NOMBRE_PARCOURS, PARCOURS, POLES, nomPole } from '@/contenu/donnees/formations';
import { metadonnees } from '@/lib/seo';
import { ORIGINE } from '@/contenu/donnees/etablissement';

/**
 * Page des formations.
 *
 * L'offre est vaste — 67 parcours — et la difficulte n'est pas de les afficher
 * mais de ne pas noyer le visiteur. Trois dispositifs s'en chargent :
 *
 * - le GROUPEMENT PAR CYCLE, qui correspond a la question que se pose un
 *   candidat (« j'ai le bac, je cherche un Bac+2 ») plutot qu'a la structure
 *   interne de l'etablissement ;
 * - les ANCRES `#dut`, `#licence`, `#master`, pour pointer un cycle precis
 *   depuis un lien ou un courriel ;
 * - le FILTRE PAR POLE, qui divise la liste par trois sans rien retirer de la
 *   page.
 *
 * Le tri des donnees se fait ici, cote serveur : le composant client ne recoit
 * que ce qu'il affiche.
 */

export const metadata = metadonnees({
  titre: 'Formations',
  description:
    `${NOMBRE_PARCOURS} parcours du Bac+2 au Bac+5 à Technolab ISTA : DUT, Licence `
    + 'et Master en sciences de gestion, technologies et ingénierie.',
  chemin: '/formations',
});

/**
 * Donnees structurees.
 *
 * Un `Course` par parcours plutot qu'un par cycle : c'est le parcours qu'un
 * candidat cherche, et c'est donc lui qui doit pouvoir remonter seul dans un
 * resultat de recherche.
 */
const schema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  numberOfItems: PARCOURS.length,
  itemListElement: PARCOURS.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Course',
      name: `${p.cycleNom} ${p.nom}`,
      url: `${ORIGINE}/formations/${p.slug}`,
      description: `${p.nom} — ${p.poleNom}, ${p.niveau}.`,
      inLanguage: 'fr',
      provider: {
        '@type': 'EducationalOrganization',
        name: 'Technolab ISTA',
        url: ORIGINE,
      },
    },
  })),
};

export default function Formations() {
  // Forme attendue par la liste : un cycle porte ses propres parcours.
  const cycles = CYCLES.map((cycle) => ({
    cle: cycle.cle,
    nom: cycle.nom,
    niveau: cycle.niveau,
    resume: cycle.resume,
    parcours: PARCOURS.filter((p) => p.cycle === cycle.cle),
  }));

  const poles = POLES.map((pole) => ({ cle: pole.cle, nom: pole.nom }));

  return (
    <>
      <script
        type="application/ld+json"
        // Contenu construit par nous, jamais une saisie : aucun risque d'injection.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <EnTetePage
        baseline="Offre de formation"
        titre="Soixante-sept parcours, trois cycles"
        chapeau={
          'Du DUT au Master, en sciences économiques et de gestion, en sciences et '
          + 'technologies et en sciences de l’ingénieur. Les diplômes sont reconnus '
          + 'par le CAMES.'
        }
        enfants={
          <nav aria-label="Accès direct par cycle" className="mt-10 flex flex-wrap gap-3">
            {CYCLES.map((cycle) => (
              <a
                key={cycle.cle}
                href={`#${cycle.cle}`}
                className="rounded-full border border-filet px-5 py-2.5 text-[0.9375rem]
                           text-neutre transition-colors duration-200
                           hover:border-marine/30 hover:text-marine"
              >
                {cycle.nom} <span className="text-neutre/70">{cycle.niveau}</span>
              </a>
            ))}
          </nav>
        }
      />

      <Section titreId={undefined}>
        <ListeParcours cycles={cycles} poles={poles} />
      </Section>

      {/* --- Poles disciplinaires --- */}
      <Section titreId="titre-poles" ton="doux">
        <Reveal>
          <p className="baseline text-ista">Nos pôles</p>
          <h2 id="titre-poles" className="mt-6 max-w-lecture text-titre">
            Trois domaines, une même exigence
          </h2>
        </Reveal>

        <div className="mt-bloc grid gap-10 lg:grid-cols-3">
          {POLES.map((pole, i) => (
            <Reveal key={pole.cle} retard={i * 0.08}>
              <article>
                <h3 className="text-sous-titre font-bold">{pole.nom}</h3>
                {pole.nomDut && (
                  <p className="mt-2 text-sm text-neutre">
                    Intitulé « {nomPole(pole, 'dut')} » en cycle DUT.
                  </p>
                )}
                <p className="mt-4 leading-relaxed text-neutre">{pole.resume}</p>
                <p className="mt-6 text-sm font-semibold text-ista">
                  {PARCOURS.filter((p) => p.pole === pole.cle).length} parcours
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* --- Appel a l'action --- */}
      <Section titreId="titre-candidater" ton="marine">
        <Reveal>
          <h2 id="titre-candidater" className="max-w-[16ch] text-titre text-white">
            Prêt à rejoindre l’institut ?
          </h2>
          <p className="mt-8 max-w-lecture leading-relaxed text-clair-sur-fonce">
            Les conditions d’admission, les pièces à fournir et les frais de scolarité
            sont détaillés sur la page Admissions.
          </p>
          <div className="mt-10">
            <Bouton href="/admissions" variante="inverse" taille="grande">
              Voir les conditions d’admission
            </Bouton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
