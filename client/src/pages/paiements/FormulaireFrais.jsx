/**
 * Definition d'un frais de la grille tarifaire.
 * Un apercu de l'echeancier genere est affiche en direct : c'est la meilleure
 * facon de verifier le decoupage en tranches avant d'enregistrer.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useClasses } from '../../hooks/useGestion.js';
import { useCreerFrais, useModifierFrais } from '../../hooks/useComptabilite.js';
import { TYPES_FRAIS, formaterMontant } from '../../utils/montant.js';
import { anneeScolaireCourante } from '../../utils/scolarite.js';
import { dateInput } from '../../utils/formulaire.js';

const schema = z.object({
  libelle: z.string().trim().min(2, 'Libelle trop court').max(80),
  type: z.string().min(1),
  montant: z.string().min(1, 'Montant obligatoire'),
  classe: z.string().min(1, 'Choisissez une classe'),
  anneeScolaire: z.string().regex(/^\d{4}-\d{4}$/, 'Format attendu : 2025-2026'),
  nombreTranches: z.string().min(1),
  intervalleMois: z.string().min(1),
  premiereEcheance: z.string().min(1, 'Date obligatoire'),
});

/** Rentree par defaut : 1er octobre de l'annee scolaire en cours. */
const rentreeParDefaut = () => `${anneeScolaireCourante().slice(0, 4)}-10-01`;

const valeursDepuis = (frais) => ({
  libelle: frais?.libelle || '',
  type: frais?.type || 'scolarite',
  montant: frais?.montant?.toString() || '',
  classe: frais?.classe?._id || frais?.classe?.id || frais?.classe || '',
  anneeScolaire: frais?.anneeScolaire || anneeScolaireCourante(),
  nombreTranches: frais?.nombreTranches?.toString() || '1',
  intervalleMois: frais?.intervalleMois?.toString() || '1',
  premiereEcheance: dateInput(frais?.premiereEcheance) || rentreeParDefaut(),
});

export default function FormulaireFrais({ ouverte, onFermer, frais }) {
  const modeEdition = Boolean(frais);
  const creer = useCreerFrais();
  const modifier = useModifierFrais();

  const { data: classesData } = useClasses({ actif: 'true' });

  const {
    register, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(frais) });

  useEffect(() => {
    if (ouverte) reset(valeursDepuis(frais));
  }, [ouverte, frais, reset]);

  // Apercu du decoupage : le reliquat d'arrondi tombe sur la derniere tranche.
  const montant = Number(watch('montant')) || 0;
  const tranches = Math.max(1, Number(watch('nombreTranches')) || 1);
  const intervalle = Number(watch('intervalleMois')) || 0;
  const premiere = watch('premiereEcheance');

  const apercu = Array.from({ length: Math.min(tranches, 12) }, (_, i) => {
    const numero = i + 1;
    const base = Math.floor(montant / tranches);
    const valeur = numero === tranches ? montant - base * (tranches - 1) : base;

    const date = premiere ? new Date(premiere) : null;
    if (date) date.setMonth(date.getMonth() + intervalle * i);

    return {
      numero,
      valeur,
      date: date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR') : '—',
    };
  });

  const onSubmit = async (valeurs) => {
    if (modeEdition) await modifier.mutateAsync({ id: frais.id, donnees: valeurs });
    else await creer.mutateAsync(valeurs);
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier le frais' : 'Nouveau frais'}
      description={modeEdition ? frais.libelle : 'Le frais s applique a tous les etudiants de la classe.'}
      largeur="lg"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-frais" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Creer le frais'}
          </Bouton>
        </>
      }
    >
      <form id="formulaire-frais" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <ChampTexte
            label="Libelle"
            placeholder="Scolarite annuelle"
            className="sm:col-span-2"
            erreur={errors.libelle?.message}
            {...register('libelle')}
          />
          <ChampSelect label="Type" options={TYPES_FRAIS} {...register('type')} />
          <ChampTexte
            label="Montant total (FCFA)"
            type="number"
            min="0"
            erreur={errors.montant?.message}
            {...register('montant')}
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
          <ChampTexte
            label="Nombre de tranches"
            type="number"
            min="1"
            max="12"
            erreur={errors.nombreTranches?.message}
            {...register('nombreTranches')}
          />
          <ChampTexte
            label="Intervalle (mois)"
            type="number"
            min="0"
            max="12"
            indication="Ecart entre deux tranches"
            erreur={errors.intervalleMois?.message}
            {...register('intervalleMois')}
          />
          <ChampTexte
            label="Premiere echeance"
            type="date"
            className="sm:col-span-2"
            erreur={errors.premiereEcheance?.message}
            {...register('premiereEcheance')}
          />
        </div>

        {/* Apercu du decoupage */}
        {montant > 0 && (
          <fieldset className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Echeancier genere
            </legend>
            <ul className="divide-y divide-slate-100 text-sm">
              {apercu.map((t) => (
                <li key={t.numero} className="flex items-center justify-between py-1.5">
                  <span className="text-slate-600">
                    {tranches > 1 ? `Tranche ${t.numero}/${tranches}` : 'Echeance unique'}
                    <span className="ml-2 text-xs text-slate-400">{t.date}</span>
                  </span>
                  <span className="font-medium text-slate-800">{formaterMontant(t.valeur)}</span>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {modeEdition && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Les échéanciers déjà générés ne suivent pas automatiquement : relancez la génération
            depuis l onglet Échéanciers pour les aligner sur le nouveau montant.
          </p>
        )}
      </form>
    </Modale>
  );
}
