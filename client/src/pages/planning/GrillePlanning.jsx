/**
 * Grille hebdomadaire de l'emploi du temps.
 * Les seances sont positionnees en absolu sur une echelle de minutes, ce qui rend
 * la duree reelle de chaque cours immediatement lisible.
 * Sur mobile la grille bascule en liste par jour : une grille 6 colonnes y est illisible.
 */
import { Clock, MapPin, Pencil, Trash2 } from 'lucide-react';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const COULEURS = [
  'bg-brand-50 border-brand-200 text-brand-800',
  'bg-emerald-50 border-emerald-200 text-emerald-800',
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-violet-50 border-violet-200 text-violet-800',
  'bg-sky-50 border-sky-200 text-sky-800',
  'bg-pink-50 border-pink-200 text-pink-800',
];

const enMinutes = (heure) => {
  const [h, m] = heure.split(':').map(Number);
  return h * 60 + m;
};

/** Couleur stable par matiere : la meme matiere garde sa teinte d'une semaine a l'autre. */
function couleurMatiere(id = '') {
  let somme = 0;
  for (const caractere of String(id)) somme += caractere.charCodeAt(0);
  return COULEURS[somme % COULEURS.length];
}

export default function GrillePlanning({ donnees, modifiable, onModifier, onSupprimer, afficherClasse }) {
  const { grille = {}, plage } = donnees || {};

  // Bornes arrondies a l'heure pleine, avec une marge d'une demi-heure en bas.
  const debut = Math.floor(enMinutes(plage?.debut || '08:00') / 60) * 60;
  const fin = Math.ceil(enMinutes(plage?.fin || '18:00') / 60) * 60;
  const amplitude = Math.max(60, fin - debut);

  const heures = [];
  for (let m = debut; m <= fin; m += 60) {
    heures.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`);
  }

  const PIXELS_PAR_MINUTE = 1.1;
  const hauteur = amplitude * PIXELS_PAR_MINUTE;

  /** Bloc d'une seance, partage entre la grille et la liste mobile. */
  const Seance = ({ creneau, compact }) => (
    <div
      className={`group relative overflow-hidden rounded-lg border p-2 ${couleurMatiere(creneau.matiere?._id)}`}
    >
      <p className="truncate text-xs font-semibold">{creneau.matiere?.nom}</p>
      <p className="truncate text-[11px] opacity-80">
        {creneau.heureDebut} — {creneau.heureFin}
      </p>

      {(afficherClasse || compact) && creneau.classe?.nom && (
        <p className="truncate text-[11px] opacity-70">{creneau.classe.nom}</p>
      )}
      {creneau.salle && (
        <p className="truncate text-[11px] opacity-70">
          <MapPin className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" />
          {creneau.salle}
        </p>
      )}
      {creneau.professeur && !afficherClasse && (
        <p className="truncate text-[11px] opacity-70">
          {creneau.professeur.prenom} {creneau.professeur.nom}
        </p>
      )}

      {modifiable && (
        <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onModifier(creneau)}
            className="rounded bg-white/80 p-1 hover:bg-white"
            title="Modifier"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onSupprimer(creneau)}
            className="rounded bg-white/80 p-1 text-retard hover:bg-white"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Grille : ecrans larges */}
      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[860px]">
          {/* En-tete des jours */}
          <div className="grid grid-cols-[60px_repeat(6,1fr)] gap-1 border-b border-slate-200 pb-2">
            <div />
            {JOURS.map((jour) => (
              <div key={jour} className="text-center text-xs font-medium capitalize text-slate-600">
                {jour}
                <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
                  {grille[jour]?.length || 0} seance(s)
                </span>
              </div>
            ))}
          </div>

          {/* Corps : une colonne d'heures puis six colonnes de jours */}
          <div className="grid grid-cols-[60px_repeat(6,1fr)] gap-1 pt-2">
            <div className="relative" style={{ height: hauteur }}>
              {heures.map((h) => (
                <span
                  key={h}
                  className="absolute -translate-y-1/2 text-[11px] text-slate-400"
                  style={{ top: (enMinutes(h) - debut) * PIXELS_PAR_MINUTE }}
                >
                  {h}
                </span>
              ))}
            </div>

            {JOURS.map((jour) => (
              <div
                key={jour}
                className="relative rounded-lg bg-slate-50/60"
                style={{ height: hauteur }}
              >
                {/* Lignes horaires de reperage */}
                {heures.map((h) => (
                  <span
                    key={h}
                    className="absolute left-0 right-0 border-t border-dashed border-slate-200"
                    style={{ top: (enMinutes(h) - debut) * PIXELS_PAR_MINUTE }}
                    aria-hidden="true"
                  />
                ))}

                {(grille[jour] || []).map((creneau) => (
                  <div
                    key={creneau.id}
                    className="absolute inset-x-1"
                    style={{
                      top: (enMinutes(creneau.heureDebut) - debut) * PIXELS_PAR_MINUTE,
                      height: Math.max(
                        44,
                        (enMinutes(creneau.heureFin) - enMinutes(creneau.heureDebut)) * PIXELS_PAR_MINUTE - 4
                      ),
                    }}
                  >
                    <Seance creneau={creneau} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liste : mobile et tablette */}
      <div className="space-y-4 lg:hidden">
        {JOURS.filter((jour) => (grille[jour] || []).length > 0).map((jour) => (
          <section key={jour}>
            <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium capitalize text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              {jour}
            </h4>
            <div className="space-y-2">
              {grille[jour].map((creneau) => (
                <Seance key={creneau.id} creneau={creneau} compact />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
