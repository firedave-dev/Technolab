/**
 * Retrait d'un role supprime du referentiel, sur une base deja exploitee.
 *
 *     node src/seed/retirer-role.js concierge            # rapport, sans ecriture
 *     node src/seed/retirer-role.js concierge --appliquer
 *
 * POURQUOI DESACTIVER PLUTOT QUE SUPPRIMER
 *
 * Dix-huit champs d'autres collections pointent vers un utilisateur : qui a pointe
 * une absence, qui a encaisse un paiement, qui l'a valide, quel professeur tient
 * telle matiere. Effacer un compte laisserait ces references dans le vide, et la
 * piste d'audit deviendrait illisible retroactivement — on ne saurait plus qui a
 * saisi une operation comptable de l'an dernier.
 *
 * Le compte est donc mis a `actif: false` : la connexion est refusee, les droits
 * tombent, mais l'historique reste lisible. Son role est conserve tel quel, ce qui
 * documente ce qu'etait la personne au moment des operations qu'elle a saisies.
 *
 * Ces comptes portent desormais un role absent de l'enumeration du modele. C'est
 * sans consequence a la lecture — Mongoose ne valide qu'a l'ecriture — mais toute
 * modification ulterieure de la fiche echouerait tant que le role n'est pas change.
 * Le rapport le signale.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { ROLE_VALUES } from '../config/roles.js';

const [role, ...options] = process.argv.slice(2);
const appliquer = options.includes('--appliquer');

if (!role) {
  console.error('Usage : node src/seed/retirer-role.js <role> [--appliquer]');
  process.exit(1);
}

if (ROLE_VALUES.includes(role)) {
  console.error(
    `« ${role} » figure encore dans src/config/roles.js. Retirez-le du referentiel `
    + "avant d'executer cette migration, sinon de nouveaux comptes pourront etre crees."
  );
  process.exit(1);
}

await connectDB();

try {
  // `User.find` filtrerait sur l'enumeration courante, qui ne contient plus ce role :
  // on interroge donc la collection directement.
  const collection = mongoose.connection.collection('users');
  const comptes = await collection
    .find({ role })
    .project({ nom: 1, prenom: 1, email: 1, matricule: 1, actif: 1 })
    .toArray();

  if (!comptes.length) {
    console.log(`Aucun compte ne porte le role « ${role} ». Rien a faire.`);
  } else {
    console.log(`\n${comptes.length} compte(s) portant le role « ${role} » :\n`);
    for (const c of comptes) {
      const etat = c.actif === false ? 'deja desactive' : 'actif';
      console.log(`  ${(c.matricule || '—').padEnd(16)} ${c.prenom} ${c.nom} <${c.email}> — ${etat}`);
    }

    if (!appliquer) {
      console.log('\nAucune ecriture. Relancez avec --appliquer pour desactiver ces comptes.');
    } else {
      const { modifiedCount } = await collection.updateMany(
        { role, actif: { $ne: false } },
        { $set: { actif: false } }
      );
      console.log(`\n${modifiedCount} compte(s) desactive(s). L'historique est conserve.`);
      console.log(
        'Pour rendre un compte a nouveau modifiable, attribuez-lui un role du referentiel '
        + 'courant depuis la page Utilisateurs.'
      );
    }
  }
} finally {
  await mongoose.disconnect();
}
