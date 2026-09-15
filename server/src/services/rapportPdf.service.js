/**
 * Mise en PDF des rapports de direction.
 *
 * UN SEUL GABARIT POUR CINQ RAPPORTS. Les rapports different par leurs colonnes
 * et leurs totaux, pas par leur forme : en-tete de l'etablissement, bandeau de
 * synthese, tableaux, pagination. Ecrire cinq gabarits garantirait qu'ils
 * divergent des la premiere retouche.
 *
 * A4 PAYSAGE : ces documents sont des TABLEAUX. Les impayes portent huit
 * colonnes, les encaissements neuf ; en portrait, les intitules se replient et
 * les montants se chevauchent.
 *
 * Le document est ecrit directement dans le flux HTTP, sans fichier temporaire.
 */
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const DOSSIER = path.dirname(fileURLToPath(import.meta.url));
const LOGO = path.resolve(DOSSIER, '../marque/blason-sur-marine.png');

const MARGE = 36;
const LARGEUR_PAGE = 841.89;   // A4 paysage
const HAUTEUR_PAGE = 595.28;
const UTILE = LARGEUR_PAGE - MARGE * 2;

const MARINE = '#2e4474';
const ISTA = '#038129';
const GRIS = '#64748b';
const BORDURE = '#cbd5e1';
const FOND = '#f1f5f9';
const ROUGE = '#b91c1c';

const HAUTEUR_LIGNE = 18;

/*
 * Separateur de milliers : espace ORDINAIRE.
 *
 * `toLocaleString('fr-FR')` insere une espace fine insecable (U+202F). Les
 * polices standard d'un PDF ne la possedent pas et PDFKit la remplace par une
 * barre oblique : « 2 233 000 » sortait « 2 /233 /000 ». On la ramene donc a
 * une espace simple, de meme pour l'insecable ordinaire.
 */
const somme = (n) => Number(n || 0).toLocaleString('fr-FR').replace(/[  ]/g, ' ');
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

/* --------------------------------------------------------------- gabarit */

function entete(doc, rapport) {
  const hauteur = 62;
  doc.rect(0, 0, LARGEUR_PAGE, hauteur).fill(MARINE);

  try {
    doc.image(LOGO, MARGE, 12, { height: 38 });
  } catch {
    // Le logo manquant ne doit pas empecher l'edition du rapport.
  }

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14)
    .text(rapport.titre, MARGE + 52, 16, { width: UTILE - 52 });
  doc.font('Helvetica').fontSize(9).fillColor('#c4cddc')
    .text(`${env.etablissement?.nom || 'TechnoLAB-ISTA'}  ·  ${rapport.periode}`,
      MARGE + 52, 36, { width: UTILE - 52 });

  doc.fillColor('#c4cddc').fontSize(8)
    .text(`Édité le ${new Date().toLocaleString('fr-FR')}`,
      LARGEUR_PAGE - MARGE - 200, 40, { width: 200, align: 'right' });

  doc.y = hauteur + 16;
}

/** Bandeau de chiffres clefs : ce qu'on lit en premier, et parfois seul. */
function synthese(doc, indicateurs) {
  const retenus = indicateurs.filter((i) => i.valeur !== null && i.valeur !== undefined);
  if (!retenus.length) return;

  const largeur = UTILE / retenus.length;
  const y = doc.y;

  retenus.forEach((indicateur, i) => {
    const x = MARGE + i * largeur;
    doc.roundedRect(x + 3, y, largeur - 6, 42, 5).fillAndStroke(FOND, BORDURE);
    doc.fillColor(GRIS).font('Helvetica').fontSize(7.5)
      .text(indicateur.libelle.toUpperCase(), x + 11, y + 8, { width: largeur - 22 });
    doc.fillColor(indicateur.alerte ? ROUGE : MARINE).font('Helvetica-Bold').fontSize(13)
      .text(String(indicateur.valeur), x + 11, y + 20, { width: largeur - 22 });
  });

  doc.y = y + 56;
}

function titreSection(doc, texte) {
  if (doc.y > HAUTEUR_PAGE - 90) nouvellePage(doc);
  doc.fillColor(ISTA).font('Helvetica-Bold').fontSize(10)
    .text(texte, MARGE, doc.y);
  doc.moveDown(0.4);
}

