/**
 * Logo TechnoLAB-ISTA.
 *
 * POURQUOI LE VERROU EST COMPOSE ICI, ET NON LIVRE EN IMAGE
 *
 * Le logo officiel fourni est un BLASON seul — couronne verte, cercle « ISTA »,
 * livre ouvert, banderole. Aucune version « blason + nom » n'existe.
 *
 * Or un blason ne survit pas a la reduction : a 40 px de haut, la hauteur d'un
 * en-tete, la banderole « INSTITUT SUPERIEUR DE TECHNOLOGIES APPLIQUEES » n'est
 * plus qu'une tache. C'est vrai de tous les emblemes detailles, pas de celui-ci
 * en particulier.
 *
 * Le nom est donc COMPOSE EN TEXTE a cote du blason plutot qu'incruste dans une
 * image. Trois consequences, toutes favorables :
 * - il reste net a toute taille et sur tout ecran, sans jeu de fichiers a gerer ;
 * - il suit la charte par les tokens, donc s'inverse seul sur fond fonce ;
 * - il est lu comme du texte par un lecteur d'ecran. Le blason porte alors
 *   `alt=""` : le donner a lire aussi ferait enoncer le nom deux fois.
 *
 * Le blason seul reste disponible en variante « icone », pour les seuls espaces
 * ou aucun texte ne tient — barre laterale repliee, onglet.
 *
 * Le fichier servi est le PNG detoure par client/scripts/preparer-logo.py :
 * l'original porte un fond blanc opaque qui dessinerait un rectangle sur les
 * aplats fonces de la charte.
 */

const BLASON = '/marque/logo-technolab.png';

/** Rapport largeur/hauteur du blason (263 x 245), pour reserver la place. */
const RATIO_BLASON = 263 / 245;

/**
 * Hauteur en deca de laquelle la signature est retiree.
 *
 * Sous ce seuil le nom composé passerait sous 11 px : illisible, et le blason
 * suffit alors a identifier l'etablissement dans un espace deja contraint.
 */
const SEUIL_SIGNATURE = 28;

/** Hauteur a partir de laquelle la ligne institutionnelle tient sans tasser. */
const SEUIL_SOUS_TITRE = 46;

const VARIANTES = {
  // Sur fond clair : nom en bleu d'autorite.
  clair: { couleurNom: 'text-marine', couleurSousTitre: 'text-slate-500' },
  // Sur aplat fonce : nom en blanc, ligne secondaire en teinte claire validee.
  marine: { couleurNom: 'text-white', couleurSousTitre: 'text-clair-sur-fonce' },
};

export default function Logo({
  variante = 'clair',
  hauteur = 40,
  /** Force le blason seul, sans signature — barre laterale repliee, favicon. */
  iconeSeule = false,
  className = '',
  ...props
}) {
  const { couleurNom, couleurSousTitre } = VARIANTES[variante] ?? VARIANTES.clair;
  const avecSignature = !iconeSeule && hauteur >= SEUIL_SIGNATURE;
  const avecSousTitre = avecSignature && hauteur >= SEUIL_SOUS_TITRE;

  const blason = (
    <img
      src={BLASON}
      // Decoratif quand le nom est compose a cote : sinon il serait annonce deux fois.
      alt={avecSignature ? '' : 'TechnoLAB-ISTA'}
      aria-hidden={avecSignature || undefined}
      height={hauteur}
      width={Math.round(hauteur * RATIO_BLASON)}
      style={{ height: hauteur, width: 'auto' }}
      className="select-none"
      draggable="false"
    />
  );

  if (!avecSignature) {
    return (
      <span className={`inline-flex ${className}`} {...props}>
        {blason}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} {...props}>
      {blason}

      <span className="flex flex-col justify-center leading-none">
        <span
          className={`font-bold tracking-tight ${couleurNom}`}
          style={{ fontSize: Math.round(hauteur * 0.42) }}
        >
          TechnoLAB<span className="font-medium opacity-70">-</span>ISTA
        </span>

        {avecSousTitre && (
          <span
            className={`mt-1 font-medium uppercase ${couleurSousTitre}`}
            style={{ fontSize: Math.round(hauteur * 0.17), letterSpacing: '0.06em' }}
          >
            Institut Supérieur de Technologies Appliquées
          </span>
        )}
      </span>
    </span>
  );
}
