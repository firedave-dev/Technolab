/** Test de bout en bout du flux d'authentification (Phase 1). */
// Chemin du dossier src/, resolu depuis l'emplacement de ce fichier.
const SRC = new URL('../src/', import.meta.url).href;
const { connectDB } = await import(SRC + 'config/db.js');

/**
 * Compte administrateur de reference, lu depuis la configuration.
 *
 * Cette adresse est reglable par SEED_ADMIN_EMAIL : la coder en dur ici faisait
 * echouer toute la suite des qu'un deploiement changeait l'adresse de l'admin,
 * alors que le code teste etait intact. On lit donc la meme source que le seed.
 */
const { env } = await import(SRC + 'config/env.js');
const ADMIN_EMAIL = env.seed.adminEmail;
const ADMIN_MDP = env.seed.adminPassword;

const BASE = 'http://localhost:5099/api';
let cookie = null;
const ok = [];
const ko = [];

function verifier(nom, condition, detail = '') {
  (condition ? ok : ko).push(`${nom}${detail ? ' -> ' + detail : ''}`);
  console.log(`${condition ? 'OK  ' : 'ECHEC'} ${nom} ${detail}`);
}

async function appel(chemin, { method = 'GET', body, token, useCookie } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  if (useCookie && cookie) headers.cookie = cookie;

  const res = await fetch(BASE + chemin, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  let data = null;
  try { data = await res.json(); } catch { /* corps vide */ }
  return { status: res.status, data };
}

const { createApp } = await import(SRC + 'app.js');
await connectDB();
const server = createApp().listen(5099);

try {
  // 1. Mauvais mot de passe
  let r = await appel('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, motDePasse: 'FauxMdp1' } });
  verifier('login mot de passe errone rejete', r.status === 401, r.data?.message);

  // 2. Connexion admin
  r = await appel('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, motDePasse: ADMIN_MDP } });
  verifier('login admin', r.status === 200 && !!r.data.accessToken, r.data?.utilisateur?.roleLabel);
  verifier('cookie refresh httpOnly pose', /refreshToken=/.test(cookie || ''));
  verifier('mot de passe absent de la reponse', r.data?.utilisateur?.motDePasse === undefined);
  const tokenAdmin = r.data.accessToken;

  // 3. /me
  r = await appel('/auth/me', { token: tokenAdmin });
  verifier('GET /me avec jeton', r.status === 200 && r.data.utilisateur.role === 'admin');

  // 4. Refresh (rotation) : on garde le cookie AVANT rotation pour le test 11
  const cookieAvantRotation = cookie;
  r = await appel('/auth/refresh', { method: 'POST', useCookie: true });
  verifier('refresh renvoie un nouveau jeton', r.status === 200 && !!r.data.accessToken);

  // 5. Connexion professeur puis tentative de creation de compte (doit etre refusee)
  const rp = await appel('/auth/login', { method: 'POST', body: { email: 'professeur@technolab-ista.edu', motDePasse: 'Passer@123' } });
  const tokenProf = rp.data.accessToken;
  r = await appel('/auth/register', {
    method: 'POST',
    token: tokenProf,
    body: { nom: 'Test', prenom: 'Interdit', email: 'interdit@test.io', motDePasse: 'Passer@123', role: 'etudiant' },
  });
  verifier('RBAC : professeur ne peut pas creer de compte', r.status === 403, r.data?.message);

  // 6. Admin cree un compte
  const emailTest = `test.${Date.now()}@technolab-ista.edu`;
  r = await appel('/auth/register', {
    method: 'POST',
    token: tokenAdmin,
    body: { nom: 'Test', prenom: 'Compte', email: emailTest, motDePasse: 'Passer@123', role: 'etudiant' },
  });
  verifier('RBAC : admin peut creer un compte', r.status === 201, r.data?.message);

  // 7. Validation serveur
  r = await appel('/auth/register', {
    method: 'POST',
    token: tokenAdmin,
    body: { nom: 'X', prenom: 'Y', email: 'pas-un-email', motDePasse: 'court', role: 'inconnu' },
  });
  verifier('validation Zod rejette les donnees invalides', r.status === 400 && r.data.details.length >= 3,
    `${r.data?.details?.length} erreurs`);

  // 8. Jeton invalide
  r = await appel('/auth/me', { token: 'jeton.bidon.xyz' });
  verifier('jeton invalide rejete', r.status === 401);

  // 9. Mot de passe oublie + reinitialisation
  r = await appel('/auth/forgot-password', { method: 'POST', body: { email: 'etudiant@technolab-ista.edu' } });
  const resetToken = r.data?.resetToken;
  verifier('forgot-password genere un jeton (mode dev)', !!resetToken);

  r = await appel('/auth/reset-password', { method: 'POST', body: { token: resetToken, motDePasse: 'Nouveau@2026' } });
  verifier('reset-password ouvre une session', r.status === 200 && !!r.data.accessToken);

  r = await appel('/auth/login', { method: 'POST', body: { email: 'etudiant@technolab-ista.edu', motDePasse: 'Nouveau@2026' } });
  verifier('connexion avec le nouveau mot de passe', r.status === 200);

  // 10. Compte inexistant : meme reponse (pas d'enumeration)
  r = await appel('/auth/forgot-password', { method: 'POST', body: { email: 'inconnu@nulle-part.io' } });
  verifier('forgot-password ne revele pas les comptes', r.status === 200 && !r.data.resetToken);

  // 11. Ancien refresh token invalide apres rotation
  cookie = cookieAvantRotation;
  r = await appel('/auth/refresh', { method: 'POST', useCookie: true });
  verifier('ancien refresh token revoque apres rotation', r.status === 401, r.data?.message);

  console.log(`\nResultat : ${ok.length} succes, ${ko.length} echec(s)`);
  if (ko.length) console.log('Echecs :', ko);
} finally {
  // Le test de reinitialisation a change le mot de passe du compte etudiant :
  // on le remet a la valeur du seed pour ne pas casser les suites suivantes.
  try {
    const admin = await appel('/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, motDePasse: ADMIN_MDP },
    });
    const liste = await appel('/users?q=etudiant@technolab-ista.edu', { token: admin.data.accessToken });
    const cible = liste.data?.utilisateurs?.[0];
    if (cible) {
      await appel(`/users/${cible.id}/mot-de-passe`, {
        method: 'POST',
        token: admin.data.accessToken,
        body: { motDePasse: 'Passer@123' },
      });
      console.log('[nettoyage] Mot de passe du compte etudiant restaure');
    }

    // Le test de creation laisse un compte derriere lui : on le retire.
    const jetables = await appel('/users?q=test.&role=etudiant', { token: admin.data.accessToken });
    for (const compte of jetables.data?.utilisateurs || []) {
      if (compte.email.startsWith('test.')) {
        await appel(`/users/${compte.id}`, { method: 'DELETE', token: admin.data.accessToken });
      }
    }
  } catch { /* nettoyage best effort */ }

  server.close();
  process.exit(ko.length ? 1 : 0);
}
