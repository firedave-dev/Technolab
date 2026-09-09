/**
 * Bulletin de notes — document paysage, concu pour l'ecran comme pour le papier.
 *
 * Format A4 paysage : la largeur permet d'aligner sur une seule ligne toutes les
 * evaluations d'une matiere, la ou une mise en page verticale obligeait a empiler
 * chaque note. La grille se lit d'un coup d'oeil, matiere par matiere.
 *
 * L'impression n'imprime que le document : la regle `@media print` de index.css
 * masque tout puis rend visible la seule classe `document-imprimable`.
 *
 * Sert trois publics — l'etudiant (son bulletin), le parent (celui de son enfant)
 * et le personnel (via /notes/bulletin/:id, evaluations non publiees comprises).
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Printer } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import Logo from '../../components/Logo.jsx';
import SelecteurEnfant from '../../components/SelecteurEnfant.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBulletin } from '../../hooks/useScolarite.js';
import { useMesEnfants } from '../../hooks/useGestion.js';
import { ROLES } from '../../utils/roles.js';
import { PERIODES, libellePeriode } from '../../utils/scolarite.js';

/** Types d'evaluation regroupes par colonne du bulletin. */
const COLONNES_NOTES = [
  { cle: 'interrogations', titre: 'Interrogations', types: ['interrogation'] },
  { cle: 'devoirs', titre: 'Devoirs et examens', types: ['devoir', 'examen', 'tp', 'projet'] },
];

/** Couleur d'une moyenne : vert au-dessus de la moyenne, ambre puis rouge en dessous. */
function tonMoyenne(moyenne) {
  if (moyenne === null || moyenne === undefined) return 'text-slate-400';
  if (moyenne >= 12) return 'text-succes';
  if (moyenne >= 10) return 'text-marine';
  if (moyenne >= 8) return 'text-alerte';
  return 'text-retard';
}

/** Fond de la cellule de moyenne : discret, pour ne pas alourdir la grille. */
function fondMoyenne(moyenne) {
  if (moyenne === null || moyenne === undefined) return '';
  if (moyenne >= 12) return 'bg-succes-fond';
  if (moyenne >= 10) return '';
  return moyenne >= 8 ? 'bg-alerte-fond' : 'bg-retard-fond';
}

/** Note formatee avec son bareme : « 8/10 » leve l'ambiguite d'un « 8 » isole. */
const formatNote = (ligne) => {
  if (ligne.absent) return 'abs';
  if (ligne.valeur === null || ligne.valeur === undefined) return null;
  return `${String(ligne.valeur).replace('.', ',')}/${ligne.evaluation.bareme}`;
};

/** Indicateur de synthese, en tete du document. */
function Synthese({ libelle, valeur, detail, ton = 'text-marine' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="libelle-capitales text-[9px] text-slate-500">{libelle}</p>
      <p className={`mt-1 text-2xl font-bold leading-none tracking-tight ${ton}`}>{valeur}</p>
      {detail && <p className="mt-1 text-[11px] text-slate-500">{detail}</p>}
    </div>
  );
}

