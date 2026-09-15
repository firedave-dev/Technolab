/** Hooks TanStack Query du journal des actions. */
import { useQuery } from '@tanstack/react-query';
import { journalApi } from '../api/journal.api.js';

export const useJournal = (params) =>
  useQuery({
    queryKey: ['journal', params],
    queryFn: () => journalApi.lister(params),
    // Garder la page precedente evite que le tableau ne clignote a chaque
    // changement de filtre ou de page.
    placeholderData: (precedent) => precedent,
  });

export const useDomainesJournal = () =>
  useQuery({
    queryKey: ['journal-domaines'],
    queryFn: journalApi.domaines,
    staleTime: 5 * 60 * 1000,
  });
