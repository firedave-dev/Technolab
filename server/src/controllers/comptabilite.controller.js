/**
 * Grille tarifaire et echeanciers.
 * Les frais sont definis par classe ; l'echeancier d'un etudiant en decoule et
 * peut etre regenere sans risque (les tranches existantes sont conservees).
 */
import { FraisScolarite } from '../models/FraisScolarite.js';
import { Echeance } from '../models/Echeance.js';
import { Paiement } from '../models/Paiement.js';
import { Classe } from '../models/Classe.js';
import { User } from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/roles.js';
import {
  genererEcheancier,
  perimetreFinancier,
  soldeEtudiant,
  statistiquesComptables,
  verifierAccesFinancier,
} from '../services/comptabilite.service.js';
import { notifierParents } from '../services/notification.service.js';
import { formaterMontant } from '../utils/montantEnLettres.js';

// ============================ Grille tarifaire ============================

/** GET /api/frais */
/** Date au format francais court, pour les messages de relance. */
const dateFr = (valeur) =>
  new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export const listerFrais = catchAsync(async (req, res) => {
  const { classe, anneeScolaire, type, actif } = req.query;
  const filtre = {};

  if (classe) filtre.classe = classe;
  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;
  if (type) filtre.type = type;
  if (actif !== undefined) filtre.actif = actif;

  const frais = await FraisScolarite.find(filtre)
    .sort({ anneeScolaire: -1, type: 1, libelle: 1 })
    .populate('classe', 'nom niveau filiere anneeScolaire')
    .lean();

  res.json({ success: true, frais: frais.map((f) => ({ ...f, id: f._id })) });
});

/** POST /api/frais */
export const creerFrais = catchAsync(async (req, res) => {
  if (!(await Classe.exists({ _id: req.body.classe }))) {
    throw ApiError.badRequest('Classe introuvable');
  }

  const doublon = await FraisScolarite.exists({
    libelle: req.body.libelle,
    classe: req.body.classe,
    anneeScolaire: req.body.anneeScolaire,
  });
  if (doublon) throw ApiError.conflict('Ce frais existe deja pour cette classe et cette annee');

  const frais = await FraisScolarite.create(req.body);
  await frais.populate('classe', 'nom niveau filiere anneeScolaire');

  res.status(201).json({ success: true, message: 'Frais cree', frais });
});

/** PATCH /api/frais/:id */
export const modifierFrais = catchAsync(async (req, res) => {
  const frais = await FraisScolarite.findById(req.params.id);
  if (!frais) throw ApiError.notFound('Frais introuvable');

  Object.assign(frais, req.body);
  await frais.save();
  await frais.populate('classe', 'nom niveau filiere anneeScolaire');

  // Les echeanciers deja generes ne suivent pas automatiquement : on le signale.
  const impactees = await Echeance.countDocuments({ frais: frais._id });

  res.json({
    success: true,
    message: impactees
      ? `Frais mis a jour. ${impactees} echeance(s) deja generees : relancez la generation pour les aligner.`
      : 'Frais mis a jour',
    frais,
  });
});

/** DELETE /api/frais/:id — refuse si des echeances en dependent */
export const supprimerFrais = catchAsync(async (req, res) => {
  const frais = await FraisScolarite.findById(req.params.id);
  if (!frais) throw ApiError.notFound('Frais introuvable');

  const echeances = await Echeance.countDocuments({ frais: frais._id });
  if (echeances > 0) {
    throw ApiError.badRequest(
      `Impossible de supprimer : ${echeances} echeance(s) en dependent. Desactivez ce frais plutot.`
    );
  }

  await frais.deleteOne();
  res.json({ success: true, message: 'Frais supprime' });
});

// ============================== Echeanciers ==============================

