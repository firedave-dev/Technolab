/**
 * Briques communes aux graphiques.
 *
 * Choix de couleur documente :
 * - toutes les series de cette application sont uniques (un seul jeu de donnees par
 *   graphique), donc une seule teinte de marque suffit : la couleur n'a pas d'identite
 *   a porter, la longueur des barres dit deja tout ;
 * - seule la repartition des moyennes est *ordinale* (Insuffisant -> Tres bien) : elle
 *   recoit une rampe monotone d'une seule teinte, du bleu d'action au marine.
 *
 * La rampe reste d'UNE SEULE teinte, du vert de marque vers son assombrissement,
 * et ne suit pas le degrade vert -> bleu de la charte : echantillonner ce degrade
 * donnait deux pas de clarte quasi identiques (6,84 et 7,04 sur blanc), ce qui
 * brisait la progression qu'une rampe ordinale doit precisement donner a lire.
 *
 * Rampe validee : clarte strictement monotone et contraste >= 3:1 sur les cinq pas
 * (3,82 -> 9,45). Les pas voisins y sont proches — c'est le propre d'une rampe
 * ordinale — mais l'identite ne repose jamais sur la couleur seule : chaque barre
 * porte son libelle sur l'axe et sa valeur au-dessus.
 *
 * Les grilles sont des filets pleins d'une nuance au-dessus de la surface — jamais
 * de pointilles, qui se lisent a tort comme un seuil.
 */
import { Tooltip } from 'recharts';

/** Teinte unique des series : vert de marque de la charte, 5,03:1 sur fond blanc. */
export const TEINTE = '#038129';

/** Rampe ordinale a 5 pas : du vert de marque a son pas le plus sombre, 3,8:1 a 9,5:1. */
export const RAMPE_ORDINALE = ['#2b954b', '#038129', '#026a22', '#025f1e', '#01521a'];

export const ENCRE_AXE = '#64748b';
export const GRILLE = '#e2e8f0';

/** Style commun des axes : filets discrets, texte secondaire, chiffres alignes. */
export const axeProps = {
  tick: { fill: ENCRE_AXE, fontSize: 11 },
  tickLine: false,
  axisLine: false,
};

/** Infobulle sobre, alignee sur les cartes de l'application. */
function ContenuInfobulle({ active, payload, label, formater }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-800">{label}</p>
      {payload.map((entree) => (
        <p key={entree.dataKey} className="mt-0.5 text-xs text-slate-600">
          {formater ? formater(entree.value, entree.payload) : entree.value}
        </p>
      ))}
    </div>
  );
}

export const Infobulle = ({ formater }) => (
  <Tooltip
    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
    content={<ContenuInfobulle formater={formater} />}
  />
);

/**
 * Carte accueillant un graphique.
 * La hauteur inclut la bande des libelles d'axe : le graphique ne genere jamais
 * de petit defilement vertical interne.
 */
export function CarteGraphique({ titre, description, hauteur = 260, children, action }) {
  return (
    <section className="carte p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-marine">{titre}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>

      <div style={{ height: hauteur }}>{children}</div>
    </section>
  );
}

/** Vignette d'indicateur : la valeur est le message, pas un graphique a une barre. */
export function Vignette({ libelle, valeur, detail, accent = 'text-slate-900' }) {
  return (
    <div className="carte p-4">
      <p className="text-xs text-slate-500">{libelle}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent}`}>{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-400">{detail}</p>}
    </div>
  );
}
