/**
 * Page d'accueil publique.
 *
 * Les chiffres et l'offre viennent de utils/formations.js, transcrits de la brochure
 * institutionnelle. Les photographies sont celles fournies par la direction : aucune
 * image d'illustration achetee, aucune scene reconstituee — un site d'ecole se juge
 * aussi sur le fait que les visages montres soient les siens.
 */
import { Link } from 'react-router-dom';
import {
  ArrowRight, Award, CalendarDays, CreditCard, FileSpreadsheet, GraduationCap, UserCheck,
} from 'lucide-react';
import Seo, { SCHEMA_ETABLISSEMENT } from '../../components/Seo.jsx';
import Photo from '../../components/Photo.jsx';
import Carrousel from '../../components/Carrousel.jsx';
import Compteur from '../../components/Compteur.jsx';
import Logo from '../../components/Logo.jsx';
import {
  CHIFFRES, CYCLES, NOMBRE_PARCOURS, PARTENARIATS, POLES,
} from '../../utils/formations.js';

/**
 * Vues du carrousel d'accueil : les ceremonies de remise de diplomes.
 *
 * C'est l'aboutissement du parcours, donc ce qu'un visiteur vient chercher. Les
 * sorties et la vie etudiante ont leur propre section plus bas — les melanger
 * ici brouillerait le propos du premier ecran.
 */
const PHOTOS_HERO = [
  'remise-diplomes',
  'diplomes-groupe',
  'remise-certificat',
  'ceremonie',
  'diplomes-scene',
  'remise-directeur',
];

/** Legendes affichees en surimpression, factuelles et non promotionnelles. */
const LEGENDES_HERO = {
  'remise-diplomes': 'Remise des diplômes',
  'diplomes-groupe': 'Diplômées devant le mur des partenaires',
  'remise-certificat': 'Remise d’un certificat de fin de cycle',
  ceremonie: 'Cérémonie de remise des diplômes',
  'diplomes-scene': 'Les diplômés sur scène',
  'remise-directeur': 'Remise par la direction de l’institut',
};

/** Ce que la plateforme apporte concretement aux familles et aux equipes. */
const SERVICES = [
  {
    icone: FileSpreadsheet,
    titre: 'Notes et bulletins',
    texte: 'Moyennes, rang et bulletin consultables dès la publication par l’enseignant.',
  },
  {
    icone: UserCheck,
    titre: 'Absences suivies',
    texte: 'Chaque absence est notifiée à la famille le jour même, avec son justificatif.',
  },
  {
    icone: CreditCard,
    titre: 'Scolarité transparente',
    texte: 'Échéancier détaillé, historique des règlements et reçus téléchargeables.',
  },
  {
    icone: CalendarDays,
    titre: 'Emploi du temps',
    texte: 'Cours de la semaine et calendrier des examens, accessibles depuis un téléphone.',
  },
];

/**
 * Moments de la vie etudiante, chacun adosse a une photographie reelle.
 * La legende dit ce qu'on voit ; elle ne romance pas la scene.
 */
const VIE_ETUDIANTE = [
  {
    photo: 'dakar-plage',
    titre: 'Séjours à l’étranger',
    texte: 'Des voyages d’études hors du Mali, ici lors d’un séjour de promotion à Dakar.',
  },
  {
    photo: 'lac-rose',
    titre: 'Sorties de promotion',
    texte: 'Des sorties qui soudent les promotions, ici lors d’une visite au lac Rose.',
  },
  {
    photo: 'salle-de-classe',
    titre: 'Enseignement en présentiel',
    texte: 'Des promotions à taille humaine, encadrées par des enseignants disponibles.',
  },
];