/** GET /api/echeances — liste filtrable, restreinte au perimetre de l'acteur */
export const listerEcheances = catchAsync(async (req, res) => {
  const { etudiant, classe, statut, anneeScolaire, enRetard, page, limite } = req.query;
  const filtre = {};

  if (classe) filtre.classe = classe;
  if (statut) filtre.statut = statut;
  if (anneeScolaire) filtre.anneeScolaire = anneeScolaire;
  if (enRetard) {
    filtre.dateEcheance = { $lt: new Date() };
    filtre.statut = { $in: ['a_payer', 'partiel'] };
  }

  const perimetre = perimetreFinancier(req.user);
  if (perimetre !== null) {
    if (etudiant) verifierAccesFinancier(req.user, etudiant);
    filtre.etudiant = etudiant || { $in: perimetre };
  } else if (etudiant) {
    filtre.etudiant = etudiant;
  }

  const [echeances, total] = await Promise.all([
    Echeance.find(filtre)
      .sort({ dateEcheance: 1 })
      .skip((page - 1) * limite)
      .limit(limite)
      .populate('etudiant', 'nom prenom matricule')
      .populate('classe', 'nom niveau'),
    Echeance.countDocuments(filtre),
  ]);

  res.json({
    success: true,
    // toJSON expose les virtuels `reste` et `enRetard`.
    echeances: echeances.map((e) => ({ ...e.toJSON(), id: e._id })),
    pagination: { page, limite, total, pages: Math.max(1, Math.ceil(total / limite)) },
  });
});

/** GET /api/echeances/etudiant/:id — echeancier complet et solde */
export const echeancierEtudiant = catchAsync(async (req, res) => {
  verifierAccesFinancier(req.user, req.params.id);

  const etudiant = await User.findOne({ _id: req.params.id, role: ROLES.ETUDIANT })
    .populate('infosEtudiant.classe', 'nom niveau filiere anneeScolaire')
    .lean();
  if (!etudiant) throw ApiError.notFound('Etudiant introuvable');

  const filtre = { etudiant: etudiant._id };
  if (req.query.anneeScolaire) filtre.anneeScolaire = req.query.anneeScolaire;

  const [echeances, paiements, solde] = await Promise.all([
    Echeance.find(filtre).sort('dateEcheance'),
    Paiement.find({ etudiant: etudiant._id, statut: { $ne: 'annule' } })
      .sort({ datePaiement: -1 })
      .populate('encaissePar', 'nom prenom')
      .lean(),
    soldeEtudiant(etudiant._id, req.query.anneeScolaire),
  ]);

  res.json({
    success: true,
    etudiant: {
      id: etudiant._id,
      nomComplet: `${etudiant.prenom} ${etudiant.nom}`,
      matricule: etudiant.matricule,
      classe: etudiant.infosEtudiant?.classe || null,
    },
    echeances: echeances.map((e) => ({ ...e.toJSON(), id: e._id })),
    paiements: paiements.map((p) => ({ ...p, id: p._id })),
    solde,
  });
});

/** POST /api/echeances/etudiant/:id — genere ou complete l'echeancier */
export const genererPourEtudiant = catchAsync(async (req, res) => {
  const resultat = await genererEcheancier(req.params.id, req.body.anneeScolaire);

  res.status(201).json({
    success: true,
    message: `${resultat.creees} echeance(s) creee(s), ${resultat.misesAJour} mise(s) a jour`,
    resultat,
  });
});

/**
 * POST /api/echeances/classe — genere l'echeancier de tous les etudiants d'une classe.
 * Les etudiants sans frais applicables sont signales sans faire echouer l'operation.
 */
export const genererPourClasse = catchAsync(async (req, res) => {
  const etudiants = await User.find({
    role: ROLES.ETUDIANT,
    'infosEtudiant.classe': req.body.classe,
  }).select('_id prenom nom').lean();

  if (!etudiants.length) throw ApiError.badRequest('Aucun etudiant dans cette classe');

  let creees = 0;
  const echecs = [];

  for (const etudiant of etudiants) {
    try {
      const resultat = await genererEcheancier(etudiant._id, req.body.anneeScolaire);
      creees += resultat.creees;
    } catch (erreur) {
      echecs.push(`${etudiant.prenom} ${etudiant.nom} : ${erreur.message}`);
    }
  }

  res.status(201).json({
    success: true,
    message: `${creees} echeance(s) generee(s) pour ${etudiants.length - echecs.length} etudiant(s)`,
    etudiants: etudiants.length,
    creees,
    ...(echecs.length ? { echecs } : {}),
  });
});

/** PATCH /api/echeances/:id — ajustement exceptionnel (remise, report, annulation) */
export const modifierEcheance = catchAsync(async (req, res) => {
  const echeance = await Echeance.findById(req.params.id);
  if (!echeance) throw ApiError.notFound('Echeance introuvable');

  if (req.body.montant !== undefined && req.body.montant < echeance.montantPaye) {
    throw ApiError.badRequest(
      `Le montant ne peut pas etre inferieur au deja percu (${echeance.montantPaye})`
    );
  }

  Object.assign(echeance, req.body);

  // Le statut reste coherent avec le montant apres un ajustement.
  if (!req.body.statut && echeance.statut !== 'annule') {
    if (echeance.montantPaye >= echeance.montant) echeance.statut = 'paye';
    else if (echeance.montantPaye > 0) echeance.statut = 'partiel';
    else echeance.statut = 'a_payer';
  }

  await echeance.save();
  res.json({ success: true, message: 'Echeance mise a jour', echeance: echeance.toJSON() });
});

