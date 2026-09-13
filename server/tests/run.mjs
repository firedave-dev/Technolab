/**
 * Lance les suites de tests a la suite.
 * Prerequis : MongoDB accessible et `npm run seed` execute au moins une fois.
 * Usage : npm test (depuis server/, ou npm run test a la racine)
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dossier = path.dirname(fileURLToPath(import.meta.url));

const SUITES = [
  ['Phase 1 — Authentification et roles', 'phase1-authentification.test.mjs'],
  ['Phase 2 — Utilisateurs, etudiants et classes', 'phase2-gestion.test.mjs'],
  ['Phase 3 — Notes, examens et absences', 'phase3-scolarite.test.mjs'],
  ['Phase 4 — Comptabilite, paiements et recus', 'phase4-comptabilite.test.mjs'],
  ['Phase 5 — Planning et statistiques', 'phase5-planning.test.mjs'],
  ['Phase 6 — Charte, emails et documents', 'phase6-charte.test.mjs'],
  ['Phase 7 — Notation, UE et credits ECTS', 'phase7-notation.test.mjs'],
  ['Phase 8 — Credits, types et appariement en UE', 'phase8-appariement.test.mjs'],
];

/** Execute une suite et renvoie son code de sortie. */
const lancer = (fichier) =>
  new Promise((resoudre) => {
    const processus = spawn(process.execPath, [path.join(dossier, fichier)], {
      stdio: 'inherit',
      // NODE_ENV=test desactive la limitation de debit, qui fausserait l'enchainement.
      env: { ...process.env, NODE_ENV: 'test' },
    });
    processus.on('close', resoudre);
  });

let echecs = 0;

for (const [titre, fichier] of SUITES) {
  console.log(`
${'='.repeat(60)}
${titre}
${'='.repeat(60)}`);
  const code = await lancer(fichier);
  if (code !== 0) echecs += 1;
}

console.log(`
${echecs ? `${echecs} suite(s) en echec` : 'Toutes les suites sont passees'}`);
process.exit(echecs ? 1 : 0);
