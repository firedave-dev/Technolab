/**
 * Declenchement quotidien de la sauvegarde.
 *
 * POURQUOI PAS DE BIBLIOTHEQUE D'ORDONNANCEMENT. Le besoin tient en quinze
 * lignes : une tache, une fois par jour, a heure fixe. Ajouter une dependance
 * pour cela reviendrait a faire entrer du code tiers — et ses mises a jour —
 * dans un serveur qui manipule des donnees d'etudiants, sans rien gagner.
 *
 * `setTimeout` RECALCULE PLUTOT QUE `setInterval`. Un intervalle de 24 heures
 * derive : il se decale un peu a chaque execution, et l'heure de passage finit
 * par tomber en pleine journee. On vise donc la prochaine occurrence, puis on
 * recalcule apres coup.
 */
import { env } from '../config/env.js';
import {
  executerSauvegarde, historiqueSauvegardes, prochaineExecution,
  rattrapageNecessaire, sauvegardeConfiguree,
} from './sauvegarde.service.js';

let minuterie = null;

/** Delai avant le rattrapage au demarrage : laisse le serveur se poser. */
const DELAI_RATTRAPAGE = 60_000;

function programmer() {
  const maintenant = new Date();
  const cible = prochaineExecution(maintenant, env.sauvegarde.heure);
  const delai = cible - maintenant;

  clearTimeout(minuterie);
  minuterie = setTimeout(async () => {
    await executerSauvegarde({ declencheur: 'automatique' });
    programmer();   // on se replace sur l'occurrence suivante
  }, delai);

  // `unref` empeche la minuterie de retenir le processus : un arret demande
  // n'a pas a patienter jusqu'a 2 h du matin.
  minuterie.unref?.();

  const heures = Math.round(delai / 360000) / 10;
  console.log(
    `[sauvegarde] Prochaine execution : ${cible.toLocaleString('fr-FR')} (dans ${heures} h)`
  );
}

/**
 * Met en place la sauvegarde quotidienne.
 * Sans URI de destination, la fonction se contente de le signaler.
 */
export async function demarrerOrdonnanceur() {
  if (!sauvegardeConfiguree()) {
    console.log('[sauvegarde] Desactivee : MONGODB_SAUVEGARDE_URI n est pas renseignee.');
    return;
  }

  console.log(
    `[sauvegarde] Active — chaque jour a ${String(env.sauvegarde.heure).padStart(2, '0')} h, `
    + `${env.sauvegarde.retention} jours conserves.`
  );

  programmer();

  /*
   * Rattrapage.
   *
   * Un hebergement qui redeploie le serveur plusieurs fois par jour peut le
   * redemarrer systematiquement AVANT l'heure prevue : la minuterie serait
   * alors remise a zero chaque fois et ne se declencherait jamais. On verifie
   * donc au demarrage qu'une sauvegarde de moins de 24 heures existe.
   */
  try {
    const historique = await historiqueSauvegardes(5);
    const derniere = historique.find((e) => e.statut === 'reussie');

    if (rattrapageNecessaire(derniere?.date, new Date())) {
      console.log('[sauvegarde] Aucune sauvegarde recente : rattrapage dans une minute.');
      const rattrapage = setTimeout(
        () => executerSauvegarde({ declencheur: 'rattrapage' }),
        DELAI_RATTRAPAGE
      );
      rattrapage.unref?.();
    }
  } catch (erreur) {
    console.error(`[sauvegarde] Verification au demarrage impossible : ${erreur.message}`);
  }
}

/** Arrete l'ordonnanceur (utilise par les tests et a l'extinction). */
export function arreterOrdonnanceur() {
  clearTimeout(minuterie);
  minuterie = null;
}
