/**
 * Hooks TanStack Query des modules pedagogiques.
 * Meme principe qu'en Phase 2 : les mutations affichent un toast et invalident
 * les listes concernees, les composants n'ont pas a gerer le rafraichissement.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  absencesApi,
  bulletinsApi,
  evaluationsApi,
  examensApi,
  matieresApi,
  notificationsApi,
} from '../api/scolarite.api.js';
import { documentsPublicsApi, notesApi, ueApi } from '../api/ue.api.js';
import { messageErreur } from '../api/client.js';

function useMutationScolarite(fn, { invalider = [] } = {}) {
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

// --- Unites d'Enseignement ---

/**
 * La nomenclature change rarement : on la garde en cache une heure plutot que
 * de la redemander a chaque ouverture d'un formulaire de matiere.
 */
export const useTypesMatiere = (actif = true) =>
  useQuery({
    queryKey: ['types-matiere'],
    queryFn: ueApi.types,
    enabled: actif,
    staleTime: 60 * 60 * 1000,
  });

export const useEtatSemestre = (params, actif = true) =>
  useQuery({
    queryKey: ['ue-etat', params],
    queryFn: () => ueApi.etat(params),
    enabled: actif && Boolean(params?.classe),
  });

export const usePropositionUE = (params, actif = true) =>
  useQuery({
    queryKey: ['ue-proposition', params],
    queryFn: () => ueApi.proposition(params),
    enabled: actif && Boolean(params?.classe),
  });

export const useUE = (params, actif = true) =>
  useQuery({
    queryKey: ['ue', params],
    queryFn: () => ueApi.lister(params),
    enabled: actif && Boolean(params?.classe),
  });

export const useAppliquerUE = () =>
  useMutationScolarite(ueApi.appliquer, { invalider: ['ue', 'ue-etat', 'ue-proposition', 'matieres'] });

export const useEchangerMatieres = () =>
  useMutationScolarite(
    ({ matiereA, matiereB }) => ueApi.echanger(matiereA, matiereB),
    { invalider: ['ue', 'ue-proposition', 'matieres'] }
  );

/**
 * Documents publics telechargeables.
 *
 * Interroge sans authentification. Le resultat conditionne l'affichage du
 * bouton : un lien de telechargement qui echoue fait croire a une panne.
 */
export const useDocumentsPublics = () =>
  useQuery({
    queryKey: ['documents-publics'],
    queryFn: documentsPublicsApi.lister,
    staleTime: 60 * 60 * 1000,
    // Une page publique doit s'afficher meme si l'API est injoignable.
    retry: false,
  });

// --- Saisie des notes de matiere ---

export const useMesEnseignements = (actif = true) =>
  useQuery({ queryKey: ['mes-enseignements'], queryFn: notesApi.mesEnseignements, enabled: actif });

export const useGrilleMatiere = (params, actif = true) =>
  useQuery({
    queryKey: ['grille-matiere', params],
    queryFn: () => notesApi.grille(params),
    enabled: actif && Boolean(params?.matiere),
  });

export const useEnregistrerGrille = () =>
  useMutationScolarite(notesApi.enregistrer, { invalider: ['grille-matiere', 'bulletin', 'releve'] });

export const usePublierGrille = () =>
  useMutationScolarite(notesApi.publier, { invalider: ['grille-matiere', 'bulletin', 'releve'] });

// --- Matieres ---

export const useMatieres = (params, actif = true) =>
  useQuery({
    queryKey: ['matieres', params],
    queryFn: () => matieresApi.lister(params),
    enabled: actif,
  });

export const useMesMatieres = (actif = true) =>
  useQuery({
    queryKey: ['mes-matieres'],
    queryFn: evaluationsApi.mesMatieres,
    enabled: actif,
  });

export const useCreerMatiere = () =>
  useMutationScolarite(matieresApi.creer, { invalider: ['matieres', 'mes-matieres'] });

export const useModifierMatiere = () =>
  useMutationScolarite(({ id, donnees }) => matieresApi.modifier(id, donnees), {
    invalider: ['matieres', 'mes-matieres'],
  });

export const useSupprimerMatiere = () =>
  useMutationScolarite(matieresApi.supprimer, { invalider: ['matieres', 'mes-matieres'] });

// --- Evaluations et notes ---

export const useEvaluations = (params, actif = true) =>
  useQuery({
    queryKey: ['evaluations', params],
    queryFn: () => evaluationsApi.lister(params),
    enabled: actif,
  });

