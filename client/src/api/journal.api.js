/** Appels API du journal des actions. Lecture seule, par construction. */
import api from './client.js';

const nettoyer = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );

export const journalApi = {
  lister: (params) => api.get('/journal', { params: nettoyer(params) }).then((r) => r.data),
  domaines: () => api.get('/journal/domaines').then((r) => r.data),
};
