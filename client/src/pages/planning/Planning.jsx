/**
 * Emploi du temps.
 * Le personnel de planification choisit une classe ou un professeur et modifie la grille ;
 * les autres profils consultent la leur (le serveur applique le perimetre).
 */
import { useState } from 'react';
import { CalendarDays, Copy, Plus } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import Modale from '../../components/ui/Modale.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import GrillePlanning from './GrillePlanning.jsx';
import FormulaireCreneau from './FormulaireCreneau.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClasses, useUtilisateurs } from '../../hooks/useGestion.js';
import {
  useDupliquerPlanning,
  usePlanning,
  useSupprimerCreneau,
} from '../../hooks/usePlanning.js';
import { ADMIN_ROLES, ROLES, STAFF_ROLES } from '../../utils/roles.js';

export default function Planning() {
  const { utilisateur } = useAuth();
  const role = utilisateur?.role;

  const peutPlanifier = [...ADMIN_ROLES, ROLES.SECRETAIRE].includes(role);
  const estPersonnel = STAFF_ROLES.includes(role);

  const [classe, setClasse] = useState('');
  const [professeur, setProfesseur] = useState('');
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [duplicationOuverte, setDuplicationOuverte] = useState(false);
  const [cibleDuplication, setCibleDuplication] = useState('');

  const { data: classesData } = useClasses(undefined, estPersonnel);
  const { data: profsData } = useUtilisateurs(
    { role: ROLES.PROFESSEUR, limite: 100, actif: 'true' },
    // La liste des comptes est reservee aux profils gestionnaires.
    peutPlanifier
  );

  const { data, isLoading, isError } = usePlanning({
    classe: classe || undefined,
    professeur: professeur || undefined,
  });

  const supprimer = useSupprimerCreneau();
  const dupliquer = useDupliquerPlanning();

  if (isLoading) return <Chargement message="Chargement de l emploi du temps..." />;

  const classes = classesData?.classes || [];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marine">Emploi du temps</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {peutPlanifier
              ? 'Construisez la semaine type. Les conflits de classe, de professeur et de salle sont bloques.'
              : 'Vos seances de la semaine.'}
          </p>
        </div>

        {peutPlanifier && (
          <div className="flex flex-wrap gap-2">
            {classe && (
              <Bouton variante="secondaire" onClick={() => setDuplicationOuverte(true)}>
                <Copy className="h-4 w-4" />
                Dupliquer
              </Bouton>
            )}
            <Bouton
              onClick={() => {
                setEnEdition(null);
                setFormulaireOuvert(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Ajouter une seance
            </Bouton>
          </div>
        )}
      </header>

      {/* Filtres : reserves au personnel */}
      {estPersonnel && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ChampSelect
            placeholder={peutPlanifier ? 'Toutes les classes' : 'Toutes mes classes'}
            options={classes.map((c) => ({ valeur: c.id, libelle: c.nom }))}
            value={classe}
            onChange={(e) => {
              setClasse(e.target.value);
              setProfesseur('');
            }}
            aria-label="Filtrer par classe"
          />
          {peutPlanifier && (
            <ChampSelect
              placeholder="Tous les professeurs"
              options={(profsData?.utilisateurs || []).map((p) => ({ valeur: p.id, libelle: p.nomComplet }))}
              value={professeur}
              onChange={(e) => {
                setProfesseur(e.target.value);
                setClasse('');
              }}
              aria-label="Filtrer par professeur"
            />
          )}
        </div>
      )}

      <div className="carte p-4">
        {isError ? (
          <EtatVide titre="Chargement impossible" message="L emploi du temps n a pas pu etre recupere." />
        ) : data?.total ? (
          <GrillePlanning
            donnees={data}
            modifiable={peutPlanifier}
            afficherClasse={Boolean(professeur) || (!classe && peutPlanifier)}
            onModifier={(creneau) => {
              setEnEdition(creneau);
              setFormulaireOuvert(true);
            }}
            onSupprimer={setASupprimer}
          />
        ) : (
          <EtatVide
            icone={CalendarDays}
            titre="Aucune seance"
            message={
              peutPlanifier
                ? 'Ajoutez une premiere seance, ou dupliquez l emploi du temps d une autre classe.'
                : 'Aucun cours n est encore planifie pour vous.'
            }
            action={
              peutPlanifier ? (
                <Bouton
                  onClick={() => {
                    setEnEdition(null);
                    setFormulaireOuvert(true);
                  }}
                >
                  Ajouter une seance
                </Bouton>
              ) : null
            }
          />
        )}
      </div>

      {peutPlanifier && (
        <FormulaireCreneau
          ouverte={formulaireOuvert}
          onFermer={() => setFormulaireOuvert(false)}
          creneau={enEdition}
          classeFiltre={classe}
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
        titre="Retirer cette seance ?"
        message={`"${aSupprimer?.matiere?.nom}" du ${aSupprimer?.jour} ${aSupprimer?.heureDebut}-${aSupprimer?.heureFin} sera retiree de l emploi du temps.`}
        libelleConfirmer="Retirer"
      />

      {/* Duplication vers une autre classe */}
      <Modale
        ouverte={duplicationOuverte}
        onFermer={() => setDuplicationOuverte(false)}
        titre="Dupliquer cet emploi du temps"
        description="Les seances sont recopiees vers une autre classe, en associant les matieres par code."
        largeur="sm"
        pied={
          <>
            <Bouton variante="secondaire" onClick={() => setDuplicationOuverte(false)}>
              Annuler
            </Bouton>
            <Bouton
              chargement={dupliquer.isPending}
              disabled={!cibleDuplication}
              onClick={async () => {
                await dupliquer.mutateAsync({ source: classe, cible: cibleDuplication });
                setDuplicationOuverte(false);
                setCibleDuplication('');
              }}
            >
              Dupliquer
            </Bouton>
          </>
        }
      >
        <ChampSelect
          label="Classe de destination"
          placeholder="Choisir une classe"
          options={classes
            .filter((c) => c.id !== classe)
            .map((c) => ({ valeur: c.id, libelle: c.nom }))}
          value={cibleDuplication}
          onChange={(e) => setCibleDuplication(e.target.value)}
        />
        <p className="mt-3 text-xs text-slate-500">
          Une seance dont la matiere n existe pas dans la classe cible, ou qui entrerait en conflit,
          est ignoree et signalee.
        </p>
      </Modale>
    </div>
  );
}
