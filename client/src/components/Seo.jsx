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

import { ANNEE_FONDATION, IDENTITE, NOM_COMPLET, RECONNAISSANCES, RESEAUX, SIGLE } from '../utils/formations.js';

const SITE = 'TechnoLAB - ISTA';

/**
 * Origine du site en production.
 * Renseignez VITE_SITE_URL au deploiement : les URL canoniques et le plan de site
 * doivent etre absolus pour etre exploitables par un moteur de recherche.
 */
/**
 * Coordonnees de l'etablissement.
 *
 * NIVEAU COMMUNE, et c'est assume : ce sont celles de Sevare, pas celles du
 * portail du campus. Une position inventee au metre pres enverrait les
 * visiteurs a la mauvaise adresse, ce qui est pire qu'une approximation
 * annoncee. A remplacer par le releve exact si la direction le fournit — un
 * point pose sur une carte suffit a l'obtenir.
 */
export const COORDONNEES = { latitude: 14.5333, longitude: -4.0833 };

/**
 * Image de partage social, aux dimensions attendues par les plateformes.
 * Les valeurs sont figees ici parce qu'elles sont declarees en metadonnees :
 * une taille annoncee differente de la taille reelle fait rejeter la carte.
 */
export const IMAGE_PARTAGE = {
  chemin: '/marque/partage-1200x630.png',
  largeur: 1200,
  hauteur: 630,
  alt: 'TechnoLAB-ISTA — Institut Supérieur de Technologies Appliquées, Sévaré, Mali',
};

export const ORIGINE = import.meta.env.VITE_SITE_URL || 'https://technolab-ista.org';

export default function Seo({ titre, description, chemin = '/', schema, indexable = true }) {
  const titreComplet =
    chemin === '/' ? `${SITE} — Institut Supérieur de Technologies Appliquées` : `${titre} | ${SITE}`;
  const url = `${ORIGINE}${chemin}`;

  return (
    <>
      <title>{titreComplet}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/*
        Directives d'indexation.
        - Page privee : exclusion ferme.
        - Page publique : on AUTORISE explicitement la grande vignette et le
          resume long. Par defaut Google limite l'apercu d'image a une miniature
          et tronque le resume ; ces deux directives sont ce qui ouvre l'acces
          aux resultats enrichis et a Google Discover. Les omettre ne bloque
          rien, mais laisse le moteur sur ses reglages les plus prudents.
      */}
      {indexable ? (
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
      ) : (
        <meta name="robots" content="noindex, nofollow" />
      )}

      {/*
        Langue de la page. Le site est monolingue : `fr` declare la version
        francaise, `x-default` designe la page servie a defaut de correspondance.
        Sans ce couple, un moteur peut supposer un ciblage geographique etroit.
      */}
      <link rel="alternate" hrefLang="fr" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      {/*
        ---- Referencement local ----
        Ces balises ne sont plus lues par Google, mais Bing et plusieurs
        annuaires regionaux s'en servent encore. Leur cout est nul, et le
        public vise — des familles maliennes — passe souvent par ces
        intermediaires. Les coordonnees font en revanche autorite dans les
        donnees structurees ci-dessous, qui sont, elles, exploitees partout.
      */}
      <meta name="geo.region" content="ML-MO" />
      <meta name="geo.placename" content="Sévaré, Mopti" />
      <meta name="geo.position" content={`${COORDONNEES.latitude};${COORDONNEES.longitude}`} />
      <meta name="ICBM" content={`${COORDONNEES.latitude}, ${COORDONNEES.longitude}`} />

      {/* Partage sur les reseaux et messageries */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={titreComplet} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="fr_FR" />
      {/*
        Image de partage : 1200 x 630, produite par
        client/scripts/preparer-partage.py.

        L'icone carree servie auparavant etait rendue en vignette minuscule a
        cote du titre — le lien ressemblait a une piece jointe. Les dimensions
        sont declarees pour que la plateforme reserve la place AVANT d'avoir
        telecharge le fichier : sans elles, plusieurs d'entre elles retombent
        sur la petite carte plutot que d'attendre.
      */}
      <meta property="og:image" content={`${ORIGINE}${IMAGE_PARTAGE.chemin}`} />
      <meta property="og:image:width" content={String(IMAGE_PARTAGE.largeur)} />
      <meta property="og:image:height" content={String(IMAGE_PARTAGE.hauteur)} />
      <meta property="og:image:alt" content={IMAGE_PARTAGE.alt} />
      <meta property="og:image:type" content="image/png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={titreComplet} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${ORIGINE}${IMAGE_PARTAGE.chemin}`} />
      <meta name="twitter:image:alt" content={IMAGE_PARTAGE.alt} />

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
  logo: `${ORIGINE}/marque/logo-technolab.png`,
  image: `${ORIGINE}/marque/icone-512.png`,
  inLanguage: 'fr',

  /*
   * Localisation.
   *
   * `address` porte l'adresse POSTALE — la boite a Bamako, celle qui figure sur
   * les documents officiels. `location` porte le lieu d'ENSEIGNEMENT, a Sevare :
   * ce sont deux choses distinctes, et les confondre ferait servir
   * l'etablissement sur la mauvaise requete geographique.
   */
  address: {
    '@type': 'PostalAddress',
    postOfficeBoxNumber: 'E3123',
    addressLocality: 'Bamako',
    addressCountry: 'ML',
  },
  location: {
    '@type': 'Place',
    name: `${SIGLE} — campus de Sévaré`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sévaré',
      addressRegion: 'Mopti',
      addressCountry: 'ML',
    },
    /*
     * Coordonnees. C'est LE champ du referencement local : il permet a un
     * moteur de rattacher l'etablissement a une carte et de le servir sur une
     * requete de proximite (« institut superieur pres de Mopti »). Sans lui,
     * une adresse textuelle doit etre geocodee par le moteur, avec le risque
     * qu'il se trompe de commune.
     */
    geo: {
      '@type': 'GeoCoordinates',
      latitude: COORDONNEES.latitude,
      longitude: COORDONNEES.longitude,
    },
  },

  /*
   * Aire de recrutement declaree. Elle indique au moteur que l'etablissement
   * s'adresse au pays entier, et pas seulement a sa commune — un candidat de
   * Bamako doit pouvoir le trouver.
   */
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Mali' },
    { '@type': 'AdministrativeArea', name: 'Région de Mopti' },
  ],

  /*
   * Diplomes DELIVRES, a ne pas confondre avec `hasCredential` plus bas, qui
   * porte les AGREMENTS recus par l'etablissement. Les deux proprietes ont
   * failli se telescoper : declarees sous le meme nom, la seconde ecrasait
   * silencieusement la premiere — en JavaScript, une cle en double garde la
   * derniere valeur, sans avertissement.
   *
   * `educationalCredentialAwarded` est la propriete prevue pour ce qu'une
   * EducationalOrganization decerne. C'est aussi ce qu'un moteur generatif
   * reprend lorsqu'on lui demande quels diplomes prepare l'etablissement.
   */
  educationalCredentialAwarded: [
    'DUT — Bac+2',
    'Licence — Bac+3',
    'Master — Bac+5',
  ],

  telephone: IDENTITE.telephones,
  email: IDENTITE.email,

  /*
   * Profils officiels. `sameAs` relie cette fiche aux comptes sociaux : le
   * moteur confirme ainsi qu'il s'agit de la MEME entite, au lieu de traiter
   * chaque presence comme une organisation distincte. C'est le signal le plus
   * economique pour un site recemment mis en ligne, qui n'a encore ni
   * anciennete ni liens entrants.
   */
  sameAs: RESEAUX.map((r) => r.url),

  /*
   * Agrement et immatriculation. `PropertyValue` est la forme prevue par
   * schema.org pour un numero officiel dont il n'existe pas de propriete dediee.
   */
  identifier: [
    { '@type': 'PropertyValue', name: 'Agrément', value: IDENTITE.agrement },
    { '@type': 'PropertyValue', name: 'Registre du commerce', value: IDENTITE.registreCommerce },
    { '@type': 'PropertyValue', name: 'DNI', value: IDENTITE.numeroDni },
  ],

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


