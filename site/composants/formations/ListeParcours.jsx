'use client';

/**
 * Les 67 parcours, groupes par cycle et filtrables par pole.
 *
 * AMELIORATION PROGRESSIVE. L'etat initial n'est pas « rien d'affiche en
 * attendant un choix » mais « tout affiche ». Ce detail decide du sort de la
 * page sans JavaScript : le rendu serveur produit les 67 cartes, les boutons de
 * filtre restent alors inertes, et le visiteur garde acces a l'offre complete.
 * Un filtre qui masque par defaut aurait livre une page vide.
 *
 * Le filtrage ne retire rien du DOM : il pose `hidden` sur ce qui ne correspond
 * pas. Un moteur de recherche voit donc toujours les 67 intitules, et revenir a
 * « tous les poles » ne recree rien.
 *
 * Le nombre de resultats est annonce dans une region `aria-live` : un filtre qui
 * change silencieusement le contenu de la page est invisible a qui ne voit pas
 * l'ecran.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';

const TOUS = 'tous';

export default function ListeParcours({ cycles, poles }) {
  const [poleActif, setPoleActif] = useState(TOUS);

  const compteurs = useMemo(() => {
    const total = cycles.reduce((n, c) => n + c.parcours.length, 0);
    const parPole = Object.fromEntries(
      poles.map((p) => [
        p.cle,
        cycles.reduce((n, c) => n + c.parcours.filter((x) => x.pole === p.cle).length, 0),
      ])
    );
    return { [TOUS]: total, ...parPole };
  }, [cycles, poles]);

  const correspond = (parcours) => poleActif === TOUS || parcours.pole === poleActif;

  const filtres = [{ cle: TOUS, nom: 'Tous les pôles' }, ...poles];

  return (
    <>
      {/* --- Barre de filtres --- */}
      <div className="flex flex-col gap-6 border-b border-filet pb-8">
        <div role="group" aria-label="Filtrer par pôle disciplinaire" className="flex flex-wrap gap-2">
          {filtres.map(({ cle, nom }) => {
            const actif = poleActif === cle;
            return (
              <button
                key={cle}
                type="button"
                onClick={() => setPoleActif(cle)}
                aria-pressed={actif}
                className={`rounded-full border px-5 py-2.5 text-[0.9375rem] transition-colors duration-200 ${
                  actif
                    ? 'border-marine bg-marine font-semibold text-white'
                    : 'border-filet text-neutre hover:border-marine/30 hover:text-marine'
                }`}
              >
                {nom}
                <span className={actif ? 'text-clair-sur-fonce' : 'text-neutre/70'}>
                  {' '}
                  {compteurs[cle]}
                </span>
              </button>
            );
          })}
        </div>

        <p aria-live="polite" className="text-[0.9375rem] text-neutre">
          {compteurs[poleActif]} parcours
          {poleActif !== TOUS
            && ` en ${poles.find((p) => p.cle === poleActif)?.nom.toLowerCase()}`}
        </p>
      </div>

      {/* --- Parcours, par cycle --- */}
      <div className="mt-bloc space-y-bloc">
        {cycles.map((cycle) => {
          const visibles = cycle.parcours.filter(correspond);

          return (
            <section
              key={cycle.cle}
              id={cycle.cle}
              aria-labelledby={`cycle-${cycle.cle}`}
              // Un cycle sans aucun parcours dans le pole choisi n'a pas a
              // laisser un titre orphelin au milieu de la page.
              hidden={visibles.length === 0}
              // `scroll-mt` : l'en-tete collant ne doit pas recouvrir le titre
              // quand on arrive par une ancre.
              className="scroll-mt-28"
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 id={`cycle-${cycle.cle}`} className="text-titre">
                  {cycle.nom}
                </h2>
                <p className="baseline text-neutre">{cycle.niveau}</p>
              </div>

              <p className="mt-4 max-w-lecture leading-relaxed text-neutre">
                {cycle.resume}
              </p>

              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cycle.parcours.map((parcours) => (
                  <li key={parcours.slug} hidden={!correspond(parcours)}>
                    <Link
                      href={`/formations/${parcours.slug}`}
                      className="flex h-full flex-col rounded-xl border border-filet bg-white p-6
                                 transition-[transform,box-shadow,border-color] duration-300 ease-douce
                                 hover:-translate-y-1 hover:border-transparent
                                 hover:shadow-[0_18px_40px_-24px_rgba(11,46,82,0.45)]"
                    >
                      <p className="baseline text-neutre">{parcours.poleNom}</p>
                      <h3 className="mt-3 flex-1 font-bold leading-snug">{parcours.nom}</h3>
                      <p className="mt-5 text-sm font-semibold text-ista">
                        {cycle.niveau}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
