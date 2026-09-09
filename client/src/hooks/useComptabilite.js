/**
 * Hooks TanStack Query du module comptable.
 * Toute mutation invalide les echeanciers ET les statistiques : un encaissement
 * change le solde d'un etudiant comme les agregats de l'etablissement.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { echeancesApi, fraisApi, paiementsApi } from '../api/comptabilite.api.js';
import { messageErreur } from '../api/client.js';

/** Caches touches par tout mouvement d'argent. */
const CACHES_COMPTABLES = ['paiements', 'echeances', 'echeancier', 'compta-stats', 'solde'];

function useMutationComptable(fn, { invalider = CACHES_COMPTABLES } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      toast.success(data?.message || 'Operation reussie');
      invalider.forEach((cle) => queryClient.invalidateQueries({ queryKey: [cle] }));
    },
    onError: (error) => toast.error(messageErreur(error)),
  });
}

// --- Grille tarifaire ---

export const useFrais = (params, actif = true) =>
  useQuery({ queryKey: ['frais', params], queryFn: () => fraisApi.lister(params), enabled: actif });

export const useCreerFrais = () =>
  useMutationComptable(fraisApi.creer, { invalider: ['frais'] });

export const useModifierFrais = () =>
  useMutationComptable(({ id, donnees }) => fraisApi.modifier(id, donnees), { invalider: ['frais'] });

export const useSupprimerFrais = () =>
  useMutationComptable(fraisApi.supprimer, { invalider: ['frais'] });

// --- Echeanciers ---

export const useEcheances = (params, actif = true) =>
  useQuery({
    queryKey: ['echeances', params],
    queryFn: () => echeancesApi.lister(params),
    enabled: actif,
    placeholderData: (precedent) => precedent,
  });

export const useEcheancierEtudiant = (id, params) =>
  useQuery({
    queryKey: ['echeancier', id, params],
    queryFn: () => echeancesApi.parEtudiant(id, params),
    enabled: Boolean(id),
  });

export const useStatistiquesComptables = (params, actif = true) =>
  useQuery({
    queryKey: ['compta-stats', params],
    queryFn: () => echeancesApi.statistiques(params),
    enabled: actif,
  });

export const useGenererEcheancier = () =>
  useMutationComptable(({ id, anneeScolaire }) =>
    echeancesApi.genererPourEtudiant(id, anneeScolaire ? { anneeScolaire } : {}));

export const useGenererEcheancierClasse = () =>
  useMutationComptable(echeancesApi.genererPourClasse);

export const useModifierEcheance = () =>
  useMutationComptable(({ id, donnees }) => echeancesApi.modifier(id, donnees));

// --- Paiements ---

export const usePaiements = (params) =>
  useQuery({
    queryKey: ['paiements', params],
    queryFn: () => paiementsApi.lister(params),
    placeholderData: (precedent) => precedent,
  });

export const useCreerPaiement = () => useMutationComptable(paiementsApi.creer);

export const useValiderPaiement = () =>
  useMutationComptable(paiementsApi.valider, {
    invalider: [...CACHES_COMPTABLES, 'notifications'],
  });

export const useAnnulerPaiement = () =>
  useMutationComptable(({ id, motif }) => paiementsApi.annuler(id, motif));

/** Ouverture du recu PDF : pas de cache a invalider, mais les erreurs restent visibles. */
export const useOuvrirRecu = () =>
  useMutation({
    mutationFn: ({ id, numeroRecu }) => paiementsApi.ouvrirRecu(id, numeroRecu),
    onError: (error) => toast.error(messageErreur(error, 'Recu indisponible')),
  });
