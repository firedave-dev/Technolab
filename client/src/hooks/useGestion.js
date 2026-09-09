/**
 * Hooks TanStack Query des modules de gestion (utilisateurs, etudiants, classes).
 * Toutes les mutations invalident les listes concernees : l'affichage se met a jour
 * sans rechargement manuel, et les erreurs remontent en toast au meme endroit.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { classesApi, etudiantsApi, usersApi } from '../api/users.api.js';
import { messageErreur } from '../api/client.js';

/** Cles de cache centralisees : evite les fautes de frappe entre hooks. */
export const CLES = {
  utilisateurs: (params) => ['utilisateurs', params],
  utilisateur: (id) => ['utilisateur', id],
  statistiques: () => ['utilisateurs', 'statistiques'],
  rolesGerables: () => ['utilisateurs', 'roles-gerables'],
  etudiants: (params) => ['etudiants', params],
  dossier: (id) => ['etudiant', id],
  mesEnfants: () => ['mes-enfants'],
  classes: (params) => ['classes', params],
  classe: (id) => ['classe', id],
};

/** Fabrique de mutation : toast de succes/erreur et invalidation des caches listes. */
function useMutationGestion(fn, { succes, invalider = [] } = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      if (succes !== false) toast.success(data?.message || succes || 'Operation reussie');
      invalider.forEach((cle) => queryClient.invalidateQueries({ queryKey: [cle] }));
    },
    onError: (error) => toast.error(messageErreur(error)),
  });
}

// --- Utilisateurs ---

/** `actif` evite d'appeler /users depuis un ecran ouvert a un role non gestionnaire. */
export const useUtilisateurs = (params, actif = true) =>
  useQuery({
    queryKey: CLES.utilisateurs(params),
    queryFn: () => usersApi.lister(params),
    enabled: actif,
    placeholderData: (precedent) => precedent, // evite le clignotement entre deux pages
  });

export const useUtilisateur = (id) =>
  useQuery({ queryKey: CLES.utilisateur(id), queryFn: () => usersApi.obtenir(id), enabled: Boolean(id) });

export const useStatistiquesUtilisateurs = (actif = true) =>
  useQuery({ queryKey: CLES.statistiques(), queryFn: usersApi.statistiques, enabled: actif });

export const useRolesGerables = () =>
  useQuery({
    queryKey: CLES.rolesGerables(),
    queryFn: usersApi.rolesGerables,
    staleTime: 10 * 60 * 1000, // change rarement
  });

export const useCreerUtilisateur = () =>
  useMutationGestion(usersApi.creer, { invalider: ['utilisateurs', 'etudiants'] });

export const useModifierUtilisateur = () =>
  useMutationGestion(({ id, donnees }) => usersApi.modifier(id, donnees), {
    invalider: ['utilisateurs', 'utilisateur', 'etudiants', 'etudiant'],
  });

export const useSupprimerUtilisateur = () =>
  useMutationGestion(usersApi.supprimer, { invalider: ['utilisateurs', 'etudiants', 'mes-enfants'] });

export const useBasculerActif = () =>
  useMutationGestion(usersApi.basculerActif, { invalider: ['utilisateurs', 'utilisateur', 'etudiants'] });

export const useReinitialiserMotDePasse = () =>
  useMutationGestion(({ id, donnees }) => usersApi.reinitialiserMotDePasse(id, donnees), {
    invalider: ['utilisateurs'],
  });

// --- Etudiants ---

export const useEtudiants = (params) =>
  useQuery({
    queryKey: CLES.etudiants(params),
    queryFn: () => etudiantsApi.lister(params),
    placeholderData: (precedent) => precedent,
  });

export const useDossierEtudiant = (id) =>
  useQuery({ queryKey: CLES.dossier(id), queryFn: () => etudiantsApi.dossier(id), enabled: Boolean(id) });

/** `enabled` evite d'appeler la route (reservee aux parents) depuis un autre profil. */
export const useMesEnfants = ({ enabled = true } = {}) =>
  useQuery({ queryKey: CLES.mesEnfants(), queryFn: etudiantsApi.mesEnfants, enabled });

export const useAffecterClasse = () =>
  useMutationGestion(({ id, classe }) => etudiantsApi.affecterClasse(id, classe), {
    invalider: ['etudiants', 'etudiant', 'classes', 'classe'],
  });

export const useLierParent = () =>
  useMutationGestion(({ id, parentId }) => etudiantsApi.lierParent(id, parentId), {
    invalider: ['etudiant', 'mes-enfants'],
  });

export const useDelierParent = () =>
  useMutationGestion(({ id, parentId }) => etudiantsApi.delierParent(id, parentId), {
    invalider: ['etudiant', 'mes-enfants'],
  });

// --- Classes ---

/** `actif` permet de ne pas lancer la requete pour un profil sans droit de consultation. */
export const useClasses = (params, actif = true) =>
  useQuery({
    queryKey: CLES.classes(params),
    queryFn: () => classesApi.lister(params),
    enabled: actif,
  });

export const useClasse = (id) =>
  useQuery({ queryKey: CLES.classe(id), queryFn: () => classesApi.obtenir(id), enabled: Boolean(id) });

export const useCreerClasse = () => useMutationGestion(classesApi.creer, { invalider: ['classes'] });

export const useModifierClasse = () =>
  useMutationGestion(({ id, donnees }) => classesApi.modifier(id, donnees), {
    invalider: ['classes', 'classe'],
  });

export const useSupprimerClasse = () =>
  useMutationGestion(classesApi.supprimer, { invalider: ['classes'] });
