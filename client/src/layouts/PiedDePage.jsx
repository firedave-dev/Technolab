/**
 * Pied de page institutionnel.
 * Zone a fond sombre au sens de la charte : aplat marine, logo sur fond marine,
 * texte secondaire en bleu clair.
 */
import Logo from '../components/Logo.jsx';

export default function PiedDePage() {
  return (
    <footer className="sur-marine mt-6 bg-marine px-4 py-6 lg:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <Logo variante="marine" hauteur={34} className="rounded" />

        <div className="text-center sm:text-right">
          <p className="libelle-capitales text-[10px] text-clair-sur-fonce">
            Universite privee
          </p>
          <p className="mt-1 text-xs text-clair-sur-fonce">
            &copy; {new Date().getFullYear()} Technolab ISTA — Tous droits reserves
          </p>
        </div>
      </div>
    </footer>
  );
}
