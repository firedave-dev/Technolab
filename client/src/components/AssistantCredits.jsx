/**
 * Assistant de bouclage d'un semestre a 30 credits.
 *
 * Affiche en permanence, pendant la saisie des matieres, ce qui manque pour
 * boucler — et surtout ce qui rend le bouclage IMPOSSIBLE.
 *
 * Pourquoi l'impasse merite un traitement a part : un semestre peut etre bloque
 * bien avant le plafond. Avec une matiere a 2 credits et sept a 3, on n'a pose
 * que 23 credits sur 30, et pourtant plus aucune repartition ne permet
 * d'arriver a bon port. Un compteur qui ne s'alarmerait qu'au depassement
 * laisserait la saisie continuer jusqu'a un mur decouvert tres tard.
 *
 * L'etat vient du serveur, qui applique la meme regle a la creation : l'ecran
 * ne fait que la rendre lisible, il ne la definit pas.
 */
import { AlertTriangle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

/** Barre de progression des credits. */
function Jauge({ credits, total, impasse, complet }) {
  const part = Math.min(100, Math.round((credits / total) * 100));
  const couleur = impasse ? 'bg-retard' : complet ? 'bg-succes' : 'bg-ista';

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-indicateur">Crédits attribués</span>
        <span className="text-sm font-bold text-marine">
          {credits} <span className="font-medium text-slate-400">/ {total}</span>
        </span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={credits}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${credits} crédits sur ${total}`}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${couleur}`}
          style={{ width: `${part}%` }} />
      </div>
    </div>
  );
}

/** Décompte d'une catégorie de crédit, avec alerte de parité. */
function Categorie({ libelle, nombre, orpheline }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{libelle}</span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-bold text-marine">{nombre}</span>
        {orpheline && (
          <span className="pastille-alerte text-[11px]" title="Une matière restera sans binôme">
            impair
          </span>
        )}
      </span>
    </div>
  );
}

export default function AssistantCredits({ etat, total = 30, chargement = false }) {
  if (chargement || !etat) {
    return (
      <div className="carte animate-pulse p-5">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-3 h-2 rounded-full bg-slate-100" />
      </div>
    );
  }

  const {
    credits, n2, n3, orphelineDeux, orphelineTrois,
    impasse, complet, configurations, corrections,
  } = etat;

  return (
    <section className="carte p-5" aria-labelledby="titre-assistant">
      <h3 id="titre-assistant" className="sr-only">Bouclage du semestre</h3>

      <Jauge credits={credits} total={total} impasse={impasse} complet={complet} />

      <div className="mt-4 grid gap-2">
        <Categorie libelle="Matières à 2 crédits" nombre={n2} orpheline={orphelineDeux} />
        <Categorie libelle="Matières à 3 crédits" nombre={n3} orpheline={orphelineTrois} />
      </div>

      {/* --- Semestre boucle --- */}
      {complet && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-succes bg-succes-fond p-3 text-sm text-succes">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Le semestre est complet : {credits} crédits, toutes les matières sont appariables.</span>
        </p>
      )}

      {/* --- Impasse : le cas qui doit sauter aux yeux --- */}
      {impasse && (
        <div className="mt-4 rounded-lg border border-retard bg-retard-fond p-3" role="alert">
          <p className="flex items-start gap-2 text-sm font-bold text-retard">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Cette répartition ne peut plus atteindre 30 crédits
          </p>
          <p className="mt-1.5 pl-6 text-sm text-retard/90">
            Aucune combinaison de matières supplémentaires ne permet de boucler. Il faut retirer
            des matières :
          </p>
          <ul className="mt-2 space-y-1 pl-6">
            {corrections.slice(0, 2).map((c) => (
              <li key={c.texte} className="text-sm text-retard/90">— {c.texte}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --- Parite : signale avant que ce soit bloquant --- */}
      {!impasse && !complet && (orphelineDeux || orphelineTrois) && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-alerte bg-alerte-fond p-3 text-sm text-alerte">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Un effectif impair laisse une matière sans binôme. Les UE se composent par paires de
            même crédit.
          </span>
        </p>
      )}

      {/* --- Ce qu'il reste possible de faire --- */}
      {!impasse && !complet && (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 label-indicateur text-slate-500">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Pour boucler à 30
          </p>
          <ul className="mt-2 space-y-1.5">
            {configurations.map((c) => (
              <li key={`${c.n2}-${c.n3}`} className="text-sm text-slate-600">
                <span className="font-medium text-marine">
                  {c.ajoutN2 > 0 && `+${c.ajoutN2} à 2 cr.`}
                  {c.ajoutN2 > 0 && c.ajoutN3 > 0 && ' et '}
                  {c.ajoutN3 > 0 && `+${c.ajoutN3} à 3 cr.`}
                </span>
                <span className="text-slate-400">
                  {' '}→ {c.matieres} matières, {c.ue4} UE de 4 et {c.ue6} de 6
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
