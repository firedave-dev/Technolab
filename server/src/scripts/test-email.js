/**
 * Envoi reel d'un email de controle.
 *
 *     npm run mail:test -- vous@exemple.com
 *
 * A la difference de `npm run mail:apercu`, qui ecrit des fichiers sans rien
 * emettre, CE SCRIPT ENVOIE VRAIMENT. Il sert a verifier la chaine complete :
 * cle d'API valide, domaine verifie chez Resend, SPF et DKIM en place, et rendu
 * du logo inline dans un vrai client de messagerie.
 *
 * Il emprunte exactement le meme chemin que les messages de la plateforme —
 * meme gabarit, meme expediteur, meme adresse de reponse. Un controle qui
 * passerait par un chemin different ne prouverait rien.
 */
import { envoyerEmail, envoiReelActif, composerExpediteur } from '../services/email.service.js';
import { env } from '../config/env.js';

const destinataire = process.argv[2];

if (!destinataire || !destinataire.includes('@')) {
  console.error('Usage : npm run mail:test -- vous@exemple.com');
  process.exit(1);
}

console.log('  Expediteur   :', composerExpediteur(env.smtp) || '(non configure)');
console.log('  Reponse vers :', env.smtp.repondreA || '(aucune)');
console.log('  Destinataire :', destinataire);
console.log('  Mode         :', envoiReelActif() ? 'envoi reel' : 'DEGRADE (RESEND_API_KEY absente)');
console.log('');

if (!envoiReelActif()) {
  console.warn('  Aucun envoi ne sera effectue : renseignez RESEND_API_KEY dans .env.');
}

const resultat = await envoyerEmail({
  destinataire,
  sujet: '[Test] Chaine d envoi TechnoLAB-ISTA',
  titre: 'Test de la chaine d envoi',
  intro: 'Bonjour,',
  corps: [
    'Ce message confirme que la plateforme sait emettre du courrier : cle d API valide, '
    + 'domaine verifie, signature en place.',
    'Verifiez trois points : le <strong>blason</strong> s affiche en en-tete, la fiche de '
    + 'l etablissement figure en pied, et une reponse a ce message arrive bien sur la boite '
    + 'relevee.',
  ],
  action: { libelle: 'Ouvrir la plateforme', url: env.clientUrl },
  complement: 'Message de controle technique, sans valeur administrative.',
});

console.log('');
console.log('  Resultat :', JSON.stringify(resultat));

/*
 * Le code de sortie distingue les deux situations : un envoi refuse doit faire
 * echouer un enchainement de commandes, alors que le mode degrade est un
 * reglage volontaire et non une panne.
 */
if (resultat.envoye) {
  console.log('  Envoi accepte par Resend. Verifiez la reception, y compris les indesirables.');
  process.exit(0);
}

if (resultat.transport === 'journal') {
  console.log('  Mode degrade : rien n a ete emis, comme attendu sans cle.');
  process.exit(0);
}

console.error(`  ECHEC : ${resultat.erreur}`);
process.exit(1);
