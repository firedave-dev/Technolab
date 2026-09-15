/**
 * Emploi du temps : creneaux hebdomadaires par classe, par professeur ou par salle.
 * La planification releve de la direction et du secretariat ; chacun consulte le sien.
 */
import { Creneau } from '../models/Creneau.js';
import { Matiere } from '../models/Matiere.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../config/roles.js';
import { construireGrille, detecterConflitCreneau } from '../services/planning.service.js';

const PEUPLE = [
  { path: 'matiere', select: 'nom code coefficient' },
  { path: 'classe', select: 'nom niveau filiere anneeScolaire' },
  { path: 'classesAssociees', select: 'nom niveau filiere' },
  { path: 'professeur', select: 'nom prenom email' },
];

/**
 * Determine les classes que l'acteur a le droit de consulter.
 * Renvoie `null` pour le personnel (aucune restriction).
 */
async function classesAutorisees(acteur) {
  if (STAFF_ROLES.includes(acteur.role)) return null;

  const concernes = acteur.role === ROLES.PARENT ? acteur.enfants || [] : [acteur._id];
  const etudiants = await User.find({ _id: { $in: concernes } })
    .select('infosEtudiant.classe')
    .lean();

  return etudiants.map((e) => e.infosEtudiant?.classe).filter(Boolean);
}

/** GET /api/planning — liste des creneaux, filtrable */
export const lister = catchAsync(async (req, res) => {
  const { classe, professeur, jour, salle, anneeScolaire } = req.query;
  const filtre = { actif: true };

  if (jour) filtre.jour = jour;
  if (salle) filtre.salle = salle;
  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;
  if (professeur) filtre.professeur = professeur;

  // Un professeur voit son propre emploi du temps par defaut.
  if (req.user.role === ROLES.PROFESSEUR && !classe && !professeur) {
    filtre.professeur = req.user._id;
  }

  /*
   * Une classe assiste a une seance soit comme classe PRINCIPALE, soit comme
   * classe ASSOCIEE a un cours mutualise. Filtrer sur le seul champ `classe`
   * ferait disparaitre de son emploi du temps les cours qu'elle suit en commun
   * avec une autre filiere.
   */
  const surLaClasse = (valeur) => ({ $or: [{ classe: valeur }, { classesAssociees: valeur }] });

  const autorisees = await classesAutorisees(req.user);
  if (autorisees !== null) {
    if (!autorisees.length) return res.json({ success: true, ...construireGrille([]), creneaux: [] });

    const demandee = classe && autorisees.some((c) => String(c) === String(classe));
    Object.assign(filtre, surLaClasse(demandee ? classe : { $in: autorisees }));
  } else if (classe) {
    Object.assign(filtre, surLaClasse(classe));
  }

  const creneaux = await Creneau.find(filtre)
    .sort({ jour: 1, heureDebut: 1 })
    .populate(PEUPLE)
    .lean();

  const enrichis = creneaux.map((c) => ({ ...c, id: c._id }));

  res.json({ success: true, creneaux: enrichis, ...construireGrille(enrichis) });
});

/** GET /api/planning/salles — salles deja utilisees dans l'emploi du temps */
export const salles = catchAsync(async (req, res) => {
  const utilisees = (await Creneau.distinct('salle')).filter(Boolean);
  res.json({ success: true, salles: utilisees.sort() });
});

/** POST /api/planning */
export const creer = catchAsync(async (req, res) => {
  const matiere = await Matiere.findById(req.body.matiere).lean();
  if (!matiere) throw ApiError.badRequest('Matiere introuvable');

  // Classe et professeur sont deduits de la matiere : ils restent forcement coherents.
  const donnees = {
    ...req.body,
    classe: matiere.classe,
    professeur: matiere.professeur,
    classesAssociees: req.body.classesAssociees || [],
    anneeScolaire: req.body.anneeScolaire || matiere.anneeScolaire,
  };

  const conflit = await detecterConflitCreneau(donnees);
  if (conflit) throw ApiError.conflict(conflit);

  const creneau = await Creneau.create(donnees);
  await creneau.populate(PEUPLE);

  res.status(201).json({ success: true, message: 'Creneau ajoute a l emploi du temps', creneau });
});

/** PATCH /api/planning/:id */
export const modifier = catchAsync(async (req, res) => {
  const creneau = await Creneau.findById(req.params.id);
  if (!creneau) throw ApiError.notFound('Creneau introuvable');

  const futur = {
    id: creneau._id,
    jour: req.body.jour || creneau.jour,
    heureDebut: req.body.heureDebut || creneau.heureDebut,
    heureFin: req.body.heureFin || creneau.heureFin,
    salle: req.body.salle ?? creneau.salle,
    classe: creneau.classe,
    classesAssociees: req.body.classesAssociees ?? creneau.classesAssociees ?? [],
    professeur: creneau.professeur,
    anneeScolaire: creneau.anneeScolaire,
  };

  // Un creneau desactive ne mobilise plus aucune ressource : le controle est inutile.
  if (req.body.actif !== false) {
    const conflit = await detecterConflitCreneau(futur);
    if (conflit) throw ApiError.conflict(conflit);
  }

  Object.assign(creneau, req.body);
  await creneau.save();
  await creneau.populate(PEUPLE);

  res.json({ success: true, message: 'Creneau mis a jour', creneau });
});

/** DELETE /api/planning/:id */
export const supprimer = catchAsync(async (req, res) => {
  const creneau = await Creneau.findById(req.params.id);
  if (!creneau) throw ApiError.notFound('Creneau introuvable');

  await creneau.deleteOne();
  res.json({ success: true, message: 'Creneau retire de l emploi du temps' });
});

/**
 * POST /api/planning/dupliquer
 * Recopie l'emploi du temps d'une classe vers une autre (memes horaires, matieres
 * correspondantes par code). Fait gagner un temps considerable a la rentree.
 */
export const dupliquer = catchAsync(async (req, res) => {
  const { source, cible } = req.body;

  const [creneauxSource, matieresCible] = await Promise.all([
    Creneau.find({ classe: source, actif: true }).populate('matiere', 'code').lean(),
    Matiere.find({ classe: cible }).lean(),
  ]);

  if (!creneauxSource.length) throw ApiError.badRequest('La classe source n a aucun creneau');

  const parCode = Object.fromEntries(matieresCible.map((m) => [m.code, m]));

  let copies = 0;
  const ignores = [];

  for (const creneau of creneauxSource) {
    const equivalent = parCode[creneau.matiere?.code];
    if (!equivalent) {
      ignores.push(creneau.matiere?.code || 'inconnue');
      continue;
    }

    const donnees = {
      matiere: equivalent._id,
      classe: cible,
      professeur: equivalent.professeur,
      jour: creneau.jour,
      heureDebut: creneau.heureDebut,
      heureFin: creneau.heureFin,
      salle: creneau.salle,
      type: creneau.type,
      anneeScolaire: equivalent.anneeScolaire,
    };

    // Un creneau qui entre en conflit est signale plutot que de faire echouer la copie.
    const conflit = await detecterConflitCreneau(donnees);
    if (conflit) {
      ignores.push(`${creneau.matiere?.code} (${conflit})`);
      continue;
    }

    await Creneau.create(donnees);
    copies += 1;
  }

  res.status(201).json({
    success: true,
    message: `${copies} creneau(x) copie(s)${ignores.length ? `, ${ignores.length} ignore(s)` : ''}`,
    copies,
    ...(ignores.length ? { ignores: [...new Set(ignores)] } : {}),
  });
});
