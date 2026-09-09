/**
 * Envoi des emails transactionnels.
 *
 * Deux transports selon la configuration :
 * - SMTP reel des que SMTP_HOST est renseigne ;
 * - sinon un transport « journal » qui ecrit le message dans la console. Le
 *   developpement et les suites de tests fonctionnent ainsi sans compte SMTP,
 *   et sans jamais envoyer de courrier a de vraies adresses.
 *
 * Un echec d'envoi ne fait jamais echouer l'action metier : une reinitialisation de
 * mot de passe reste valable meme si le serveur de messagerie est indisponible.
 */
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { CID_LOGO, composerEmail, composerTexte } from './email.template.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const LOGO_MARINE = path.resolve(DOSSIER, '../marque/logo-horizontal-marine.png');

let transport = null;

/**
 * Traduit une configuration SMTP en options de transport nodemailer.
 *
 * Fonction PURE, exportee pour etre testable : elle ne lit pas l'environnement
 * et ne cree aucune connexion. La suite de tests peut donc verifier les deux
 * branches — avec et sans serveur configure — quel que soit le contenu reel du
 * fichier .env de la machine qui execute les tests. Une assertion du type
 * « aucun SMTP n'est configure ici » deviendrait fausse le jour ou la messagerie
 * passe en production, ce qui ferait echouer la suite pour une bonne nouvelle.
 *
 * @param {{host?: string, port?: number, user?: string, pass?: string}} smtp
 */
export function optionsTransport(smtp) {
  // Sans serveur declare : transport « journal », rien ne part sur le reseau.
  if (!smtp?.host) return { jsonTransport: true };

  return {
    host: smtp.host,
    // Le port 465 parle TLS des la connexion ; 587 negocie STARTTLS ensuite.
    port: smtp.port,
    secure: smtp.port === 465,
    // Un relais interne peut n'exiger aucune authentification.
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  };
}

/** Cree le transport une seule fois, a la premiere utilisation. */
function obtenirTransport() {
  if (!transport) transport = nodemailer.createTransport(optionsTransport(env.smtp));
  return transport;
}

/** L'envoi reel est-il configure ? */
export const envoiReelActif = () => Boolean(env.smtp.host);

/**
 * Envoie un email compose a partir du gabarit de la charte.
 * @returns { envoye, transport } — jamais d'exception propagee a l'appelant.
 */
export async function envoyerEmail({ destinataire, sujet, ...contenu }) {
  const message = {
    from: env.smtp.expediteur,
    to: destinataire,
    subject: sujet,
    text: composerTexte(contenu),
    html: composerEmail(contenu),
    attachments: [
      {
        filename: 'technolab-ista.png',
        path: LOGO_MARINE,
        cid: CID_LOGO, // reference par <img src="cid:..."> dans le gabarit
      },
    ],
  };

  try {
    await obtenirTransport().sendMail(message);

    if (!envoiReelActif()) {
      console.log(`[email] (non envoye, SMTP absent) « ${sujet} » -> ${destinataire}`);
    }

    return { envoye: envoiReelActif(), transport: envoiReelActif() ? 'smtp' : 'journal' };
  } catch (erreur) {
    // L'action metier a deja abouti : on trace sans interrompre.
    console.error(`[email] Echec d'envoi vers ${destinataire} :`, erreur.message);
    return { envoye: false, transport: 'echec', erreur: erreur.message };
  }
}

// ============================ Messages transactionnels ============================

/** Lien de reinitialisation du mot de passe. */
export const emailReinitialisation = ({ destinataire, prenom, lien, dureeMinutes = 30 }) =>
  envoyerEmail({
    destinataire,
    sujet: 'Reinitialisation de votre mot de passe',
    titre: 'Reinitialisation de votre mot de passe',
    intro: `Bonjour ${prenom},`,
    corps: [
      'Vous avez demande la reinitialisation du mot de passe de votre compte Technolab ISTA. '
      + 'Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
    ],
    action: { libelle: 'Choisir un nouveau mot de passe', url: lien },
    complement:
      `Ce lien expire dans ${dureeMinutes} minutes. Si vous n'etes pas a l'origine de cette demande, `
      + 'ignorez ce message : votre mot de passe actuel reste valable.',
  });

/** Identifiants d'un compte cree par l'administration. */
export const emailBienvenue = ({ destinataire, prenom, roleLabel, motDePasseProvisoire, lien }) =>
  envoyerEmail({
    destinataire,
    sujet: 'Votre compte Technolab ISTA',
    titre: 'Bienvenue sur la plateforme',
    intro: `Bonjour ${prenom},`,
    corps: [
      `Un compte <strong>${roleLabel}</strong> vient d'etre cree pour vous sur la plateforme de gestion de Technolab ISTA.`,
      `Identifiant : <strong>${destinataire}</strong><br />Mot de passe provisoire : <strong>${motDePasseProvisoire}</strong>`,
    ],
    action: { libelle: 'Me connecter', url: lien },
    complement: 'Modifiez ce mot de passe des votre premiere connexion, depuis votre profil.',
  });

/** Notification generique (absence, note publiee, paiement). */
export const emailNotification = ({ destinataire, prenom, titre, message, lien }) =>
  envoyerEmail({
    destinataire,
    sujet: titre,
    titre,
    intro: `Bonjour ${prenom},`,
    corps: [message],
    ...(lien ? { action: { libelle: 'Consulter sur la plateforme', url: lien } } : {}),
    complement: 'Vous recevez ce message car votre compte est rattache a ce dossier.',
  });
