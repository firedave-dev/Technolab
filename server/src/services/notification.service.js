/**
 * Creation des notifications internes, et relais par email quand la situation le justifie.
 *
 * L'email n'est PAS systematique : `email: true` doit etre demande explicitement.
 * Publier les notes d'une classe de quarante eleves creerait quatre-vingts
 * notifications — pertinentes dans l'application, mais une avalanche par courrier.
 * Sont relayes par email les evenements qu'une famille doit connaitre le jour meme :
 * absences et mouvements de paiement.
 */
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { emailNotification } from './email.service.js';

/**
 * Cree une notification pour chaque destinataire.
 * @param contenu.email  relaie aussi le message par courrier electronique
 */
export async function notifier(destinataires, { email = false, ...contenu }) {
  const ids = (Array.isArray(destinataires) ? destinataires : [destinataires]).filter(Boolean);
  if (!ids.length) return [];

  const creees = await Notification.insertMany(
    ids.map((destinataire) => ({ destinataire, ...contenu }))
  );

  if (email) await relayerParEmail(ids, contenu);

  return creees;
}

/**
 * Previent les parents d'un etudiant, et l'etudiant lui-meme.
 * Utilise pour les absences, la publication des notes et les paiements.
 */
export async function notifierParents(etudiantId, contenu) {
  const etudiant = await User.findById(etudiantId).select('parents prenom nom').lean();
  if (!etudiant) return [];

  return notifier([...(etudiant.parents || []), etudiant._id], contenu);
}

/**
 * Envoie le message aux comptes actifs disposant d'une adresse.
 * Les echecs sont journalises par le service d'email et n'interrompent jamais l'appelant.
 */
async function relayerParEmail(ids, { titre, message, lien, type }) {
  const destinataires = await User.find({ _id: { $in: ids }, actif: true })
    .select('email prenom')
    .lean();

  await Promise.all(
    destinataires.map((u) =>
      emailNotification({
        destinataire: u.email,
        prenom: u.prenom,
        titre,
        message,
        // Choisit l'habillage : prefixe d'objet, libelle du bouton, phrase de pied.
        type,
        lien: lien ? `${env.clientUrl}${lien}` : undefined,
      })
    )
  );
}
