/**
 * Page publique des formations.
 *
 * Le catalogue vient de utils/formations.js — la meme source alimente les donnees
 * structurees schema.org, ce qui garantit que le visiteur et le moteur de recherche
 * voient exactement la meme offre.
 *
 * La page est organisee par CYCLE (DUT, licence, master) puis par pole, et non
 * l'inverse : un candidat sait a quel niveau il postule avant de savoir dans quelle
 * discipline. Chaque cycle porte une ancre (`#dut`, `#licence`, `#master`) pour
 * qu'un lien envoye par le secretariat tombe directement au bon endroit.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import Seo, { schemaFormations, assembler, schemaFilAriane } from '../../components/Seo.jsx';
import Photo from '../../components/Photo.jsx';
import { CYCLES, NOMBRE_PARCOURS, POLES, nomPole } from '../../utils/formations.js';

export default function Formations() {
  return (
    <>
      <Seo
        chemin="/formations"
        titre="Formations"
        description={
          `Les ${NOMBRE_PARCOURS} parcours de TechnoLAB-ISTA, du DUT au master : gestion et `
          + 'finance, informatique, réseaux et data, génie électrique, génie civil, mines '
          + 'et technologies agro-alimentaires.'
        }
        schema={assembler(
          schemaFormations(CYCLES, POLES),
          schemaFilAriane([{ nom: 'Formations', chemin: '/formations' }]),
        )}
      />

      <section className="border-b border-slate-200 bg-brand-50/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="libelle-capitales text-[11px] text-ista">Offre de formation</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-marine">Nos formations</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            {NOMBRE_PARCOURS} parcours répartis sur trois cycles — du Bac+2 au Bac+5 — et
            trois pôles disciplinaires.
          </p>

          {/* Sommaire : la page est longue, on donne les points d'entrée d'emblée. */}
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Cycles de formation">
            {CYCLES.map((cycle) => (
              <a
                key={cycle.cle}
                href={`#${cycle.cle}`}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-marine transition hover:border-ista hover:text-ista"
              >
                {cycle.nom} <span className="text-slate-500">({cycle.niveau})</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {CYCLES.map((cycle) => (
          <section
            key={cycle.cle}
            id={cycle.cle}
            className="scroll-mt-24"
            aria-labelledby={`titre-${cycle.cle}`}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ista text-white">
                <GraduationCap className="h-6 w-6" aria-hidden="true" />
              </span>

              <div>
                <h2 id={`titre-${cycle.cle}`} className="text-2xl font-bold tracking-tight text-marine">
                  Cycle {cycle.nom}
                  <span className="ml-2 align-middle text-base font-medium text-slate-500">
                    {cycle.niveau}
                  </span>
                </h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">{cycle.resume}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              {POLES.map((pole) => (
                <article key={pole.cle} className="carte flex flex-col p-6">
                  <h3 className="text-base font-bold text-marine">{nomPole(pole, cycle.cle)}</h3>

                  <ul className="mt-4 space-y-2">
                    {cycle.programmes[pole.cle].map((programme) => (
                      <li key={programme} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                        <span
                          className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-ista"
                          aria-hidden="true"
                        />
                        {programme}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-auto pt-5 text-sm font-medium text-slate-500">
                    {cycle.programmes[pole.cle].length} parcours
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section
          className="grid items-center gap-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 md:grid-cols-[1fr_292px]"
          aria-labelledby="titre-candidature"
        >
          <div className="p-8">
            <h2 id="titre-candidature" className="text-xl font-bold text-marine">
              Vous souhaitez candidater ?
            </h2>
            <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
              Les pièces à fournir et la grille tarifaire sont réunies sur la page
              Admissions. Les étudiants déjà inscrits accèdent à leur dossier depuis leur
              espace personnel.
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
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-marine transition hover:bg-white"
              >
                Accéder à mon espace
              </Link>
            </div>
          </div>

          <Photo nom="seance-travail" className="h-full w-full object-cover" />
        </section>
      </div>
    </>
  );
}
