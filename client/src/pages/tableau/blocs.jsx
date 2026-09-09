/** Blocs reutilises par les differentes vues du tableau de bord. */
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CalendarClock, Clock, MapPin } from 'lucide-react';
import Indicateur from '../../components/ui/Indicateur.jsx';
import { dateCourte } from '../../utils/formulaire.js';

export { Indicateur };

/** Rangee d'indicateurs : les nombres sont le message, pas un graphique. */
export function RangeeIndicateurs({ titre, indicateurs }) {
  return (
    <section>
      {titre && <h2 className="titre-section mb-4">{titre}</h2>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicateurs.map((i) => (
          <Indicateur key={i.libelle} {...i} />
        ))}
      </div>
    </section>
  );
}

/**
 * Carte de section : en-tete titre + contenu, avec un pied optionnel.
 * Uniformise les listes du tableau de bord, qui empilaient jusqu'ici des variantes
 * legerement differentes d'un meme motif.
 */
export function CarteSection({ titre, icone: Icone, tonIcone = 'text-slate-400', enPied, children }) {
  return (
    <section className="carte overflow-hidden">
      <h2 className="titre-carte flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        {Icone && <Icone className={`h-4 w-4 ${tonIcone}`} aria-hidden="true" />}
        {titre}
      </h2>

      {children}
      {enPied}
    </section>
  );
}

/**
 * Alertes actionnables : chaque ligne renvoie vers l'ecran qui permet de la traiter.
 * Une alerte a zero n'est pas affichee — un tableau de bord vide est une bonne nouvelle.
 */
export function Alertes({ alertes = [] }) {
  const actives = alertes.filter((a) => a.nombre > 0);
  if (!actives.length) return null;

  return (
    <CarteSection titre="A traiter" icone={AlertTriangle} tonIcone="text-alerte">
      <ul className="divide-y divide-slate-100">
        {actives.map((alerte) => (
          <li key={alerte.libelle}>
            <Link
              to={alerte.vers}
              className="group flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-alerte-fond text-sm font-bold text-alerte">
                {alerte.nombre}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                {alerte.libelle}
              </span>

              <ArrowRight
                className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ista"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </CarteSection>
  );
}

/** Seances du jour, avec horaire, salle et classe. */
export function SeancesDuJour({ donnees, afficherClasse = true }) {
  const { jour, seances = [] } = donnees || {};

  return (
    <CarteSection titre={jour ? `Vos cours de ${jour}` : 'Cours du jour'} icone={Clock}>
      {seances.length ? (
        <ul className="divide-y divide-slate-100">
          {seances.map((seance) => (
            <li key={seance.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              {/* L'heure sert de reperage : isolee, en gras, chiffres alignes. */}
              <span className="w-14 shrink-0 text-sm font-bold tabular-nums text-marine">
                {seance.heureDebut}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{seance.matiere?.nom}</p>
                <p className="truncate text-xs text-slate-500">
                  jusqu&apos;a {seance.heureFin}
                  {afficherClasse && seance.classe?.nom ? ` · ${seance.classe.nom}` : ''}
                  {seance.professeur && !afficherClasse
                    ? ` · ${seance.professeur.prenom} ${seance.professeur.nom}`
                    : ''}
                </p>
              </div>

              {seance.salle && (
                <span className="pastille-neutre">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {seance.salle}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-6 py-8 text-center text-sm text-slate-500">
          {jour ? 'Aucun cours prevu aujourd hui.' : 'Nous sommes dimanche : aucun cours.'}
        </p>
      )}
    </CarteSection>
  );
}

/** Prochaines epreuves, tous profils confondus. */
export function ProchainsExamens({ examens = [], titre = 'Prochains examens' }) {
  if (!examens.length) return null;

  return (
    <CarteSection
      titre={titre}
      icone={CalendarClock}
      enPied={
        <Link
          to="/examens"
          className="block border-t border-slate-100 px-6 py-3 text-center text-xs font-medium text-ista transition hover:bg-slate-50"
        >
          Voir le calendrier complet
        </Link>
      }
    >
      <ul className="divide-y divide-slate-100">
        {examens.map((examen) => (
          <li key={examen.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-ista">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{examen.titre}</p>
              <p className="truncate text-xs text-slate-500">
                {dateCourte(examen.date)} · {examen.heureDebut}-{examen.heureFin} · salle {examen.salle}
                {examen.classe?.nom ? ` · ${examen.classe.nom}` : ''}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </CarteSection>
  );
}
