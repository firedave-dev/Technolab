/**
 * Ajout ou modification d'une seance hebdomadaire.
 * La classe et le professeur sont deduits de la matiere : impossible de creer un
 * creneau incoherent. Les conflits sont detectes par le serveur et affiches ici.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useMatieres } from '../../hooks/useScolarite.js';
import { useClasses } from '../../hooks/useGestion.js';
import { useCreerCreneau, useModifierCreneau, useSallesPlanning } from '../../hooks/usePlanning.js';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((j) => ({
  valeur: j,
  libelle: j.charAt(0).toUpperCase() + j.slice(1),
}));

const TYPES = [
  { valeur: 'cours', libelle: 'Cours magistral' },
  { valeur: 'td', libelle: 'Travaux diriges' },
  { valeur: 'tp', libelle: 'Travaux pratiques' },
  { valeur: 'conference', libelle: 'Conference' },
];

const heure = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format attendu : HH:MM');

const schema = z
  .object({
    matiere: z.string().min(1, 'Choisissez une matiere'),
    jour: z.string().min(1, 'Choisissez un jour'),
    heureDebut: heure,
    heureFin: heure,
    salle: z.string().max(40).optional(),
    type: z.string().optional(),
    classesAssociees: z.array(z.string()).max(5).optional(),
  })
  .refine((d) => d.heureFin > d.heureDebut, {
    message: 'L heure de fin doit suivre l heure de debut',
    path: ['heureFin'],
  });

const valeursDepuis = (creneau, jourPrerempli) => ({
  matiere: creneau?.matiere?._id || creneau?.matiere || '',
  jour: creneau?.jour || jourPrerempli || 'lundi',
  heureDebut: creneau?.heureDebut || '08:00',
  heureFin: creneau?.heureFin || '10:00',
  salle: creneau?.salle || '',
  type: creneau?.type || 'cours',
  classesAssociees: (creneau?.classesAssociees || []).map((c) => c?._id || c),
});

export default function FormulaireCreneau({ ouverte, onFermer, creneau, classeFiltre, jourPrerempli }) {
  const modeEdition = Boolean(creneau);
  const creer = useCreerCreneau();
  const modifier = useModifierCreneau();

  const { data: matieresData } = useMatieres({ actif: 'true', classe: classeFiltre || undefined });
  const { data: sallesData } = useSallesPlanning();
  const { data: classesData } = useClasses({ limite: 100 });

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(creneau, jourPrerempli) });

  useEffect(() => {
    if (ouverte) reset(valeursDepuis(creneau, jourPrerempli));
  }, [ouverte, creneau, jourPrerempli, reset]);

  const matieres = matieresData?.matieres || [];
  const matiereChoisie = matieres.find((m) => m.id === watch('matiere'));

  /*
   * COURS MUTUALISE : classes qui suivent la seance en plus de celle de la
   * matiere. La classe de la matiere est evidemment exclue de la liste — on ne
   * peut pas associer une classe a elle-meme.
   */
  const associees = watch('classesAssociees') || [];
  const classePrincipale = matiereChoisie?.classe?._id || matiereChoisie?.classe?.id;
  const classesProposees = (classesData?.classes || [])
    .filter((c) => String(c._id ?? c.id) !== String(classePrincipale));

  const basculerClasse = (id) => {
    const presente = associees.some((c) => String(c) === String(id));
    setValue(
      'classesAssociees',
      presente ? associees.filter((c) => String(c) !== String(id)) : [...associees, id],
      { shouldDirty: true }
    );
  };

  const onSubmit = async (valeurs) => {
    if (modeEdition) {
      // La matiere d'une seance ne change pas : on supprimerait la coherence classe/professeur.
      const { matiere, ...donnees } = valeurs;
      await modifier.mutateAsync({ id: creneau.id, donnees });
    } else {
      await creer.mutateAsync(valeurs);
    }
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier la seance' : 'Nouvelle seance'}
      description={
        matiereChoisie
          ? `${matiereChoisie.classe?.nom || ''}${matiereChoisie.professeur ? ` · ${matiereChoisie.professeur.prenom} ${matiereChoisie.professeur.nom}` : ''}`
          : 'La classe et le professeur sont deduits de la matiere choisie.'
      }
      largeur="md"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-creneau" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Ajouter au planning'}
          </Bouton>
        </>
      }
    >
      <form id="formulaire-creneau" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <ChampSelect
          label="Matiere"
          placeholder="Choisir une matiere"
          className="sm:col-span-2"
          options={matieres.map((m) => ({
            valeur: m.id,
            libelle: `${m.nom} — ${m.classe?.nom || ''}`,
          }))}
          erreur={errors.matiere?.message}
          disabled={modeEdition}
          {...register('matiere')}
        />

        {/*
          COURS MUTUALISE — cases a cocher plutot qu'une liste deroulante
          multiple : on doit voir d'un coup d'oeil quelles classes sont
          reunies, sans deplier de menu.
        */}
        {classesProposees.length > 0 && (
          <fieldset className="sm:col-span-2">
            <legend className="label">Cours mutualisé</legend>
            <p className="mb-2 text-xs text-slate-500">
              Classes qui suivent cette séance en plus de
              {' '}<strong>{matiereChoisie?.classe?.nom || 'la classe de la matière'}</strong>.
              Une seule séance est créée : un seul professeur, une seule salle.
            </p>
            <div className="flex flex-wrap gap-2">
              {classesProposees.map((c) => {
                const id = c._id ?? c.id;
                const coche = associees.some((a) => String(a) === String(id));
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => basculerClasse(id)}
                    aria-pressed={coche}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition
                      ${coche
                        ? 'border-ista bg-ista/10 font-medium text-ista'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    {c.nom}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <ChampSelect label="Jour" options={JOURS} erreur={errors.jour?.message} {...register('jour')} />
        <ChampSelect label="Type de seance" options={TYPES} {...register('type')} />

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

        <ChampTexte
          label="Salle"
          className="sm:col-span-2"
          list="salles-planning"
          placeholder="Salle A1"
          indication="Une salle occupee sur le meme creneau sera refusee."
          erreur={errors.salle?.message}
          {...register('salle')}
        />
        <datalist id="salles-planning">
          {(sallesData?.salles || []).map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </form>
    </Modale>
  );
}
