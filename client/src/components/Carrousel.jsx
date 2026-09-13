/**
 * Carrousel d'images de la page d'accueil.
 *
 * Ecrit avec les seuls crochets de React — pas de bibliotheque d'animation. Le
 * besoin tient en un index qui avance et une transformation CSS ; importer un
 * moteur d'animation pour cela couterait plus en poids transfere que toute la
 * page d'accueil.
 *
 * TROIS REGLES QUE TOUT DEFILEMENT AUTOMATIQUE DOIT SUIVRE, et qui ne sont pas
 * du confort :
 *
 * 1. `prefers-reduced-motion` — un mouvement qui se declenche seul peut
 *    provoquer des nausees ou declencher une crise chez les personnes sensibles
 *    au mouvement. Quand le systeme signale cette preference, le defilement ne
 *    demarre pas et les transitions sont supprimees ; les fleches restent, la
 *    navigation manuelle aussi ;
 *
 * 2. PAUSE AU SURVOL ET AU FOCUS — trois secondes suffisent rarement a lire une
 *    legende. Une image qui se derobe pendant qu'on la regarde est un defaut,
 *    pas une animation ;
 *
 * 3. ANNONCE AUX LECTEURS D'ECRAN — le conteneur porte `aria-roledescription`
 *    et chaque vue son rang, de sorte qu'une navigation non visuelle sache
 *    qu'elle parcourt un ensemble et ou elle en est.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Photo from './Photo.jsx';
import { PHOTOS } from '../utils/photos.js';

/** Duree d'affichage d'une vue, en millisecondes. */
const INTERVALLE = 3000;

/** L'utilisateur demande-t-il a limiter les animations ? */
function useMouvementReduit() {
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduit(requete.matches);

    const suivre = (evenement) => setReduit(evenement.matches);
    requete.addEventListener('change', suivre);
    return () => requete.removeEventListener('change', suivre);
  }, []);

  return reduit;
}

export default function Carrousel({ photos = [], legendes = {}, className = '' }) {
  const [index, setIndex] = useState(0);
  const [enPause, setEnPause] = useState(false);
  const mouvementReduit = useMouvementReduit();
  const conteneur = useRef(null);

  const total = photos.length;

  const aller = useCallback(
    (pas) => setIndex((actuel) => (actuel + pas + total) % total),
    [total]
  );

  /*
   * Rotation automatique. `setInterval` est relance a chaque changement d'index
   * pour que le compte a rebours reparte de zero apres une navigation manuelle :
   * sinon, cliquer sur la fleche juste avant une bascule automatique ferait
   * defiler deux vues coup sur coup.
   */
  useEffect(() => {
    if (total <= 1 || enPause || mouvementReduit) return undefined;

    const minuterie = setInterval(() => setIndex((i) => (i + 1) % total), INTERVALLE);
    return () => clearInterval(minuterie);
  }, [total, enPause, mouvementReduit, index]);

  if (!total) return null;

  const surTouche = (evenement) => {
    if (evenement.key === 'ArrowLeft') { evenement.preventDefault(); aller(-1); }
    if (evenement.key === 'ArrowRight') { evenement.preventDefault(); aller(1); }
  };

  return (
    <div
      ref={conteneur}
      className={`group relative overflow-hidden rounded-2xl bg-slate-100 ${className}`}
      role="group"
      aria-roledescription="carrousel"
      aria-label="Photographies de l’établissement"
      tabIndex={0}
      onKeyDown={surTouche}
      onMouseEnter={() => setEnPause(true)}
      onMouseLeave={() => setEnPause(false)}
      onFocus={() => setEnPause(true)}
      onBlur={() => setEnPause(false)}
    >
      {/*
        Une seule bande translatee, plutot que des images empilees en fondu :
        `transform` est compose par le processeur graphique, la page ne se
        remet donc pas en page a chaque vue.
      */}
      <div
        className="flex"
        style={{
          transform: `translateX(-${index * 100}%)`,
          transition: mouvementReduit ? 'none' : 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {photos.map((nom, rang) => (
          <figure
            key={nom}
            className="relative w-full shrink-0 grow-0 basis-full"
            role="group"
            aria-roledescription="vue"
            aria-label={`${rang + 1} sur ${total}`}
            // Les vues hors champ sont retirees du parcours au clavier et de
            // l'arbre d'accessibilite : sans cela, la tabulation traverse des
            // images invisibles.
            aria-hidden={rang !== index}
          >
            <Photo
              nom={nom}
              prioritaire={rang === 0}
              tailles="(min-width: 1024px) 640px, 100vw"
              className="aspect-[3/2] w-full object-cover"
            />

            {legendes[nom] && (
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-marine/85 to-transparent px-5 pb-4 pt-10 text-sm text-white">
                {legendes[nom]}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {total > 1 && (
        <>
          {/* Fleches : masquees au repos sur grand ecran, toujours visibles au doigt. */}
          {[
            { sens: -1, Icone: ChevronLeft, position: 'left-3', libelle: 'Image précédente' },
            { sens: 1, Icone: ChevronRight, position: 'right-3', libelle: 'Image suivante' },
          ].map(({ sens, Icone, position, libelle }) => (
            <button
              key={libelle}
              type="button"
              onClick={() => aller(sens)}
              aria-label={libelle}
              className={`absolute ${position} top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-marine shadow-md transition
                hover:bg-white focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ista
                sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100`}
            >
              <Icone className="h-5 w-5" aria-hidden="true" />
            </button>
          ))}

          {/* Pastilles de position, cliquables. */}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((nom, rang) => (
              <button
                key={nom}
                type="button"
                onClick={() => setIndex(rang)}
                aria-label={`Aller à l’image ${rang + 1}`}
                aria-current={rang === index ? 'true' : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  rang === index ? 'w-6 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/*
        Annonce du changement de vue, hors ecran. `polite` attend une pause dans
        la lecture : une annonce toutes les trois secondes en `assertive`
        couperait la parole sans arret.
      */}
      <p className="sr-only" aria-live="polite">
        Image {index + 1} sur {total}
        {PHOTOS[photos[index]] ? ` : ${PHOTOS[photos[index]].alt}` : ''}
      </p>
    </div>
  );
}
