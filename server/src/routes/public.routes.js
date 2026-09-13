/**
 * Documents publics : servis SANS authentification.
 *
 * Pourquoi les heberger plutot que de pointer vers le site institutionnel :
 * un lien externe casse le jour ou l'autre site est refait, et personne ne s'en
 * apercoit avant qu'un candidat ne se plaigne. Le fichier suit le deploiement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { fileURLToPath } from 'node:url';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));

/**
 * Emplacement des documents telechargeables.
 *
 * Volontairement HORS du dossier public du client : ces fichiers sont servis
 * par l'API, qui peut donc les compter, les restreindre ou les remplacer sans
 * reconstruire le front.
 */
const DOCUMENTS = path.resolve(DOSSIER, '../documents');

/** Catalogue des documents servis, et leur nom de telechargement. */
const CATALOGUE = {
  'fiche-inscription': {
    fichier: 'Fiche_inscription.pdf',
    nomTelecharge: 'fiche-inscription-technolab-ista.pdf',
    libelle: 'Fiche d’inscription',
  },
};

const cheminDe = (cle) => path.join(DOCUMENTS, CATALOGUE[cle].fichier);

const router = Router();

/**
 * GET /api/public/documents — ce qui est reellement disponible.
 *
 * La page Admissions s'en sert pour n'afficher le bouton QUE si le fichier est
 * en place. Un lien de telechargement qui renvoie une erreur fait plus de tort
 * qu'un bouton absent : le candidat croit que le site est casse.
 */
router.get('/documents', (req, res) => {
  res.json({
    success: true,
    documents: Object.entries(CATALOGUE).map(([cle, { libelle }]) => ({
      cle,
      libelle,
      disponible: fs.existsSync(cheminDe(cle)),
      url: `/api/public/${cle}`,
    })),
  });
});

/** GET /api/public/fiche-inscription — le formulaire a remplir et deposer. */
router.get('/fiche-inscription', catchAsync(async (req, res) => {
  const { fichier, nomTelecharge } = CATALOGUE['fiche-inscription'];
  const chemin = cheminDe('fiche-inscription');

  if (!fs.existsSync(chemin)) {
    throw ApiError.notFound(
      `Fiche d'inscription indisponible : deposez ${fichier} dans server/src/documents/.`
    );
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nomTelecharge}"`);
  fs.createReadStream(chemin).pipe(res);
}));

export default router;
