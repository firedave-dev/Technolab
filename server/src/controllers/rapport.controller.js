/**
 * Rapports de direction : consultation a l'ecran et telechargement en PDF.
 *
 * Les deux formats partagent EXACTEMENT la meme source : le PDF n'est pas une
 * seconde implementation, c'est la mise en page du meme objet. Deux calculs
 * distincts finiraient par donner deux chiffres differents pour la meme
 * question, et c'est precisement ce qu'un rapport de direction ne peut pas se
 * permettre.
 */
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { PERIODES } from '../services/periode.service.js';
import { RAPPORTS, produire } from '../services/rapports.service.js';
import { genererRapportPDF } from '../services/rapportPdf.service.js';

/** Options communes, lues dans la requete. */
function options(req) {
  const { periode = 'mensuel', reference, anneeScolaire, classe, semestre } = req.query;

  if (!PERIODES.includes(periode)) {
    throw ApiError.badRequest(`Periode inconnue : ${periode}. Attendu : ${PERIODES.join(', ')}`);
  }

  const date = reference ? new Date(reference) : new Date();
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Date de reference invalide');

  return { periode, reference: date, anneeScolaire, classe, semestre };
}

function verifierCle(cle) {
  if (!RAPPORTS.some((r) => r.cle === cle)) {
    throw ApiError.notFound(`Rapport inconnu : ${cle}`);
  }
}

/** GET /api/rapports — catalogue des rapports et des periodes disponibles. */
export const catalogue = catchAsync(async (req, res) => {
  res.json({ success: true, rapports: RAPPORTS, periodes: PERIODES });
});

/** GET /api/rapports/:cle — donnees du rapport, pour affichage. */
export const consulter = catchAsync(async (req, res) => {
  verifierCle(req.params.cle);
  res.json({ success: true, rapport: await produire(req.params.cle, options(req)) });
});

/** GET /api/rapports/:cle/pdf — meme rapport, mis en page. */
export const telecharger = catchAsync(async (req, res) => {
  verifierCle(req.params.cle);
  const rapport = await produire(req.params.cle, options(req));

  const nom = `${rapport.titre} - ${rapport.periode}`
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nom}.pdf"`);
  genererRapportPDF(rapport, res);
});
