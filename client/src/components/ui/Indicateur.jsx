/**
 * Vignette d'indicateur.
 *
 * Hierarchie : la valeur domine (30 px / 700), le libelle s'efface (12 px / 500).
 * C'est l'ecart entre ces deux niveaux qui rend la carte lisible d'un coup d'oeil —
 * l'ancienne version les affichait a des tailles trop proches.
 *
 * L'icone contextualise sans repeter le libelle. La tendance n'est affichee que
 * lorsque la donnee de comparaison existe reellement cote serveur : une fleche
 * inventee vaut moins que pas de fleche du tout.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react';

/** Teintes de l'icone selon la nature de l'indicateur. */
const TONS = {
  neutre: 'bg-brand-50 text-ista',
  succes: 'bg-succes-fond text-succes',
  alerte: 'bg-alerte-fond text-alerte',
  retard: 'bg-retard-fond text-retard',
};

/**
 * Fleche de tendance.
 * `sens` dit si une hausse est une bonne nouvelle : le taux de recouvrement qui
 * monte est positif, les impayes qui montent ne le sont pas.
 */
function Tendance({ variation, sens = 'hausse-positive', periode = 'sur un mois' }) {
  if (variation === null || variation === undefined) return null;

  const stable = Math.abs(variation) < 0.5;
  const monte = variation > 0;
  const favorable = sens === 'hausse-positive' ? monte : !monte;

  const Icone = stable ? Minus : monte ? TrendingUp : TrendingDown;
  const couleur = stable
    ? 'text-slate-500'
    : favorable
      ? 'text-succes'
      : 'text-retard';

  const libelle = stable
    ? 'stable'
    : `${monte ? '+' : ''}${Math.round(variation)} %`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${couleur}`}>
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {libelle}
      <span className="font-normal text-slate-400">{periode}</span>
    </span>
  );
}

export default function Indicateur({
  libelle,
  valeur,
  detail,
  icone: Icone,
  ton = 'neutre',
  accent,
  tendance,
  vers,
}) {
  const contenu = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="label-indicateur">{libelle}</p>

        {Icone && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONS[ton]}`}>
            <Icone className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <p className={`valeur-cle mt-3 ${accent || ''}`}>{valeur ?? '—'}</p>

      {(detail || tendance) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {tendance && <Tendance {...tendance} />}
          {detail && <span className="texte-secondaire">{detail}</span>}
        </div>
      )}

      {vers && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-ista">
          Consulter
          <ArrowRight
            className="h-3 w-3 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      )}
    </>
  );

  if (vers) {
    return (
      <Link to={vers} className="carte-interactive group block p-5">
        {contenu}
      </Link>
    );
  }

  return <div className="carte p-5">{contenu}</div>;
}
