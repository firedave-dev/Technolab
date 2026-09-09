/**
 * Planification d'une epreuve : creneau, salle et surveillants.
 * Les conflits de salle et de classe sont detectes par le serveur et affiches ici.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useUtilisateurs } from '../../hooks/useGestion.js';
import { useCreerExamen, useMatieres, useModifierExamen, useSalles } from '../../hooks/useScolarite.js';
import { ROLES } from '../../utils/roles.js';
import { STATUTS_EXAMEN, TYPES_EXAMEN, aujourdhui } from '../../utils/scolarite.js';
import { dateInput } from '../../utils/formulaire.js';

const heure = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format attendu : HH:MM');

const schema = z
  .object({
    matiere: z.string().min(1, 'Choisissez une matiere'),
    titre: z.string().max(100).optional(),
    type: z.string().min(1),
    date: z.string().min(1, 'Date obligatoire'),
    heureDebut: heure,
    heureFin: heure,
    salle: z.string().trim().min(1, 'Salle obligatoire').max(40),
    instructions: z.string().max(500).optional(),
    statut: z.string().optional(),
  })
  .refine((d) => d.heureFin > d.heureDebut, {
    message: 'L heure de fin doit suivre l heure de debut',
    path: ['heureFin'],
  });

const valeursDepuis = (examen) => ({
  matiere: examen?.matiere?._id || examen?.matiere || '',
  titre: examen?.titre || '',
  type: examen?.type || 'partiel',
  date: dateInput(examen?.date) || aujourdhui(),
  heureDebut: examen?.heureDebut || '08:00',
  heureFin: examen?.heureFin || '10:00',
  salle: examen?.salle || '',
  instructions: examen?.instructions || '',
  statut: examen?.statut || 'planifie',
});

export default function FormulaireExamen({ ouverte, onFermer, examen }) {
  const modeEdition = Boolean(examen);
  const creer = useCreerExamen();
  const modifier = useModifierExamen();

  const { data: matieresData } = useMatieres({ actif: 'true' });
  const { data: sallesData } = useSalles();
  // Les surveillants designables : surveillance, enseignants et secretariat.
  const { data: personnelData } = useUtilisateurs({
    roles: [ROLES.SURVEILLANT, ROLES.PROFESSEUR, ROLES.SECRETAIRE].join(','),
    limite: 100,
    actif: 'true',
  });

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(examen) });

  useEffect(() => {
    if (ouverte) reset(valeursDepuis(examen));
  }, [ouverte, examen, reset]);

  // Les surveillants sont geres hors react-hook-form (cases a cocher multiples).
  const surveillantsInitiaux = (examen?.surveillants || []).map((s) => String(s._id || s));

  const onSubmit = async (valeurs, event) => {
    const coches = Array.from(
      event.target.querySelectorAll('input[name="surveillants"]:checked'),
      (input) => input.value
    );

    const donnees = { ...valeurs, surveillants: coches };

    if (modeEdition) {
      delete donnees.matiere; // la matiere d'une epreuve ne se change pas
      await modifier.mutateAsync({ id: examen.id, donnees });
    } else {
      delete donnees.statut;
      await creer.mutateAsync(donnees);
    }
    onFermer();
  };

  const matiereChoisie = (matieresData?.matieres || []).find((m) => m.id === watch('matiere'));

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier l epreuve' : 'Planifier une epreuve'}
      description={
        matiereChoisie
          ? `${matiereChoisie.nom} — ${matiereChoisie.classe?.nom || ''}`
          : 'La classe est deduite de la matiere choisie.'
      }
      largeur="lg"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-examen" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Planifier'}
          </Bouton>
        </>
      }
    >
      <form id="formulaire-examen" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ChampSelect
            label="Matiere"
            placeholder="Choisir une matiere"
            className="sm:col-span-2"
            options={(matieresData?.matieres || []).map((m) => ({
              valeur: m.id,
              libelle: `${m.nom} — ${m.classe?.nom || ''}`,
            }))}
            erreur={errors.matiere?.message}
            disabled={modeEdition}
            {...register('matiere')}
          />

          <ChampTexte
            label="Titre"
            placeholder="Genere depuis la matiere si vide"
            erreur={errors.titre?.message}
            {...register('titre')}
          />
          <ChampSelect label="Type" options={TYPES_EXAMEN} {...register('type')} />

          <ChampTexte label="Date" type="date" erreur={errors.date?.message} {...register('date')} />
          <ChampTexte
            label="Salle"
            placeholder="Salle A1"
            list="salles-connues"
            erreur={errors.salle?.message}
            {...register('salle')}
          />
          <datalist id="salles-connues">
            {(sallesData?.salles || []).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          <ChampTexte
            label="Heure de debut"
            type="time"
            erreur={errors.heureDebut?.message}
            {...register('heureDebut')}
          />
          <ChampTexte
            label="Heure de fin"
            type="time"
            erreur={errors.heureFin?.message}
            {...register('heureFin')}
          />

          {modeEdition && (
            <ChampSelect
              label="Statut"
              options={STATUTS_EXAMEN}
              className="sm:col-span-2"
              {...register('statut')}
            />
          )}

          <ChampTexte
            label="Instructions"
            placeholder="Documents non autorises..."
            className="sm:col-span-2"
            erreur={errors.instructions?.message}
            {...register('instructions')}
          />
        </div>

        {/* Surveillants : selection multiple par cases a cocher */}
        <fieldset className="rounded-lg border border-slate-200 p-4">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Surveillants assignes
          </legend>

          <div className="grid max-h-44 gap-1.5 overflow-y-auto sm:grid-cols-2">
            {(personnelData?.utilisateurs || []).map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                <input
                  type="checkbox"
                  name="surveillants"
                  value={p.id}
                  defaultChecked={surveillantsInitiaux.includes(String(p.id))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="min-w-0 truncate">
                  {p.nomComplet}
                  <span className="text-xs text-slate-400"> · {p.roleLabel}</span>
                </span>
              </label>
            ))}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Les personnes cochees recoivent une notification de convocation.
          </p>
        </fieldset>
      </form>
    </Modale>
  );
}
