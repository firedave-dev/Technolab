/**
 * Bulletins : moyennes par matiere, moyenne generale, rang.
 * Rien n'est stocke, tout est recalcule a partir des notes (voir scolarite.service.js).
 */
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';
import { calculerBulletin, verifierAccesEtudiant } from '../services/scolarite.service.js';

/** GET /api/bulletins/:id — bulletin d'un etudiant */
export const bulletinEtudiant = catchAsync(async (req, res) => {
  await verifierAccesEtudiant(req.user, req.params.id);

  // Le personnel voit aussi les evaluations non encore publiees (bulletin provisoire).
  const inclureNonPubliees = STAFF_ROLES.includes(req.user.role);

  const bulletin = await calculerBulletin(req.params.id, {
    periode: req.query.periode,
    inclureNonPubliees,
  });

  res.json({ success: true, bulletin, provisoire: inclureNonPubliees });
});

/** GET /api/bulletins/classe/:id — releve des moyennes de toute une classe */
export const releveClasse = catchAsync(async (req, res) => {
  const etudiants = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': req.params.id })
    .sort('nom prenom')
    .select('nom prenom matricule')
    .lean();

  if (!etudiants.length) throw ApiError.notFound('Aucun etudiant dans cette classe');

  // Le rang est identique pour tous : on le calcule une fois par etudiant via le service.
  const lignes = [];
  for (const etudiant of etudiants) {
    const bulletin = await calculerBulletin(etudiant._id, {
      periode: req.query.periode,
      inclureNonPubliees: true,
    });

    lignes.push({
      etudiant: { id: etudiant._id, nomComplet: `${etudiant.prenom} ${etudiant.nom}`, matricule: etudiant.matricule },
      moyenneGenerale: bulletin.moyenneGenerale,
      mention: bulletin.mention,
      rang: bulletin.rang,
      matieres: bulletin.matieres.map((m) => ({ nom: m.matiere.nom, code: m.matiere.code, moyenne: m.moyenne })),
    });
  }

  const moyennes = lignes.map((l) => l.moyenneGenerale).filter((m) => m !== null);

  res.json({
    success: true,
    releve: lignes.sort((a, b) => (b.moyenneGenerale ?? -1) - (a.moyenneGenerale ?? -1)),
    statistiques: {
      effectif: etudiants.length,
      notes: moyennes.length,
      moyenneClasse: moyennes.length
        ? Math.round((moyennes.reduce((s, m) => s + m, 0) / moyennes.length) * 100) / 100
        : null,
      admis: moyennes.filter((m) => m >= 10).length,
      tauxReussite: moyennes.length
        ? Math.round((moyennes.filter((m) => m >= 10).length / moyennes.length) * 100)
        : null,
    },
  });
});
