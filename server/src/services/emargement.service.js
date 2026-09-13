/**
 * Liste d'emargement : le document papier sur lequel le professeur porte ses
 * notes au stylo avant de les saisir.
 *
 * A4 PORTRAIT, contrairement au bulletin qui est en paysage. Une liste se lit en
 * colonne et se remplit ligne a ligne ; la largeur ne sert a rien ici, la
 * hauteur si — elle decide du nombre d'etudiants par feuille.
 *
 * Les deux colonnes de notes sont VOLONTAIREMENT VIDES, avec une hauteur de
 * ligne calibree pour l'ecriture manuscrite (22 pt, soit environ 7,8 mm). En
 * dessous, deux chiffres et une virgule ne tiennent plus proprement.
 *
 * Le document est ecrit directement dans le flux HTTP : aucun fichier temporaire
 * n'est cree sur le disque du serveur.
 */
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const LOGO_MARINE = path.resolve(DOSSIER, '../marque/blason-sur-marine.png');

const MARGE = 42;
const LARGEUR_PAGE = 595.28; // A4 portrait
const HAUTEUR_PAGE = 841.89;
const LARGEUR_UTILE = LARGEUR_PAGE - MARGE * 2;

const MARINE = '#2e4474';
const ISTA = '#038129';
const GRIS = '#64748b';
const BORDURE = '#cbd5e1';
const FOND_DOUX = '#f8fafc';

/** Hauteur d'une ligne du tableau : calibree pour une note ecrite a la main. */
const HAUTEUR_LIGNE = 22;

const LIBELLES_SEMESTRE = { semestre1: 'Semestre 1', semestre2: 'Semestre 2' };

/** Colonnes du tableau, en largeurs proportionnelles a la zone utile. */
const COLONNES = [
  { cle: 'numero', titre: 'N°', part: 0.07, align: 'center' },
  { cle: 'nom', titre: 'Nom et prenom', part: 0.40, align: 'left' },
  { cle: 'matricule', titre: 'Matricule', part: 0.20, align: 'left' },
  /*
   * Intitules volontairement COURTS. « Note de classe » se repliait sur deux
   * lignes et la seconde sortait du bandeau, tronquee. Deux mots suffisent :
   * le pied de page rappelle que les notes sont sur 20.
   */
  { cle: 'noteClasse', titre: 'Note classe', part: 0.165, align: 'center', saisie: true },
  { cle: 'noteExamen', titre: 'Note examen', part: 0.165, align: 'center', saisie: true },
];

/** Position et largeur de chaque colonne, calculees une fois. */
const GEOMETRIE = (() => {
  let x = MARGE;
  return COLONNES.map((colonne) => {
    const largeur = LARGEUR_UTILE * colonne.part;
    const position = { ...colonne, x, largeur };
    x += largeur;
    return position;
  });
})();

const dateFr = (valeur) =>
  new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

/** Bandeau d'en-tete : blason, nom compose, et nature du document. */
function enTete(doc, contexte) {
  doc.rect(0, 0, LARGEUR_PAGE, 96).fill(MARINE);

  const hauteurBlason = 52;
  const largeurBlason = Math.round(hauteurBlason * (263 / 245));
  doc.image(LOGO_MARINE, MARGE, 22, { height: hauteurBlason });

  const xNom = MARGE + largeurBlason + 11;
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(15).text('TechnoLAB-ISTA', xNom, 30);
  doc.fillColor('#c4cddc').font('Helvetica').fontSize(6.5)
    .text('Institut Superieur de Technologies Appliquees', xNom, 49, { width: 200 });

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
    .text('LISTE D EMARGEMENT', MARGE, 30, {
      width: LARGEUR_UTILE, align: 'right', characterSpacing: 1.1,
    });
  doc.fillColor('#c4cddc').font('Helvetica').fontSize(8)
    .text(`Editee le ${dateFr(new Date())}`, MARGE, 48, {
      width: LARGEUR_UTILE, align: 'right',
    });
}

/**
 * Bloc de contexte : ce que la feuille concerne.
 *
 * Sans lui, une pile de listes remplies devient indechiffrable une fois
 * detachee de son ecran d'origine.
 */
function contexteDuDocument(doc, contexte, y) {
  const hauteur = 58;
  doc.roundedRect(MARGE, y, LARGEUR_UTILE, hauteur, 5).fillAndStroke('#ffffff', BORDURE);
  doc.rect(MARGE, y + 10, 3, 14).fill(ISTA);

  const champs = [
    ['Classe', contexte.classe],
    ['Matiere', `${contexte.matiere} (${contexte.code})`],
    ['Semestre', LIBELLES_SEMESTRE[contexte.semestre] || contexte.semestre],
    ['Annee', contexte.anneeScolaire],
    ['Professeur', contexte.professeur || 'Non assigne'],
    ['Effectif', `${contexte.effectif} etudiant(s)`],
  ];

  // Deux colonnes de trois lignes : la feuille reste dense sans etre serree.
  const largeurColonne = LARGEUR_UTILE / 2 - 14;
  champs.forEach(([libelle, valeur], index) => {
    const colonne = index % 2;
    const ligne = Math.floor(index / 2);
    const x = MARGE + 14 + colonne * largeurColonne;
    const ligneY = y + 12 + ligne * 14;

    doc.fillColor(GRIS).font('Helvetica').fontSize(8).text(`${libelle} :`, x, ligneY, { width: 60 });
    doc.fillColor(MARINE).font('Helvetica-Bold').fontSize(8)
      .text(String(valeur ?? '—'), x + 62, ligneY, { width: largeurColonne - 70 });
  });

  return y + hauteur + 14;
}

