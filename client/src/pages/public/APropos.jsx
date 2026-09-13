/**
 * Page « À propos ».
 *
 * L'histoire, la mission et les reconnaissances viennent de la brochure
 * institutionnelle (utils/formations.js). L'organisation decrite ensuite est celle
 * que la plateforme modelise reellement — les quatre poles correspondent aux roles
 * geres par l'application.
 *
 * Restent volontairement absents : adresse postale complete, telephone, numero
 * d'agrement. Ils doivent etre fournis par la direction plutot qu'inventes, et
 * alimenteront alors aussi les mentions legales des recus (env.etablissement).
 */
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Globe2, ShieldCheck, Users } from 'lucide-react';
import Seo, { SCHEMA_ETABLISSEMENT, assembler, schemaFilAriane } from '../../components/Seo.jsx';
import Photo from '../../components/Photo.jsx';
import {
  ANNEE_FONDATION, NOMBRE_PARCOURS, NOM_COMPLET, PARTENARIATS, RECONNAISSANCES, SIGLE,
} from '../../utils/formations.js';

/** Les trois engagements que la plateforme rend concrets. */
const ENGAGEMENTS = [
  {
    icone: ClipboardCheck,
    titre: 'Un suivi continu',
    texte:
      'Notes, absences et bulletins sont saisis au fil de l’année. Chaque famille reçoit '
      + 'une notification le jour même d’une absence ou de la publication de nouvelles notes.',
  },
  {
    icone: Users,
    titre: 'Des familles associées',
    texte:
      'Les parents disposent de leur propre accès, rattaché au dossier de leur enfant : '
      + 'résultats, assiduité et situation financière, sans avoir à se déplacer.',
  },
  {
    icone: ShieldCheck,
    titre: 'Des données protégées',
    texte:
      'Chaque profil ne voit que ce qui le concerne. Un parent accède au dossier de ses '
      + 'enfants uniquement, un enseignant aux matières qui lui sont assignées.',
  },
];

/** Rôles réellement gérés par la plateforme. */
const EQUIPES = [
  ['Direction', 'Pilotage de l’établissement, validation des paiements, statistiques.'],
  ['Secrétariat', 'Inscriptions, dossiers étudiants, échéanciers et encaissements.'],
  ['Enseignants', 'Saisie des notes, publication des bulletins, appel en cours.'],
  ['Surveillance', 'Suivi de l’assiduité, justificatifs, surveillance des examens.'],
];

export default function APropos() {
  return (
    <>
      <Seo
        chemin="/a-propos"
        titre="À propos"
        description={
          `${NOM_COMPLET} (${SIGLE}), fondé en ${ANNEE_FONDATION} : établissement privé agréé, `
          + 'reconnu par le CAMES et la FEDE, accrédité Cisco et Huawei ICT. Organisation, '
          + 'partenariats et suivi de scolarité en ligne.'
        }
        schema={assembler(
          SCHEMA_ETABLISSEMENT,
          schemaFilAriane([{ nom: 'À propos', chemin: '/a-propos' }]),
        )}
      />

      <section className="border-b border-slate-200 bg-brand-50/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="libelle-capitales text-[11px] text-ista">L’établissement</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-marine">À propos</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            Fondé en {ANNEE_FONDATION}, l’{NOM_COMPLET} ({SIGLE}) est un établissement privé
            d’éducation agréé par le gouvernement malien. Il forme, sur {NOMBRE_PARCOURS} parcours,
            les futurs cadres et experts de l’ingénierie, de la gestion et des techniques
            administratives, commerciales et managériales.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {/* Présentation illustrée */}
        <section className="grid items-center gap-10 lg:grid-cols-2" aria-labelledby="titre-institut">
          <div>
            <h2 id="titre-institut" className="text-3xl font-bold tracking-tight text-marine">
              Pourquoi choisir TechnoLAB-ISTA
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              L’institut suit les évolutions des entreprises et des administrations, et adapte
              son offre aux mutations socio-économiques et technologiques. Plus de 16 000 diplômés
              en sont issus, répartis à travers le monde et pour la plupart au Mali.
            </p>
            <p className="mt-4 leading-relaxed text-slate-600">
              La scolarité se déroule en présentiel, sur des promotions à taille humaine. Chaque
              cursus se conclut par un projet professionnel encadré, soutenu devant un jury.
            </p>

            <Link
              to="/formations"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ista hover:underline"
            >
              Voir les {NOMBRE_PARCOURS} parcours
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <figure className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-900/5">
            <Photo nom="assemblee-generale" className="h-auto w-full object-cover" />
            <figcaption className="bg-white px-5 py-3 text-sm text-slate-600">
              Rassemblement dans la cour de l’établissement.
            </figcaption>
          </figure>
        </section>

        {/* Agréments */}
        <section aria-labelledby="titre-reconnaissances">
          <h2 id="titre-reconnaissances" className="text-3xl font-bold tracking-tight text-marine">
            Agréments et reconnaissances
          </h2>

          <dl className="mt-8 grid gap-6 md:grid-cols-2">
            {RECONNAISSANCES.map(({ nom, detail }) => (
              <div key={nom} className="carte p-6">
                <dt className="text-base font-bold text-marine">{nom}</dt>
                <dd className="mt-2 leading-relaxed text-slate-600">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Partenariats internationaux */}
        <section
          className="sur-marine rounded-2xl bg-marine px-8 py-12 sm:px-12"
          aria-labelledby="titre-partenariats"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 text-white">
            <Globe2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 id="titre-partenariats" className="mt-5 text-2xl font-bold tracking-tight text-white">
            Partenariats internationaux
          </h2>
          <p className="mt-3 max-w-2xl text-clair-sur-fonce">
            TechnoLAB-ISTA collabore avec plusieurs universités étrangères. Des doubles diplômes
            sont proposés par le biais de programmes conjoints, et d’autres partenariats existent
            au {PARTENARIATS.pays.join(', au ')}.
          </p>

          <ul className="mt-6 flex flex-wrap gap-3">
            {PARTENARIATS.doublesDiplomes.map((partenaire) => (
              <li
                key={partenaire}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white"
              >
                {partenaire}
                <span className="ml-2 text-clair-sur-fonce">double diplôme</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-engagements">
          <h2 id="titre-engagements" className="text-3xl font-bold tracking-tight text-marine">
            Nos engagements
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {ENGAGEMENTS.map(({ icone: Icone, titre, texte }) => (
              <article key={titre} className="carte p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-ista">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-marine">{titre}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{texte}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="titre-equipes">
          <h2 id="titre-equipes" className="text-3xl font-bold tracking-tight text-marine">
            Les équipes
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            L’établissement s’appuie sur quatre pôles, dont chacun dispose de son propre
            espace de travail dans la plateforme.
          </p>

          <dl className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
            {EQUIPES.map(([role, mission]) => (
              <div key={role} className="grid gap-2 bg-white px-6 py-5 sm:grid-cols-[200px_1fr] sm:gap-6">
                <dt className="font-bold text-marine">{role}</dt>
                <dd className="leading-relaxed text-slate-600">{mission}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="carte p-8" aria-labelledby="titre-contact">
          <h2 id="titre-contact" className="text-2xl font-bold tracking-tight text-marine">
            Nous contacter
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Pour toute demande d’information ou d’inscription, adressez-vous au secrétariat
            de l’établissement, à Sévaré. Les étudiants et parents déjà inscrits peuvent
            écrire depuis leur espace personnel.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/admissions"
              className="inline-flex items-center gap-2 rounded-lg bg-ista px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Admissions et tarifs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-marine transition hover:bg-slate-50"
            >
              Accéder à mon espace
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
