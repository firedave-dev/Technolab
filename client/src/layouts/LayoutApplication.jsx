/**
 * Gabarit des pages authentifiees : barre laterale + en-tete + contenu + pied de page.
 *
 * Accessibilite : le lien d'evitement est le premier element focusable de la page.
 * Il permet d'atteindre le contenu sans traverser toute la navigation au clavier.
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BarreLaterale from './BarreLaterale.jsx';
import BarreSuperieure from './BarreSuperieure.jsx';
import PiedDePage from './PiedDePage.jsx';
import Seo from '../components/Seo.jsx';

export default function LayoutApplication() {
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Seo
        titre="Espace personnel"
        description="Espace prive Technolab ISTA."
        indexable={false}
      />

      <a href="#contenu-principal" className="lien-evitement">
        Aller au contenu principal
      </a>

      <BarreLaterale ouverte={menuOuvert} onFermer={() => setMenuOuvert(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <BarreSuperieure onOuvrirMenu={() => setMenuOuvert(true)} />

        <main id="contenu-principal" tabIndex={-1} className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>

        <PiedDePage />
      </div>
    </div>
  );
}
