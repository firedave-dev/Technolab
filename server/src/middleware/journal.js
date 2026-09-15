/**
 * Consignation des actions sensibles, en un seul endroit.
 *
 * POURQUOI UN INTERGICIEL PLUTOT QU'UN APPEL DANS CHAQUE CONTROLEUR. Semer des
 * `journaliser(...)` dans quinze controleurs garantit qu'on en oubliera : les
 * actions ajoutees plus tard ne seraient pas tracees, et rien ne le signalerait.
 * Ici, toute ecriture qui aboutit passe par le meme chemin, et la table des
 * libelles ci-dessous dit en clair ce qui merite une ligne.
 *
 * REGLE : on ne consigne que les ecritures REUSSIES. Une tentative refusee
 * n'est pas une action ; l'exception est la connexion, ou l'echec est justement
 * le renseignement interessant.
 *
 * L'ECRITURE NE DOIT JAMAIS FAIRE ECHOUER L'ACTION. Une panne du journal ne
 * saurait empecher d'encaisser un paiement : l'enregistrement est detache de la
 * reponse et ses erreurs sont avalees, faute de quoi le dispositif de
 * surveillance deviendrait lui-meme une cause de panne.
 */
import { Journal } from '../models/Journal.js';

/**
 * Table des actions dignes du journal.
 *
 * Les motifs s'appliquent au chemin SANS le prefixe /api. Le premier qui
 * correspond gagne, d'ou l'ordre : les cas particuliers avant les regles larges.
 */
const ACTIONS = [
  // --- Comptes et acces
  { m: 'POST', re: /^\/auth\/login$/, action: 'connexion', domaine: 'Accès',
    libelle: (r, ok) => (ok ? 'Connexion à la plateforme' : 'Tentative de connexion échouée') },
  { m: 'POST', re: /^\/auth\/logout$/, action: 'deconnexion', domaine: 'Accès',
    libelle: () => 'Déconnexion' },
  { m: 'POST', re: /^\/auth\/mot-de-passe-oublie$/, action: 'motdepasse.demande', domaine: 'Accès',
    libelle: () => 'Demande de réinitialisation de mot de passe' },
  { m: 'POST', re: /^\/auth\/reset-password/, action: 'motdepasse.reinitialise', domaine: 'Accès',
    libelle: () => 'Mot de passe réinitialisé' },
  { m: 'PATCH', re: /^\/auth\/mot-de-passe$/, action: 'motdepasse.change', domaine: 'Accès',
    libelle: () => 'Changement de son propre mot de passe' },

  // --- Utilisateurs
  { m: 'POST', re: /^\/users$/, action: 'user.creer', domaine: 'Comptes',
    libelle: () => 'Création d’un compte' },
  { m: 'PATCH', re: /^\/users\/[^/]+$/, action: 'user.modifier', domaine: 'Comptes',
    libelle: () => 'Modification d’un compte' },
  { m: 'DELETE', re: /^\/users\/[^/]+$/, action: 'user.supprimer', domaine: 'Comptes',
    libelle: () => 'Suppression d’un compte' },
  { m: 'POST', re: /^\/etudiants$/, action: 'etudiant.inscrire', domaine: 'Comptes',
    libelle: () => 'Inscription d’un étudiant' },
  { m: 'PATCH', re: /^\/etudiants\/[^/]+$/, action: 'etudiant.modifier', domaine: 'Comptes',
    libelle: () => 'Modification d’un dossier étudiant' },

  // --- Notes : le coeur du dispositif
  { m: 'PUT', re: /^\/notes\/grille$/, action: 'note.enregistrer', domaine: 'Notes',
    libelle: (r) => `Enregistrement de ${r.body?.lignes?.length ?? '?'} ligne(s) de notes` },
  { m: 'PATCH', re: /^\/notes\/publication$/, action: 'note.publier', domaine: 'Notes',
    libelle: () => 'Publication ou retrait de publication d’une grille de notes' },

  // --- Structure pedagogique
  { m: 'POST', re: /^\/classes$/, action: 'classe.creer', domaine: 'Scolarité',
    libelle: () => 'Création d’une classe' },
  { m: 'PATCH', re: /^\/classes\/[^/]+$/, action: 'classe.modifier', domaine: 'Scolarité',
    libelle: () => 'Modification d’une classe' },
  { m: 'DELETE', re: /^\/classes\/[^/]+$/, action: 'classe.supprimer', domaine: 'Scolarité',
    libelle: () => 'Suppression d’une classe' },
  { m: 'POST', re: /^\/matieres$/, action: 'matiere.creer', domaine: 'Scolarité',
    libelle: (r) => `Création de la matière « ${r.body?.nom ?? '?'} »` },
  { m: 'PATCH', re: /^\/matieres\/[^/]+$/, action: 'matiere.modifier', domaine: 'Scolarité',
    libelle: () => 'Modification d’une matière' },
  { m: 'DELETE', re: /^\/matieres\/[^/]+$/, action: 'matiere.supprimer', domaine: 'Scolarité',
    libelle: () => 'Suppression d’une matière' },
  { m: 'POST', re: /^\/ue\/apparier/, action: 'ue.apparier', domaine: 'Scolarité',
    libelle: () => 'Constitution automatique des unités d’enseignement' },
  { m: 'POST', re: /^\/ue$/, action: 'ue.creer', domaine: 'Scolarité',
    libelle: () => 'Création d’une unité d’enseignement' },
  { m: 'PATCH', re: /^\/ue\/[^/]+$/, action: 'ue.modifier', domaine: 'Scolarité',
    libelle: () => 'Modification d’une unité d’enseignement' },
  { m: 'DELETE', re: /^\/ue\/[^/]+$/, action: 'ue.supprimer', domaine: 'Scolarité',
    libelle: () => 'Suppression d’une unité d’enseignement' },

  // --- Vie scolaire
  { m: 'POST', re: /^\/absences/, action: 'absence.saisir', domaine: 'Vie scolaire',
    libelle: () => 'Saisie d’absences' },
  { m: 'PATCH', re: /^\/absences\/[^/]+$/, action: 'absence.modifier', domaine: 'Vie scolaire',
    libelle: () => 'Modification d’une absence' },
  { m: 'POST', re: /^\/planning$/, action: 'planning.ajouter', domaine: 'Vie scolaire',
    libelle: () => 'Ajout d’un créneau à l’emploi du temps' },
  { m: 'PATCH', re: /^\/planning\/[^/]+$/, action: 'planning.modifier', domaine: 'Vie scolaire',
    libelle: () => 'Modification d’un créneau' },
  { m: 'DELETE', re: /^\/planning\/[^/]+$/, action: 'planning.supprimer', domaine: 'Vie scolaire',
    libelle: () => 'Suppression d’un créneau' },

  // --- Comptabilite
  { m: 'POST', re: /^\/paiements$/, action: 'paiement.encaisser', domaine: 'Comptabilité',
    libelle: () => 'Encaissement d’un paiement' },
  { m: 'PATCH', re: /^\/paiements\/[^/]+\/annuler$/, action: 'paiement.annuler', domaine: 'Comptabilité',
    libelle: () => 'Annulation d’un paiement' },
  { m: 'POST', re: /^\/frais/, action: 'frais.definir', domaine: 'Comptabilité',
    libelle: () => 'Définition de frais de scolarité' },
  { m: 'PATCH', re: /^\/frais\/[^/]+$/, action: 'frais.modifier', domaine: 'Comptabilité',
    libelle: () => 'Modification de frais de scolarité' },
  { m: 'POST', re: /^\/echeances/, action: 'echeance.generer', domaine: 'Comptabilité',
    libelle: () => 'Génération d’un échéancier' },
];

