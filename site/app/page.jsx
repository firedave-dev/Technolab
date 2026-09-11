import Section from '@/composants/structure/Section';
import Bouton from '@/composants/ui/Bouton';
import Carte from '@/composants/ui/Carte';
import Photo from '@/composants/media/Photo';
import Reveal from '@/composants/mouvement/Reveal';
import Compteur from '@/composants/mouvement/Compteur';
import SceneOrdinateur from '@/composants/scene/SceneOrdinateur';
import { separer } from '@/lib/nombres';
import { CHIFFRES, ANNEE_FONDATION } from '@/contenu/donnees/etablissement';
import { CYCLES, POLES, NOMBRE_PARCOURS } from '@/contenu/donnees/formations';
import { metadonnees } from '@/lib/seo';

/**
 * Accueil — etat de la Phase 1.
 *
 * Cette page n'est pas encore l'accueil definitif : elle sert a valider le
 * design system sur du contenu reel plutot que sur du faux texte. Chaque bloc
 * exerce un jeton ou un composant — l'echelle d'affiche, le rythme vertical, les
 * boutons, les cartes, les compteurs, les photographies — pour qu'un ecart de
 * charte se voie maintenant, avant que douze pages ne l'aient recopie.
 *
 * Le hero porte la scene 3D, seule page du site a la charger.
 */

export const metadata = metadonnees({
  titre: 'Se former aux technologies appliquées et aux métiers de la gestion',
  description:
    `Établissement privé d’enseignement supérieur à Sévaré depuis ${ANNEE_FONDATION} : `
    + `${NOMBRE_PARCOURS} parcours du Bac+2 au Bac+5, diplômes reconnus CAMES.`,
  chemin: '/',
});

export default function Accueil() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section
        aria-labelledby="titre-accueil"
        className="relative overflow-hidden pb-section pt-40 md:pt-48"
      >
        <div className="mx-auto grid max-w-page items-center gap-bloc px-6 md:px-10 lg:grid-cols-[var(--proportion-hero)]">
          <div>
            <p className="baseline text-ista">Université privée · Sévaré, Mali</p>

            <h1 id="titre-accueil" className="mt-8 text-affiche text-balance">
              Se former aux technologies appliquées
            </h1>

            <p className="mt-8 max-w-lecture text-chapeau text-neutre">
              {NOMBRE_PARCOURS} parcours, du DUT au Master, dans les sciences de
              gestion, les technologies et l’ingénierie. Des diplômes reconnus par
              le CAMES et ouverts sur l’international.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Bouton href="/formations" taille="grande">
                Découvrir les formations
              </Bouton>
              <Bouton href="/admissions" variante="secondaire" taille="grande">
                Candidater
              </Bouton>
            </div>
          </div>

          <SceneOrdinateur />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Chiffres cles                                                    */}
      {/* ---------------------------------------------------------------- */}
      <Section titreId="titre-chiffres" ton="marine">
        <h2 id="titre-chiffres" className="sr-only">
          L’institut en chiffres
        </h2>

        <dl className="grid gap-bloc sm:grid-cols-2 lg:grid-cols-4">
          {CHIFFRES.map(({ valeur, libelle }, i) => {
            // « 28 ans », « 16 000+ », « 30+ », « 3 » : le nombre est isole pour
            // etre anime, le reste du libelle est restitue tel quel.
            const { nombre, suffixe } = separer(valeur);

            return (
              <Reveal key={libelle} retard={i * 0.08} as="div">
                <dt className="text-titre text-white">
                  <Compteur valeur={nombre} suffixe={suffixe} />
                </dt>
                <dd className="mt-3 text-[0.9375rem] text-clair-sur-fonce">{libelle}</dd>
              </Reveal>
            );
          })}
        </dl>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Cycles                                                           */}
      {/* ---------------------------------------------------------------- */}
      <Section titreId="titre-cycles">
        <Reveal>
          <p className="baseline text-ista">Nos cycles</p>
          <h2 id="titre-cycles" className="mt-6 max-w-lecture text-titre">
            Trois cycles, trois pôles disciplinaires
          </h2>
        </Reveal>

        <div className="mt-bloc grid gap-6 lg:grid-cols-3">
          {CYCLES.map((cycle, i) => {
            const total = POLES.reduce(
              (n, pole) => n + cycle.programmes[pole.cle].length,
              0
            );

            return (
              <Reveal key={cycle.cle} retard={i * 0.08}>
                <Carte href="/formations" className="h-full">
                  <p className="baseline text-neutre">{cycle.niveau}</p>
                  <h3 className="mt-4 text-sous-titre font-bold">{cycle.nom}</h3>
                  <p className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-neutre">
                    {cycle.resume}
                  </p>
                  <p className="mt-8 text-sm font-semibold text-ista">
                    {total} parcours
                  </p>
                </Carte>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ---------------------------------------------------------------- */}
      {/* Photographie                                                     */}
      {/* ---------------------------------------------------------------- */}
      <Section titreId="titre-vie" ton="doux">
        <div className="grid items-center gap-bloc lg:grid-cols-2">
          <Reveal>
            <p className="baseline text-ista">La vie à l’institut</p>
            <h2 id="titre-vie" className="mt-6 text-titre">
              Une école qui sort de ses murs
            </h2>
            <p className="mt-8 max-w-lecture leading-relaxed text-neutre">
              Compétitions inter-universitaires, festival sur le Niger, séjours de
              formation à l’étranger : la formation ne s’arrête pas à la salle de
              cours.
            </p>
            <div className="mt-10">
              <Bouton href="/vie-etudiante" variante="secondaire">
                Découvrir la vie étudiante
              </Bouton>
            </div>
          </Reveal>

          <Reveal retard={0.1}>
            <div className="overflow-hidden rounded-2xl">
              <Photo
                nom="segou-art"
                tailles="(min-width: 1024px) 45vw, 92vw"
                className="h-auto w-full"
              />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
