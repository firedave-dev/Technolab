/**
 * Metadonnees de reference d'une page publique.
 *
 * React 19 remonte lui-meme les balises `<title>`, `<meta>` et `<link>` rendues
 * n'importe ou dans l'arbre vers le `<head>` : aucune bibliotheque tierce n'est
 * necessaire, et le rendu statique de build les recupere naturellement.
 *
 * Ce composant ne sert que les pages publiques. L'espace prive est derriere
 * authentification : il n'a pas vocation a etre indexe, et porte `noindex`.
 */

import { ANNEE_FONDATION, NOM_COMPLET, RECONNAISSANCES } from '../utils/formations.js';

const SITE = 'TechnoLAB - ISTA';

/**
 * Origine du site en production.
 * Renseignez VITE_SITE_URL au deploiement : les URL canoniques et le plan de site
 * doivent etre absolus pour etre exploitables par un moteur de recherche.
 */
export const ORIGINE = import.meta.env.VITE_SITE_URL || 'https://www.technolab-ista.net';

export default function Seo({ titre, description, chemin = '/', schema, indexable = true }) {
  const titreComplet =
    chemin === '/' ? `${SITE} — Institut Supérieur de Technologies Appliquées` : `${titre} | ${SITE}`;
  const url = `${ORIGINE}${chemin}`;

  return (
    <>
      <title>{titreComplet}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Les pages privees ne doivent jamais entrer dans l'index. */}
      {!indexable && <meta name="robots" content="noindex, nofollow" />}

      {/* Partage sur les reseaux et messageries */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={titreComplet} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:image" content={`${ORIGINE}/marque/icone-512.png`} />
      <meta name="twitter:card" content="summary" />

      {/*
        Donnees structurees. `dangerouslySetInnerHTML` est ici sans risque : le
        contenu est un objet que nous construisons, jamais une saisie utilisateur.
      */}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
    </>
  );
}

/**
 * Fiche d'identite de l'etablissement, au format schema.org.
 *
 * Volontairement limitee aux informations verifiables depuis l'application :
 * adresse postale, telephone et numeros d'agrement sont a completer par
 * l'etablissement — un schema incomplet est sans effet, un schema faux est nuisible.
 */
export const SCHEMA_ETABLISSEMENT = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'TechnoLAB - ISTA',
  alternateName: NOM_COMPLET,
  foundingDate: String(ANNEE_FONDATION),
  description:
    'Établissement privé d’enseignement supérieur agréé, formant du DUT au master '
    + 'dans les sciences économiques et de gestion, les sciences et technologies et '
    + 'les sciences de l’ingénieur.',
  url: ORIGINE,
  logo: `${ORIGINE}/marque/logo-horizontal.svg`,
  image: `${ORIGINE}/marque/icone-512.png`,
  inLanguage: 'fr',

  /*
   * Localisation. C'est le champ qui permet a un moteur de recherche de servir
   * l'etablissement sur une requete geographique (« institut superieur Sevare »).
   * A completer par la rue, le code postal et le telephone lorsque la direction
   * les aura fournis.
   */
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Sévaré',
    addressRegion: 'Mopti',
    addressCountry: 'ML',
  },

  /*
   * Reconnaissances institutionnelles. `accreditingBody` n'est pas un champ valide
   * pour une EducationalOrganization : les agrements sont donc portes par des
   * entites `Organization` nommees, ce que schema.org sait interpreter.
   */
  hasCredential: RECONNAISSANCES.map((r) => ({
    '@type': 'EducationalOccupationalCredential',
    name: r.nom,
    description: r.detail,
  })),
};

/**
 * Liste des formations, rattachee a l'etablissement.
 *
 * Un `Course` schema.org est emis par PARCOURS, et non par cycle ou par pole :
 * c'est le parcours que cherche un candidat, et c'est donc lui qui doit pouvoir
 * remonter seul dans un resultat de recherche. Le niveau est porte par
 * `educationalLevel`, ce qui distingue une licence d'un master homonymes.
 */
export const schemaFormations = (cycles, poles) => {
  let position = 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: cycles.flatMap((cycle) =>
      poles.flatMap((pole) =>
        cycle.programmes[pole.cle].map((programme) => {
          position += 1;
          return {
            '@type': 'ListItem',
            position,
            item: {
              '@type': 'Course',
              name: `${cycle.nom} ${programme}`,
              description: `${programme} — ${cycle.nom} (${cycle.niveau}), ${pole.nom}.`,
              educationalLevel: cycle.niveau,
              inLanguage: 'fr',
              provider: {
                '@type': 'EducationalOrganization',
                name: 'TechnoLAB - ISTA',
                url: ORIGINE,
              },
            },
          };
        })
      )
    ),
  };
};
