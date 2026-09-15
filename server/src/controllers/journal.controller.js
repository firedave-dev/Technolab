/**
 * Lecture du journal des actions.
 *
 * CONSULTATION SEULE, ET RESERVEE A LA DIRECTION. Aucune route n'ecrit, ne
 * modifie ni ne supprime une entree : un journal qu'on peut retoucher ne prouve
 * plus rien. Les lignes disparaissent d'elles-memes au bout de deux ans, par
 * expiration posee sur la collection.
 */
import { Journal } from '../models/Journal.js';
import { catchAsync } from '../utils/catchAsync.js';

/** GET /api/journal — dernieres actions, filtrables. */
export const lister = catchAsync(async (req, res) => {
  const {
    page = 1, limite = 50, domaine, acteur, action, recherche, depuis, jusqua,
  } = req.query;

  const filtre = {};
  if (domaine) filtre.domaine = domaine;
  if (acteur) filtre.acteur = acteur;
  if (action) filtre.action = action;

  if (depuis || jusqua) {
    filtre.createdAt = {};
    if (depuis) filtre.createdAt.$gte = new Date(depuis);
    // Une date de fin s'entend inclusivement : « jusqu'au 12 » couvre le 12
    // entier, et non l'instant zero de cette journee.
    if (jusqua) {
      const fin = new Date(jusqua);
      fin.setHours(23, 59, 59, 999);
      filtre.createdAt.$lte = fin;
    }
  }

  if (recherche) {
    const motif = new RegExp(String(recherche).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filtre.$or = [{ acteurNom: motif }, { libelle: motif }];
  }

  const pageCourante = Math.max(1, Number(page));
  const parPage = Math.min(200, Math.max(1, Number(limite)));

  const [entrees, total] = await Promise.all([
    Journal.find(filtre)
      .sort({ createdAt: -1 })
      .skip((pageCourante - 1) * parPage)
      .limit(parPage)
      .lean(),
    Journal.countDocuments(filtre),
  ]);

  res.json({
    success: true,
    entrees,
    pagination: {
      page: pageCourante,
      limite: parPage,
      total,
      pages: Math.ceil(total / parPage) || 1,
    },
  });
});

/**
 * GET /api/journal/domaines — valeurs disponibles pour les filtres.
 *
 * Les listes sont tirees du journal lui-meme plutot que d'une enumeration
 * figee : un filtre qui propose un domaine dont aucune ligne n'existe fait
 * perdre du temps, et un domaine ajoute plus tard apparaitrait de lui-meme.
 */
export const domaines = catchAsync(async (req, res) => {
  const [listeDomaines, listeActions] = await Promise.all([
    Journal.distinct('domaine'),
    Journal.distinct('action'),
  ]);
  res.json({
    success: true,
    domaines: listeDomaines.filter(Boolean).sort(),
    actions: listeActions.filter(Boolean).sort(),
  });
});
