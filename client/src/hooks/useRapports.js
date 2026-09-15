/** Hooks TanStack Query des rapports de direction. */
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rapportsApi } from '../api/rapports.api.js';
import { messageErreur } from '../api/client.js';

export const useCatalogueRapports = () =>
  useQuery({
    queryKey: ['rapports-catalogue'],
    queryFn: rapportsApi.catalogue,
    staleTime: 10 * 60 * 1000,
  });

export const useRapport = (cle, params, actif = true) =>
  useQuery({
    queryKey: ['rapport', cle, params],
    queryFn: () => rapportsApi.consulter(cle, params),
    enabled: Boolean(cle) && actif,
    // Conserver l'affichage precedent evite que le tableau ne disparaisse a
    // chaque changement de periode.
    placeholderData: (precedent) => precedent,
  });

export const useTelechargerRapport = () =>
  useMutation({
    mutationFn: ({ cle, params, nom }) => rapportsApi.telecharger(cle, params, nom),
    onSuccess: () => toast.success('Rapport téléchargé'),
    onError: (error) => toast.error(messageErreur(error)),
  });
