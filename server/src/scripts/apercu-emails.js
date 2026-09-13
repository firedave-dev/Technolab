/**
 * Apercu local des emails transactionnels.
 *
 *     npm run mail:apercu
 *
 * Ecrit un fichier HTML par message dans server/apercus/, plus un sommaire.
 * RIEN N'EST ENVOYE : on compose le gabarit et on l'ecrit sur le disque.
 *
 * Pourquoi ce script existe — verifier un rendu d'email en s'envoyant des
 * messages a soi-meme est lent, pollue une boite, et consomme le quota
 * d'expedition. Ouvrir le fichier dans un navigateur suffit a controler la mise
 * en page, la fiche de pied et les couleurs.
 *
 * Ce que l'apercu NE dit PAS : le rendu reel dans Outlook, qui utilise le moteur
 * de Word et non celui du navigateur. Pour cela, il faut un envoi reel — c'est
 * la limite connue de tout apercu local.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composerEmail, composerTexte, CID_LOGO } from '../services/email.template.js';
import { sujetNotification } from '../services/email.service.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const SORTIE = path.resolve(DOSSIER, '../../apercus');
const LOGO = path.resolve(DOSSIER, '../marque/blason-sur-marine.png');

/** Les messages reellement envoyes par la plateforme. */
const MESSAGES = [
  {
    fichier: 'reinitialisation',
    sujet: 'Reinitialisation de votre mot de passe',
    contenu: {
      titre: 'Reinitialisation de votre mot de passe',
      intro: 'Bonjour Awa,',
      corps: [
        'Vous avez demande la reinitialisation du mot de passe de votre compte Technolab ISTA. '
        + 'Cliquez sur le bouton ci-dessous pour en choisir un nouveau.',
      ],
      action: { libelle: 'Choisir un nouveau mot de passe', url: 'https://technolab-ista.org/reset-password?token=apercu' },
      complement: 'Ce lien expire dans 30 minutes. Si vous n etes pas a l origine de cette demande, '
        + 'ignorez ce message : votre mot de passe actuel reste valable.',
    },
  },
  {
    fichier: 'bienvenue',
    sujet: 'Votre compte Technolab ISTA',
    contenu: {
      titre: 'Bienvenue sur la plateforme',
      intro: 'Bonjour Moussa,',
      corps: [
        'Un compte <strong>Parent</strong> vient d etre cree pour vous sur la plateforme de gestion de Technolab ISTA.',
        'Identifiant : <strong>moussa.diallo@exemple.ml</strong><br />Mot de passe provisoire : <strong>Passer@123</strong>',
      ],
      action: { libelle: 'Me connecter', url: 'https://technolab-ista.org/login' },
      complement: 'Modifiez ce mot de passe des votre premiere connexion, depuis votre profil.',
    },
  },
  {
    fichier: 'absence',
    sujet: sujetNotification('absence', 'Absence signalee'),
    contenu: {
      titre: 'Absence signalee',
      intro: 'Bonjour Moussa,',
      corps: ['Fatoumata a ete portee absente en Algorithmique le 12 septembre 2026, de 08h00 a 10h00.'],
      action: { libelle: 'Voir le releve d assiduite', url: 'https://technolab-ista.org/absences' },
      complement: 'Vous recevez ce message parce que votre compte est rattache au dossier de cet eleve. '
        + 'Un justificatif peut etre remis au surveillant.',
    },
  },
  {
    fichier: 'notes',
    sujet: sujetNotification('note', 'Nouvelles notes publiees'),
    contenu: {
      titre: 'Nouvelles notes publiees',
      intro: 'Bonjour Moussa,',
      corps: ['Les notes de Base de donnees viennent d etre publiees pour le semestre 1.'],
      action: { libelle: 'Consulter le bulletin', url: 'https://technolab-ista.org/notes' },
      complement: 'Les notes publiees restent consultables a tout moment depuis votre espace.',
    },
  },
  {
    fichier: 'rappel-echeance',
    sujet: sujetNotification('paiement', 'Echeance de scolarite en retard'),
    contenu: {
      titre: 'Echeance de scolarite en retard',
      intro: 'Bonjour Moussa,',
      corps: ['Reste a regler : 200 000 FCFA. Scolarite tranche 2 : 200 000 FCFA (echue le 15 janvier 2026).'],
      action: { libelle: 'Voir la situation financiere', url: 'https://technolab-ista.org/paiements' },
      complement: 'Ce message vaut trace du mouvement enregistre. Le recu officiel est telechargeable '
        + 'depuis votre espace.',
    },
  },
  {
    fichier: 'confirmation-paiement',
    sujet: sujetNotification('paiement', 'Paiement enregistre'),
    contenu: {
      titre: 'Paiement enregistre',
      intro: 'Bonjour Moussa,',
      corps: ['Un reglement de 200 000 FCFA a ete enregistre (recu REC-2026-A4F2).'],
      action: { libelle: 'Voir la situation financiere', url: 'https://technolab-ista.org/paiements' },
      complement: 'Ce message vaut trace du mouvement enregistre. Le recu officiel est telechargeable '
        + 'depuis votre espace.',
    },
  },
];

fs.mkdirSync(SORTIE, { recursive: true });

// Le gabarit reference le logo par `cid:` — un identifiant de piece jointe, que
// le navigateur ne sait pas resoudre. On le remplace par le fichier local, le
// temps de l'apercu seulement.
const logoLocal = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`;

const liens = [];

for (const { fichier, sujet, contenu } of MESSAGES) {
  const reel = composerEmail(contenu);
  // Le poids annonce est celui du message REEL. L'apercu est bien plus lourd,
  // le logo y etant inline en base64 au lieu d'etre joint : annoncer sa taille
  // laisserait croire a des courriers de 80 ko.
  const html = reel.replaceAll(`cid:${CID_LOGO}`, logoLocal);
  const texte = composerTexte(contenu);

  fs.writeFileSync(path.join(SORTIE, `${fichier}.html`), html, 'utf8');
  fs.writeFileSync(path.join(SORTIE, `${fichier}.txt`), texte, 'utf8');

  liens.push({ fichier, sujet, poids: Buffer.byteLength(reel) });
  console.log(`  ${fichier.padEnd(24)} ${(Buffer.byteLength(reel) / 1024).toFixed(1)} ko   « ${sujet} »`);
}

// Sommaire, pour ouvrir les six d'un seul clic.
const sommaire = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>Apercus des emails</title>
<style>
  body{font:15px system-ui,sans-serif;background:#f1f5f9;margin:0;padding:32px}
  h1{color:#2E4474;font-size:20px}
  ul{list-style:none;padding:0;max-width:640px}
  li{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px}
  a{display:flex;justify-content:space-between;gap:16px;padding:14px 18px;text-decoration:none;color:#2E4474}
  a:hover{background:#f2f9f4}
  small{color:#64748b;font-weight:400}
</style></head><body>
<h1>Apercus des emails transactionnels</h1>
<ul>
${liens.map((l) => `  <li><a href="${l.fichier}.html"><span>${l.sujet}</span>`
  + `<small>${(l.poids / 1024).toFixed(1)} ko &middot; ${l.fichier}.txt</small></a></li>`).join('\n')}
</ul>
</body></html>`;

fs.writeFileSync(path.join(SORTIE, 'index.html'), sommaire, 'utf8');

console.log(`\n  ${MESSAGES.length} apercus ecrits dans ${SORTIE}`);
console.log(`  Ouvrez ${path.join(SORTIE, 'index.html')}`);
