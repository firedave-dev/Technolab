/** Appels API des modules frais, echeanciers et paiements. */
import api from './client.js';

const nettoyer = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const fraisApi = {
  lister: (params) => api.get('/frais', { params: nettoyer(params) }).then((r) => r.data),
  creer: (donnees) => api.post('/frais', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/frais/${id}`, donnees).then((r) => r.data),
  supprimer: (id) => api.delete(`/frais/${id}`).then((r) => r.data),
};

export const echeancesApi = {
  lister: (params) => api.get('/echeances', { params: nettoyer(params) }).then((r) => r.data),
  parEtudiant: (id, params) =>
    api.get(`/echeances/etudiant/${id}`, { params: nettoyer(params) }).then((r) => r.data),
  solde: (id, params) => api.get(`/echeances/solde/${id}`, { params: nettoyer(params) }).then((r) => r.data),
  statistiques: (params) => api.get('/echeances/statistiques', { params: nettoyer(params) }).then((r) => r.data),
  genererPourEtudiant: (id, donnees = {}) =>
    api.post(`/echeances/etudiant/${id}`, donnees).then((r) => r.data),
  genererPourClasse: (donnees) => api.post('/echeances/classe', donnees).then((r) => r.data),
  modifier: (id, donnees) => api.patch(`/echeances/${id}`, donnees).then((r) => r.data),
};

export const paiementsApi = {
  lister: (params) => api.get('/paiements', { params: nettoyer(params) }).then((r) => r.data),
  obtenir: (id) => api.get(`/paiements/${id}`).then((r) => r.data),
  creer: (donnees) => api.post('/paiements', donnees).then((r) => r.data),
  valider: (id) => api.patch(`/paiements/${id}/validation`).then((r) => r.data),
  annuler: (id, motif) => api.patch(`/paiements/${id}/annulation`, { motif }).then((r) => r.data),

  /**
   * Ouvre le recu PDF dans un nouvel onglet.
   * Le PDF transite en blob : le jeton d'authentification reste dans l'en-tete
   * Authorization, il n'apparait jamais dans une URL.
   */
  ouvrirRecu: async (id, numeroRecu) => {
    const reponse = await api.get(`/paiements/${id}/recu`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([reponse.data], { type: 'application/pdf' }));

    const onglet = window.open(url, '_blank', 'noopener');
    if (!onglet) {
      // Fenetre bloquee : on bascule sur un telechargement classique.
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `recu-${numeroRecu || id}.pdf`;
      lien.click();
    }

    // Liberation differee : le navigateur doit avoir le temps de charger le document.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
