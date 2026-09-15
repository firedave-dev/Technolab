/**
 * Rapports de direction.
 *
 * CE QUE CES RAPPORTS DOIVENT PERMETTRE : repondre sans calcul intermediaire aux
 * questions qu'un directeur se pose devant un conseil d'administration — combien
 * est entre ce mois-ci, qui doit encore, quelles classes decrochent, ou sont les
 * absences. Chaque rapport est donc autonome : il porte ses totaux, ses
 * sous-totaux et la periode qu'il couvre.
 *
 * RIEN N'EST STOCKE. Un rapport est recalcule a chaque demande, comme les
 * bulletins. Un chiffre fige serait faux des la premiere ecriture comptable
 * posterieure, et personne ne penserait a le regenerer.
 */
import { Paiement } from '../models/Paiement.js';
import { Echeance } from '../models/Echeance.js';
import { Classe } from '../models/Classe.js';
import { User } from '../models/User.js';
import { Absence } from '../models/Absence.js';
import { Matiere } from '../models/Matiere.js';
import { NoteMatiere } from '../models/NoteMatiere.js';
import { ROLES } from '../config/roles.js';
import { bornesPeriode, filtreDates } from './periode.service.js';
import { calculerBulletin } from './scolarite.service.js';

export const RAPPORTS = [
  { cle: 'encaissements', titre: 'Encaissements', domaine: 'Comptabilité' },
  { cle: 'impayes', titre: 'État des impayés', domaine: 'Comptabilité' },
  { cle: 'resultats', titre: 'Résultats académiques', domaine: 'Pédagogie' },
  { cle: 'assiduite', titre: 'Assiduité', domaine: 'Vie scolaire' },
  { cle: 'effectifs', titre: 'Effectifs', domaine: 'Pilotage' },
];

const LIBELLES_MODE = {
  especes: 'Espèces', virement: 'Virement', mobile_money: 'Mobile money',
  cheque: 'Chèque', carte: 'Carte',
};

const nomComplet = (u) => (u ? `${u.prenom} ${u.nom}` : '—');

/* ------------------------------------------------------- encaissements */

/**
 * Ce qui est ENTRE EN CAISSE sur la periode.
 *
 * Seuls les paiements valides comptent : un encaissement en attente de
 * validation n'est pas de l'argent disponible, et un paiement annule n'en a
 * jamais ete.
 */
export async function rapportEncaissements({ periode, reference, anneeScolaire, classe }) {
  const bornes = bornesPeriode(periode, reference, anneeScolaire);

  const filtre = { statut: 'valide', ...filtreDates('datePaiement', bornes) };

  const paiements = await Paiement.find(filtre)
    .populate({
      path: 'etudiant',
      select: 'nom prenom matricule infosEtudiant.classe',
      populate: { path: 'infosEtudiant.classe', select: 'nom filiere' },
    })
    .populate('echeance', 'libelle type')
    .populate('encaissePar', 'nom prenom')
    .sort({ datePaiement: 1 })
    .lean();

  const retenus = classe
    ? paiements.filter((p) => String(p.etudiant?.infosEtudiant?.classe?._id) === String(classe))
    : paiements;

  const total = retenus.reduce((s, p) => s + p.montant, 0);

  const grouper = (cle) => {
    const carte = new Map();
    for (const p of retenus) {
      const k = cle(p) || '—';
      const ligne = carte.get(k) || { libelle: k, nombre: 0, montant: 0 };
      ligne.nombre += 1;
      ligne.montant += p.montant;
      carte.set(k, ligne);
    }
    return [...carte.values()].sort((a, b) => b.montant - a.montant);
  };

  return {
    type: 'encaissements',
    titre: 'Encaissements',
    periode: bornes.libelle,
    total,
    nombre: retenus.length,
    parMode: grouper((p) => LIBELLES_MODE[p.mode] ?? p.mode),
    parClasse: grouper((p) => p.etudiant?.infosEtudiant?.classe?.nom),
    parType: grouper((p) => p.echeance?.libelle ?? 'Versement libre'),
    lignes: retenus.map((p) => ({
      date: p.datePaiement,
      recu: p.numeroRecu,
      etudiant: nomComplet(p.etudiant),
      matricule: p.etudiant?.matricule ?? '—',
      classe: p.etudiant?.infosEtudiant?.classe?.nom ?? '—',
      motif: p.echeance?.libelle ?? 'Versement libre',
      mode: LIBELLES_MODE[p.mode] ?? p.mode,
      montant: p.montant,
      encaissePar: nomComplet(p.encaissePar),
    })),
  };
}

/* -------------------------------------------------------------- impayes */

/**
 * Ce qui reste du, echeance echue par echeance echue.
 *
 * La periode ne filtre PAS la date de paiement mais la date d'echeance : on veut
 * « ce qui aurait du etre regle », pas « ce qui a ete regle ».
 */