export const useGrilleNotes = (id) =>
  useQuery({
    queryKey: ['grille', id],
    queryFn: () => evaluationsApi.grille(id),
    enabled: Boolean(id),
  });

export const useCreerEvaluation = () =>
  useMutationScolarite(evaluationsApi.creer, { invalider: ['evaluations', 'bulletin'] });

export const useModifierEvaluation = () =>
  useMutationScolarite(({ id, donnees }) => evaluationsApi.modifier(id, donnees), {
    invalider: ['evaluations', 'grille', 'bulletin'],
  });

export const useSupprimerEvaluation = () =>
  useMutationScolarite(evaluationsApi.supprimer, { invalider: ['evaluations', 'bulletin'] });

export const useSaisirNotes = () =>
  useMutationScolarite(({ id, notes }) => evaluationsApi.saisirNotes(id, notes), {
    invalider: ['evaluations', 'grille', 'bulletin', 'releve'],
  });

export const useBasculerPublication = () =>
  useMutationScolarite(evaluationsApi.basculerPublication, {
    invalider: ['evaluations', 'bulletin', 'notifications'],
  });

// --- Bulletins ---

export const useBulletin = (id, params) =>
  useQuery({
    queryKey: ['bulletin', id, params],
    queryFn: () => bulletinsApi.etudiant(id, params),
    enabled: Boolean(id),
  });

export const useReleveClasse = (id, params) =>
  useQuery({
    queryKey: ['releve', id, params],
    queryFn: () => bulletinsApi.classe(id, params),
    enabled: Boolean(id),
  });

// --- Examens ---

export const useExamens = (params) =>
  useQuery({ queryKey: ['examens', params], queryFn: () => examensApi.lister(params) });

export const useMesSurveillances = (actif = true) =>
  useQuery({ queryKey: ['mes-surveillances'], queryFn: examensApi.mesSurveillances, enabled: actif });

export const useSalles = (actif = true) =>
  useQuery({
    queryKey: ['salles'],
    queryFn: examensApi.salles,
    enabled: actif,
    staleTime: 5 * 60 * 1000,
  });

export const useCreerExamen = () =>
  useMutationScolarite(examensApi.creer, { invalider: ['examens', 'mes-surveillances'] });

export const useModifierExamen = () =>
  useMutationScolarite(({ id, donnees }) => examensApi.modifier(id, donnees), {
    invalider: ['examens', 'mes-surveillances'],
  });

export const useSupprimerExamen = () =>
  useMutationScolarite(examensApi.supprimer, { invalider: ['examens', 'mes-surveillances'] });

// --- Absences ---

export const useAbsences = (params) =>
  useQuery({
    queryKey: ['absences', params],
    queryFn: () => absencesApi.lister(params),
    placeholderData: (precedent) => precedent,
  });

export const useStatistiquesAbsences = (params, actif = true) =>
  useQuery({
    queryKey: ['absences-stats', params],
    queryFn: () => absencesApi.statistiques(params),
    enabled: actif,
  });

export const useAbsencesEtudiant = (id) =>
  useQuery({
    queryKey: ['absences-etudiant', id],
    queryFn: () => absencesApi.parEtudiant(id),
    enabled: Boolean(id),
  });

export const useEtatAppel = (params, actif = true) =>
  useQuery({
    queryKey: ['appel', params],
    queryFn: () => absencesApi.etatAppel(params),
    enabled: actif && Boolean(params?.classe),
  });

export const useEnregistrerAppel = () =>
  useMutationScolarite(absencesApi.enregistrerAppel, {
    invalider: ['appel', 'absences', 'absences-stats', 'absences-etudiant'],
  });

export const useJustifierAbsence = () =>
  useMutationScolarite(({ id, donnees }) => absencesApi.justifier(id, donnees), {
    invalider: ['absences', 'absences-stats', 'absences-etudiant'],
  });

export const useSupprimerAbsence = () =>
  useMutationScolarite(absencesApi.supprimer, {
    invalider: ['absences', 'absences-stats', 'absences-etudiant', 'appel'],
  });

// --- Notifications ---

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.lister({ limite: 20 }),
    refetchInterval: 60_000, // rafraichissement discret de la cloche
  });

export const useMarquerNotificationLue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.marquerLue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useToutMarquerLu = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.toutMarquerLu,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
