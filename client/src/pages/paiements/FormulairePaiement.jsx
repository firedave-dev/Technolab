/**
 * Enregistrement d'un encaissement.
 * Le selecteur d'echeance n'affiche que les lignes ouvertes de l'etudiant, avec leur
 * reste a payer : le montant est prerempli, ce qui evite la majorite des erreurs de saisie.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCreerPaiement, useEcheancierEtudiant } from '../../hooks/useComptabilite.js';
import { ADMIN_ROLES } from '../../utils/roles.js';
import { MODES_PAIEMENT, formaterMontant } from '../../utils/montant.js';
import { aujourdhui } from '../../utils/scolarite.js';

const schema = z.object({
  echeance: z.string().optional(),
  montant: z.string().min(1, 'Montant obligatoire'),
  mode: z.string().min(1),
  reference: z.string().max(60).optional(),
  datePaiement: z.string().min(1, 'Date obligatoire'),
  commentaire: z.string().max(300).optional(),
});

export default function FormulairePaiement({ ouverte, onFermer, etudiant, echeancePreselectionnee }) {
  const { utilisateur } = useAuth();
  const valideDirectement = ADMIN_ROLES.includes(utilisateur?.role);

  const creer = useCreerPaiement();
  const { data } = useEcheancierEtudiant(ouverte ? etudiant?.id : null);
  const [recuEmis, setRecuEmis] = useState(null);

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { echeance: '', montant: '', mode: 'especes', reference: '', datePaiement: aujourdhui(), commentaire: '' },
  });

  // Echeances encore ouvertes, du plus urgent au plus lointain.
  const ouvertes = (data?.echeances || []).filter((e) => e.statut !== 'paye' && e.statut !== 'annule');

  useEffect(() => {
    if (!ouverte) return;
    reset({
      echeance: echeancePreselectionnee?.id || '',
      montant: echeancePreselectionnee ? String(echeancePreselectionnee.reste) : '',
      mode: 'especes',
      reference: '',
      datePaiement: aujourdhui(),
      commentaire: '',
    });
    setRecuEmis(null);
  }, [ouverte, echeancePreselectionnee, reset]);

  const echeanceChoisie = ouvertes.find((e) => e.id === watch('echeance'));

  /** Selectionner une echeance preremplit le reste a payer. */
  const surChangementEcheance = (id) => {
    setValue('echeance', id);
    const cible = ouvertes.find((e) => e.id === id);
    setValue('montant', cible ? String(cible.reste) : '');
  };

  const onSubmit = async (valeurs) => {
    const reponse = await creer.mutateAsync({
      etudiant: etudiant.id,
      echeance: valeurs.echeance || undefined,
      montant: Number(valeurs.montant),
      mode: valeurs.mode,
      reference: valeurs.reference || undefined,
      datePaiement: valeurs.datePaiement,
      commentaire: valeurs.commentaire || undefined,
    });
    setRecuEmis(reponse.paiement);
  };

  // Confirmation affichee apres l'encaissement : le numero de recu doit etre note.
  if (recuEmis) {
    return (
      <Modale
        ouverte={ouverte}
        onFermer={onFermer}
        titre="Paiement enregistre"
        largeur="sm"
        pied={<Bouton onClick={onFermer}>Terminer</Bouton>}
      >
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">
            Reçu <strong className="font-mono">{recuEmis.numeroRecu}</strong> —{' '}
            {formaterMontant(recuEmis.montant)}
          </p>
          <p className="mt-2 text-xs text-succes">
            {recuEmis.statut === 'valide'
              ? 'Le paiement est valide et imputé sur l échéancier.'
              : 'Le paiement attend la validation de la direction avant d être imputé sur le solde.'}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Le reçu PDF est téléchargeable depuis la liste des paiements.
        </p>
      </Modale>
    );
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Enregistrer un paiement"
      description={etudiant ? `${etudiant.nomComplet}${etudiant.matricule ? ` — ${etudiant.matricule}` : ''}` : undefined}
      largeur="md"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-paiement" chargement={isSubmitting}>
            Encaisser
          </Bouton>
        </>
      }
    >
      <form id="formulaire-paiement" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <ChampSelect
          label="Echeance reglee"
          placeholder="Versement libre (aucune echeance)"
          options={ouvertes.map((e) => ({
            valeur: e.id,
            libelle: `${e.libelle} — reste ${formaterMontant(e.reste)}`,
          }))}
          value={watch('echeance')}
          onChange={(e) => surChangementEcheance(e.target.value)}
          indication="Un versement libre n est impute sur aucune ligne de l echeancier."
        />

        {echeanceChoisie && (
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>
              Deja regle : {formaterMontant(echeanceChoisie.montantPaye)} sur{' '}
              {formaterMontant(echeanceChoisie.montant)}. Le montant saisi ne peut pas depasser le reste du.
            </span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ChampTexte
            label="Montant (FCFA)"
            type="number"
            min="1"
            erreur={errors.montant?.message}
            {...register('montant')}
          />
          <ChampSelect label="Mode de reglement" options={MODES_PAIEMENT} {...register('mode')} />
          <ChampTexte
            label="Date du paiement"
            type="date"
            erreur={errors.datePaiement?.message}
            {...register('datePaiement')}
          />
          <ChampTexte
            label="Reference"
            placeholder="N° de transaction, de cheque..."
            erreur={errors.reference?.message}
            {...register('reference')}
          />
          <ChampTexte
            label="Commentaire"
            className="sm:col-span-2"
            erreur={errors.commentaire?.message}
            {...register('commentaire')}
          />
        </div>

        {!valideDirectement && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Ce paiement sera enregistré en attente : il ne sera imputé sur le solde qu après
            validation par la direction.
          </p>
        )}
      </form>
    </Modale>
  );
}
