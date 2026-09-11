import EnTetePage from '@/composants/structure/EnTetePage';
import Section from '@/composants/structure/Section';
import Reveal from '@/composants/mouvement/Reveal';
import Compteur from '@/composants/mouvement/Compteur';
import Bouton from '@/composants/ui/Bouton';
import Photo from '@/composants/media/Photo';
import BandePhoto from '@/composants/media/BandePhoto';
import { separer } from '@/lib/nombres';
import { metadonnees } from '@/lib/seo';
import {
  ANNEE_FONDATION,
  CHIFFRES,
  CONTACT,
  NOM_COMPLET,
  PARTENARIATS,
  RECONNAISSANCES,
  SIGLE,
} from '@/contenu/donnees/etablissement';
import { NOMBRE_PARCOURS } from '@/contenu/donnees/formations';

/**
 * Page « L'institut ».
 *
 * Tout ce qui y est affirme vient de la brochure institutionnelle. Un
 * superlatif y a ete ecarte — « le taux d'insertion professionnelle le plus
 * eleve » — parce qu'une comparaison entre etablissements demande une source
 * publiee : sur un site officiel, une affirmation invérifiable expose autant
 * qu'elle valorise. Elle se reintegrera si la direction fournit l'etude.
 *
 * La section gouvernance reste une grille vide et annoncee comme telle, faute
 * de portraits et de noms. Inventer une equipe dirigeante serait la pire faute
 * possible sur la page qui engage le plus l'etablissement.
 */

export const metadata = metadonnees({
  titre: 'L’institut',
  description:
    `${NOM_COMPLET} — établissement privé d’enseignement supérieur fondé en `
    + `${ANNEE_FONDATION} à Sévaré, agréé par le gouvernement malien et reconnu CAMES.`,
  chemin: '/a-propos',
});

