/**
 * Envoi des emails transactionnels, via l'API Resend.
 *
 * Deux modes selon la configuration :
 * - envoi reel des que RESEND_API_KEY est renseignee ;
 * - sinon un mode DEGRADE qui journalise le message sans rien emettre. Le
 *   developpement et les suites de tests fonctionnent ainsi sans compte, et
 *   sans jamais ecrire a de vraies adresses.
 *
 * Un echec d'envoi ne fait JAMAIS echouer l'action metier : une reinitialisation
 * de mot de passe reste valable, un paiement reste enregistre, meme si la
 * messagerie est indisponible. C'est la raison d'etre du try/catch final.
 *
 * ISOLATION DU TRANSPORT — seul ce fichier connait Resend. Les gabarits
 * (email.template.js) et les declencheurs (controleurs, notification.service)
 * l'ignorent entierement : changer de fournisseur ne demande de reecrire que la
 * fonction `emettre` ci-dessous. C'est ce qui a permis de passer de nodemailer
 * SMTP a Resend sans toucher une seule ligne de logique metier.
 */
import { Resend } from 'resend';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { CID_LOGO, composerEmail, composerTexte } from './email.template.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const LOGO_MARINE = path.resolve(DOSSIER, '../marque/blason-sur-marine.png');

let client = null;
let logoEncode = null;

/**
 * Logo encode en base64, lu une seule fois puis conserve.
 *
 * Resend attend le CONTENU de la piece jointe, la ou nodemailer acceptait un
 * chemin. Le relire a chaque message ferait un acces disque par destinataire :
 * une publication de notes pour quarante familles en ferait quarante.
 */
function logoEnBase64() {
  if (logoEncode === null) logoEncode = readFileSync(LOGO_MARINE).toString('base64');
  return logoEncode;
}

/**
 * Compose l'en-tete `From` a partir de la configuration.
 *
 * Fonction PURE, exportee pour etre testable : elle ne lit pas l'environnement.
 *
 * Elle accepte les DEUX ecritures de SMTP_FROM, l'adresse nue comme le couple
 * « Nom <adresse> » deja forme. Un fichier .env herite de la configuration SMTP
 * precedente porte la seconde forme ; la recomposer aveuglement produirait
 * « TechnoLAB-ISTA <TechnoLAB-ISTA <mails@...>> », que Resend rejetterait.
 *
 * @param {{nomExpediteur?: string, adresseExpediteur?: string}} config
 */
export function composerExpediteur(config = {}) {
  const adresse = (config.adresseExpediteur || '').trim();
  if (!adresse) return '';

  // Deja sous la forme « Nom <adresse> » : on la respecte telle quelle.
  if (adresse.includes('<')) return adresse;

  const nom = (config.nomExpediteur || '').trim();
  return nom ? `${nom} <${adresse}>` : adresse;
}

/**
 * Mode d'envoi deduit de la configuration.
 *
 * Fonction PURE et exportee, pour la meme raison que ci-dessus : la suite de
 * tests doit pouvoir eprouver les deux branches quel que soit le contenu reel
 * du .env de la machine qui l'execute. Une assertion du type « aucune cle n'est
 * configuree ici » deviendrait fausse le jour ou la messagerie passe en
 * production, et ferait echouer la suite pour une bonne nouvelle.
 *
 * @returns {'resend'|'journal'}
 */
export const modeEnvoi = (config = {}) => (config.cleApi ? 'resend' : 'journal');

/** L'envoi reel est-il configure ? */
export const envoiReelActif = () => modeEnvoi(env.smtp) === 'resend';

/** Cree le client une seule fois, a la premiere utilisation. */
function obtenirClient() {
  if (!client) client = new Resend(env.smtp.cleApi);
  return client;
}

/**
 * Emet le message aupres du fournisseur.
 *
 * Isolee du reste pour rester le SEUL point a reecrire en cas de changement de
 * fournisseur — et pour que les tests puissent l'eprouver sans reseau.
 */
async function emettre(message) {
  return interpreterReponse(await obtenirClient().emails.send(message));
}

/**
 * Traduit une reponse Resend en resultat exploitable.
 *
 * Fonction PURE et exportee : c'est ce qui permet d'eprouver le cas d'erreur
 * sans reseau ni bibliotheque de simulation. Le point important qu'elle capture
 * est que RESEND NE LEVE PAS sur un refus applicatif — adresse invalide,
 * domaine non verifie, quota depasse — il renvoie un objet dont seul `error`
 * est renseigne. Un code qui ne surveillerait que l'exception compterait ces
 * refus comme des envois reussis.
 *
 * @param {{data?: {id?: string}, error?: {message?: string}}} reponse
 */
export function interpreterReponse(reponse = {}) {
  const { data, error } = reponse;

  if (error) {
    return { envoye: false, transport: 'echec', erreur: error.message || String(error) };
  }

  return { envoye: true, transport: 'resend', id: data?.id ?? null };
}