export async function rapportImpayes({ periode, reference, anneeScolaire, classe }) {
  const bornes = bornesPeriode(periode, reference, anneeScolaire);

  const filtre = {
    statut: { $in: ['a_payer', 'partiel'] },
    ...filtreDates('dateEcheance', bornes),
    ...(anneeScolaire ? { anneeScolaire } : {}),
    ...(classe ? { classe } : {}),
  };

  const echeances = await Echeance.find(filtre)
    .populate('etudiant', 'nom prenom matricule telephone')
    .populate('classe', 'nom filiere')
    .sort({ dateEcheance: 1 })
    .lean();

  const maintenant = new Date();

  const lignes = echeances.map((e) => ({
    etudiant: nomComplet(e.etudiant),
    matricule: e.etudiant?.matricule ?? '—',
    telephone: e.etudiant?.telephone ?? '—',
    classe: e.classe?.nom ?? '—',
    libelle: e.libelle,
    echeance: e.dateEcheance,
    du: e.montant,
    paye: e.montantPaye,
    reste: e.montant - e.montantPaye,
    // Un retard ne se compte qu'a partir de la date d'echeance : une tranche
    // due le mois prochain n'est pas un impaye, c'est un encours.
    joursRetard: e.dateEcheance < maintenant
      ? Math.floor((maintenant - new Date(e.dateEcheance)) / 86400000)
      : 0,
  }));

  const parClasse = new Map();
  for (const l of lignes) {
    const ligne = parClasse.get(l.classe) || { libelle: l.classe, nombre: 0, montant: 0, etudiants: new Set() };
    ligne.nombre += 1;
    ligne.montant += l.reste;
    ligne.etudiants.add(l.matricule);
    parClasse.set(l.classe, ligne);
  }

  return {
    type: 'impayes',
    titre: 'État des impayés',
    periode: bornes.libelle,
    total: lignes.reduce((s, l) => s + l.reste, 0),
    nombre: lignes.length,
    echus: lignes.filter((l) => l.joursRetard > 0).length,
    montantEchu: lignes.filter((l) => l.joursRetard > 0).reduce((s, l) => s + l.reste, 0),
    parClasse: [...parClasse.values()]
      .map((c) => ({ ...c, etudiants: c.etudiants.size }))
      .sort((a, b) => b.montant - a.montant),
    lignes,
  };
}

/* ------------------------------------------------------------ resultats */

/** Moyennes, credits et mentions, classe par classe. */
export async function rapportResultats({ anneeScolaire, classe, semestre = 'semestre1' }) {
  const filtre = { ...(anneeScolaire ? { anneeScolaire } : {}), ...(classe ? { _id: classe } : {}) };
  const classes = await Classe.find(filtre).sort({ nom: 1 }).lean();

  const blocs = [];

  for (const c of classes) {
    const etudiants = await User.find({
      role: ROLES.ETUDIANT, 'infosEtudiant.classe': c._id,
    }).sort({ nom: 1 }).lean();

    const lignes = [];
    for (const e of etudiants) {
      const bulletin = await calculerBulletin(e._id, { periode: semestre });
      lignes.push({
        etudiant: nomComplet(e),
        matricule: e.matricule ?? '—',
        moyenne: bulletin.moyenneGenerale,
        mention: bulletin.mention,
        rang: bulletin.rang,
        creditsAcquis: bulletin.creditsAcquis,
        creditsTotal: bulletin.creditsTotal,
        admis: bulletin.moyenneGenerale !== null && bulletin.moyenneGenerale >= 10,
      });
    }

    lignes.sort((a, b) => (b.moyenne ?? -1) - (a.moyenne ?? -1));
    const notes = lignes.map((l) => l.moyenne).filter((m) => m !== null);
    const admis = lignes.filter((l) => l.admis).length;

    const mentions = new Map();
    for (const l of lignes) {
      if (!l.mention) continue;
      mentions.set(l.mention, (mentions.get(l.mention) || 0) + 1);
    }

    blocs.push({
      classe: c.nom,
      filiere: c.filiere,
      effectif: etudiants.length,
      moyenneClasse: notes.length
        ? Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 100) / 100
        : null,
      meilleure: notes.length ? Math.max(...notes) : null,
      plusFaible: notes.length ? Math.min(...notes) : null,
      admis,
      tauxReussite: etudiants.length ? Math.round((admis / etudiants.length) * 100) : null,
      mentions: [...mentions.entries()].map(([libelle, nombre]) => ({ libelle, nombre })),
      lignes,
    });
  }

  const effectifTotal = blocs.reduce((s, b) => s + b.effectif, 0);
  const admisTotal = blocs.reduce((s, b) => s + b.admis, 0);

  return {
    type: 'resultats',
    titre: 'Résultats académiques',
    periode: `${semestre === 'semestre1' ? 'Semestre 1' : 'Semestre 2'}`
      + (anneeScolaire ? ` — ${anneeScolaire}` : ''),
    effectif: effectifTotal,
    admis: admisTotal,
    tauxReussite: effectifTotal ? Math.round((admisTotal / effectifTotal) * 100) : null,
    blocs,
  };
}

