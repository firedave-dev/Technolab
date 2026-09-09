/** Hooks TanStack Query de l'emploi du temps et des statistiques. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { planningApi, statistiquesApi } from '../api/planning.api.js';
import { messageErreur } from '../api/client.js';

function useMutationPlanning(fn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      toast.success(data?.message || 'Operation reussie');
      // Le planning alimente aussi les tableaux de bord ("vos cours aujourd'hui").
      ['planning', 'mon-tableau', 'salles-planning'].forEach((cle) =>
        queryClient.invalidateQueries({ queryKey: [cle] })
      );
    },
    onError: (error) => toast.error(messageErreur(error)),
  });
}

export const usePlanning = (params) =>
  useQuery({
    queryKey: ['planning', params],
    queryFn: () => planningApi.lister(params),
    placeholderData: (precedent) => precedent,
  });

export const useSallesPlanning = (actif = true) =>
  useQuery({
    queryKey: ['salles-planning'],
    queryFn: planningApi.salles,
    enabled: actif,
    staleTime: 5 * 60 * 1000,
  });

export const useCreerCreneau = () => useMutationPlanning(planningApi.creer);
export const useModifierCreneau = () =>
  useMutationPlanning(({ id, donnees }) => planningApi.modifier(id, donnees));
export const useSupprimerCreneau = () => useMutationPlanning(planningApi.supprimer);
export const useDupliquerPlanning = () => useMutationPlanning(planningApi.dupliquer);

/** Tableau de bord : la charge utile depend du role, le serveur decide. */
export const useMonTableau = () =>
  useQuery({ queryKey: ['mon-tableau'], queryFn: statistiquesApi.monTableau });

export const useStatistiquesEtablissement = (params, actif = true) =>
  useQuery({
    queryKey: ['stats-etablissement', params],
    queryFn: () => statistiquesApi.etablissement(params),
    enabled: actif,
  });
