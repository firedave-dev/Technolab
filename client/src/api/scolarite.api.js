/** Appels API des modules pedagogiques : matieres, notes, bulletins, examens, absences. */
import api from './client.js';

/** Retire les champs vides pour ne pas envoyer de parametres inutiles. */
const nettoyer = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const matieresApi = {
  lister: (params) => api.get('/matieres', { params: nettoyer(params) }).then((r) => r.data),
  obtenir: (id) => api.get(`/matieres/${id}`).then((r) => r.data),
  creer: (donnees) => api.post('/matieres', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/matieres/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/matieres/${id}`).then((r) => r.data),
};

export const evaluationsApi = {
  lister: (params) => api.get('/evaluations', { params: nettoyer(params) }).then((r) => r.data),
  mesMatieres: () => api.get('/evaluations/mes-matieres').then((r) => r.data),
  creer: (donnees) => api.post('/evaluations', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/evaluations/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/evaluations/${id}`).then((r) => r.data),
  grille: (id) => api.get(`/evaluations/${id}/notes`).then((r) => r.data),
  saisirNotes: (id, notes) => api.put(`/evaluations/${id}/notes`, { notes }).then((r) => r.data),
  basculerPublication: (id) => api.patch(`/evaluations/${id}/publication`).then((r) => r.data),
};

export const bulletinsApi = {
  etudiant: (id, params) => api.get(`/bulletins/${id}`, { params: nettoyer(params) }).then((r) => r.data),
  classe: (id, params) => api.get(`/bulletins/classe/${id}`, { params: nettoyer(params) }).then((r) => r.data),
};

export const examensApi = {
  lister: (params) => api.get('/examens', { params: nettoyer(params) }).then((r) => r.data),
  mesSurveillances: () => api.get('/examens/mes-surveillances').then((r) => r.data),
  salles: () => api.get('/examens/salles').then((r) => r.data),
  creer: (donnees) => api.post('/examens', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/examens/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/examens/${id}`).then((r) => r.data),
};

export const absencesApi = {
  lister: (params) => api.get('/absences', { params: nettoyer(params) }).then((r) => r.data),
  statistiques: (params) => api.get('/absences/statistiques', { params: nettoyer(params) }).then((r) => r.data),
  parEtudiant: (id) => api.get(`/absences/etudiant/${id}`).then((r) => r.data),
  etatAppel: (params) => api.get('/absences/appel', { params: nettoyer(params) }).then((r) => r.data),
  enregistrerAppel: (donnees) => api.post('/absences/appel', donnees).then((r) => r.data),
  creer: (donnees) => api.post('/absences', donnees).then((r) => r.data),
  justifier: (id, donnees) => api.patch(`/absences/${id}/justification`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/absences/${id}`).then((r) => r.data),
};

export const notificationsApi = {
  lister: (params) => api.get('/notifications', { params: nettoyer(params) }).then((r) => r.data),
  marquerLue: (id) => api.patch(`/notifications/${id}/lecture`).then((r) => r.data),
  toutMarquerLu: () => api.patch('/notifications/lecture').then((r) => r.data),
};