/**
 * Nouvelle page, en-tete compris.
 *
 * Le rapport est porte PAR LE DOCUMENT, et non par une variable de module. Deux
 * rapports demandes presque en meme temps partagent le meme module : une
 * variable partagee faisait que le second ecrasait le contexte du premier, qui
 * finissait de s'ecrire pendant ce temps — page d'en-tete fausse, et parfois
 * flux interrompu. Chaque document transporte donc le sien.
 */
function nouvellePage(doc) {
  doc.addPage({ size: 'A4', layout: 'landscape', margin: MARGE });
  if (doc.rapportCourant) entete(doc, doc.rapportCourant);
}

/**
 * Tableau generique.
 * `colonnes` : { titre, cle, part, align, format }
 */
function tableau(doc, colonnes, lignes, { totaux = null } = {}) {
  if (!lignes.length) {
    doc.fillColor(GRIS).font('Helvetica-Oblique').fontSize(9)
      .text('Aucune donnée sur cette période.', MARGE, doc.y);
    doc.moveDown(1);
    return;
  }

  let x = MARGE;
  const geometrie = colonnes.map((c) => {
    const largeur = UTILE * c.part;
    const place = { ...c, x, largeur };
    x += largeur;
    return place;
  });

  const enTeteTableau = () => {
    const y = doc.y;
    doc.rect(MARGE, y, UTILE, HAUTEUR_LIGNE).fill(MARINE);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(7.5);
    for (const c of geometrie) {
      doc.text(c.titre, c.x + 5, y + 5.5, {
        width: c.largeur - 10, align: c.align || 'left',
        height: HAUTEUR_LIGNE - 6, ellipsis: true, lineBreak: false,
      });
    }
    doc.y = y + HAUTEUR_LIGNE;
  };

  enTeteTableau();

  lignes.forEach((ligne, index) => {
    // Saut de page : l'en-tete du tableau est REPETE, sans quoi les colonnes
    // d'une page 2 n'ont plus de nom.
    if (doc.y > HAUTEUR_PAGE - 50) {
      nouvellePage(doc);
      enTeteTableau();
    }

    const y = doc.y;
    if (index % 2 === 1) doc.rect(MARGE, y, UTILE, HAUTEUR_LIGNE).fill('#f8fafc');

    doc.font('Helvetica').fontSize(7.5);
    for (const c of geometrie) {
      const brut = ligne[c.cle];
      const texte = c.format ? c.format(brut, ligne) : (brut ?? '—');
      doc.fillColor(c.couleur ? c.couleur(brut, ligne) : '#1f2937')
        .text(String(texte), c.x + 5, y + 5.5, {
          width: c.largeur - 10,
          align: c.align || 'left',
          // Hauteur bornee + ellipse : un intitule trop long est coupe par des
          // points de suspension au lieu de deborder sur la ligne suivante.
          height: HAUTEUR_LIGNE - 6,
          ellipsis: true,
          lineBreak: false,
        });
    }
    doc.y = y + HAUTEUR_LIGNE;
  });

  if (totaux) {
    const y = doc.y;
    doc.rect(MARGE, y, UTILE, HAUTEUR_LIGNE).fillAndStroke(FOND, BORDURE);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MARINE);
    for (const c of geometrie) {
      if (totaux[c.cle] === undefined) continue;
      doc.text(String(totaux[c.cle]), c.x + 5, y + 5, {
        width: c.largeur - 10, align: c.align || 'left', lineBreak: false,
      });
    }
    doc.y = y + HAUTEUR_LIGNE;
  }

  doc.moveDown(1.2);
}

function pagination(doc) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(pages.start + i);
    doc.fillColor(GRIS).font('Helvetica').fontSize(7.5)
      .text(`Page ${i + 1} / ${pages.count}`,
        MARGE, HAUTEUR_PAGE - 24, { width: UTILE, align: 'center' });
  }
}

/* ------------------------------------------------------- un par rapport */

