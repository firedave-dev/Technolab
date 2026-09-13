/**
 * Unites d'Enseignement : etat du semestre, proposition d'appariement,
 * application et reglage manuel.
 *
 * L'appariement automatique est une PROPOSITION, pas une sentence : il est
 * calcule a la demande, presente a l'administration, et n'est ecrit en base que
 * lorsqu'elle l'applique. Une generation qui ecrirait directement priverait la
 * direction de tout droit de regard sur des regroupements dont l'algorithme
 * reconnait lui-meme qu'ils sont parfois arbitraires.
 */
import { Matiere } from '../models/Matiere.js';
import { UE } from '../models/UE.js';
import { Classe } from '../models/Classe.js';
import { TypeMatiere } from '../models/TypeMatiere.js';
import { matriceAffinites } from '../models/AffiniteType.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';
import {
  apparierSemestre,
  etatSemestre,
  nommerUE,
  CONFIGURATIONS,
  CREDITS_PAR_SEMESTRE,
} from '../services/appariement.service.js';

/** Matieres actives d'une classe pour un semestre. */
const matieresDu = (classe, semestre, anneeScolaire) =>
  Matiere.find({ classe, semestre, anneeScolaire, actif: true })
    .populate('professeur', 'nom prenom')
    .lean();

/** Verifie l'existence de la classe et renvoie son annee par defaut. */
async function contexte(req) {
  const { classe: classeId, semestre = 'semestre1' } = req.query;

  const classe = await Classe.findById(classeId).lean();
  if (!classe) throw ApiError.badRequest('Classe introuvable');

  const anneeScolaire = req.query.anneeScolaire || classe.anneeScolaire;
  return { classe, semestre, anneeScolaire };
}

/**
 * GET /api/ue/etat — avancement du semestre pendant la saisie des matieres.
 *
 * Sert l'assistant de saisie : compteur de credits, decompte par categorie,
 * configurations encore atteignables et alerte d'impasse. Tout est recalcule a
 * la demande — rien de cet etat n'est stocke.
 */
export const etat = catchAsync(async (req, res) => {
  const { classe, semestre, anneeScolaire } = await contexte(req);
  const matieres = await matieresDu(classe._id, semestre, anneeScolaire);

  const n2 = matieres.filter((m) => m.creditsEcts === 2).length;
  const n3 = matieres.filter((m) => m.creditsEcts === 3).length;

  res.json({
    success: true,
    classe: { id: classe._id, nom: classe.nom },
    semestre,
    anneeScolaire,
    total: CREDITS_PAR_SEMESTRE,
    etat: etatSemestre(n2, n3),
    matieres: matieres.map((m) => ({
      id: m._id,
      nom: m.nom,
      code: m.code,
      coefficient: m.coefficient,
      creditsEcts: m.creditsEcts,
      typeMatiere: m.typeMatiere || null,
      ue: m.ue || null,
    })),
  });
});

/**
 * GET /api/ue/proposition — appariement propose, sans rien ecrire.
 *
 * Les UE deja enregistrees ne sont pas consultees : la proposition part
 * toujours des matieres, pour que l'administration compare ce que
 * l'algorithme suggere a ce qui est en place.
 */
export const proposition = catchAsync(async (req, res) => {
  const { classe, semestre, anneeScolaire } = await contexte(req);
  const matieres = await matieresDu(classe._id, semestre, anneeScolaire);

  const [affinites, types] = await Promise.all([matriceAffinites(), TypeMatiere.find().lean()]);
  const libelles = new Map(types.map((t) => [t.code, t.libelle]));

  const resultat = apparierSemestre(matieres, affinites);

  res.json({
    success: true,
    classe: { id: classe._id, nom: classe.nom },
    semestre,
    anneeScolaire,
    erreurs: resultat.erreurs,
    ues: resultat.ues.map((ue, index) => ({
      ...nommerUE(ue, index + 1, libelles),
      credits: ue.credits,
      score: ue.score,
      parDefaut: ue.parDefaut,
      matieres: ue.matieres.map((m) => ({
        id: m._id,
        nom: m.nom,
        code: m.code,
        creditsEcts: m.creditsEcts,
        typeMatiere: m.typeMatiere || null,
      })),
    })),
  });
});

/**
 * POST /api/ue/appliquer — enregistre une proposition.
 *
 * Le corps porte les UE telles que l'administration les a validees, eventuellement
 * renommees ou remaniees. Le serveur ne fait pas confiance a ce qu'il recoit : il
 * REVERIFIE la compatibilite des credits, puisque c'est la seule regle que le
 * reglage manuel ne doit jamais pouvoir enfreindre.
 *
 * L'operation est de type « remplacement » : les UE du semestre sont reconstruites.
 * Un rapprochement ligne a ligne laisserait des UE orphelines a la moindre
 * reorganisation.
 */
