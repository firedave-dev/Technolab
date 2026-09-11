'use client';

/**
 * En-tete collant.
 *
 * Transparent tant que la page n'a pas defile, puis fond blanc et filet des le
 * premier mouvement : au-dessus du hero il ne doit pas couper l'image, et
 * au-dessus du contenu il doit rester lisible. Le seuil est volontairement bas
 * — quelques pixels suffisent a signaler que la page a bouge.
 *
 * Le menu mobile est un `<dialog>` logique plutot qu'un simple bloc replie :
 * il se ferme a la touche Echap et au changement de page, deux comportements
 * qu'un panneau maison oublie presque toujours.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAVIGATION_PRINCIPALE } from '@/contenu/donnees/navigation';
import { URL_APPLICATION } from '@/contenu/donnees/etablissement';
import Bouton from '@/composants/ui/Bouton';

const SEUIL_DEFILEMENT = 8;

export default function EnTete() {
  const chemin = usePathname();
  const [defile, setDefile] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > SEUIL_DEFILEMENT);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  // Le menu ne survit pas a une navigation : sans cela, il resterait ouvert
  // par-dessus la page d'arrivee.
  useEffect(() => setMenuOuvert(false), [chemin]);

  useEffect(() => {
    if (!menuOuvert) return undefined;
    const surTouche = (e) => e.key === 'Escape' && setMenuOuvert(false);
    document.addEventListener('keydown', surTouche);
    // Le fond ne defile pas derriere le menu ouvert.
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = '';
    };
  }, [menuOuvert]);

  const estActif = (c) => chemin === c || chemin.startsWith(`${c}/`);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ease-douce ${
        defile || menuOuvert
          ? 'border-b border-filet bg-white/90 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-20 max-w-page items-center gap-8 px-6 md:px-10">
        <Link href="/" aria-label="Technolab ISTA — retour à l’accueil" className="shrink-0">
          {/*
            SVG servi tel quel : l'optimiseur d'images n'a rien a y gagner.
            Les attributs portent le rapport natif (1068,4 x 254,9) pour que la
            place soit reservee avant le chargement ; la largeur affichee est
            reduite sur telephone, ou 190 px prendraient la moitie de l'ecran.
          */}
          <img
            src="/marque/logo-horizontal.svg"
            alt="Technolab ISTA"
            width={190}
            height={45}
            className="h-auto w-[152px] sm:w-[190px]"
          />
        </Link>

        <nav aria-label="Navigation principale" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAVIGATION_PRINCIPALE.map(({ chemin: c, libelle }) => (
              <li key={c}>
                <Link
                  href={c}
                  aria-current={estActif(c) ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-[0.9375rem] transition-colors duration-200 ${
                    estActif(c)
                      ? 'font-semibold text-marine'
                      : 'text-neutre hover:bg-fond-doux hover:text-marine'
                  }`}
                >
                  {libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          {/*
            La visibilite responsive est portee par ce conteneur, pas par une
            classe passee au bouton : `hidden` et le `inline-flex` du composant
            declarent tous deux `display`, et Tailwind tranche selon l'ordre
            dans la feuille CSS, pas selon l'ordre des classes. Le bouton
            restait donc affiche sur telephone, coupe sur deux lignes.
          */}
          <div className="hidden sm:block">
            <Bouton href={URL_APPLICATION}>Mon espace</Bouton>
          </div>

          <button
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-marine transition-colors hover:bg-fond-doux lg:hidden"
          >
            <span aria-hidden="true" className="relative block h-3 w-5">
              <span
                className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ease-douce ${
                  menuOuvert ? 'top-1.5 rotate-45' : 'top-0'
                }`}
              />
              <span
                className={`absolute left-0 block h-px w-full bg-current transition-transform duration-300 ease-douce ${
                  menuOuvert ? 'top-1.5 -rotate-45' : 'top-3'
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOuvert && (
        <nav
          id="menu-mobile"
          aria-label="Navigation mobile"
          className="border-t border-filet bg-white lg:hidden"
        >
          <ul className="mx-auto max-w-page px-6 py-4">
            {NAVIGATION_PRINCIPALE.map(({ chemin: c, libelle }) => (
              <li key={c}>
                <Link
                  href={c}
                  aria-current={estActif(c) ? 'page' : undefined}
                  className={`block border-b border-filet py-4 text-xl ${
                    estActif(c) ? 'font-bold text-marine' : 'text-neutre'
                  }`}
                >
                  {libelle}
                </Link>
              </li>
            ))}
            <li className="pt-6">
              <Bouton href={URL_APPLICATION} taille="grande" className="w-full">
                Mon espace
              </Bouton>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
