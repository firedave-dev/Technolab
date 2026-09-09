/**
 * Grille de saisie des notes d'une evaluation.
 * L'etat local est initialise depuis le serveur puis envoye en une seule requete :
 * la correction peut se faire en plusieurs fois, une ligne vide efface la note.
 */
import { useEffect, useState } from 'react';
import { Loader2, Save, UserX } from 'lucide-react';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import { useGrilleNotes, useSaisirNotes } from '../../hooks/useScolarite.js';
import { couleurMoyenne } from '../../utils/scolarite.js';

export default function SaisieNotes({ ouverte, onFermer, evaluationId }) {
  const { data, isLoading } = useGrilleNotes(ouverte ? evaluationId : null);
  const saisir = useSaisirNotes();
  const [lignes, setLignes] = useState([]);

  // Les donnees du serveur alimentent l'etat local une fois chargees.
  useEffect(() => {
    if (data?.lignes) {
      setLignes(
        data.lignes.map((l) => ({
          etudiant: l.etudiant.id,
          nomComplet: l.etudiant.nomComplet,
          matricule: l.etudiant.matricule,
          valeur: l.valeur === null ? '' : String(l.valeur),
          absent: l.absent,
          appreciation: l.appreciation || '',
        }))
      );
    }
  }, [data]);

  const evaluation = data?.evaluation;
  const bareme = evaluation?.bareme ?? 20;

  const majLigne = (index, champ, valeur) => {
    setLignes((precedent) =>
      precedent.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l))
    );
  };

  /** Moyenne calculee en direct sur les notes saisies (les absents sont exclus). */
  const saisies = lignes.filter((l) => !l.absent && l.valeur !== '');
  const moyenneLocale = saisies.length
    ? Math.round((saisies.reduce((s, l) => s + Number(l.valeur), 0) / saisies.length / bareme) * 20 * 100) / 100
    : null;

  const horsBareme = lignes.some((l) => l.valeur !== '' && Number(l.valeur) > bareme);

  const enregistrer = async () => {
    await saisir.mutateAsync({
      id: evaluationId,
      notes: lignes.map((l) => ({
        etudiant: l.etudiant,
        valeur: l.absent || l.valeur === '' ? null : Number(l.valeur),
        absent: l.absent,
        appreciation: l.appreciation,
      })),
    });
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={evaluation ? `Notes — ${evaluation.titre}` : 'Saisie des notes'}
      description={
        evaluation
          ? `Bareme sur ${bareme} · coefficient ${evaluation.coefficient} · ${data.statistiques.saisies}/${data.statistiques.effectif} saisies`
          : undefined
      }
      largeur="xl"
      pied={
        <>
          <span className="mr-auto text-sm text-slate-500">
            Moyenne en cours :{' '}
            <strong className={couleurMoyenne(moyenneLocale)}>
              {moyenneLocale === null ? '—' : `${moyenneLocale}/20`}
            </strong>
          </span>
          <Bouton variante="secondaire" onClick={onFermer} disabled={saisir.isPending}>
            Annuler
          </Bouton>
          <Bouton onClick={enregistrer} chargement={saisir.isPending} disabled={horsBareme}>
            <Save className="h-4 w-4" />
            Enregistrer
          </Bouton>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Chargement de la grille...
        </div>
      ) : lignes.length ? (
        <>
          {horsBareme && (
            <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Une note depasse le bareme de {bareme} points.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">Etudiant</th>
                  <th className="w-28 px-2 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Note / {bareme}
                  </th>
                  <th className="w-20 px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                    Absent
                  </th>
                  <th className="px-2 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Appreciation
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {lignes.map((ligne, index) => (
                  <tr key={ligne.etudiant}>
                    <td className="px-2 py-2">
                      <p className="font-medium text-slate-800">{ligne.nomComplet}</p>
                      <p className="text-xs text-slate-500">{ligne.matricule}</p>
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max={bareme}
                        value={ligne.valeur}
                        disabled={ligne.absent}
                        onChange={(e) => majLigne(index, 'valeur', e.target.value)}
                        aria-label={`Note de ${ligne.nomComplet}`}
                        className={`champ px-2 py-1.5 text-center ${
                          ligne.valeur !== '' && Number(ligne.valeur) > bareme ? 'champ-erreur' : ''
                        }`}
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={ligne.absent}
                        onChange={(e) => majLigne(index, 'absent', e.target.checked)}
                        aria-label={`${ligne.nomComplet} absent`}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={ligne.appreciation}
                        maxLength={200}
                        onChange={(e) => majLigne(index, 'appreciation', e.target.value)}
                        placeholder="Optionnel"
                        aria-label={`Appreciation de ${ligne.nomComplet}`}
                        className="champ px-2 py-1.5"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Laisser une note vide (et la case Absent decochee) retire la note de la base.
          </p>
        </>
      ) : (
        <EtatVide
          icone={UserX}
          titre="Aucun etudiant dans cette classe"
          message="Affectez des etudiants a la classe avant de saisir des notes."
        />
      )}
    </Modale>
  );
}