/**
 * Envoie un email compose a partir du gabarit de la charte.
 *
 * @returns {{envoye: boolean, transport: string, id?: string, erreur?: string}}
 *          jamais d'exception propagee a l'appelant.
 */
export async function envoyerEmail({ destinataire, sujet, ...contenu }) {
  const message = {
    from: composerExpediteur(env.smtp),
    // Les reponses partent vers une boite relevee, pas vers l'adresse d'envoi.
    ...(env.smtp.repondreA ? { replyTo: env.smtp.repondreA } : {}),
    to: destinataire,
    subject: sujet,
    text: composerTexte(contenu),
    html: composerEmail(contenu),
    attachments: [
      {
        filename: 'technolab-ista.png',
        content: logoEnBase64(),
        // Rend la piece jointe INLINE : le gabarit la reference par
        // <img src="cid:..."> et elle s'affiche meme quand le client bloque
        // les images distantes.
        contentId: CID_LOGO,
        contentType: 'image/png',
      },
    ],
  };

  // --- Mode degrade : rien ne part sur le reseau ---
  if (!envoiReelActif()) {
    console.warn(`[email] RESEND_API_KEY absente — « ${sujet} » non envoye a ${destinataire}`);
    return { envoye: false, transport: 'journal' };
  }

  // Un destinataire vide ne vaut pas un aller-retour reseau, et Resend le
  // refuserait de toute facon.
  if (!destinataire) {
    console.error('[email] Destinataire vide : envoi abandonne');
    return { envoye: false, transport: 'echec', erreur: 'Destinataire vide' };
  }

  try {
    const resultat = await emettre(message);

    if (resultat.envoye) {
      console.log(`[email] Envoye a ${destinataire} (id ${resultat.id})`);
    } else {
      console.error(`[email] Refus de Resend pour ${destinataire} : ${resultat.erreur}`);
    }
    return resultat;
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

/**
 * Habillage propre a chaque nature de notification.
 *
 * Plutot que quatre fonctions quasi identiques, une seule table : ce qui change
 * d'un evenement a l'autre tient au prefixe d'objet, au libelle du bouton et a
 * la phrase de pied. Le reste — en-tete, fiche institutionnelle, version texte —
 * est commun, et le rester garantit qu'un correctif de gabarit profite aux
 * quatre.
 *
 * Le PREFIXE D'OBJET compte plus qu'il n'y parait : les messageries regroupent
 * par sujet, et une famille qui recoit « Absence » puis « Paiement » distingue
 * d'un coup d'oeil ce qui appelle une reaction de ce qui est une simple trace.
 */
const HABILLAGE = {
  absence: {
    prefixe: 'Absence',
    bouton: 'Voir le releve d assiduite',
    pied: 'Vous recevez ce message parce que votre compte est rattache au dossier de cet eleve. '
      + 'Un justificatif peut etre remis au surveillant.',
  },
  note: {
    prefixe: 'Notes',
    bouton: 'Consulter le bulletin',
    pied: 'Les notes publiees restent consultables a tout moment depuis votre espace.',
  },
  paiement: {
    prefixe: 'Scolarite',
    bouton: 'Voir la situation financiere',
    pied: 'Ce message vaut trace du mouvement enregistre. Le recu officiel est telechargeable '
      + 'depuis votre espace.',
  },
  examen: {
    prefixe: 'Examens',
    bouton: 'Voir le calendrier',
    pied: 'Le calendrier des epreuves peut etre ajuste : cet espace fait foi.',
  },
  information: {
    prefixe: null,
    bouton: 'Consulter sur la plateforme',
    pied: 'Vous recevez ce message car votre compte est rattache a ce dossier.',
  },
};

/**
 * Objet du message, prefixe selon la nature de l'evenement.
 *
 * Fonction PURE et exportee : c'est la seule facon d'eprouver la regle sans
 * declencher d'envoi. Une nature inconnue retombe sur l'habillage generique
 * plutot que d'echouer — un type ajoute au modele ne doit pas casser les envois.
 */
export const sujetNotification = (type, titre) => {
  const { prefixe } = HABILLAGE[type] ?? HABILLAGE.information;
  return prefixe ? `[${prefixe}] ${titre}` : titre;
};

/**
 * Notification relayee par email (absence, note publiee, paiement, examen).
 * @param type  nature de l'evenement, qui choisit l'habillage ci-dessus
 */
export const emailNotification = ({ destinataire, prenom, titre, message, lien, type }) => {
  const { bouton, pied } = HABILLAGE[type] ?? HABILLAGE.information;

  return envoyerEmail({
    destinataire,
    sujet: sujetNotification(type, titre),
    titre,
    intro: `Bonjour ${prenom},`,
    corps: [message],
    ...(lien ? { action: { libelle: bouton, url: lien } } : {}),
    complement: pied,
  });
};
