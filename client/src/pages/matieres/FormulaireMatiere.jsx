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
import { useCreerMatiere, useModifierMatiere } from '../../hooks/useScolarite.js';
import { ROLES } from '../../utils/roles.js';
import { anneeScolaireCourante } from '../../utils/scolarite.js';
import { nettoyerPayload } from '../../utils/formulaire.js';

const schema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court').max(80),
  code: z.string().trim().min(2, 'Code trop court').max(12),
  coefficient: z.string().optional(),
  classe: z.string().min(1, 'Choisissez une classe'),
  professeur: z.string().optional(),
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'),
  description: z.string().max(300).optional(),
});

const valeursDepuis = (matiere) => ({
  nom: matiere?.nom || '',
  code: matiere?.code || '',
  coefficient: matiere?.coefficient?.toString() || '1',
  classe: matiere?.classe?._id || matiere?.classe?.id || matiere?.classe || '',
  professeur: matiere?.professeur?._id || matiere?.professeur || '',
  anneeScolaire: matiere?.anneeScolaire || anneeScolaireCourante(),
  description: matiere?.description || '',
});

export default function FormulaireMatiere({ ouverte, onFermer, matiere }) {
  const modeEdition = Boolean(matiere);
  const creer = useCreerMatiere();
  const modifier = useModifierMatiere();

  const { data: classesData } = useClasses({ actif: 'true' });
  const { data: profsData } = useUtilisateurs({ role: ROLES.PROFESSEUR, limite: 100, actif: 'true' });

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(matiere) });

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
          indication="Poids dans la moyenne generale"
          erreur={errors.coefficient?.message}
          {...register('coefficient')}
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
      </form>
    </Modale>
  );
}
