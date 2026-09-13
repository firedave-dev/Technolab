/** Creation / modification d'une matiere. */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useClasses, useUtilisateurs } from '../../hooks/useGestion.js';
import {
  useCreerMatiere, useEtatSemestre, useModifierMatiere, useTypesMatiere,
} from '../../hooks/useScolarite.js';
import AssistantCredits from '../../components/AssistantCredits.jsx';
import { ROLES } from '../../utils/roles.js';
import { anneeScolaireCourante } from '../../utils/scolarite.js';
import { nettoyerPayload } from '../../utils/formulaire.js';

const schema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court').max(80),
  code: z.string().trim().min(2, 'Code trop court').max(12),
  coefficient: z.string().optional(),
  semestre: z.enum(['semestre1', 'semestre2']),
  // Obligatoire : sans type, la matiere ne peut etre appariee que par repli.
  typeMatiere: z.string().min(1, 'Choisissez un type'),
  classe: z.string().min(1, 'Choisissez une classe'),
  professeur: z.string().optional(),
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'),
  description: z.string().max(300).optional(),
});

const valeursDepuis = (matiere) => ({
  nom: matiere?.nom || '',
  code: matiere?.code || '',
  coefficient: matiere?.coefficient?.toString() || '1',
  semestre: matiere?.semestre || 'semestre1',
  typeMatiere: matiere?.typeMatiere || '',
  classe: matiere?.classe?._id || matiere?.classe?.id || matiere?.classe || '',
  professeur: matiere?.professeur?._id || matiere?.professeur || '',
  anneeScolaire: matiere?.anneeScolaire || anneeScolaireCourante(),
  description: matiere?.description || '',
});

export default function FormulaireMatiere({ ouverte, onFermer, matiere }) {
  const modeEdition = Boolean(matiere);
  const creer = useCreerMatiere();
  const modifier = useModifierMatiere();
  const { data: typesData } = useTypesMatiere(ouverte);

  const { data: classesData } = useClasses({ actif: 'true' });
  const { data: profsData } = useUtilisateurs({ role: ROLES.PROFESSEUR, limite: 100, actif: 'true' });

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(matiere) });

  /*
   * Le credit est DERIVE, ici comme sur le serveur. La regle est dupliquee a
   * dessein : l'ecran doit pouvoir afficher le credit avant tout aller-retour
   * reseau. Le serveur reste seul juge — il la reapplique a l'enregistrement,
   * et ecrase toute valeur recue.
   */
  const coefficient = Number(watch('coefficient')) || 1;
  const creditsEcts = coefficient >= 3 ? 3 : 2;

  const classeChoisie = watch('classe');
  const semestreChoisi = watch('semestre');

  // L'assistant n'a de sens qu'a la creation : modifier une matiere ne change
  // pas le nombre de matieres du semestre.
  const { data: etatData, isLoading: chargeEtat } = useEtatSemestre(
    { classe: classeChoisie, semestre: semestreChoisi },
    ouverte && !modeEdition && Boolean(classeChoisie)
  );

  useEffect(() => {
    if (ouverte) reset(valeursDepuis(matiere));
  }, [ouverte, matiere, reset]);

  const onSubmit = async (valeurs) => {
    const payload = nettoyerPayload(valeurs);

    if (modeEdition) {
      // Chaine vide volontaire : elle signale au serveur le retrait du titulaire.
      payload.professeur = valeurs.professeur || '';
      await modifier.mutateAsync({ id: matiere.id, donnees: payload });
    } else {
      await creer.mutateAsync(payload);
    }
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier la matiere' : 'Nouvelle matiere'}
      description={modeEdition ? matiere.nom : 'Une matiere relie une classe a son professeur titulaire.'}
      largeur="md"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-matiere" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Creer la matiere'}
          </Bouton>
        </>
      }
    >
      <form
        id="formulaire-matiere"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <ChampTexte
          label="Nom de la matiere"
          placeholder="Algorithmique"
          className="sm:col-span-2"
          erreur={errors.nom?.message}
          {...register('nom')}
        />
        <ChampTexte
          label="Code"
          placeholder="ALGO"
          indication="Unique au sein de la classe"
          erreur={errors.code?.message}
          {...register('code')}
        />
        <ChampTexte
          label="Coefficient"
          type="number"
          step="1"
          min="1"
          max="10"
          indication="Determine le credit ECTS ci-contre"
          erreur={errors.coefficient?.message}
          {...register('coefficient')}
        />

        {/*
          Credit en LECTURE SEULE : il se deduit du coefficient et n'est jamais
          saisi. Le rendre modifiable creerait deux sources de verite pour un
          meme poids pedagogique. Le champ est affiche malgre tout, parce qu'il
          gouverne l'appariement en UE — un saisisseur doit voir tout de suite
          si sa matiere pesera 2 ou 3 credits.
        */}
        <div>
          <span className="label">Credit ECTS</span>
          <output
            htmlFor="coefficient"
            className="champ flex items-center justify-between bg-slate-50 text-slate-700"
          >
            <span className="font-bold text-marine">{creditsEcts} credits</span>
            <span className="pastille-neutre">UE de {creditsEcts * 2}</span>
          </output>
          <p className="mt-1.5 text-xs text-slate-500">
            Credit deduit du coefficient : 1 ou 2 donnent 2 credits, 3 et plus en donnent 3.
          </p>
        </div>

        <ChampSelect
          label="Semestre"
          options={[
            { valeur: 'semestre1', libelle: 'Semestre 1' },
            { valeur: 'semestre2', libelle: 'Semestre 2' },
          ]}
          indication="Les 30 credits se comptent par semestre"
          erreur={errors.semestre?.message}
          {...register('semestre')}
        />

        <ChampSelect
          label="Type de matiere"
          placeholder="Choisir un type"
          options={(typesData?.types || []).map((t) => ({ valeur: t.code, libelle: t.libelle }))}
          indication="Gouverne le regroupement automatique en UE"
          erreur={errors.typeMatiere?.message}
          {...register('typeMatiere')}
        />

        <ChampSelect
          label="Classe"
          placeholder="Choisir une classe"
          options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
          erreur={errors.classe?.message}
          disabled={modeEdition}
          {...register('classe')}
        />
        <ChampTexte
          label="Annee scolaire"
          placeholder="2025-2026"
          erreur={errors.anneeScolaire?.message}
          {...register('anneeScolaire')}
        />
        <ChampSelect
          label="Professeur titulaire"
          placeholder="Non assigne"
          className="sm:col-span-2"
          options={(profsData?.utilisateurs || []).map((p) => ({ valeur: p.id, libelle: p.nomComplet }))}
          {...register('professeur')}
        />
        <ChampTexte
          label="Description"
          className="sm:col-span-2"
          erreur={errors.description?.message}
          {...register('description')}
        />

        {/*
          Etat du semestre vise, mis a jour a mesure que la classe et le semestre
          changent. Il previent d'une impasse AVANT la tentative d'enregistrement,
          que le serveur refuserait de toute facon.
        */}
        {!modeEdition && classeChoisie && (
          <div className="sm:col-span-2">
            <AssistantCredits
              etat={etatData?.etat}
              total={etatData?.total ?? 30}
              chargement={chargeEtat}
            />
          </div>
        )}
      </form>
    </Modale>
  );
}
