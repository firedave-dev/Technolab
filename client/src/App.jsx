/**
 * Table de routage de l'application.
 *
 * Trois espaces cohabitent :
 * - le SITE PUBLIC a la racine (`/`, `/formations`, `/a-propos`), indexable et
 *   pre-rendu au build ;
 * - les ECRANS D'AUTHENTIFICATION (`/login`...), publics mais non indexes ;
 * - l'ESPACE PRIVE sous `/tableau-de-bord`, protege par role.
 *
 * La racine appartient au site public : c'est l'URL qu'un moteur de recherche
 * considere comme canonique, elle ne peut donc pas heberger le tableau de bord.
 *
 * Les routes de module sont generees depuis NAVIGATION : la liste des roles
 * autorises est definie a un seul endroit (barre laterale + garde de route).
 *
 * Les ecrans sont charges a la demande (React.lazy) : le premier ecran servi ne
 * transporte pas le code des autres.
 */
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import RouteProtegee, { RoutePublique } from './router/RouteProtegee.jsx';
import { ACCUEIL_PRIVE, NAVIGATION } from './router/navigation.js';
import Chargement from './components/ui/Chargement.jsx';
import LayoutPublic from './layouts/LayoutPublic.jsx';
import LayoutAuth from './layouts/LayoutAuth.jsx';
import LayoutApplication from './layouts/LayoutApplication.jsx';

// Site public : charge avec l'application, c'est la premiere page servie.
import Accueil from './pages/public/Accueil.jsx';

// Ecrans du premier rendu de l'espace prive.
import Connexion from './pages/auth/Connexion.jsx';
import TableauDeBord from './pages/TableauDeBord.jsx';
import NonAutorise from './pages/NonAutorise.jsx';
import Introuvable from './pages/Introuvable.jsx';

// Pages publiques secondaires et modules : charges au premier acces.
const Formations = lazy(() => import('./pages/public/Formations.jsx'));
const APropos = lazy(() => import('./pages/public/APropos.jsx'));
const Admissions = lazy(() => import('./pages/public/Admissions.jsx'));
const VerificationRecu = lazy(() => import('./pages/public/VerificationRecu.jsx'));
const MotDePasseOublie = lazy(() => import('./pages/auth/MotDePasseOublie.jsx'));
const ReinitialiserMotDePasse = lazy(() => import('./pages/auth/ReinitialiserMotDePasse.jsx'));
const Profil = lazy(() => import('./pages/Profil.jsx'));
const EnConstruction = lazy(() => import('./pages/EnConstruction.jsx'));
const DossierEtudiant = lazy(() => import('./pages/etudiants/DossierEtudiant.jsx'));
const BulletinEtudiant = lazy(() => import('./pages/notes/BulletinEtudiant.jsx'));

/** Ecrans livres, associes a leur chemin de navigation. */
const ECRANS = {
  '/utilisateurs': lazy(() => import('./pages/utilisateurs/ListeUtilisateurs.jsx')),
  '/etudiants': lazy(() => import('./pages/etudiants/ListeEtudiants.jsx')),
  '/classes': lazy(() => import('./pages/classes/ListeClasses.jsx')),
  '/personnel': lazy(() => import('./pages/Personnel.jsx')),
  '/mes-enfants': lazy(() => import('./pages/parent/MesEnfants.jsx')),
  '/matieres': lazy(() => import('./pages/matieres/ListeMatieres.jsx')),
  '/notes': lazy(() => import('./pages/notes/Notes.jsx')),
  '/examens': lazy(() => import('./pages/examens/ListeExamens.jsx')),
  '/absences': lazy(() => import('./pages/absences/Absences.jsx')),
  '/paiements': lazy(() => import('./pages/paiements/Paiements.jsx')),
  '/planning': lazy(() => import('./pages/planning/Planning.jsx')),
  '/statistiques': lazy(() => import('./pages/statistiques/Statistiques.jsx')),
};

// Le tableau de bord a sa propre route : il est exclu de la generation.
const MODULES = NAVIGATION.filter((n) => n.chemin !== ACCUEIL_PRIVE);

export default function App() {
  return (
    <Suspense fallback={<Chargement message="Chargement..." />}>
      <Routes>
        {/* --- Site public --- */}
        <Route element={<LayoutPublic />}>
          <Route index element={<Accueil />} />
          <Route path="/formations" element={<Formations />} />
          <Route path="/admissions" element={<Admissions />} />
          <Route path="/a-propos" element={<APropos />} />

          {/* Cible du QR code imprime sur les recus : accessible sans compte. */}
          <Route path="/verification/:numeroRecu" element={<VerificationRecu />} />
        </Route>

        {/* --- Authentification --- */}
        <Route element={<RoutePublique />}>
          <Route element={<LayoutAuth />}>
            <Route path="/login" element={<Connexion />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
            <Route path="/reset-password" element={<ReinitialiserMotDePasse />} />
          </Route>
        </Route>

        {/* --- Espace prive --- */}
        <Route element={<RouteProtegee />}>
          <Route element={<LayoutApplication />}>
            <Route path={ACCUEIL_PRIVE} element={<TableauDeBord />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/non-autorise" element={<NonAutorise />} />

            {/* Une route par module, restreinte aux roles declares dans NAVIGATION */}
            {MODULES.map(({ chemin, roles }) => {
              const Ecran = ECRANS[chemin] || EnConstruction;
              return (
                <Route key={chemin} element={<RouteProtegee roles={roles} />}>
                  <Route path={chemin} element={<Ecran />} />
                </Route>
              );
            })}

            {/* Bulletin d'un etudiant precis : ouvert depuis le releve de classe
                ou le dossier etudiant. Le serveur verifie le droit de consultation. */}
            <Route
              element={<RouteProtegee roles={NAVIGATION.find((n) => n.chemin === '/notes').roles} />}
            >
              <Route path="/notes/bulletin/:id" element={<BulletinEtudiant />} />
            </Route>

            {/* Dossier etudiant : accessible aussi aux parents et a l'etudiant concerne,
                le serveur verifie le lien exact. */}
            <Route
              element={
                <RouteProtegee roles={NAVIGATION.find((n) => n.chemin === '/etudiants').roles.concat(['etudiant', 'parent'])} />
              }
            >
              <Route path="/etudiants/:id" element={<DossierEtudiant />} />
            </Route>
          </Route>
        </Route>

        {/*
          URL inconnue : page 404 servie avec l'habillage public. La placer sous la
          garde privee redirigerait un visiteur vers la connexion, ce qui masquerait
          l'erreur et nuirait a l'indexation.
        */}
        <Route element={<LayoutPublic />}>
          <Route path="*" element={<Introuvable />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
