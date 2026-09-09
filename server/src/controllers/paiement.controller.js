/**
 * Encaissements, validation par la direction et generation des recus PDF.
 * Un paiement saisi par le secretariat naît "en_attente" ; la direction le valide,
 * et seuls les paiements valides alimentent les soldes.
 */
import { Paiement } from '../models/Paiement.js';
import { Echeance } from '../models/Echeance.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ADMIN_ROLES, ROLES } from '../config/roles.js';
import {
  genererNumeroRecu,
  perimetreFinancier,
  recalculerEcheance,
  soldeEtudiant,
  verifierAccesFinancier,
} from '../services/comptabilite.service.js';
import { genererRecuPDF } from '../services/recu.service.js';
import { notifierParents } from '../services/notification.service.js';
import { formaterMontant } from '../utils/montantEnLettres.js';

const PEUPLE = [
  { path: 'etudiant', select: 'nom prenom matricule infosEtudiant.classe' },
  { path: 'echeance', select: 'libelle montant montantPaye dateEcheance anneeScolaire statut' },
  { path: 'encaissePar', select: 'nom prenom role' },
  { path: 'validePar', select: 'nom prenom role' },
];

/** GET /api/paiements — liste filtrable et paginee */
export const lister = catchAsync(async (req, res) => {
  const { etudiant, classe, statut, mode, du, au, q, page, limite } = req.query;
  const filtre = {};

  if (statut) filtre.statut = statut;
  if (mode) filtre.mode = mode;
  if (du || au) {
    filtre.datePaiement = {};
    if (du) filtre.datePaiement.$gte = du;
    if (au) filtre.datePaiement.$lte = au;
  }
  if (q) filtre.numeroRecu = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  // Filtre par classe : on passe par les etudiants concernes.
  if (classe) {
    const inscrits = await User.find({ role: ROLES.ETUDIANT, 'infosEtudiant.classe': classe })
      .select('_id')
      .lean();
    filtre.etudiant = { $in: inscrits.map((e) => e._id) };
  }

  const perimetre = perimetreFinancier(req.user);
  if (perimetre !== null) {
    if (etudiant) verifierAccesFinancier(req.user, etudiant);
    filtre.etudiant = etudiant || { $in: perimetre };
  } else if (etudiant) {
    filtre.etudiant = etudiant;
  }

  const [paiements, total, agregat] = await Promise.all([
    Paiement.find(filtre)
      .sort({ datePaiement: -1, createdAt: -1 })
      .skip((page - 1) * limite)
      .limit(limite)
      .populate(PEUPLE)
      .lean(),
    Paiement.countDocuments(filtre),
    Paiement.aggregate([
      { $match: { ...filtre, statut: 'valide' } },
      { $group: { _id: null, montant: { $sum: '$montant' } } },
    ]),
  ]);

  res.json({
    success: true,
    paiements: paiements.map((p) => ({ ...p, id: p._id })),
    totalEncaisse: agregat[0]?.montant || 0,
    pagination: { page, limite, total, pages: Math.max(1, Math.ceil(total / limite)) },
  });
});

/** GET /api/paiements/:id */
export const obtenir = catchAsync(async (req, res) => {
  const paiement = await Paiement.findById(req.params.id).populate(PEUPLE).lean();
  if (!paiement) throw ApiError.notFound('Paiement introuvable');

  verifierAccesFinancier(req.user, paiement.etudiant._id);

  res.json({ success: true, paiement: { ...paiement, id: paiement._id } });
});

/**
 * POST /api/paiements
 * La direction encaisse directement en "valide" ; le secretariat depose un paiement
 * "en_attente" qui devra etre valide.
 */
export const creer = catchAsync(async (req, res) => {
  const etudiant = await User.findOne({ _id: req.body.etudiant, role: ROLES.ETUDIANT }).lean();
  if (!etudiant) throw ApiError.badRequest('Etudiant introuvable');

  let echeance = null;
  if (req.body.echeance) {
    echeance = await Echeance.findById(req.body.echeance);
    if (!echeance) throw ApiError.badRequest('Echeance introuvable');

    if (!echeance.etudiant.equals(etudiant._id)) {
      throw ApiError.badRequest("Cette echeance n'appartient pas a cet etudiant");
    }
    if (echeance.statut === 'annule') {
      throw ApiError.badRequest('Cette echeance est annulee');
    }

    // On refuse un encaissement qui depasserait le reste du, erreur de saisie frequente.
    const reste = echeance.montant - echeance.montantPaye;
    if (req.body.montant > reste) {
      throw ApiError.badRequest(
        `Montant superieur au reste du (${formaterMontant(reste)}). Saisissez un versement libre si c'est une avance.`
      );
    }
  }

  const valideDirectement = ADMIN_ROLES.includes(req.user.role);

  const paiement = await Paiement.create({
    ...req.body,
    echeance: echeance?._id,
    numeroRecu: await genererNumeroRecu(),
    encaissePar: req.user._id,
    statut: valideDirectement ? 'valide' : 'en_attente',
    ...(valideDirectement ? { validePar: req.user._id, dateValidation: new Date() } : {}),
  });

  if (valideDirectement) {
    await recalculerEcheance(echeance?._id);
    await notifierParents(etudiant._id, {
      type: 'paiement',
      titre: 'Paiement enregistre',
      message: `Un reglement de ${formaterMontant(paiement.montant)} a ete enregistre (recu ${paiement.numeroRecu}).`,
      lien: '/paiements',
      email: true, // trace ecrite du reglement pour la famille
    });
  }

  await paiement.populate(PEUPLE);

  res.status(201).json({
    success: true,
    message: valideDirectement
      ? `Paiement enregistre — recu ${paiement.numeroRecu}`
      : `Paiement enregistre, en attente de validation — recu ${paiement.numeroRecu}`,
    paiement,
  });
});