export const appliquer = catchAsync(async (req, res) => {
  const { classe: classeId, semestre, anneeScolaire, ues } = req.body;

  const classe = await Classe.findById(classeId).lean();
  if (!classe) throw ApiError.badRequest('Classe introuvable');

  const annee = anneeScolaire || classe.anneeScolaire;
  const matieres = await matieresDu(classeId, semestre, annee);
  const parId = new Map(matieres.map((m) => [String(m._id), m]));

  // --- Verifications avant toute ecriture ---
  const vues = new Set();

  for (const ue of ues) {
    const membres = ue.matieres.map((id) => parId.get(String(id)));

    if (membres.some((m) => !m)) {
      throw ApiError.badRequest('Une UE reference une matiere absente de ce semestre');
    }

    const credits = new Set(membres.map((m) => m.creditsEcts));
    if (credits.size > 1) {
      throw ApiError.badRequest(
        `L UE « ${ue.intitule} » melange des matieres a ${[...credits].join(' et ')} credits. `
        + 'Une UE ne regroupe que des matieres de meme credit.'
      );
    }

    for (const m of membres) {
      if (vues.has(String(m._id))) {
        throw ApiError.badRequest(`La matiere « ${m.nom} » figure dans deux UE`);
      }
      vues.add(String(m._id));
    }
  }

  // --- Ecriture ---
  await UE.deleteMany({ classe: classeId, semestre, anneeScolaire: annee });
  await Matiere.updateMany(
    { classe: classeId, semestre, anneeScolaire: annee },
    { $unset: { ue: '' } }
  );

  const creees = [];
  for (const [index, ue] of ues.entries()) {
    const creee = await UE.create({
      code: ue.code || `UE${String(index + 1).padStart(2, '0')}`,
      intitule: ue.intitule,
      classe: classeId,
      semestre,
      anneeScolaire: annee,
      ordre: index,
    });

    await Matiere.updateMany({ _id: { $in: ue.matieres } }, { $set: { ue: creee._id } });
    creees.push(creee);
  }

  res.json({
    success: true,
    message: `${creees.length} UE enregistrees`,
    ues: creees,
    matieresHorsUE: matieres.length - vues.size,
  });
});

/**
 * PATCH /api/ue/echanger — echange deux matieres entre leurs UE respectives.
 *
 * Reglage fin, sans repasser par une proposition complete. Le controle de
 * compatibilite est ici la seule chose qui compte : echanger deux matieres de
 * credits differents casserait les deux UE a la fois.
 */
export const echanger = catchAsync(async (req, res) => {
  const { matiereA, matiereB } = req.body;

  const [a, b] = await Promise.all([
    Matiere.findById(matiereA).lean(),
    Matiere.findById(matiereB).lean(),
  ]);

  if (!a || !b) throw ApiError.badRequest('Matiere introuvable');
  if (!a.ue || !b.ue) throw ApiError.badRequest('Les deux matieres doivent appartenir a une UE');

  if (a.creditsEcts !== b.creditsEcts) {
    throw ApiError.badRequest(
      `Echange impossible : « ${a.nom} » vaut ${a.creditsEcts} credits et `
      + `« ${b.nom} » ${b.creditsEcts}. Les deux UE deviendraient incoherentes.`
    );
  }

  if (String(a.ue) === String(b.ue)) {
    throw ApiError.badRequest('Ces deux matieres appartiennent deja a la meme UE');
  }

  await Promise.all([
    Matiere.updateOne({ _id: a._id }, { $set: { ue: b.ue } }),
    Matiere.updateOne({ _id: b._id }, { $set: { ue: a.ue } }),
  ]);

  res.json({ success: true, message: `« ${a.nom} » et « ${b.nom} » ont ete echangees` });
});

/** GET /api/ue/types — nomenclature disciplinaire, pour les listes de saisie. */
export const types = catchAsync(async (req, res) => {
  const liste = await TypeMatiere.find({ actif: true }).sort({ ordre: 1 }).lean();
  res.json({
    success: true,
    types: liste.map((t) => ({ code: t.code, libelle: t.libelle })),
    configurations: CONFIGURATIONS,
  });
});

/** GET /api/ue — UE enregistrees d'un semestre, avec leurs matieres. */
export const lister = catchAsync(async (req, res) => {
  const { classe, semestre, anneeScolaire } = await contexte(req);

  const ues = await UE.find({ classe: classe._id, semestre, anneeScolaire })
    .sort({ ordre: 1 })
    .lean();

  const matieres = await matieresDu(classe._id, semestre, anneeScolaire);

  res.json({
    success: true,
    ues: ues.map((ue) => {
      const siennes = matieres.filter((m) => String(m.ue) === String(ue._id));
      return {
        id: ue._id,
        code: ue.code,
        intitule: ue.intitule,
        // Le total n'est pas stocke : il est la somme de ses matieres.
        credits: siennes.reduce((s, m) => s + (m.creditsEcts || 0), 0),
        matieres: siennes.map((m) => ({
          id: m._id, nom: m.nom, code: m.code,
          creditsEcts: m.creditsEcts, typeMatiere: m.typeMatiere || null,
        })),
      };
    }),
    matieresHorsUE: matieres
      .filter((m) => !m.ue)
      .map((m) => ({ id: m._id, nom: m.nom, creditsEcts: m.creditsEcts })),
  });
});