/**
 * Fil d'Ariane, au format schema.org.
 *
 * Google le reprend TEL QUEL dans ses resultats, a la place de l'URL brute :
 * « technolab-ista.org > Formations » se lit mieux qu'une adresse, et indique
 * au visiteur ou le lien va le mener avant qu'il ne clique. C'est aussi ce qui
 * permet a un moteur de comprendre la hierarchie du site sans l'explorer.
 *
 * @param {Array<{nom: string, chemin: string}>} etapes  sans l'accueil
 */
export const schemaFilAriane = (etapes = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ nom: 'Accueil', chemin: '/' }, ...etapes].map((etape, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: etape.nom,
    item: `${ORIGINE}${etape.chemin}`,
  })),
});

/**
 * Questions frequentes, au format schema.org.
 *
 * Deux usages, et le second prend de l'importance :
 *
 * 1. RESULTATS ENRICHIS — Google deplie les questions sous le lien, ce qui
 *    occupe plus de surface qu'un resultat ordinaire ;
 *
 * 2. MOTEURS GENERATIFS — un assistant interroge sur « les frais d'inscription
 *    a TechnoLAB-ISTA » reprend une reponse formulee explicitement bien plus
 *    volontiers qu'un chiffre isole dans un tableau. Une question posee et
 *    repondue est la forme la plus citable qui soit.
 *
 * Les reponses doivent rester TEXTUELLEMENT presentes sur la page : declarer
 * une reponse absente du contenu visible est une violation des consignes de
 * Google, sanctionnee par le retrait des resultats enrichis.
 *
 * @param {Array<{question: string, reponse: string}>} questions
 */
export const schemaQuestions = (questions = []) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: questions.map(({ question, reponse }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: reponse },
  })),
});

/**
 * Assemble plusieurs schemas en un seul graphe.
 *
 * Poser deux balises `<script type="application/ld+json">` sur une meme page
 * fonctionne, mais `@graph` les relie explicitement : le moteur comprend que la
 * fiche etablissement, le fil d'Ariane et la FAQ decrivent la MEME page, au
 * lieu de trois objets sans rapport.
 */
export const assembler = (...schemas) => ({
  '@context': 'https://schema.org',
  '@graph': schemas.filter(Boolean).map(({ '@context': _, ...reste }) => reste),
});
