/**
 * Pointage des absences et retards.
 * Saisie par les professeurs (leurs cours) et les surveillants (tout l'etablissement),
 * justification par la surveillance, le secretariat et la direction.
 * Chaque absence enregistree declenche une notification aux parents.
 */
import { Absence, jour } from '../models/Absence.js';
import { Matiere } from '../models/Matiere.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/roles.js';
import { perimetreEtudiants, verifierAccesEtudiant } from '../services/scolarite.service.js';
import { notifierParents } from '../services/notification.service.js';

const PEUPLE = [
  { path: 'etudiant', select: 'nom prenom matricule' },
  { path: 'classe', select: 'nom niveau' },
  { path: 'matiere', select: 'nom code' },
  { path: 'saisiePar', select: 'nom prenom role' },
];

const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR');

/** Message envoye aux parents lors d'une saisie. */
const messageNotification = (etudiant, absence) =>
  absence.type === 'retard'
    ? `${etudiant.prenom} a ete note en retard le ${dateFr(absence.date)}${absence.minutesRetard ? ` (${absence.minutesRetard} min)` : ''}.`
    : `${etudiant.prenom} a ete note absent le ${dateFr(absence.date)} (${absence.creneau}).`;

/** GET /api/absences — liste filtrable et paginee */
export const lister = catchAsync(async (req, res) => {
  const { etudiant, classe, matiere, type, justifie, du, au, page, limite } = req.query;
  const filtre = {};

  if (classe) filtre.classe = classe;
  if (matiere) filtre.matiere = matiere;
  if (type) filtre.type = type;
  if (justifie !== undefined) filtre.justifie = justifie;
  if (du || au) {
    filtre.date = {};
    if (du) filtre.date.$gte = jour(du);
    if (au) filtre.date.$lte = jour(au);
  }

  // Etudiant et parent sont limites a leur perimetre.
  const perimetre = await perimetreEtudiants(req.user);
  if (perimetre !== null) {
    const autorises = perimetre.map(String);
    if (etudiant && !autorises.includes(String(etudiant))) {
      throw ApiError.forbidden('Vous ne pouvez consulter que vos absences ou celles de vos enfants');
    }
    filtre.etudiant = etudiant || { $in: perimetre };
  } else if (etudiant) {
    filtre.etudiant = etudiant;
  }

  const [absences, total] = await Promise.all([
    Absence.find(filtre)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limite)
      .limit(limite)
      .populate(PEUPLE)
      .lean(),
    Absence.countDocuments(filtre),
  ]);

  res.json({
    success: true,
    absences: absences.map((a) => ({ ...a, id: a._id })),
    pagination: { page, limite, total, pages: Math.max(1, Math.ceil(total / limite)) },
  });
});

/** GET /api/absences/statistiques — synthese par etudiant sur une periode */
export const statistiques = catchAsync(async (req, res) => {
  const { classe, du, au } = req.query;
  const filtre = {};

  if (classe) filtre.classe = classe;
  if (du || au) {
    filtre.date = {};
    if (du) filtre.date.$gte = jour(du);
    if (au) filtre.date.$lte = jour(au);
  }

  const perimetre = await perimetreEtudiants(req.user);
  if (perimetre !== null) filtre.etudiant = { $in: perimetre };

  const parEtudiant = await Absence.aggregate([
    { $match: filtre },
    {
      $group: {
        _id: '$etudiant',
        absences: { $sum: { $cond: [{ $eq: ['$type', 'absence'] }, 1, 0] } },
        retards: { $sum: { $cond: [{ $eq: ['$type', 'retard'] }, 1, 0] } },
        nonJustifiees: { $sum: { $cond: ['$justifie', 0, 1] } },
      },
    },
    { $sort: { nonJustifiees: -1, absences: -1 } },
    { $limit: 50 },
  ]);

  const etudiants = await User.find({ _id: { $in: parEtudiant.map((p) => p._id) } })
    .select('nom prenom matricule')
    .lean();
  const parId = Object.fromEntries(etudiants.map((e) => [String(e._id), e]));

  const total = await Absence.countDocuments(filtre);
  const nonJustifiees = await Absence.countDocuments({ ...filtre, justifie: false });

  res.json({
    success: true,
    statistiques: {
      total,
      nonJustifiees,
      justifiees: total - nonJustifiees,
      parEtudiant: parEtudiant.map((p) => ({
        etudiant: parId[String(p._id)]
          ? {
              id: p._id,
              nomComplet: `${parId[String(p._id)].prenom} ${parId[String(p._id)].nom}`,
              matricule: parId[String(p._id)].matricule,
            }
          : { id: p._id, nomComplet: 'Compte supprime' },
        absences: p.absences,
        retards: p.retards,
        nonJustifiees: p.nonJustifiees,
      })),
    },
  });
});

