/**
 * Recu de paiement au format PDF (pdfkit), portrait A4.
 *
 * Le document est ecrit directement dans le flux HTTP : aucun fichier temporaire
 * n'est cree sur le disque du serveur.
 *
 * Hierarchie voulue : le MONTANT PERCU domine tout le reste. C'est l'information
 * que l'on cherche en reprenant un recu des mois plus tard ; elle est donc traitee
 * en pave colore de pleine largeur, deux fois plus grande que le reste.
 *
 * Les blocs sont differencies par leur fond plutot qu'empiles a l'identique :
 * l'oeil separe « qui » (etudiant), « quoi » (paiement) et « combien » (montant)
 * sans avoir a lire les intitules.
 *
 * Les polices standard de pdfkit utilisent l'encodage WinAnsi : les accents
 * francais sont donc rendus correctement.
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { formaterMontant, montantEnLettres } from '../utils/montantEnLettres.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
/* Logo sur aplat marine : son fond (#0B2E52) se fond exactement dans le bandeau. */
const LOGO_MARINE = path.resolve(DOSSIER, '../marque/logo-horizontal-marine.png');

const MARGE = 46;
const LARGEUR_PAGE = 595.28; // A4 portrait
const LARGEUR_UTILE = LARGEUR_PAGE - MARGE * 2;

/* Couleurs de la charte Technolab ISTA. */
const MARINE = '#0b2e52';
const ISTA = '#1f6fe0';
const GRIS = '#64748b';
const GRIS_CLAIR = '#94a3b8';
const BORDURE = '#e2e8f0';
const FOND_DOUX = '#f8fafc';

const LIBELLES_MODE = {
  especes: 'Especes',
  virement: 'Virement bancaire',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
  carte: 'Carte bancaire',
};

const dateFr = (valeur) =>
  new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Bandeau d'en-tete : logo, nature du document et numero de recu mis en avant.
 * Le numero est encadre : c'est la reference que l'on cite au telephone ou au guichet.
 */
function enTete(doc, paiement) {
  doc.rect(0, 0, LARGEUR_PAGE, 118).fill(MARINE);

  // Le fichier porte deja sa zone de protection : aucune marge a ajouter.
  doc.image(LOGO_MARINE, MARGE - 12, 26, { width: 186 });

  const largeurCartouche = 168;
  const xCartouche = LARGEUR_PAGE - MARGE - largeurCartouche;

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
    .text('RECU DE PAIEMENT', xCartouche, 30, {
      width: largeurCartouche, align: 'right', characterSpacing: 1.2,
    });

  // Cartouche du numero : fond clair sur le marine, donc immediatement reperable.
  doc.roundedRect(xCartouche, 48, largeurCartouche, 34, 5).fill('#ffffff');
  doc.fillColor(MARINE).font('Helvetica-Bold').fontSize(15)
    .text(paiement.numeroRecu, xCartouche, 58, { width: largeurCartouche, align: 'center' });

  doc.fillColor('#7fb6f7').font('Helvetica').fontSize(8)
    .text(`Emis le ${dateFr(new Date())}`, xCartouche, 90, {
      width: largeurCartouche, align: 'right',
    });
}

/**
 * Bloc d'informations : intitule en filet colore, puis couples libelle / valeur.
 * @param variante  'clair' (fond blanc) ou 'doux' (fond gris tres pale)
 */
function bloc(doc, titre, lignes, y, variante = 'clair') {
  const hauteur = 30 + lignes.length * 17 + 8;

  doc.roundedRect(MARGE, y, LARGEUR_UTILE, hauteur, 5)
    .fillAndStroke(variante === 'doux' ? FOND_DOUX : '#ffffff', BORDURE);

  // Filet vertical d'accent : signale le debut du bloc sans ajouter de bruit.
  doc.rect(MARGE, y + 10, 3, 14).fill(ISTA);

  doc.fillColor(MARINE).font('Helvetica-Bold').fontSize(8.5)
    .text(titre.toUpperCase(), MARGE + 14, y + 12, { characterSpacing: 0.8 });

  let ligneY = y + 32;
  for (const [libelle, valeur] of lignes) {
    doc.fillColor(GRIS).font('Helvetica').fontSize(9).text(libelle, MARGE + 14, ligneY);
    doc.fillColor(MARINE).font('Helvetica-Bold').fontSize(9)
      .text(String(valeur ?? '—'), MARGE + 175, ligneY, { width: LARGEUR_UTILE - 195 });
    ligneY += 17;
  }

  return y + hauteur + 12;
}

/**
 * Pave du montant percu : l'element dominant du document.
 * Aplat bleu pleine largeur, chiffre en 30 points, somme en toutes lettres dessous.
 */
function paveMontant(doc, paiement, y, qr) {
  const hauteur = 86;

  doc.roundedRect(MARGE, y, LARGEUR_UTILE, hauteur, 6).fill(ISTA);

  doc.fillColor('#bfdbfe').font('Helvetica-Bold').fontSize(8.5)
    .text('MONTANT PERCU', MARGE + 20, y + 14, { characterSpacing: 1 });

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(30)
    .text(formaterMontant(paiement.montant), MARGE + 20, y + 30);

  doc.fillColor('#dbeafe').font('Helvetica-Oblique').fontSize(8)
    .text(
      `Arrete a la somme de ${montantEnLettres(paiement.montant)} francs CFA.`,
      MARGE + 20, y + 66,
      { width: LARGEUR_UTILE - (qr ? 130 : 40) }
    );

  // QR de verification, cale dans le pave, sur une pastille blanche pour le contraste.
  if (qr) {
    const cote = 62;
    const x = MARGE + LARGEUR_UTILE - cote - 12;
    doc.roundedRect(x, y + 12, cote, cote, 4).fill('#ffffff');
    doc.image(qr, x + 4, y + 16, { width: cote - 8 });
  }

  return y + hauteur + 12;
}

