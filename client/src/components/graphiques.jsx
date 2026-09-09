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
 * La rampe part volontairement de #4A8CE8 et non du bleu clair #7FB6F7 de la charte :
 * ce dernier ne doit jamais apparaitre sur fond clair (2,1:1 sur blanc). Rampe validee
 * (lightness monotone, ecarts >= 0.06, extremite claire a 3,3:1 sur la surface).
 *
 * Les grilles sont des filets pleins d'une nuance au-dessus de la surface — jamais
 * de pointilles, qui se lisent a tort comme un seuil.
 */
import { Tooltip } from 'recharts';

/** Teinte unique des series : bleu d'action de la charte, 4,8:1 sur fond blanc. */
export const TEINTE = '#1f6fe0';

/** Rampe ordinale a 5 pas : du bleu d'action au marine, contrastes 3,4:1 a 13,8:1. */
export const RAMPE_ORDINALE = ['#4a8ce8', '#1f6fe0', '#1a5cbc', '#164a97', '#0b2e52'];

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