/** POST /api/absences — saisie unitaire */
export const creer = catchAsync(async (req, res) => {
  const etudiant = await User.findOne({ _id: req.body.etudiant, role: ROLES.ETUDIANT }).lean();
  if (!etudiant) throw ApiError.badRequest('Etudiant introuvable');

  const classe = etudiant.infosEtudiant?.classe;
  if (!classe) throw ApiError.badRequest("Cet etudiant n'est affecte a aucune classe");

  const donnees = {
    ...req.body,
    matiere: req.body.matiere || undefined,
    creneau: req.body.creneau || 'journee',
    classe,
    date: jour(req.body.date),
    saisiePar: req.user._id,
  };

  const existante = await Absence.findOne({
    etudiant: donnees.etudiant,
    date: donnees.date,
    creneau: donnees.creneau,
  });
  if (existante) throw ApiError.conflict('Une saisie existe deja pour cet etudiant sur ce creneau');

  const absence = await Absence.create(donnees);
  await absence.populate(PEUPLE);

  await notifierParents(etudiant._id, {
    type: 'absence',
    titre: absence.type === 'retard' ? 'Retard signale' : 'Absence signalee',
    message: messageNotification(etudiant, absence),
    lien: '/absences',
    email: true, // une absence doit etre connue de la famille le jour meme
  });

  res.status(201).json({ success: true, message: 'Absence enregistree', absence });
});

/**
 * POST /api/absences/appel
 * Feuille d'appel : enregistre en une fois tous les absents et retardataires d'un creneau.
 * Les etudiants marques presents voient leur saisie precedente retiree (correction d'erreur).
 */
export const feuilleAppel = catchAsync(async (req, res) => {
  const { classe, matiere, lignes } = req.body;
  const date = jour(req.body.date);
  const creneau = req.body.creneau || 'journee';

  // Un professeur ne fait l'appel que dans une matiere qui lui est assignee.
  if (req.user.role === ROLES.PROFESSEUR) {
    if (!matiere) throw ApiError.badRequest('Precisez la matiere concernee par cet appel');
    const sienne = await Matiere.exists({ _id: matiere, professeur: req.user._id, classe });
    if (!sienne) throw ApiError.forbidden('Cette matiere ne vous est pas assignee pour cette classe');
  }

  const inscrits = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe })
    .select('nom prenom parents')
    .lean();
  const parId = Object.fromEntries(inscrits.map((e) => [String(e._id), e]));

  const absents = lignes.filter((l) => !l.present && parId[l.etudiant]);
  const presents = lignes.filter((l) => l.present && parId[l.etudiant]);

  if (lignes.some((l) => !parId[l.etudiant])) {
    throw ApiError.badRequest('Certains etudiants ne sont pas inscrits dans cette classe');
  }

  // Presents : on efface une eventuelle saisie erronee sur ce creneau.
  if (presents.length) {
    await Absence.deleteMany({
      etudiant: { $in: presents.map((l) => l.etudiant) },
      date,
      creneau,
    });
  }

  // Absents : upsert pour rendre l'appel rejouable sans creer de doublon.
  if (absents.length) {
    await Absence.bulkWrite(
      absents.map((ligne) => ({
        updateOne: {
          filter: { etudiant: ligne.etudiant, date, creneau },
          update: {
            $set: {
              classe,
              matiere: matiere || undefined,
              type: ligne.type || 'absence',
              minutesRetard: ligne.type === 'retard' ? ligne.minutesRetard : undefined,
              saisiePar: req.user._id,
            },
            $setOnInsert: { justifie: false },
          },
          upsert: true,
        },
      }))
    );

    // Notification aux parents et a l'etudiant, une par saisie.
    await Promise.all(
      absents.map((ligne) =>
        notifierParents(ligne.etudiant, {
          type: 'absence',
          titre: ligne.type === 'retard' ? 'Retard signale' : 'Absence signalee',
          message: messageNotification(parId[ligne.etudiant], {
            type: ligne.type || 'absence',
            date,
            creneau,
            minutesRetard: ligne.minutesRetard,
          }),
          lien: '/absences',
          email: true,
        })
      )
    );
  }

  res.json({
    success: true,
    message: `Appel enregistre : ${absents.length} absence(s) sur ${lignes.length} etudiant(s)`,
    absents: absents.length,
    presents: presents.length,
  });
});