export default function APropos() {
  return (
    <>
      <EnTetePage
        baseline="L’institut"
        titre={`Former depuis ${ANNEE_FONDATION}`}
        chapeau={
          `${NOM_COMPLET} — ${SIGLE} — est un établissement privé d’éducation agréé `
          + 'par le gouvernement malien, implanté à Sévaré, dans la région de Mopti.'
        }
      />

      {/* --- Chiffres --- */}
      <Section titreId="titre-chiffres" ton="marine">
        <h2 id="titre-chiffres" className="sr-only">
          L’institut en chiffres
        </h2>

        <dl className="grid gap-bloc sm:grid-cols-2 lg:grid-cols-4">
          {CHIFFRES.map(({ valeur, libelle }, i) => {
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

      {/* --- Mission --- */}
      <Section titreId="titre-mission">
        <div className="grid gap-bloc lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <p className="baseline text-ista">Notre mission</p>
            <h2 id="titre-mission" className="mt-6 text-titre">
              Préparer les experts de demain
            </h2>
            <div className="mt-8 max-w-lecture space-y-6 leading-relaxed text-neutre">
              <p>
                L’institut a pour mission de préparer et de former les futurs leaders
                et experts dans les secteurs de l’ingénierie, de la gestion, ainsi que
                des techniques administratives, commerciales et managériales.
              </p>
              <p>
                Il tient compte des évolutions au sein des entreprises et des
                administrations, et s’adapte aux innovations socio-économiques et
                technologiques par une offre d’enseignement régulièrement mise à jour —
                aujourd’hui {NOMBRE_PARCOURS} parcours répartis sur trois cycles.
              </p>
            </div>
            <div className="mt-10">
              <Bouton href="/formations" variante="secondaire">
                Voir les formations
              </Bouton>
            </div>
          </Reveal>

          <Reveal retard={0.1}>
            <div className="overflow-hidden rounded-2xl">
              <Photo
                nom="campus-groupe"
                tailles="(min-width: 1024px) 45vw, 92vw"
                className="h-auto w-full"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* --- Photographie pleine largeur --- */}
      <BandePhoto
        nom="remise-diplomes"
        legende="Cérémonie de remise des diplômes, devant la salle multifonctionnelle."
      />

      {/* --- Reconnaissances --- */}
      <Section titreId="titre-reconnaissances" ton="doux">
        <Reveal>
          <p className="baseline text-ista">Agréments</p>
          <h2 id="titre-reconnaissances" className="mt-6 max-w-lecture text-titre">
            Reconnaissances et accréditations
          </h2>
        </Reveal>

        <dl className="mt-bloc divide-y divide-filet border-y border-filet">
          {RECONNAISSANCES.map(({ nom, detail }, i) => (
            <Reveal key={nom} retard={i * 0.05} as="div">
              <div className="grid gap-3 py-8 md:grid-cols-[16rem_1fr] md:gap-10">
                <dt className="text-sous-titre font-bold">{nom}</dt>
                <dd className="max-w-lecture leading-relaxed text-neutre">{detail}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </Section>

      {/* --- Partenariats --- */}
      <Section titreId="titre-partenariats">
        <div className="grid gap-bloc lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <p className="baseline text-ista">International</p>
            <h2 id="titre-partenariats" className="mt-6 text-titre">
              Des diplômes qui franchissent les frontières
            </h2>
            <p className="mt-8 max-w-lecture leading-relaxed text-neutre">
              L’institut collabore avec plusieurs universités étrangères dans le cadre
              de partenariats offrant des doubles diplômes par le biais de programmes
              conjoints.
            </p>
          </Reveal>

          <Reveal retard={0.1}>
            <div className="space-y-10">
              <div>
                <h3 className="baseline text-neutre">Doubles diplômes</h3>
                <ul className="mt-5 space-y-3">
                  {PARTENARIATS.doublesDiplomes.map((p) => (
                    <li key={p} className="border-l-2 border-ista pl-5 font-semibold">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="baseline text-neutre">Autres partenariats</h3>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {PARTENARIATS.pays.map((pays) => (
                    <li
                      key={pays}
                      className="rounded-full border border-filet px-4 py-2 text-[0.9375rem] text-neutre"
                    >
                      {pays}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* --- Gouvernance --- */}
      <Section titreId="titre-gouvernance" ton="doux">
        <Reveal>
          <p className="baseline text-ista">Gouvernance</p>
          <h2 id="titre-gouvernance" className="mt-6 max-w-lecture text-titre">
            L’équipe de direction
          </h2>
          <p className="mt-8 max-w-lecture leading-relaxed text-neutre">
            Les membres de l’équipe de direction seront présentés ici. Cette section
            attend les noms, fonctions et portraits fournis par l’institut.
          </p>
        </Reveal>

        {/*
          Grille d'emplacements vides plutot qu'une section absente : elle montre
          la place reservee, tient le rythme de la page, et rend visible ce qui
          reste a fournir. Aucun nom, aucune fonction ne sont supposes.
        */}
        <Reveal retard={0.08}>
          <ul className="mt-bloc grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <li
                key={i}
                aria-hidden="true"
                className="rounded-2xl border border-dashed border-filet bg-white p-6"
              >
                <div className="aspect-square w-full rounded-xl bg-fond-doux" />
                <div className="mt-5 h-3 w-2/3 rounded bg-fond-doux" />
                <div className="mt-3 h-3 w-1/2 rounded bg-fond-doux" />
              </li>
            ))}
          </ul>
        </Reveal>
      </Section>

      {/* --- Contact --- */}
      <Section titreId="titre-ou" ton="marine">
        <Reveal>
          <h2 id="titre-ou" className="max-w-[18ch] text-titre text-white">
            Nous trouver
          </h2>
          <p className="mt-8 max-w-lecture leading-relaxed text-clair-sur-fonce">
            L’institut est implanté à {CONTACT.ville}, dans la région de{' '}
            {CONTACT.region}, au {CONTACT.pays}. Le secrétariat reçoit les candidats
            à la Direction et dans les centres annexes.
          </p>
          <div className="mt-10">
            <Bouton href="/admissions" variante="inverse" taille="grande">
              Conditions d’admission
            </Bouton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