export default function Accueil() {
  return (
    <>
      <Seo
        chemin="/"
        titre="Accueil"
        description={
          `TechnoLAB-ISTA, institut supérieur privé agréé à Sévaré : ${NOMBRE_PARCOURS} parcours `
          + 'du DUT au master en gestion, informatique, réseaux, génie électrique, BTP et mines. '
          + 'Suivi de scolarité en ligne pour les étudiants et les familles.'
        }
        schema={SCHEMA_ETABLISSEMENT}
      />

      {/* Bannière principale */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_460px]">
          <div>
            <p className="libelle-capitales text-[11px] text-ista">
              Institut supérieur privé agréé
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-marine sm:text-5xl">
              Se former aux technologies appliquées et aux métiers de la gestion
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              TechnoLAB-ISTA propose {NOMBRE_PARCOURS} parcours répartis sur trois cycles —
              DUT, licence et master — dans les sciences de gestion, les technologies et
              l’ingénierie.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/formations"
                className="action-relief inline-flex items-center gap-2 rounded-lg bg-ista px-5 py-3 text-sm font-medium text-white hover:bg-brand-700"
              >
                Découvrir les formations
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                to="/admissions"
                className="action-relief-discret inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-marine hover:bg-slate-50"
              >
                Admissions et tarifs
              </Link>
            </div>
          </div>

          {/*
            Premier écran : la première vue du carrousel est chargée sans
            attendre, tout le reste du site étant différé (voir Photo.jsx).
          */}
          <Carrousel
            photos={PHOTOS_HERO}
            legendes={LEGENDES_HERO}
            className="shadow-lg ring-1 ring-slate-900/5"
          />
        </div>
      </section>

      {/* Chiffres clés */}
      <section className="border-b border-slate-200 bg-marine sur-marine" aria-labelledby="titre-chiffres">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="titre-chiffres" className="sr-only">
            L’institut en chiffres
          </h2>
          <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {CHIFFRES.map(({ nombre, suffixe, libelle }) => (
              <div key={libelle}>
                <dt className="sr-only">{libelle}</dt>
                <dd>
                  <Compteur
                    valeur={nombre}
                    suffixe={suffixe}
                    className="block text-3xl font-bold tabular-nums tracking-tight text-white"
                  />
                  <span className="mt-1 block text-sm text-clair-sur-fonce">{libelle}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Cycles */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="titre-cycles">
        <h2 id="titre-cycles" className="text-3xl font-bold tracking-tight text-marine">
          Trois cycles, trois pôles
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Du Bac+2 au Bac+5, chaque cycle couvre les mêmes trois pôles disciplinaires :{' '}
          {POLES.map((p) => p.nom.toLowerCase()).join(', ')}.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {CYCLES.map((cycle) => {
            const parcours = POLES.reduce(
              (n, pole) => n + cycle.programmes[pole.cle].length,
              0
            );

            return (
              <article key={cycle.cle} className="carte-interactive flex flex-col p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-ista">
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="mt-5 text-xl font-bold text-marine">
                  {cycle.nom}
                  <span className="ml-2 align-middle text-sm font-medium text-slate-500">
                    {cycle.niveau}
                  </span>
                </h3>
                <p className="mt-3 leading-relaxed text-slate-600">{cycle.resume}</p>

                <p className="mt-5 text-sm font-medium text-slate-500">{parcours} parcours</p>

                <Link
                  to={`/formations#${cycle.cle}`}
                  className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-medium text-ista hover:underline"
                >
                  Voir les parcours
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* Reconnaissances et partenariats */}
      <section className="border-y border-slate-200 bg-slate-50" aria-labelledby="titre-reconnaissance">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-ista shadow-sm">
              <Award className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2
              id="titre-reconnaissance"
              className="mt-5 text-3xl font-bold tracking-tight text-marine"
            >
              Des diplômes reconnus
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Établissement agréé par le gouvernement malien, TechnoLAB-ISTA est reconnu par
              le CAMES et la Fédération Européenne des Écoles. Les certifications CISCO ITE
              et CCNA sont intégrées aux programmes techniques informatiques.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              Des doubles diplômes sont proposés avec {PARTENARIATS.doublesDiplomes.join(' et ')},
              et des partenariats existent au {PARTENARIATS.pays.join(', au ')}.
            </p>

            <Link
              to="/a-propos"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ista hover:underline"
            >
              En savoir plus sur l’institut
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <figure className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
            <Photo nom="ceremonie" className="h-auto w-full object-cover" />
            <figcaption className="px-5 py-3 text-sm text-slate-600">
              Cérémonie de remise des diplômes.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Vie étudiante */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="titre-vie">
        <h2 id="titre-vie" className="text-3xl font-bold tracking-tight text-marine">
          La vie à l’institut
        </h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Au-delà des cours, les promotions participent à des événements culturels
          et à des séjours d’études, au Mali comme à l’étranger.
        </p>

        <figure className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          <Photo
            nom="segou-art"
            tailles="(min-width: 640px) 1152px, 100vw"
            className="h-auto w-full object-cover"
          />
          <figcaption className="px-6 py-4 text-sm text-slate-600">
            La délégation de l’institut au festival sur le Niger, à Ségou.
          </figcaption>
        </figure>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {VIE_ETUDIANTE.map(({ photo, titre, texte }) => (
            <article key={photo} className="carte overflow-hidden">
              <Photo nom={photo} className="h-44 w-full object-cover" />
              <div className="p-5">
                <h3 className="text-base font-bold text-marine">{titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{texte}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Plateforme de suivi */}
      <section className="border-t border-slate-200 bg-slate-50" aria-labelledby="titre-plateforme">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="titre-plateforme" className="text-3xl font-bold tracking-tight text-marine">
            Un suivi accessible à tout moment
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Étudiants, parents et équipes disposent chacun de leur espace, avec exactement
            les informations qui les concernent.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ icone: Icone, titre, texte }) => (
              <article key={titre} className="carte p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-ista shadow-sm">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-marine">{titre}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{texte}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="sur-marine overflow-hidden rounded-2xl bg-marine px-8 py-12 sm:px-12">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <Logo variante="marine" hauteur={44} className="rounded" />
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Déjà inscrit ? Retrouvez votre scolarité en ligne
              </h2>
              <p className="mt-3 text-clair-sur-fonce">
                Notes, absences, emploi du temps et paiements, dans un seul espace.
              </p>
            </div>

            <Link
              to="/login"
              className="action-relief-discret inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-marine hover:bg-slate-100"
            >
              Se connecter
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