/** Mentions legales de pied de page. */
function pied(doc, paiement) {
  const y = 690;

  doc.moveTo(MARGE, y).lineTo(MARGE + LARGEUR_UTILE, y).stroke(BORDURE);

  // Signatures
  doc.fillColor(GRIS).font('Helvetica').fontSize(8.5);
  doc.text('Le payeur', MARGE, y + 14);
  doc.text('Le service comptable', MARGE + 300, y + 14);
  doc.moveTo(MARGE, y + 56).lineTo(MARGE + 170, y + 56).stroke(BORDURE);
  doc.moveTo(MARGE + 300, y + 56).lineTo(MARGE + 470, y + 56).stroke(BORDURE);

  /*
   * Identification legale de l'etablissement.
   * RCCM et numero fiscal sont lus depuis la configuration : ils varient d'un
   * etablissement a l'autre et ne doivent pas etre codes en dur. Les lignes non
   * renseignees sont simplement omises plutot que d'afficher un espace vide.
   */
  const mentions = [
    env.etablissement.raisonSociale,
    env.etablissement.rccm && `RCCM : ${env.etablissement.rccm}`,
    env.etablissement.nif && `NIF : ${env.etablissement.nif}`,
    env.etablissement.adresse,
  ].filter(Boolean);

  doc.fillColor(GRIS_CLAIR).font('Helvetica').fontSize(7)
    .text(mentions.join('  ·  '), MARGE, y + 74, { width: LARGEUR_UTILE, align: 'center' });

  doc.fillColor(GRIS_CLAIR).fontSize(6.8)
    .text(
      `Recu ${paiement.numeroRecu} genere electroniquement par la plateforme de gestion Technolab ISTA. `
      + 'A conserver : il fait foi du reglement en cas de contestation. '
      + 'Authenticite verifiable en scannant le code du document.',
      MARGE, y + 88, { width: LARGEUR_UTILE, align: 'center' }
    );
}

/**
 * Ecrit le recu dans le flux fourni (typiquement `res`).
 * @param paiement document Paiement peuple (etudiant, echeance, encaissePar)
 * @param solde    solde de l'etudiant, affiche a titre indicatif
 */
export async function genererRecuPDF(paiement, solde, flux) {
  const doc = new PDFDocument({ size: 'A4', margin: MARGE, bufferPages: true });
  doc.pipe(flux);

  const etudiant = paiement.etudiant || {};
  const classe = etudiant.infosEtudiant?.classe;

  /*
   * QR de verification. Un echec de generation ne doit pas empecher l'emission du
   * recu : le document reste valable, il perd seulement son code.
   */
  let qr = null;
  try {
    qr = await QRCode.toBuffer(`${env.clientUrl}/verification/${paiement.numeroRecu}`, {
      type: 'png',
      width: 240,
      margin: 0,
      color: { dark: MARINE, light: '#ffffff' },
    });
  } catch (erreur) {
    console.error('[recu] QR non genere :', erreur.message);
  }

  enTete(doc, paiement);

  let y = 142;

  y = bloc(doc, 'Etudiant', [
    ['Nom et prenom', `${etudiant.prenom || ''} ${etudiant.nom || ''}`.trim()],
    ['Matricule', etudiant.matricule],
    ['Classe', classe ? `${classe.nom} — ${classe.filiere || ''}` : 'Non affecte'],
    ['Annee scolaire', paiement.echeance?.anneeScolaire || classe?.anneeScolaire],
  ], y);

  y = bloc(doc, 'Detail du reglement', [
    ['Designation', paiement.echeance?.libelle || 'Versement libre'],
    ['Date du paiement', dateFr(paiement.datePaiement)],
    ['Mode de reglement', LIBELLES_MODE[paiement.mode] || paiement.mode],
    ['Reference', paiement.reference || '—'],
    ['Encaisse par', paiement.encaissePar
      ? `${paiement.encaissePar.prenom} ${paiement.encaissePar.nom}`
      : '—'],
  ], y, 'doux');

  y = paveMontant(doc, paiement, y, qr);

  if (solde) {
    y = bloc(doc, 'Situation du compte', [
      ['Total du (annee)', formaterMontant(solde.total)],
      ['Total regle', formaterMontant(solde.paye)],
      ['Reste a payer', formaterMontant(solde.reste)],
    ], y, 'doux');
  }

  // Un recu provisoire ou annule doit rester identifiable comme tel.
  if (paiement.statut !== 'valide') {
    const enAttente = paiement.statut === 'en_attente';

    doc.roundedRect(MARGE, y, LARGEUR_UTILE, 36, 5)
      .fillAndStroke(enAttente ? '#fffbeb' : '#fef2f2', enAttente ? '#fcd34d' : '#fca5a5');

    doc.fillColor(enAttente ? '#b45309' : '#b91c1c').font('Helvetica-Bold').fontSize(9)
      .text(
        enAttente
          ? 'Paiement en attente de validation par la direction : ce recu est provisoire.'
          : `Paiement annule${paiement.motifAnnulation ? ` — ${paiement.motifAnnulation}` : ''}. Ce recu est sans valeur.`,
        MARGE + 14, y + 13, { width: LARGEUR_UTILE - 28 }
      );
  }

  pied(doc, paiement);

  doc.end();
}
