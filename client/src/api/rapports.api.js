/** Appels API des rapports de direction. Consultation et telechargement. */
import api from './client.js';

const nettoyer = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );

export const rapportsApi = {
  catalogue: () => api.get('/rapports').then((r) => r.data),

  consulter: (cle, params) =>
    api.get(`/rapports/${cle}`, { params: nettoyer(params) }).then((r) => r.data),

  /**
   * Telecharge le rapport en PDF.
   *
   * Le document transite en blob : le jeton d'authentification reste dans
   * l'en-tete Authorization et n'apparait jamais dans une URL, qui finirait
   * dans l'historique du navigateur et dans les journaux du serveur.
   */
  telecharger: async (cle, params, nomFichier) => {
    const reponse = await api.get(`/rapports/${cle}/pdf`, {
      params: nettoyer(params), responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([reponse.data], { type: 'application/pdf' }));

    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `${nomFichier || cle}.pdf`;
    lien.click();

    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
