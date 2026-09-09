/** Creation / modification d'une classe (promotion). */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useCreerClasse, useModifierClasse, useUtilisateurs } from '../../hooks/useGestion.js';
import { ROLES } from '../../utils/roles.js';
import { nettoyerPayload } from '../../utils/formulaire.js';

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2'];

const schema = z.object({
  nom: z.string().trim().min(2, 'Nom trop court'),
  niveau: z.string().min(1, 'Choisissez un niveau'),
  filiere: z.string().trim().min(2, 'Filiere trop courte'),
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'),
  capacite: z.string().optional(),
  professeurPrincipal: z.string().optional(),
});

/** Annee scolaire courante : la rentree est consideree au 1er aout. */
function anneeScolaireCourante() {
  const maintenant = new Date();
  const debut = maintenant.getMonth() >= 7 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
  return `${debut}-${debut + 1}`;
}

const valeursDepuis = (classe) => ({
  nom: classe?.nom || '',
  niveau: classe?.niveau || '',
  filiere: classe?.filiere || '',
  anneeScolaire: classe?.anneeScolaire || anneeScolaireCourante(),
  capacite: classe?.capacite?.toString() || '40',
  professeurPrincipal: classe?.professeurPrincipal?._id || classe?.professeurPrincipal || '',
});

export default function FormulaireClasse({ ouverte, onFermer, classe }) {
  const modeEdition = Boolean(classe);
  const creer = useCreerClasse();
  const modifier = useModifierClasse();

  const { data: profsData } = useUtilisateurs({ role: ROLES.PROFESSEUR, limite: 100, actif: 'true' });

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(classe) });

  useEffect(() => {
    if (ouverte) reset(valeursDepuis(classe));
  }, [ouverte, classe, reset]);

  const onSubmit = async (valeurs) => {
    const payload = nettoyerPayload(valeurs);

    if (modeEdition) {
      // Chaine vide volontaire : elle signale au serveur le retrait du professeur principal.
      payload.professeurPrincipal = valeurs.professeurPrincipal || '';
      await modifier.mutateAsync({ id: classe.id, donnees: payload });
    } else {
      await creer.mutateAsync(payload);
    }
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier la classe' : 'Nouvelle classe'}
      description={modeEdition ? classe.nom : 'Une classe regroupe les etudiants d une promotion.'}
      largeur="md"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-classe" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Creer la classe'}
          </Bouton>
        </>
      }
    >
      <form id="formulaire-classe" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <ChampTexte
          label="Nom de la classe"
          placeholder="L1 Informatique A"
          className="sm:col-span-2"
          erreur={errors.nom?.message}
          {...register('nom')}
        />
        <ChampSelect
          label="Niveau"
          placeholder="Choisir"
          options={NIVEAUX.map((n) => ({ valeur: n, libelle: n }))}
          erreur={errors.niveau?.message}
          {...register('niveau')}
        />
        <ChampTexte
          label="Filiere"
          placeholder="Informatique"
          erreur={errors.filiere?.message}
          {...register('filiere')}
        />
        <ChampTexte
          label="Annee scolaire"
          placeholder="2025-2026"
          erreur={errors.anneeScolaire?.message}
          {...register('anneeScolaire')}
        />
        <ChampTexte
          label="Capacite"
          type="number"
          indication="Nombre maximum d etudiants"
          erreur={errors.capacite?.message}
          {...register('capacite')}
        />
        <ChampSelect
          label="Professeur principal"
          placeholder="Aucun"
          className="sm:col-span-2"
          options={(profsData?.utilisateurs || []).map((p) => ({
            valeur: p.id,
            libelle: p.nomComplet,
          }))}
          {...register('professeurPrincipal')}
        />
      </form>
    </Modale>
  );
}