const CORPS = {
  encaissements(doc, r) {
    synthese(doc, [
      { libelle: 'Total encaissé', valeur: `${somme(r.total)} F` },
      { libelle: 'Nombre de reçus', valeur: r.nombre },
      { libelle: 'Montant moyen', valeur: r.nombre ? `${somme(Math.round(r.total / r.nombre))} F` : '—' },
      { libelle: 'Classes concernées', valeur: r.parClasse.length },
    ]);

    titreSection(doc, 'Répartition par mode de paiement');
    tableau(doc, [
      { titre: 'Mode', cle: 'libelle', part: 0.5 },
      { titre: 'Nombre', cle: 'nombre', part: 0.2, align: 'center' },
      { titre: 'Montant (FCFA)', cle: 'montant', part: 0.3, align: 'right', format: somme },
    ], r.parMode, { totaux: { libelle: 'TOTAL', nombre: r.nombre, montant: somme(r.total) } });

    titreSection(doc, 'Répartition par classe');
    tableau(doc, [
      { titre: 'Classe', cle: 'libelle', part: 0.5 },
      { titre: 'Nombre', cle: 'nombre', part: 0.2, align: 'center' },
      { titre: 'Montant (FCFA)', cle: 'montant', part: 0.3, align: 'right', format: somme },
    ], r.parClasse);

    titreSection(doc, 'Détail des encaissements');
    tableau(doc, [
      { titre: 'Date', cle: 'date', part: 0.09, format: jour },
      { titre: 'N° reçu', cle: 'recu', part: 0.12 },
      { titre: 'Étudiant', cle: 'etudiant', part: 0.18 },
      { titre: 'Matricule', cle: 'matricule', part: 0.12 },
      { titre: 'Classe', cle: 'classe', part: 0.17 },
      { titre: 'Motif', cle: 'motif', part: 0.16 },
      { titre: 'Mode', cle: 'mode', part: 0.08 },
      { titre: 'Montant', cle: 'montant', part: 0.08, align: 'right', format: somme },
    ], r.lignes, { totaux: { recu: 'TOTAL', montant: somme(r.total) } });
  },

  impayes(doc, r) {
    synthese(doc, [
      { libelle: 'Reste à recouvrer', valeur: `${somme(r.total)} F`, alerte: r.total > 0 },
      { libelle: 'Échéances concernées', valeur: r.nombre },
      { libelle: 'Dont échues', valeur: r.echus, alerte: r.echus > 0 },
      { libelle: 'Montant échu', valeur: `${somme(r.montantEchu)} F`, alerte: r.montantEchu > 0 },
    ]);

    titreSection(doc, 'Par classe');
    tableau(doc, [
      { titre: 'Classe', cle: 'libelle', part: 0.45 },
      { titre: 'Étudiants', cle: 'etudiants', part: 0.15, align: 'center' },
      { titre: 'Échéances', cle: 'nombre', part: 0.15, align: 'center' },
      { titre: 'Reste dû (FCFA)', cle: 'montant', part: 0.25, align: 'right', format: somme },
    ], r.parClasse, { totaux: { libelle: 'TOTAL', montant: somme(r.total) } });

    titreSection(doc, 'Détail par échéance');
    tableau(doc, [
      { titre: 'Étudiant', cle: 'etudiant', part: 0.16 },
      { titre: 'Matricule', cle: 'matricule', part: 0.11 },
      { titre: 'Classe', cle: 'classe', part: 0.17 },
      { titre: 'Échéance', cle: 'libelle', part: 0.17 },
      { titre: 'Date', cle: 'echeance', part: 0.08, format: jour },
      { titre: 'Dû', cle: 'du', part: 0.08, align: 'right', format: somme },
      { titre: 'Payé', cle: 'paye', part: 0.08, align: 'right', format: somme },
      { titre: 'Reste', cle: 'reste', part: 0.08, align: 'right', format: somme,
        couleur: () => ROUGE },
      { titre: 'Retard', cle: 'joursRetard', part: 0.07, align: 'center',
        format: (v) => (v > 0 ? `${v} j` : '—') },
    ], r.lignes, { totaux: { classe: 'TOTAL', reste: somme(r.total) } });
  },

  resultats(doc, r) {
    synthese(doc, [
      { libelle: 'Effectif', valeur: r.effectif },
      { libelle: 'Admis', valeur: r.admis },
      { libelle: 'Taux de réussite', valeur: r.tauxReussite === null ? '—' : `${r.tauxReussite} %` },
      { libelle: 'Classes', valeur: r.blocs.length },
    ]);

    for (const bloc of r.blocs) {
      titreSection(doc, `${bloc.classe} — moyenne ${bloc.moyenneClasse ?? '—'} / 20  ·  `
        + `${bloc.admis}/${bloc.effectif} admis (${bloc.tauxReussite ?? '—'} %)`);

      tableau(doc, [
        { titre: 'Rang', cle: 'rang', part: 0.06, align: 'center' },
        { titre: 'Étudiant', cle: 'etudiant', part: 0.26 },
        { titre: 'Matricule', cle: 'matricule', part: 0.16 },
        { titre: 'Moyenne', cle: 'moyenne', part: 0.12, align: 'center',
          format: (v) => (v === null ? '—' : v.toFixed(2).replace('.', ',')),
          couleur: (v) => (v !== null && v >= 10 ? ISTA : ROUGE) },
        { titre: 'Mention', cle: 'mention', part: 0.18 },
        { titre: 'Crédits', cle: 'creditsAcquis', part: 0.12, align: 'center',
          format: (v, l) => `${v} / ${l.creditsTotal}` },
        { titre: 'Décision', cle: 'admis', part: 0.10, align: 'center',
          format: (v) => (v ? 'Admis' : 'Ajourné'),
          couleur: (v) => (v ? ISTA : ROUGE) },
      ], bloc.lignes);
    }
  },

  assiduite(doc, r) {
    synthese(doc, [
      { libelle: 'Total signalements', valeur: r.total },
      { libelle: 'Absences', valeur: r.absences },
      { libelle: 'Retards', valeur: r.retards },
      { libelle: 'Justifiés', valeur: r.justifiees },
    ]);

    titreSection(doc, 'Par classe');
    tableau(doc, [
      { titre: 'Classe', cle: 'libelle', part: 0.4 },
      { titre: 'Absences', cle: 'absences', part: 0.2, align: 'center' },
      { titre: 'Retards', cle: 'retards', part: 0.2, align: 'center' },
      { titre: 'Justifiés', cle: 'justifiees', part: 0.2, align: 'center' },
    ], r.parClasse);

    titreSection(doc, 'Par étudiant — les plus concernés en tête');
    tableau(doc, [
      { titre: 'Étudiant', cle: 'etudiant', part: 0.28 },
      { titre: 'Matricule', cle: 'matricule', part: 0.18 },
      { titre: 'Classe', cle: 'classe', part: 0.26 },
      { titre: 'Absences', cle: 'absences', part: 0.1, align: 'center' },
      { titre: 'Retards', cle: 'retards', part: 0.09, align: 'center' },
      { titre: 'Justifiés', cle: 'justifiees', part: 0.09, align: 'center' },
    ], r.lignes);
  },

  effectifs(doc, r) {
    synthese(doc, [
      { libelle: 'Étudiants', valeur: r.effectif },
      { libelle: 'Enseignants', valeur: r.professeurs },
      { libelle: 'Personnel', valeur: r.personnel },
      { libelle: 'Comptes parents', valeur: r.parents },
      { libelle: 'Filles / garçons', valeur: `${r.femmes} / ${r.hommes}` },
    ]);

    titreSection(doc, 'Répartition par classe');
    tableau(doc, [
      { titre: 'Classe', cle: 'classe', part: 0.28 },
      { titre: 'Niveau', cle: 'niveau', part: 0.08, align: 'center' },
      { titre: 'Filière', cle: 'filiere', part: 0.24 },
      { titre: 'Effectif', cle: 'effectif', part: 0.09, align: 'center' },
      { titre: 'Capacité', cle: 'capacite', part: 0.09, align: 'center' },
      { titre: 'Occupation', cle: 'occupation', part: 0.1, align: 'center',
        format: (v) => (v === null ? '—' : `${v} %`) },
      { titre: 'Filles', cle: 'femmes', part: 0.06, align: 'center' },
      { titre: 'Garçons', cle: 'hommes', part: 0.06, align: 'center' },
    ], r.blocs, { totaux: { classe: 'TOTAL', effectif: r.effectif, femmes: r.femmes, hommes: r.hommes } });
  },
};

/**
 * Ecrit le rapport dans le flux fourni.
 * @param {object} rapport  sortie de rapports.service.js
 * @param {Writable} flux   generalement la reponse HTTP
 */
export function genererRapportPDF(rapport, flux) {
  const doc = new PDFDocument({
    size: 'A4', layout: 'landscape', margin: MARGE, bufferPages: true,
    info: { Title: `${rapport.titre} — ${rapport.periode}`, Author: 'TechnoLAB-ISTA' },
  });

  doc.pipe(flux);
  doc.rapportCourant = rapport;

  entete(doc, rapport);
  (CORPS[rapport.type] || (() => {}))(doc, rapport);
  pagination(doc);

  doc.end();
  return doc;
}
