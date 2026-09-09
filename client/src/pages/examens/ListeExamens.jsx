/**
 * Calendrier des examens, groupe par jour.
 * Le personnel de planification cree et modifie les epreuves ; les autres profils
 * consultent (etudiants et parents sont filtres sur leur classe par le serveur).
 */
import { useState } from 'react';
import { CalendarClock, Clock, MapPin, Pencil, Plus, Trash2, UserCheck } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulaireExamen from './FormulaireExamen.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClasses } from '../../hooks/useGestion.js';
import { useExamens, useSupprimerExamen } from '../../hooks/useScolarite.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../../utils/roles.js';
import { STATUTS_EXAMEN, dateLongue, libelleStatutExamen, libelleTypeExamen } from '../../utils/scolarite.js';

const COULEUR_STATUT = {
  planifie: 'bg-sky-100 text-sky-700',
  termine: 'bg-slate-200 text-slate-600',
  annule: 'bg-red-100 text-red-700',
};

/** Regroupe les epreuves par journee, dans l'ordre chronologique. */
function grouperParJour(examens) {
  const groupes = new Map();

  for (const examen of examens) {
    const cle = new Date(examen.date).toISOString().slice(0, 10);
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(examen);
  }

  return [...groupes.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function ListeExamens() {
  const { utilisateur } = useAuth();
  const role = utilisateur?.role;

  const peutPlanifier = [...ADMIN_ROLES, ROLES.SECRETAIRE].includes(role);
  const peutSupprimer = ADMIN_ROLES.includes(role);
  const estPersonnel = STAFF_ROLES.includes(role);

  const [classe, setClasse] = useState('');
  const [statut, setStatut] = useState('');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);

  const { data: classesData } = useClasses(undefined, estPersonnel);
  const { data, isLoading, isError } = useExamens({
    classe: classe || undefined,
    statut: statut || undefined,
  });
  const supprimer = useSupprimerExamen();

  if (isLoading) return <Chargement message="Chargement du calendrier..." />;

  const journees = grouperParJour(data?.examens || []);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marine">Examens</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {peutPlanifier
              ? 'Planifiez les epreuves : creneau, salle et surveillants.'
              : 'Calendrier des epreuves qui vous concernent.'}
          </p>
        </div>
        {peutPlanifier && (
          <Bouton
            onClick={() => {
              setEnEdition(null);
              setFormulaireOuvert(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Planifier
          </Bouton>
        )}
      </header>

      {estPersonnel && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ChampSelect
            placeholder="Toutes les classes"
            options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            aria-label="Filtrer par classe"
          />
          <ChampSelect
            placeholder="Tous les statuts"
            options={STATUTS_EXAMEN}
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            aria-label="Filtrer par statut"
          />
        </div>
      )}

      {isError ? (
        <div className="carte">
          <EtatVide titre="Chargement impossible" message="Le calendrier n a pas pu etre recupere." />
        </div>
      ) : journees.length ? (
        <div className="space-y-5">
          {journees.map(([jour, examens]) => (
            <section key={jour}>
              <h3 className="mb-2 text-sm font-medium capitalize text-slate-600">{dateLongue(jour)}</h3>

              <ul className="space-y-2">
                {examens.map((examen) => (
                  <li key={examen.id} className="carte p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-marine">{examen.titre}</h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COULEUR_STATUT[examen.statut]}`}
                          >
                            {libelleStatutExamen(examen.statut)}
                          </span>
                        </div>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {examen.matiere?.nom} · {examen.classe?.nom} · {libelleTypeExamen(examen.type)}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            {examen.heureDebut} — {examen.heureFin}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            {examen.salle}
                          </span>
                          {examen.surveillants?.length > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                              {examen.surveillants.map((s) => `${s.prenom} ${s.nom}`).join(', ')}
                            </span>
                          )}
                        </div>

                        {examen.instructions && (
                          <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                            {examen.instructions}
                          </p>
                        )}
                      </div>

                      {peutPlanifier && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Modifier"
                            onClick={() => {
                              setEnEdition(examen);
                              setFormulaireOuvert(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {peutSupprimer && (
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-retard"
                              title="Supprimer"
                              onClick={() => setASupprimer(examen)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="carte">
          <EtatVide
            icone={CalendarClock}
            titre="Aucune epreuve planifiee"
            message={
              peutPlanifier
                ? 'Planifiez une premiere epreuve pour alimenter le calendrier.'
                : 'Aucun examen n est prevu pour le moment.'
            }
          />
        </div>
      )}

      {peutPlanifier && (
        <FormulaireExamen
          ouverte={formulaireOuvert}
          onFermer={() => setFormulaireOuvert(false)}
          examen={enEdition}
        />
      )}

      <Confirmation
        ouverte={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={async () => {
          await supprimer.mutateAsync(aSupprimer.id);
          setASupprimer(null);
        }}
        chargement={supprimer.isPending}
        titre="Supprimer cette epreuve ?"
        message={`"${aSupprimer?.titre}" sera retiree du calendrier. Pour conserver la trace, passez plutot son statut a "Annule".`}
        libelleConfirmer="Supprimer"
      />
    </div>
  );
}