/** Cherche la description d'une action, ou `null` si elle ne merite pas de ligne. */
function decrire(methode, chemin) {
  return ACTIONS.find((a) => a.m === methode && a.re.test(chemin)) || null;
}

/** Dernier segment du chemin, quand il ressemble a un identifiant. */
function cibleDe(chemin) {
  const segments = chemin.split('/').filter(Boolean);
  const dernier = segments[segments.length - 1];
  return /^[0-9a-f]{24}$/i.test(dernier) ? dernier : undefined;
}

export function journaliser(req, res, suite) {
  const description = decrire(req.method, req.path);
  if (!description) return suite();

  // `finish` se declenche une fois la reponse partie : on connait alors son
  // code, et le journal n'ajoute aucun delai a ce que voit l'utilisateur.
  res.on('finish', () => {
    const reussi = res.statusCode >= 200 && res.statusCode < 400;

    // Seule la connexion merite d'etre tracee quand elle echoue.
    if (!reussi && description.action !== 'connexion') return;

    const acteur = req.user;
    Journal.create({
      acteur: acteur?._id,
      acteurNom: acteur ? `${acteur.prenom} ${acteur.nom}` : (req.body?.email || 'Visiteur'),
      acteurRole: acteur?.role || 'anonyme',
      action: description.action,
      libelle: description.libelle(req, reussi),
      domaine: description.domaine,
      methode: req.method,
      chemin: req.originalUrl.split('?')[0].slice(0, 200),
      statut: res.statusCode,
      cible: cibleDe(req.path),
      adresseIp: req.ip,
    }).catch((erreur) => {
      // Le journal ne doit jamais faire tomber l'application qu'il observe.
      console.error(`[journal] Ecriture impossible : ${erreur.message}`);
    });
  });

  return suite();
}
