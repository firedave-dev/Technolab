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

/**
 * Note affichee sur le document.
 *
 * La virgule remplace le point : c'est la convention francaise, et le bulletin
 * est un document officiel. Deux decimales toujours, meme sur un entier — une
 * colonne de nombres alignes se compare d'un coup d'oeil, ce qui n'est pas le
 * cas si « 12 » cotoie « 9,33 ».
 */
const formaterNote = (valeur) =>
  valeur === null || valeur === undefined
    ? '—'
    : valeur.toFixed(2).replace('.', ',');

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
            {/*
              Le libelle est ecrit en toutes lettres, comme sur le bulletin
              officiel de l'etablissement : un numero seul en petits caracteres
              ne se rattache a rien pour qui lit le document imprime.
            */}
            {b.etudiant.matricule && (
              <p className="mt-0.5 text-xs text-slate-500">
                Matricule : <span className="font-mono text-slate-700">{b.etudiant.matricule}</span>
              </p>
            )}
          </div>
        </header>

        {/* Synthese : les quatre chiffres qui resument le semestre */}
        <section className="grid gap-3 border-b border-slate-200 bg-slate-50 px-8 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Synthese
            libelle="Moyenne generale"
            valeur={b.moyenneGenerale === null ? '—' : `${b.moyenneGenerale}/20`}
            detail={b.mention || undefined}
            ton={tonMoyenne(b.moyenneGenerale)}
          />
          <Synthese
            libelle="Credits valides"
            valeur={`${b.creditsAcquis ?? 0}/${b.creditsTotal ?? 0}`}
            detail={
              b.creditsTotal
                ? `${Math.round(((b.creditsAcquis ?? 0) / b.creditsTotal) * 100)} % de l unite`
                : undefined
            }
            ton={
              b.creditsTotal && b.creditsAcquis === b.creditsTotal ? 'text-succes' : 'text-marine'
            }
          />
          <Synthese
            libelle="Rang"
            valeur={b.rang ? `${b.rang}e` : '—'}
            detail={b.effectif ? `sur ${b.effectif} etudiants` : undefined}
          />
          <Synthese
            libelle="Moyenne de la promotion"
            valeur={b.moyenneGeneraleClasse === null ? '—' : `${b.moyenneGeneraleClasse}/20`}
            detail={
              b.moyenneGenerale !== null && b.moyenneGeneraleClasse !== null
                ? `${b.moyenneGenerale >= b.moyenneGeneraleClasse ? '+' : ''}${(b.moyenneGenerale - b.moyenneGeneraleClasse).toFixed(2).replace('.', ',')} pt`
                : undefined
            }
          />
        </section>

        {/* Grille par unite d'enseignement */}
        {b.ues?.length ? (
          <div className="overflow-x-auto">
            {/*
              Largeur minimale calee sur le PAPIER, pas sur l'ecran : un A4 paysage
              a marges de 8 mm offre 281 mm de laize, soit environ 1062 px. Passer
              au-dessus ferait rogner la derniere colonne a l'impression, sans que
              rien ne le signale a l'ecran.
            */}
            <table className="w-full min-w-[1040px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-white text-left">
                  {[
                    ['Code UE', 'px-6 text-left'],
                    ['Intitule de l unite', 'px-3 text-left'],
                    ['Matiere', 'px-3 text-left'],
                    ['Note de classe', 'px-3 text-center'],
                    ['Note d examen', 'px-3 text-center'],
                    ['Note de matiere', 'px-3 text-center'],
                    ['Credit ECTS', 'px-3 text-center'],
                    ['Credit UE', 'px-3 text-center'],
                    ['Moyenne UE', 'px-3 text-center'],
                    ['Resultat', 'px-6 text-center'],
                  ].map(([titre, classes]) => (
                    <th
                      key={titre}
                      scope="col"
                      className={`py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 ${classes}`}
                    >
                      {titre}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {b.ues.map((ue, indexUE) =>
                  ue.matieres.map((ligne, indexMatiere) => {
                    const premiere = indexMatiere === 0;
                    const zebre = indexUE % 2 === 1 ? 'bg-slate-50/60' : 'bg-white';

                    return (
                      <tr
                        key={ligne.matiere.id}
                        className={`${zebre} ${premiere && indexUE > 0 ? 'border-t border-slate-300' : 'border-t border-slate-100'}`}
                      >
                        {/*
                          Les cellules d'UE sont fusionnees verticalement sur toutes
                          ses matieres : c'est la structure du bulletin officiel, et
                          c'est ce qui fait lire l'unite comme un bloc plutot que
                          comme une colonne repetee.
                        */}
                        {premiere && (
                          <>
                            <th
                              scope="rowgroup"
                              rowSpan={ue.matieres.length}
                              className="px-6 py-3 text-left align-top font-bold text-marine"
                            >
                              {ue.code || <span className="text-alerte">hors UE</span>}
                            </th>
                            <td
                              rowSpan={ue.matieres.length}
                              className="px-3 py-3 align-top text-xs leading-relaxed text-slate-600"
                            >
                              {ue.intitule}
                            </td>
                          </>
                        )}

                        <td className="px-3 py-3 font-medium text-marine">{ligne.matiere.nom}</td>

                        <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                          {formaterNote(ligne.noteClasse)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                          {formaterNote(ligne.noteExamen)}
                        </td>
                        <td className={`px-3 py-3 text-center font-bold tabular-nums ${tonMoyenne(ligne.note)}`}>
                          {formaterNote(ligne.note)}
                        </td>
                        <td className="px-3 py-3 text-center tabular-nums text-slate-600">
                          {ligne.credits || '—'}
                        </td>

                        {premiere && (
                          <>
                            <td
                              rowSpan={ue.matieres.length}
                              className="px-3 py-3 text-center align-middle font-bold tabular-nums text-marine"
                            >
                              {ue.creditsTotal}
                            </td>
                            <td
                              rowSpan={ue.matieres.length}
                              className={`px-3 py-3 text-center align-middle font-bold tabular-nums ${tonMoyenne(ue.moyenne)}`}
                            >
                              {formaterNote(ue.moyenne)}
                            </td>
                            <td rowSpan={ue.matieres.length} className="px-6 py-3 text-center align-middle">
                              {/*
                                Le resultat ne repose pas sur la seule couleur : le mot
                                est ecrit. Un bulletin s'imprime souvent en noir et
                                blanc, et se lit aussi au lecteur d'ecran.
                              */}
                              <span
                                className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                                  ue.validee ? 'bg-succes-fond text-succes' : 'bg-retard-fond text-retard'
                                }`}
                              >
                                {ue.validee ? 'Valide' : 'Non valide'}
                              </span>
                              {ue.validee && ue.matieres.some((m) => m.note !== null && m.note < 10) && (
                                <span className="mt-1 block text-[9px] leading-tight text-slate-500">
                                  par compensation
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Ligne de totalisation */}
              <tfoot>
                <tr className="border-t-2 border-marine bg-white">
                  <th scope="row" colSpan={5} className="px-6 py-3 text-left font-bold text-marine">
                    Moyenne du semestre
                  </th>
                  <td className={`px-3 py-3 text-center text-lg font-bold tabular-nums ${tonMoyenne(b.moyenneGenerale)}`}>
                    {formaterNote(b.moyenneGenerale)}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-slate-500">Total</td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums text-marine">
                    {b.creditsTotal ?? 0}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-slate-500">
                    {b.mention || '—'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="text-sm font-bold tabular-nums text-marine">
                      {b.creditsAcquis ?? 0}/{b.creditsTotal ?? 0}
                    </span>
                    <span className="block text-[9px] text-slate-500">credits acquis</span>
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
              <strong className="font-bold text-slate-600">
                Note de matiere = (note de classe x {b.ponderation?.poidsClasse ?? 1} + note d
                examen x {b.ponderation?.poidsExamen ?? 2}) /{' '}
                {(b.ponderation?.poidsClasse ?? 1) + (b.ponderation?.poidsExamen ?? 2)}.
              </strong>{' '}
              Une unite d enseignement est validee lorsque sa moyenne — ponderee par les
              credits — atteint 10/20 : la totalite de ses credits est alors acquise, y
              compris pour une matiere restee en dessous. Une note manquante est ecartee du
              calcul, jamais comptee pour zero. Document genere electroniquement par la
              plateforme Technolab ISTA le {editeLe} ; toute correction ulterieure donnera
              lieu a une nouvelle edition.
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
