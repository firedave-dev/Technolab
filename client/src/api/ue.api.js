/** Appels API des Unites d'Enseignement : etat du semestre, appariement, reglage. */
import api from './client.js';

const nettoyer = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const ueApi = {
  /** Nomenclature disciplinaire et configurations valides. */
  types: () => api.get('/ue/types').then((r) => r.data),

  /** Avancement du semestre : credits, parites, impasses. */
  etat: (params) => api.get('/ue/etat', { params: nettoyer(params) }).then((r) => r.data),

  /** Appariement propose — calcule a la demande, rien n'est ecrit. */
  proposition: (params) => api.get('/ue/proposition', { params: nettoyer(params) }).then((r) => r.data),

  /** UE deja enregistrees. */
  lister: (params) => api.get('/ue', { params: nettoyer(params) }).then((r) => r.data),

  appliquer: (donnees) => api.post('/ue/appliquer', donnees).then((r) => r.data),
  echanger: (matiereA, matiereB) => api.patch('/ue/echanger', { matiereA, matiereB }).then((r) => r.data),
};

export const notesApi = {
  /** Classes ou l'acteur enseigne, et les matieres qu'il y dispense. */
  mesEnseignements: () => api.get('/notes/mes-enseignements').then((r) => r.data),

  grille: (params) => api.get('/notes/grille', { params: nettoyer(params) }).then((r) => r.data),

  /** Enregistrement groupe : une seule requete pour toute la grille. */
  enregistrer: (donnees) => api.put('/notes/grille', donnees).then((r) => r.data),

  publier: (donnees) => api.patch('/notes/publication', donnees).then((r) => r.data),
};

export const documentsPublicsApi = {
  /** Ce qui est réellement téléchargeable, pour ne pas afficher de lien mort. */
  lister: () => api.get('/public/documents').then((r) => r.data),
};