/** GET /api/absences/appel — etat de l'appel deja saisi pour un creneau */
export const etatAppel = catchAsync(async (req, res) => {
  const { classe, matiere } = req.query;
  if (!classe) throw ApiError.badRequest('Precisez la classe');

  const date = jour(req.query.date || new Date());
  const creneau = req.query.creneau || 'journee';

  const [etudiants, saisies] = await Promise.all([
    User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe })
      .sort('nom prenom')
      .select('nom prenom matricule')
      .lean(),
    Absence.find({ classe, date, creneau, ...(matiere ? { matiere } : {}) }).lean(),
  ]);

  const parEtudiant = Object.fromEntries(saisies.map((a) => [String(a.etudiant), a]));

  res.json({
    success: true,
    date,
    creneau,
    lignes: etudiants.map((e) => {
      const saisie = parEtudiant[String(e._id)];
      return {
        etudiant: { id: e._id, nomComplet: `${e.prenom} ${e.nom}`, matricule: e.matricule },
        present: !saisie,
        type: saisie?.type || 'absence',
        minutesRetard: saisie?.minutesRetard ?? null,
        justifie: Boolean(saisie?.justifie),
      };
    }),
    dejaSaisi: saisies.length > 0,
  });
});

/** PATCH /api/absences/:id/justification */
export const justifier = catchAsync(async (req, res) => {
  const absence = await Absence.findById(req.params.id);
  if (!absence) throw ApiError.notFound('Absence introuvable');

  absence.justifie = req.body.justifie;
  absence.motif = req.body.motif || absence.motif;
  absence.justifiePar = req.user._id;
  absence.dateJustification = new Date();

  await absence.save();
  await absence.populate(PEUPLE);

  res.json({
    success: true,
    message: absence.justifie ? 'Absence justifiee' : 'Justification retiree',
    absence,
  });
});

/** DELETE /api/absences/:id — correction d'une saisie erronee */
export const supprimer = catchAsync(async (req, res) => {
  const absence = await Absence.findById(req.params.id);
  if (!absence) throw ApiError.notFound('Absence introuvable');

  await absence.deleteOne();
  res.json({ success: true, message: 'Saisie supprimee' });
});

/** GET /api/absences/etudiant/:id — historique d'un etudiant */
export const parEtudiant = catchAsync(async (req, res) => {
  await verifierAccesEtudiant(req.user, req.params.id);

  const absences = await Absence.find({ etudiant: req.params.id })
    .sort({ date: -1 })
    .populate(PEUPLE)
    .lean();

  res.json({
    success: true,
    absences: absences.map((a) => ({ ...a, id: a._id })),
    synthese: {
      total: absences.length,
      absences: absences.filter((a) => a.type === 'absence').length,
      retards: absences.filter((a) => a.type === 'retard').length,
      nonJustifiees: absences.filter((a) => !a.justifie).length,
    },
  });
});