/* ------------------------------------------------------------ assiduite */

export async function rapportAssiduite({ periode, reference, anneeScolaire, classe }) {
  const bornes = bornesPeriode(periode, reference, anneeScolaire);

  const filtre = { ...filtreDates('date', bornes), ...(classe ? { classe } : {}) };

  const absences = await Absence.find(filtre)
    .populate('etudiant', 'nom prenom matricule')
    .populate('classe', 'nom')
    .populate('matiere', 'nom')
    .sort({ date: -1 })
    .lean();

  const parClasse = new Map();
  const parEtudiant = new Map();

  for (const a of absences) {
    const nomClasse = a.classe?.nom ?? '—';
    const bloc = parClasse.get(nomClasse)
      || { libelle: nomClasse, absences: 0, retards: 0, justifiees: 0 };
    if (a.type === 'retard') bloc.retards += 1; else bloc.absences += 1;
    if (a.justifie) bloc.justifiees += 1;
    parClasse.set(nomClasse, bloc);

    const cle = a.etudiant?.matricule ?? String(a.etudiant?._id);
    const ligne = parEtudiant.get(cle) || {
      etudiant: nomComplet(a.etudiant),
      matricule: a.etudiant?.matricule ?? '—',
      classe: nomClasse,
      absences: 0, retards: 0, justifiees: 0,
    };
    if (a.type === 'retard') ligne.retards += 1; else ligne.absences += 1;
    if (a.justifie) ligne.justifiees += 1;
    parEtudiant.set(cle, ligne);
  }

  return {
    type: 'assiduite',
    titre: 'Assiduité',
    periode: bornes.libelle,
    total: absences.length,
    absences: absences.filter((a) => a.type !== 'retard').length,
    retards: absences.filter((a) => a.type === 'retard').length,
    justifiees: absences.filter((a) => a.justifie).length,
    parClasse: [...parClasse.values()].sort((a, b) =>
      (b.absences + b.retards) - (a.absences + a.retards)),
    // Les plus absents en tete : c'est la liste sur laquelle on agit.
    lignes: [...parEtudiant.values()].sort((a, b) =>
      (b.absences + b.retards) - (a.absences + a.retards)),
  };
}

/* ------------------------------------------------------------ effectifs */

export async function rapportEffectifs({ anneeScolaire }) {
  const classes = await Classe.find({ ...(anneeScolaire ? { anneeScolaire } : {}) })
    .sort({ niveau: 1, nom: 1 })
    .lean();

  const blocs = [];
  for (const c of classes) {
    const etudiants = await User.find({
      role: ROLES.ETUDIANT, 'infosEtudiant.classe': c._id,
    }).select('sexe').lean();

    const matieres = await Matiere.countDocuments({ classe: c._id, actif: true });

    blocs.push({
      classe: c.nom,
      niveau: c.niveau,
      filiere: c.filiere,
      effectif: etudiants.length,
      capacite: c.capacite,
      // Un taux d'occupation dit en un chiffre si la classe est rentable et si
      // elle peut encore accueillir.
      occupation: c.capacite ? Math.round((etudiants.length / c.capacite) * 100) : null,
      hommes: etudiants.filter((e) => e.sexe === 'M').length,
      femmes: etudiants.filter((e) => e.sexe === 'F').length,
      matieres,
    });
  }

  const [professeurs, personnel, parents] = await Promise.all([
    User.countDocuments({ role: ROLES.PROFESSEUR, actif: true }),
    User.countDocuments({ role: { $in: [ROLES.ADMIN, ROLES.DIRECTEUR, ROLES.SECRETAIRE, ROLES.SURVEILLANT] }, actif: true }),
    User.countDocuments({ role: ROLES.PARENT, actif: true }),
  ]);

  return {
    type: 'effectifs',
    titre: 'Effectifs',
    periode: anneeScolaire ? `Année scolaire ${anneeScolaire}` : 'Toutes années',
    effectif: blocs.reduce((s, b) => s + b.effectif, 0),
    hommes: blocs.reduce((s, b) => s + b.hommes, 0),
    femmes: blocs.reduce((s, b) => s + b.femmes, 0),
    professeurs,
    personnel,
    parents,
    blocs,
  };
}

/** Aiguillage unique, utilise par la route et par la generation PDF. */
export function produire(cle, options) {
  switch (cle) {
    case 'encaissements': return rapportEncaissements(options);
    case 'impayes': return rapportImpayes(options);
    case 'resultats': return rapportResultats(options);
    case 'assiduite': return rapportAssiduite(options);
    case 'effectifs': return rapportEffectifs(options);
    default: throw new Error(`Rapport inconnu : ${cle}`);
  }
}
