/** Appels API des modules utilisateurs et etudiants. */
import api from './client.js';

/** Retire les champs vides pour ne pas envoyer de parametres inutiles. */
const nettoyer = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const usersApi = {
  lister: (params) => api.get('/users', { params: nettoyer(params) }).then((r) => r.data),
  obtenir: (id) => api.get(`/users/${id}`).then((r) => r.data),
  creer: (donnees) => api.post('/users', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/users/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/users/${id}`).then((r) => r.data),
  basculerActif: (id) => api.patch(`/users/${id}/statut`).then((r) => r.data),
  reinitialiserMotDePasse: (id, donnees = {}) =>
    api.post(`/users/${id}/mot-de-passe`, donnees).then((r) => r.data),
  statistiques: () => api.get('/users/statistiques').then((r) => r.data),
  rolesGerables: () => api.get('/users/roles-gerables').then((r) => r.data),
};

export const etudiantsApi = {
  lister: (params) => api.get('/etudiants', { params: nettoyer(params) }).then((r) => r.data),
  dossier: (id) => api.get(`/etudiants/${id}`).then((r) => r.data),
  mesEnfants: () => api.get('/etudiants/mes-enfants').then((r) => r.data),
  affecterClasse: (id, classe) =>
    api.patch(`/etudiants/${id}/classe`, { classe: classe || null }).then((r) => r.data),
  lierParent: (id, parentId) =>
    api.post(`/etudiants/${id}/parents`, { parentId }).then((r) => r.data),
  delierParent: (id, parentId) =>
    api.delete(`/etudiants/${id}/parents/${parentId}`).then((r) => r.data),
};

export const classesApi = {
  lister: (params) => api.get('/classes', { params: nettoyer(params) }).then((r) => r.data),
  obtenir: (id) => api.get(`/classes/${id}`).then((r) => r.data),
  creer: (donnees) => api.post('/classes', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/classes/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/classes/${id}`).then((r) => r.data),
};
