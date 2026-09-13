/**
 * Point d'entree du pre-rendu.
 *
 * Les pages publiques sont importees ici de maniere EAGER, contrairement a App.jsx
 * qui les charge en `React.lazy` : `renderToString` est synchrone et ne sait pas
 * attendre un import dynamique — il rendrait le fallback de Suspense a la place du
 * contenu, ce qui viderait justement les pages qu'on veut faire indexer.
 *
 * Aucun effet React ne s'execute pendant un rendu serveur : le contexte
 * d'authentification reste donc a « visiteur », qui est exactement l'etat dans
 * lequel un moteur de recherche voit le site.
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext.jsx';
import LayoutPublic from './layouts/LayoutPublic.jsx';
import Accueil from './pages/public/Accueil.jsx';
import Formations from './pages/public/Formations.jsx';
import APropos from './pages/public/APropos.jsx';
import Admissions from './pages/public/Admissions.jsx';

import './index.css';

/** Routes pre-rendues, et leur fichier de destination dans dist/. */
/**
 * Routes pre-rendues, et leur fichier de destination dans dist/.
 *
 * `images` alimente le plan de site : Google indexe les photographies a part,
 * et une image declaree avec son titre remonte sur une recherche visuelle
 * (« remise de diplomes TechnoLAB »). Sans declaration, une image chargee en
 * differe — ce qui est le cas de presque toutes les notres — peut n'etre jamais
 * decouverte.
 */
export const ROUTES_PUBLIQUES = [
  {
    chemin: '/',
    fichier: 'index.html',
    images: [
      { fichier: 'remise-diplomes.webp', titre: 'Cérémonie de remise des diplômes' },
      { fichier: 'diplomes-groupe.webp', titre: 'Diplômées devant le mur des partenaires' },
      { fichier: 'salle-de-classe.webp', titre: 'Étudiants en cours' },
      { fichier: 'dakar-plage.webp', titre: 'Séjour d’études à Dakar' },
    ],
  },
  {
    chemin: '/formations',
    fichier: 'formations/index.html',
    images: [{ fichier: 'seance-travail.webp', titre: 'Séance de travail entre étudiants' }],
  },
  {
    chemin: '/admissions',
    fichier: 'admissions/index.html',
    images: [{ fichier: 'etudiants-groupe.webp', titre: 'Étudiants de TechnoLAB-ISTA' }],
  },
  {
    chemin: '/a-propos',
    fichier: 'a-propos/index.html',
    images: [{ fichier: 'assemblee-generale.webp', titre: 'Assemblée générale de l’institut' }],
  },
];

/** Rend une route publique en HTML statique. */
export function rendu(chemin) {
  const queryClient = new QueryClient();

  return renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={chemin}>
          <AuthProvider>
            <Routes>
              <Route element={<LayoutPublic />}>
                <Route path="/" element={<Accueil />} />
                <Route path="/formations" element={<Formations />} />
                <Route path="/admissions" element={<Admissions />} />
                <Route path="/a-propos" element={<APropos />} />
              </Route>
            </Routes>
          </AuthProvider>
        </StaticRouter>
      </QueryClientProvider>
    </StrictMode>
  );
}
