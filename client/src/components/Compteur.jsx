/**
 * Nombre qui compte de zero jusqu'a sa valeur, une fois.
 *
 * Trois choix qui meritent d'etre expliques :
 *
 * 1. `requestAnimationFrame` PLUTOT QUE `setInterval(…, 16)`. Un intervalle fixe
 *    de 16 ms suppose que le navigateur tient 60 images par seconde ; il derive
 *    des que l'onglet est charge, et continue de tourner dans un onglet en
 *    arriere-plan. La boucle d'animation, elle, se cale sur le rafraichissement
 *    reel et s'interrompt quand l'onglet n'est pas visible.
 *
 * 2. PROGRESSION AMORTIE plutot que lineaire. Un compteur lineaire s'arrete net,
 *    ce qui se remarque desagreablement ; la courbe ralentit a l'approche de la
 *    valeur, et l'arret parait voulu.
 *
 * 3. DECLENCHEMENT A L'APPARITION, via IntersectionObserver. Animer au
 *    chargement gaspille l'effet quand la section est encore hors champ — le
 *    visiteur arrive sur un nombre deja fige. L'animation ne se joue qu'une
 *    fois : la rejouer a chaque passage transformerait la page en enseigne
 *    clignotante.
 *
 * `prefers-reduced-motion` court-circuite tout : la valeur finale s'affiche
 * directement. Un chiffre qui defile est un mouvement comme un autre.
 */
import { useEffect, useRef, useState } from 'react';

/** Duree de l'animation, en millisecondes. */
const DUREE = 1400;

/** Courbe d'amortissement : rapide au depart, posee a l'arrivee. */
const amortir = (t) => 1 - (1 - t) ** 3;

export default function Compteur({
  valeur,
  /** Texte accole apres le nombre, par exemple « ans » ou « + ». */
  suffixe = '',
  className = '',
}) {
  const [affichee, setAffichee] = useState(0);
  const cible = useRef(null);
  const dejaJoue = useRef(false);

  useEffect(() => {
    const element = cible.current;
    if (!element) return undefined;

    const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (mouvementReduit) {
      setAffichee(valeur);
      return undefined;
    }

    let animation = null;

    const jouer = () => {
      const depart = performance.now();

      const etape = (maintenant) => {
        const avancement = Math.min(1, (maintenant - depart) / DUREE);
        setAffichee(Math.round(valeur * amortir(avancement)));
        if (avancement < 1) animation = requestAnimationFrame(etape);
      };

      animation = requestAnimationFrame(etape);
    };

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting || dejaJoue.current) return;
        dejaJoue.current = true;
        jouer();
        observateur.disconnect();
      },
      // Declenche des qu'un quart du bloc est visible : attendre la totalite
      // ferait manquer l'animation sur un ecran court.
      { threshold: 0.25 }
    );

    observateur.observe(element);

    return () => {
      observateur.disconnect();
      if (animation) cancelAnimationFrame(animation);
    };
  }, [valeur]);

  /*
   * Separateur de milliers a la francaise, espace insecable normalisee en
   * espace simple : certaines polices rendent l'insecable etroite de facon
   * erratique, ce qui fait danser le nombre pendant qu'il defile.
   */
  const formatee = affichee.toLocaleString('fr-FR').replace(/ | /g, ' ');

  return (
    <span ref={cible} className={className}>
      {/*
        La valeur finale est ecrite en clair pour les lecteurs d'ecran et pour
        les moteurs de recherche : l'animation ne doit pas rendre le chiffre
        dependant de l'execution du script.
      */}
      <span aria-hidden="true">{formatee}{suffixe}</span>
      <span className="sr-only">{valeur.toLocaleString('fr-FR')}{suffixe}</span>
    </span>
  );
}
