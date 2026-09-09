/** Appels API des modules emploi du temps et statistiques. */
import api from './client.js';

const nettoyer = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const planningApi = {
  lister: (params) => api.get('/planning', { params: nettoyer(params) }).then((r) => r.data),
  salles: () => api.get('/planning/salles').then((r) => r.data),
  creer: (donnees) => api.post('/planning', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/planning/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/planning/${id}`).then((r) => r.data),
  dupliquer: (donnees) => api.post('/planning/dupliquer', donnees).then((r) => r.data),
};

export const statistiquesApi = {
  monTableau: () => api.get('/statistiques/mon-tableau').then((r) => r.data),
  etablissement: (params) =>
    api.get('/statistiques/etablissement', { params: nettoyer(params) }).then((r) => r.data),
};
