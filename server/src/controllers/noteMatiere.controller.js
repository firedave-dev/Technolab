/**
 * Saisie des deux notes de matiere : note de classe et note d'examen.
 *
 * Remplace la chaine Evaluation + Note, qui admettait un nombre quelconque
 * d'epreuves. L'etablissement n'exploite pas cette granularite : le professeur
 * fait sa synthese hors plateforme et ne reporte que deux valeurs.
 *
 * L'ENREGISTREMENT EST GROUPE. Une grille de trente etudiants deux fois notee,
 * sauvegardee cellule par cellule, produirait soixante requetes, soixante
 * occasions d'echec partiel, et un etat indechiffrable si le reseau lache au
 * milieu. Une seule requete porte la grille entiere.
 */
import { Matiere } from '../models/Matiere.js';
import { NoteMatiere } from '../models/NoteMatiere.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';
import { verifierAccesMatiere } from '../services/scolarite.service.js';
import { noteMatiere } from '../services/notation.service.js';
import { ponderationEnVigueur } from '../models/ParametrePedagogique.js';
import { genererEmargementPDF } from '../services/emargement.service.js';

/**
 * GET /api/notes/mes-enseignements
 *
 * Alimente le selecteur en cascade : les classes ou l'acteur enseigne, et pour
 * chacune les matieres qu'il y dispense.
 *
 * Le regroupement est fait ICI plutot que dans le navigateur : c'est le serveur
 * qui sait ce que l'acteur a le droit de voir, et lui seul doit en decider. Un
 * professeur ne recoit que ses matieres ; l'administration recoit tout.
 */