/** Ligne d'en-tete du tableau. */
function enTeteTableau(doc, y) {
  const hauteur = 22;
  doc.rect(MARGE, y, LARGEUR_UTILE, hauteur).fill(MARINE);

  for (const colonne of GEOMETRIE) {
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5)
      .text(colonne.titre.toUpperCase(), colonne.x + 4, y + 7.5, {
        width: colonne.largeur - 8,
        align: colonne.align,
        characterSpacing: 0.4,
        // Une seule ligne, quoi qu'il arrive : un repli sortirait du bandeau.
        lineBreak: false,
        ellipsis: true,
      });
  }

  return y + hauteur;
}

/**
 * Une ligne d'etudiant.
 *
 * Les cellules de saisie recoivent un fond blanc et un encadrement net : sur une
 * impression en noir et blanc, c'est ce qui distingue ce qui est a remplir de ce
 * qui est deja imprime.
 */
function ligneEtudiant(doc, etudiant, numero, y) {
  const pair = numero % 2 === 0;
  if (pair) doc.rect(MARGE, y, LARGEUR_UTILE, HAUTEUR_LIGNE).fill(FOND_DOUX);

  for (const colonne of GEOMETRIE) {
    if (colonne.saisie) {
      // Case a remplir : fond blanc franc, quel que soit le zebrage.
      doc.rect(colonne.x + 3, y + 2, colonne.largeur - 6, HAUTEUR_LIGNE - 4)
        .fillAndStroke('#ffffff', BORDURE);
      continue;
    }

    const valeur = colonne.cle === 'numero' ? String(numero) : etudiant[colonne.cle] || '';
    const police = colonne.cle === 'nom' ? 'Helvetica-Bold' : 'Helvetica';

    doc.fillColor(colonne.cle === 'nom' ? MARINE : GRIS).font(police).fontSize(8.5)
      .text(String(valeur), colonne.x + 4, y + 7, {
        width: colonne.largeur - 8, align: colonne.align, ellipsis: true, lineBreak: false,
      });
  }

  // Filet de separation, trace apres le contenu pour rester visible.
  doc.moveTo(MARGE, y + HAUTEUR_LIGNE).lineTo(MARGE + LARGEUR_UTILE, y + HAUTEUR_LIGNE)
    .lineWidth(0.5).stroke(BORDURE);

  return y + HAUTEUR_LIGNE;
}

/** Pied de page : signature du professeur et rappel de la regle de calcul. */
function pied(doc, y) {
  doc.fillColor(GRIS).font('Helvetica').fontSize(8)
    .text('Nom et signature du professeur', MARGE, y + 16);
  doc.moveTo(MARGE, y + 46).lineTo(MARGE + 190, y + 46).stroke(BORDURE);

  doc.fillColor(GRIS).font('Helvetica').fontSize(8)
    .text('Date de remise', MARGE + 300, y + 16);
  doc.moveTo(MARGE + 300, y + 46).lineTo(MARGE + 450, y + 46).stroke(BORDURE);

  const mentions = [
    env.etablissement.raisonSociale,
    env.etablissement.adresse,
    env.etablissement.telephone && `Tel. ${env.etablissement.telephone}`,
  ].filter(Boolean);

  doc.fillColor('#94a3b8').fontSize(6.8)
    .text(
      `${mentions.join('  ·  ')}  —  Notes sur 20. La note de matiere est calculee `
      + 'automatiquement par la plateforme apres saisie.',
      MARGE, y + 62, { width: LARGEUR_UTILE, align: 'center' }
    );
}

/**
 * Genere la liste d'emargement dans le flux fourni.
 *
 * @param contexte  { classe, matiere, code, semestre, anneeScolaire, professeur }
 * @param etudiants liste deja triee par ordre alphabetique
 * @param flux      reponse HTTP
 */
export function genererEmargementPDF(contexte, etudiants, flux) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  doc.pipe(flux);

  enTete(doc, contexte);
  let y = contexteDuDocument(doc, { ...contexte, effectif: etudiants.length }, 112);
  y = enTeteTableau(doc, y);

  // Hauteur reservee au pied : on change de page avant d'y mordre.
  const limite = HAUTEUR_PAGE - MARGE - 96;

  etudiants.forEach((etudiant, index) => {
    if (y + HAUTEUR_LIGNE > limite) {
      doc.addPage({ size: 'A4', margin: 0 });
      enTete(doc, contexte);
      y = enTeteTableau(doc, 112);
    }
    y = ligneEtudiant(doc, etudiant, index + 1, y);
  });

  pied(doc, y);

  /*
   * Numerotation, posee a la fin : le nombre total de pages n'est connu qu'une
   * fois toutes les lignes tracees. Une liste de quarante etudiants deborde sur
   * deux feuilles, qui se separent facilement sur un bureau.
   */
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7)
      .text(`Page ${i + 1} / ${pages.count}`, MARGE, HAUTEUR_PAGE - 26, {
        width: LARGEUR_UTILE, align: 'right',
      });
  }

  doc.end();
}
