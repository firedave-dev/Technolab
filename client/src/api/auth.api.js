/** Appels API du module authentification. */
import api from './client.js';

export const authApi = {
  login: (donnees) => api.post('/auth/login', donnees).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (donnees) => api.patch('/auth/me', donnees).then((r) => r.data),
  changePassword: (donnees) => api.patch('/auth/change-password', donnees).then((r) => r.data),
  forgotPassword: (donnees) => api.post('/auth/forgot-password', donnees).then((r) => r.data),
  resetPassword: (donnees) => api.post('/auth/reset-password', donnees).then((r) => r.data),
  register: (donnees) => api.post('/auth/register', donnees).then((r) => r.data),
};
