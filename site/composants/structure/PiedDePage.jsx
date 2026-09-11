import Link from 'next/link';
import { NAVIGATION_PIED, LIENS_LEGAUX } from '@/contenu/donnees/navigation';
import {
  CONTACT,
  NOM_COMPLET,
  SIGLE,
  URL_APPLICATION,
  estRenseigne,
} from '@/contenu/donnees/etablissement';

/**
 * Pied de page.
 *
 * Fond marine : c'est le seul endroit du site ou le bleu clair de la charte est
 * lisible, puisqu'il n'est autorise que sur fond fonce.
 *
 * Les coordonnees encore absentes ne sont pas affichees en attente — un
 * « Téléphone : à venir » sur un site institutionnel est pire que rien. Le bloc
 * se reduit tant que la direction ne les a pas fournies.
 */

export default function PiedDePage() {
  const annee = new Date().getFullYear();

  return (
    <footer className="bg-marine text-white">
      <div className="mx-auto max-w-page px-6 py-section md:px-10">
        <div className="grid gap-bloc lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-sm">
            <img
              src="/marque/logo-horizontal-marine.svg"
              alt={`${SIGLE} — ${NOM_COMPLET}`}
              width={186}
              height={44}
            />
            <p className="mt-6 text-[0.9375rem] leading-relaxed text-clair-sur-fonce">
              {NOM_COMPLET} — établissement privé d’enseignement supérieur agréé,
              formant aux sciences de gestion, aux technologies et à l’ingénierie.
            </p>

            <p className="mt-6 text-[0.9375rem] text-clair-sur-fonce">
              {CONTACT.ville}, région de {CONTACT.region}, {CONTACT.pays}
            </p>

            {estRenseigne(CONTACT.telephone) && (
              <a
                href={`tel:${String(CONTACT.telephone).replace(/\s/g, '')}`}
                className="mt-1 block text-[0.9375rem] text-white hover:underline"
              >
                {CONTACT.telephone}
              </a>
            )}
            {estRenseigne(CONTACT.email) && (
              <a
                href={`mailto:${CONTACT.email}`}
                className="mt-1 block text-[0.9375rem] text-white hover:underline"
              >
                {CONTACT.email}
              </a>
            )}
          </div>

          {NAVIGATION_PIED.map(({ titre, liens }) => (
            <nav key={titre} aria-label={titre}>
              <h2 className="baseline text-clair-sur-fonce/70">{titre}</h2>
              <ul className="mt-5 space-y-3">
                {liens.map(({ chemin, libelle }) => (
                  <li key={chemin}>
                    <Link
                      href={chemin}
                      className="text-[0.9375rem] text-clair-sur-fonce transition-colors duration-200 hover:text-white"
                    >
                      {libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-bloc flex flex-col gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-clair-sur-fonce">
            © {annee} {SIGLE} — Tous droits réservés
          </p>

          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {LIENS_LEGAUX.map(({ chemin, libelle }) => (
              <li key={chemin}>
                <Link
                  href={chemin}
                  className="text-sm text-clair-sur-fonce transition-colors duration-200 hover:text-white"
                >
                  {libelle}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={URL_APPLICATION}
                className="text-sm text-clair-sur-fonce transition-colors duration-200 hover:text-white"
              >
                Espace privé
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