/** PATCH /api/paiements/:id/validation — reservee a la direction */
export const valider = catchAsync(async (req, res) => {
  const paiement = await Paiement.findById(req.params.id);
  if (!paiement) throw ApiError.notFound('Paiement introuvable');

  if (paiement.statut === 'valide') throw ApiError.badRequest('Ce paiement est deja valide');
  if (paiement.statut === 'annule') throw ApiError.badRequest('Un paiement annule ne peut pas etre valide');

  paiement.statut = 'valide';
  paiement.validePar = req.user._id;
  paiement.dateValidation = new Date();
  await paiement.save();

  await recalculerEcheance(paiement.echeance);
  await notifierParents(paiement.etudiant, {
    type: 'paiement',
    titre: 'Paiement valide',
    message: `Le reglement de ${formaterMontant(paiement.montant)} a ete valide (recu ${paiement.numeroRecu}).`,
    lien: '/paiements',
    email: true,
  });

  await paiement.populate(PEUPLE);
  res.json({ success: true, message: 'Paiement valide', paiement });
});

/**
 * PATCH /api/paiements/:id/annulation
 * Le paiement est conserve pour la piste d'audit ; seul son statut change,
 * et le solde de l'echeance est recalcule en consequence.
 */
export const annuler = catchAsync(async (req, res) => {
  const paiement = await Paiement.findById(req.params.id);
  if (!paiement) throw ApiError.notFound('Paiement introuvable');
  if (paiement.statut === 'annule') throw ApiError.badRequest('Ce paiement est deja annule');

  paiement.statut = 'annule';
  paiement.motifAnnulation = req.body.motif;
  await paiement.save();

  await recalculerEcheance(paiement.echeance);

  await paiement.populate(PEUPLE);
  res.json({ success: true, message: 'Paiement annule', paiement });
});

/**
 * GET /api/paiements/verification/:numeroRecu — verification publique d'un recu.
 *
 * Sert la cible du QR code imprime sur le document. Volontairement ouvert, et
 * volontairement avare : seuls le numero, la date, le montant et le statut sont
 * renvoyes. Aucune identite, aucun solde. Celui qui scanne le code a deja le recu
 * sous les yeux ; l'endpoint ne fait que confirmer que le serveur le reconnait,
 * ce qui suffit a detecter un faux sans rien divulguer de plus.
 */
export const verifierRecu = catchAsync(async (req, res) => {
  const paiement = await Paiement.findOne({ numeroRecu: req.params.numeroRecu })
    .select('numeroRecu montant datePaiement statut')
    .lean();

  if (!paiement) {
    throw ApiError.notFound('Aucun recu ne correspond a ce numero');
  }

  res.json({
    success: true,
    recu: {
      numero: paiement.numeroRecu,
      montant: paiement.montant,
      date: paiement.datePaiement,
      statut: paiement.statut,
      etablissement: 'Technolab ISTA',
    },
  });
});

/**
 * GET /api/paiements/:id/recu — recu au format PDF.
 * Le document est ecrit directement dans la reponse.
 */
export const recu = catchAsync(async (req, res) => {
  const paiement = await Paiement.findById(req.params.id)
    .populate({
      path: 'etudiant',
      select: 'nom prenom matricule infosEtudiant',
      populate: { path: 'infosEtudiant.classe', select: 'nom filiere anneeScolaire' },
    })
    .populate('echeance', 'libelle anneeScolaire')
    .populate('encaissePar', 'nom prenom');

  if (!paiement) throw ApiError.notFound('Paiement introuvable');
  verifierAccesFinancier(req.user, paiement.etudiant._id);

  const solde = await soldeEtudiant(paiement.etudiant._id, paiement.echeance?.anneeScolaire);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="recu-${paiement.numeroRecu}.pdf"`);

  await genererRecuPDF(paiement, solde, res);
});