export const mesEnseignements = catchAsync(async (req, res) => {
  const filtre = { actif: true };

  if (req.user.role === ROLES.PROFESSEUR) filtre.professeur = req.user._id;
  else if (!STAFF_ROLES.includes(req.user.role)) throw ApiError.forbidden();

  const matieres = await Matiere.find(filtre)
    .sort({ nom: 1 })
    .populate('classe', 'nom niveau filiere anneeScolaire')
    .lean();

  // Une classe n'apparait que si l'acteur y enseigne au moins une matiere.
  const parClasse = new Map();

  for (const matiere of matieres) {
    if (!matiere.classe) continue;
    const cle = String(matiere.classe._id);

    if (!parClasse.has(cle)) {
      parClasse.set(cle, {
        id: matiere.classe._id,
        nom: matiere.classe.nom,
        niveau: matiere.classe.niveau,
        filiere: matiere.classe.filiere,
        anneeScolaire: matiere.classe.anneeScolaire,
        matieres: [],
      });
    }

    parClasse.get(cle).matieres.push({
      id: matiere._id,
      nom: matiere.nom,
      code: matiere.code,
      semestre: matiere.semestre || 'semestre1',
      creditsEcts: matiere.creditsEcts,
      anneeScolaire: matiere.anneeScolaire,
    });
  }

  res.json({
    success: true,
    classes: [...parClasse.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  });
});

/**
 * GET /api/notes/grille — etudiants d'une matiere et leurs deux notes.
 *
 * La note de matiere est renvoyee CALCULEE, jamais stockee : elle depend de la
 * ponderation en vigueur, qui est un parametre reglable. La figer en base la
 * rendrait fausse au premier changement de reglement.
 */
export const grille = catchAsync(async (req, res) => {
  const { matiere: matiereId, semestre } = req.query;

  const matiere = await Matiere.findById(matiereId).populate('classe', 'nom anneeScolaire').lean();
  if (!matiere) throw ApiError.notFound('Matiere introuvable');
  verifierAccesMatiere(req.user, matiere, { lecture: true });

  const periode = semestre || matiere.semestre || 'semestre1';
  const annee = matiere.anneeScolaire;

  const [etudiants, notes, ponderation] = await Promise.all([
    User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': matiere.classe._id, actif: true })
      .select('nom prenom matricule')
      .sort({ nom: 1, prenom: 1 })
      .lean(),
    NoteMatiere.find({ matiere: matiereId, semestre: periode, anneeScolaire: annee }).lean(),
    ponderationEnVigueur(),
  ]);

  const parEtudiant = new Map(notes.map((n) => [String(n.etudiant), n]));

  const lignes = etudiants.map((etudiant) => {
    const ligne = parEtudiant.get(String(etudiant._id));
    const noteClasse = ligne?.noteClasse ?? null;
    const noteExamen = ligne?.noteExamen ?? null;

    return {
      etudiant: {
        id: etudiant._id,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        matricule: etudiant.matricule,
      },
      noteClasse,
      noteExamen,
      note: noteMatiere(noteClasse, noteExamen, ponderation),
      publiee: ligne?.publiee ?? false,
      appreciation: ligne?.appreciation ?? '',
    };
  });

  res.json({
    success: true,
    matiere: {
      id: matiere._id,
      nom: matiere.nom,
      code: matiere.code,
      creditsEcts: matiere.creditsEcts,
      classe: matiere.classe.nom,
    },
    semestre: periode,
    anneeScolaire: annee,
    ponderation,
    // Le nombre de lignes completes guide l'indicateur de progression.
    saisies: lignes.filter((l) => l.noteClasse !== null && l.noteExamen !== null).length,
    lignes,
  });
});

/**
 * PUT /api/notes/grille — enregistrement groupe.
 *
 * Les lignes recues sont ecrites en une seule operation en masse. Les etudiants
 * absents du corps ne sont PAS touches : la grille peut ainsi etre enregistree
 * par morceaux sans effacer ce qui a ete saisi ailleurs.
 *
 * Une note a `null` est une suppression volontaire — « je retire cette note » —
 * et se distingue d'un champ simplement absent.
 */
export const enregistrerGrille = catchAsync(async (req, res) => {
  const { matiere: matiereId, semestre, lignes } = req.body;

  const matiere = await Matiere.findById(matiereId).lean();
  if (!matiere) throw ApiError.notFound('Matiere introuvable');
  verifierAccesMatiere(req.user, matiere);

  const periode = semestre || matiere.semestre || 'semestre1';
  const annee = matiere.anneeScolaire;

  // Les etudiants cites doivent bien appartenir a la classe de la matiere :
  // sans ce controle, un identifiant forge deposerait une note ailleurs.
  const inscrits = await User.find({
    _id: { $in: lignes.map((l) => l.etudiant) },
    role: ROLES.ETUDIANT,
    'infosEtudiant.classe': matiere.classe,
  }).select('_id').lean();

  const autorises = new Set(inscrits.map((e) => String(e._id)));
  const intrus = lignes.filter((l) => !autorises.has(String(l.etudiant)));

  if (intrus.length) {
    throw ApiError.badRequest(
      `${intrus.length} etudiant(s) ne sont pas inscrits dans cette classe`
    );
  }

  const operations = lignes.map((ligne) => ({
    updateOne: {
      filter: {
        matiere: matiereId,
        etudiant: ligne.etudiant,
        semestre: periode,
        anneeScolaire: annee,
      },
      update: {
        $set: {
          noteClasse: ligne.noteClasse ?? null,
          noteExamen: ligne.noteExamen ?? null,
          ...(ligne.appreciation !== undefined ? { appreciation: ligne.appreciation } : {}),
          saisiePar: req.user._id,
        },
      },
      upsert: true,
    },
  }));

  const resultat = operations.length ? await NoteMatiere.bulkWrite(operations) : null;

  res.json({
    success: true,
    message: `${lignes.length} ligne(s) enregistree(s)`,
    creees: resultat?.upsertedCount ?? 0,
    modifiees: resultat?.modifiedCount ?? 0,
  });
});

/**
 * PATCH /api/notes/publication — publie ou retire la publication d'une grille.
 *
 * Tant que la grille n'est pas publiee, ni l'etudiant ni sa famille ne voient
 * quoi que ce soit : le professeur saisit tranquillement, puis decide.
 */
export const basculerPublication = catchAsync(async (req, res) => {
  const { matiere: matiereId, semestre, publiee } = req.body;

  const matiere = await Matiere.findById(matiereId).lean();
  if (!matiere) throw ApiError.notFound('Matiere introuvable');
  verifierAccesMatiere(req.user, matiere);

  const periode = semestre || matiere.semestre || 'semestre1';

  const resultat = await NoteMatiere.updateMany(
    { matiere: matiereId, semestre: periode, anneeScolaire: matiere.anneeScolaire },
    { $set: { publiee } }
  );

  res.json({
    success: true,
    message: publiee
      ? `Notes publiees pour ${resultat.modifiedCount} etudiant(s)`
      : `Publication retiree pour ${resultat.modifiedCount} etudiant(s)`,
    publiee,
  });
});

/**
 * GET /api/notes/emargement — liste imprimable, a remplir au stylo.
 *
 * Le meme controle d'acces que la grille de saisie : `verifierAccesMatiere` en
 * LECTURE, ce qui ouvre le document a la direction et au surveillant, et le
 * limite au professeur titulaire pour les siennes. C'est deliberé — on imprime
 * cette feuille pour la donner a corriger, pas pour consulter des notes.
 *
 * Les etudiants sont tries par ordre alphabetique, comme le demande l'usage :
 * une liste dans l'ordre d'inscription est impossible a pointer a la main.
 */
export const emargement = catchAsync(async (req, res) => {
  const { matiere: matiereId, semestre } = req.query;

  const matiere = await Matiere.findById(matiereId)
    .populate('classe', 'nom filiere anneeScolaire')
    .populate('professeur', 'nom prenom')
    .lean();

  if (!matiere) throw ApiError.notFound('Matiere introuvable');
  verifierAccesMatiere(req.user, matiere, { lecture: true });

  const etudiants = await User.find({
    role: ROLES.ETUDIANT,
    'infosEtudiant.classe': matiere.classe._id,
    actif: true,
  })
    .select('nom prenom matricule')
    .sort({ nom: 1, prenom: 1 })
    .collation({ locale: 'fr', strength: 1 })
    .lean();

  if (!etudiants.length) throw ApiError.badRequest('Aucun etudiant inscrit dans cette classe');

  const contexte = {
    classe: matiere.classe.nom,
    matiere: matiere.nom,
    code: matiere.code,
    semestre: semestre || matiere.semestre || 'semestre1',
    anneeScolaire: matiere.anneeScolaire,
    professeur: matiere.professeur
      ? `${matiere.professeur.prenom} ${matiere.professeur.nom}`
      : null,
  };

  const nomFichier = `emargement-${matiere.code}-${contexte.classe}`
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .toLowerCase();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nomFichier}.pdf"`);

  genererEmargementPDF(
    contexte,
    etudiants.map((e) => ({
      nom: `${e.nom} ${e.prenom}`,
      matricule: e.matricule || '',
    })),
    res
  );
});
