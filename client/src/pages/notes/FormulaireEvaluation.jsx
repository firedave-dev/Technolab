/** Creation / modification d'une evaluation notee. */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useCreerEvaluation, useModifierEvaluation } from '../../hooks/useScolarite.js';
import { PERIODES, TYPES_EVALUATION, aujourdhui } from '../../utils/scolarite.js';
import { dateInput } from '../../utils/formulaire.js';

const schema = z.object({
  titre: z.string().trim().min(2, 'Titre trop court').max(100),
  type: z.string().min(1),
  date: z.string().min(1, 'Date obligatoire'),
  bareme: z.string().min(1, 'Bareme obligatoire'),
  coefficient: z.string().min(1, 'Coefficient obligatoire'),
  periode: z.string().min(1, 'Choisissez une periode'),
});

const valeursDepuis = (evaluation) => ({
  titre: evaluation?.titre || '',
  type: evaluation?.type || 'devoir',
  date: dateInput(evaluation?.date) || aujourdhui(),
  bareme: evaluation?.bareme?.toString() || '20',
  coefficient: evaluation?.coefficient?.toString() || '1',
  periode: evaluation?.periode || 'semestre1',
});

export default function FormulaireEvaluation({ ouverte, onFermer, evaluation, matiere }) {
  const modeEdition = Boolean(evaluation);
  const creer = useCreerEvaluation();
  const modifier = useModifierEvaluation();

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(evaluation) });

  useEffect(() => {
    if (ouverte) reset(valeursDepuis(evaluation));
  }, [ouverte, evaluation, reset]);

  const onSubmit = async (valeurs) => {
    if (modeEdition) {
      await modifier.mutateAsync({ id: evaluation.id, donnees: valeurs });
    } else {
      await creer.mutateAsync({ ...valeurs, matiere: matiere.id });
    }
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier l evaluation' : 'Nouvelle evaluation'}
      description={matiere ? `${matiere.nom} — ${matiere.classe?.nom || ''}` : undefined}
      largeur="md"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-evaluation" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Creer'}
          </Bouton>
        </>
      }
    >
      <form
        id="formulaire-evaluation"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <ChampTexte
          label="Titre"
          placeholder="Devoir surveille n°1"
          className="sm:col-span-2"
          erreur={errors.titre?.message}
          {...register('titre')}
        />
        <ChampSelect label="Type" options={TYPES_EVALUATION} erreur={errors.type?.message} {...register('type')} />
        <ChampTexte label="Date" type="date" erreur={errors.date?.message} {...register('date')} />
        <ChampTexte
          label="Bareme"
          type="number"
          min="1"
          max="100"
          indication="Note maximale (ex. 20)"
          erreur={errors.bareme?.message}
          {...register('bareme')}
        />
        <ChampTexte
          label="Coefficient"
          type="number"
          step="0.5"
          min="0.5"
          max="10"
          indication="Poids dans la moyenne de la matiere"
          erreur={errors.coefficient?.message}
          {...register('coefficient')}
        />
        <ChampSelect
          label="Periode"
          options={PERIODES}
          className="sm:col-span-2"
          erreur={errors.periode?.message}
          {...register('periode')}
        />
      </form>
    </Modale>
  );
}