export default function BulletinEtudiant() {
  const { id: idRoute } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();

  const [periode, setPeriode] = useState('semestre1');
  const [enfant, setEnfant] = useState(null);

  const estParent = utilisateur?.role === ROLES.PARENT;
  const { data: enfantsData, isLoading: chargementEnfants } = useMesEnfants({ enabled: estParent });
  const enfants = enfantsData?.enfants || [];

  const idEtudiant = idRoute || (estParent ? enfant || enfants[0]?.id : utilisateur?.id);
  const { data, isLoading, isError } = useBulletin(idEtudiant, { periode });

  if (estParent && !idRoute && chargementEnfants) return <Chargement />;

  if (estParent && !idRoute && !enfants.length) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide
          icone={FileSpreadsheet}
          titre="Aucun enfant rattache"
          message="Le secretariat doit rattacher votre compte au dossier de votre enfant."
        />
      </div>
    );
  }

  if (isLoading) return <Chargement message="Calcul du bulletin..." />;

  if (isError || !data?.bulletin) {
    return (
      <EtatVide
        titre="Bulletin indisponible"
        message="Ce bulletin n existe pas ou ne vous est pas accessible."
        action={<Bouton variante="secondaire" onClick={() => navigate(-1)}>Retour</Bouton>}
      />
    );
  }

  const b = data.bulletin;

  if (!b.classe) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide
          titre="Aucune classe"
          message="Cet etudiant n est affecte a aucune classe : aucun bulletin ne peut etre etabli."
        />
      </div>
    );
  }

  const editeLe = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      {/* Barre d'outils : absente du document imprime */}
      <div className="sans-impression flex flex-wrap items-center gap-3">
        {idRoute && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-marine"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Retour
          </button>
        )}

        {estParent && !idRoute && (
          <SelecteurEnfant valeur={enfant} onChanger={setEnfant} className="w-full sm:w-64" />
        )}

        <ChampSelect
          options={PERIODES}
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          aria-label="Periode du bulletin"
          className="w-full sm:w-48"
        />

        <Bouton onClick={() => window.print()} className="sm:ml-auto">
          <Printer className="h-4 w-4" />
          Imprimer
        </Bouton>
      </div>

      {data.provisoire && (
        <p className="sans-impression rounded-lg border border-alerte-fond bg-alerte-fond px-4 py-3 text-xs text-alerte">
          Vue interne : ce bulletin inclut les evaluations non encore publiees. Il ne doit pas
          etre remis en l etat a la famille.
        </p>
      )}

      {/* ===================== Document ===================== */}
      <article className="document-imprimable overflow-hidden rounded-xl border border-slate-300 bg-white">
        {/* En-tete : une seule bande claire, logo a gauche, identite a droite */}
        <header className="flex flex-wrap items-center justify-between gap-6 border-b-2 border-marine px-8 py-5">
          <div className="flex items-center gap-5">
            <Logo variante="clair" hauteur={44} />

            <div className="border-l border-slate-200 pl-5">
              <p className="libelle-capitales text-[9px] text-slate-500">Bulletin de notes</p>
              <p className="mt-1 text-sm font-bold text-marine">
                {libellePeriode(b.periode === 'toutes' ? periode : b.periode)}
                <span className="ml-2 font-medium text-slate-500">{b.classe.anneeScolaire}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold leading-tight text-marine">{b.etudiant.nomComplet}</p>
            <p className="mt-0.5 text-sm text-slate-600">
              {b.classe.nom} · {b.classe.filiere}
            </p>
            {b.etudiant.matricule && (
              <p className="mt-0.5 font-mono text-xs text-slate-500">{b.etudiant.matricule}</p>
            )}
          </div>
        </header>

        {/* Synthese : les quatre chiffres qui resument l'annee */}
        <section className="grid gap-3 border-b border-slate-200 bg-slate-50 px-8 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Synthese
            libelle="Moyenne generale"
            valeur={b.moyenneGenerale === null ? '—' : `${b.moyenneGenerale}/20`}
            detail={b.mention || undefined}
            ton={tonMoyenne(b.moyenneGenerale)}
          />
          <Synthese
            libelle="Rang"
            valeur={b.rang ? `${b.rang}e` : '—'}
            detail={b.effectif ? `sur ${b.effectif} etudiants` : undefined}
          />
          <Synthese
            libelle="Moyenne de classe"
            valeur={b.moyenneClasse === null ? '—' : `${b.moyenneClasse}/20`}
            detail={
              b.moyenneGenerale !== null && b.moyenneClasse !== null
                ? `${b.moyenneGenerale >= b.moyenneClasse ? '+' : ''}${(b.moyenneGenerale - b.moyenneClasse).toFixed(2).replace('.', ',')} pt`
                : undefined
            }
          />
          <Synthese
            libelle="Matieres evaluees"
            valeur={b.matieres.filter((m) => m.moyenne !== null).length}
            detail={`sur ${b.matieres.length} au programme`}
          />
        </section>

        {/* Grille des matieres */}
        {b.matieres.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-white text-left">
                  <th scope="col" className="px-8 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Matiere
                  </th>
                  <th scope="col" className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Coef.
                  </th>
                  {COLONNES_NOTES.map((colonne) => (
                    <th
                      key={colonne.cle}
                      scope="col"
                      className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                    >
                      {colonne.titre}
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Moyenne
                  </th>
                  <th scope="col" className="px-8 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Appreciation
                  </th>
                </tr>
              </thead>

              <tbody>
                {b.matieres.map((ligne, index) => {
                  // L'appreciation retenue est celle de l'evaluation la plus ponderee
                  // qui en porte une : c'est le commentaire le plus representatif.
                  const appreciation = [...ligne.evaluations]
                    .filter((e) => e.appreciation)
                    .sort((a, c) => c.evaluation.coefficient - a.evaluation.coefficient)[0]?.appreciation;

                  return (
                    <tr
                      key={ligne.matiere.id}
                      className={`border-b border-slate-100 ${index % 2 ? 'bg-slate-50/60' : 'bg-white'}`}
                    >
                      <th scope="row" className="px-8 py-3 text-left align-top font-medium text-marine">
                        {ligne.matiere.nom}
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                          {ligne.matiere.professeur || 'Titulaire non designe'}
                        </span>
                      </th>

                      <td className="px-3 py-3 text-center align-top tabular-nums text-slate-600">
                        {ligne.matiere.coefficient}
                      </td>

                      {COLONNES_NOTES.map((colonne) => {
                        const notes = ligne.evaluations.filter((e) =>
                          colonne.types.includes(e.evaluation.type)
                        );

                        return (
                          <td key={colonne.cle} className="px-3 py-3 align-top">
                            {notes.length ? (
                              <ul className="flex flex-wrap gap-1.5">
                                {notes.map((note) => {
                                  const affichee = formatNote(note);
                                  return (
                                    <li
                                      key={note.evaluation.id}
                                      title={note.evaluation.titre}
                                      className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${
                                        note.absent
                                          ? 'bg-alerte-fond text-alerte'
                                          : affichee
                                            ? 'bg-slate-100 text-slate-700'
                                            : 'text-slate-300'
                                      }`}
                                    >
                                      {affichee || '·'}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className={`px-3 py-3 text-center align-top ${fondMoyenne(ligne.moyenne)}`}>
                        <span className={`text-base font-bold tabular-nums ${tonMoyenne(ligne.moyenne)}`}>
                          {ligne.moyenne === null ? '—' : ligne.moyenne.toFixed(2).replace('.', ',')}
                        </span>
                      </td>

                      <td className="px-8 py-3 align-top text-xs leading-relaxed text-slate-600">
                        {appreciation || <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Ligne de totalisation */}
              <tfoot>
                <tr className="border-t-2 border-marine bg-white">
                  <th scope="row" className="px-8 py-3 text-left font-bold text-marine">
                    Moyenne generale
                  </th>
                  <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                    {b.matieres.reduce((s, m) => s + m.matiere.coefficient, 0)}
                  </td>
                  <td colSpan={COLONNES_NOTES.length} className="px-3 py-3 text-xs text-slate-500">
                    Mention : {b.mention || '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-lg font-bold tabular-nums ${tonMoyenne(b.moyenneGenerale)}`}>
                      {b.moyenneGenerale === null ? '—' : b.moyenneGenerale.toFixed(2).replace('.', ',')}
                    </span>
                  </td>
                  <td className="px-8 py-3 text-xs text-slate-500">
                    Rang {b.rang ? `${b.rang} / ${b.effectif}` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="px-8 py-12 text-center text-sm text-slate-500">
            Aucune matiere n est encore rattachee a cette classe.
          </p>
        )}

        {/* Pied : mentions et signatures */}
        <footer className="border-t border-slate-200 bg-slate-50 px-8 py-5">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <p className="max-w-md text-[10px] leading-relaxed text-slate-500">
              Document genere electroniquement par la plateforme de gestion Technolab ISTA
              le {editeLe}. Les notes portees sont celles publiees a cette date ; toute
              correction ulterieure donnera lieu a une nouvelle edition.
            </p>

            <div className="flex gap-12">
              {['Le professeur principal', 'La direction'].map((role) => (
                <div key={role} className="text-center">
                  <div className="h-12 w-40 border-b border-slate-300" aria-hidden="true" />
                  <p className="mt-1 text-[10px] text-slate-500">{role}</p>
                </div>
              ))}
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}