/** GET /api/echeances/statistiques — agregats comptables */
export const statistiques = catchAsync(async (req, res) => {
  const stats = await statistiquesComptables(req.query);
  res.json({ success: true, statistiques: stats });
});

/** GET /api/echeances/solde/:id — solde d'un etudiant */
export const solde = catchAsync(async (req, res) => {
  verifierAccesFinancier(req.user, req.params.id);
  res.json({ success: true, solde: await soldeEtudiant(req.params.id, req.query.anneeScolaire) });
});

/**
 * POST /api/echeances/rappels — relance les familles sur les echeances dues.
 *
 * DECLENCHE A LA MAIN, pas par une tache planifiee. Un rappel automatique
 * supposerait un ordonnanceur que ce deploiement n'a pas, et surtout il partirait
 * sans que personne ne l'ait relu — or une relance de paiement adressee a tort a
 * une famille a jour coute plus cher que le rappel ne rapporte. Le secretariat
 * choisit son moment et voit d'abord combien de foyers seront touches.
 *
 * `joursAvant` couvre les deux usages d'un meme geste : a 0, on ne relance que
 * le retard avere ; a 7, on previent une semaine avant l'echeance.
 */
export const envoyerRappels = catchAsync(async (req, res) => {
  const { classe, anneeScolaire, joursAvant = 0, simulation = false } = req.body;

  const limite = new Date();
  limite.setDate(limite.getDate() + Number(joursAvant));

  const filtre = {
    statut: { $in: ['a_payer', 'partiel'] },
    dateEcheance: { $lte: limite },
    ...(classe ? { classe } : {}),
    ...(anneeScolaire ? { anneeScolaire } : {}),
  };

  const echeances = await Echeance.find(filtre)
    .populate('etudiant', 'nom prenom')
    .sort({ dateEcheance: 1 })
    .lean();

  // Une famille recoit UN message recapitulatif, pas un par echeance : trois
  // tranches en retard ne justifient pas trois courriers le meme jour.
  const parEtudiant = new Map();

  for (const echeance of echeances) {
    const reste = Math.max(0, echeance.montant - echeance.montantPaye);
    if (reste <= 0) continue;

    const cle = String(echeance.etudiant?._id ?? echeance.etudiant);
    if (!parEtudiant.has(cle)) {
      parEtudiant.set(cle, { etudiant: echeance.etudiant, lignes: [], total: 0 });
    }

    const dossier = parEtudiant.get(cle);
    dossier.lignes.push({ libelle: echeance.libelle, reste, date: echeance.dateEcheance });
    dossier.total += reste;
  }

  const dossiers = [...parEtudiant.values()];

  // La simulation renvoie le perimetre sans rien envoyer : on regarde avant d'agir.
  if (simulation) {
    return res.json({
      success: true,
      simulation: true,
      familles: dossiers.length,
      montantTotal: dossiers.reduce((s, d) => s + d.total, 0),
      apercu: dossiers.slice(0, 10).map((d) => ({
        etudiant: `${d.etudiant?.nom ?? ''} ${d.etudiant?.prenom ?? ''}`.trim(),
        echeances: d.lignes.length,
        reste: d.total,
      })),
    });
  }

  for (const dossier of dossiers) {
    const detail = dossier.lignes
      .map((l) => `${l.libelle} : ${formaterMontant(l.reste)} (echue le ${dateFr(l.date)})`)
      .join(' ; ');

    await notifierParents(dossier.etudiant?._id ?? dossier.etudiant, {
      type: 'paiement',
      titre: Number(joursAvant) > 0 ? 'Echeance de scolarite a venir' : 'Echeance de scolarite en retard',
      message: `Reste a regler : ${formaterMontant(dossier.total)}. ${detail}.`,
      lien: '/paiements',
      email: true,
    });
  }

  res.json({
    success: true,
    message: `${dossiers.length} famille(s) relancee(s)`,
    familles: dossiers.length,
    montantTotal: dossiers.reduce((s, d) => s + d.total, 0),
  });
});
