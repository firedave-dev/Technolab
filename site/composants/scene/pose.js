/**
 * Reglages de pose partages par la scene et son repli.
 *
 * CE MODULE N'IMPORTE RIEN. C'est sa raison d'etre : la constante ci-dessous est
 * lue a la fois par l'orchestrateur du hero — charge sur toutes les visites — et
 * par le modele 3D, qui tire `three` derriere lui. Si le premier importait le
 * second pour une simple valeur numerique, le moteur 3D entier repartirait dans
 * le lot principal, et l'isolation du chunk tomberait sans que rien ne le
 * signale.
 */

/**
 * Ouverture de l'ecran en haut de page, entre 0 (rabattu) et 1 (ouvert).
 *
 * Deux choses doivent s'accorder sur cette valeur : la position de depart du
 * defilement, et la pose que prend le modele en mode fige — celle dont l'image
 * de repli est tiree. Si elles divergent, le remplacement de l'image par la
 * scene produit un saut visible, au moment precis ou l'on cherche a le rendre
 * imperceptible.
 *
 * Un portable entierement ferme n'etant qu'une plaque, on part deja entrouvert :
 * l'objet doit se reconnaitre avant meme le premier defilement.
 */
export const OUVERTURE_INITIALE = 0.35;

/** Course de defilement necessaire a l'ouverture complete, en hauteurs d'ecran. */
export const COURSE = 0.6;
