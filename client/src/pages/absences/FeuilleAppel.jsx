/**
 * Feuille d'appel : pointage d'une classe sur un creneau.
 * L'etat deja saisi est precharge, ce qui rend l'appel rejouable — le professeur
 * peut corriger une erreur en repassant un etudiant en "present".
 */
import { useEffect, useState } from 'react';
import { Check, Clock, Loader2, Save, UserX } from 'lucide-react';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClasses } from '../../hooks/useGestion.js';
import { useEnregistrerAppel, useEtatAppel, useMesMatieres } from '../../hooks/useScolarite.js';
import { ROLES } from '../../utils/roles.js';
import { aujourdhui } from '../../utils/scolarite.js';

const CRENEAUX = [
  { valeur: 'journee', libelle: 'Journee entiere' },
  { valeur: 'matin', libelle: 'Matin' },
  { valeur: 'apres-midi', libelle: 'Apres-midi' },
];

/** Trois etats possibles par etudiant, bascules par un groupe de boutons. */
const ETATS = [
  { cle: 'present', libelle: 'Present', icone: Check, actif: 'bg-emerald-600 text-white' },
  { cle: 'retard', libelle: 'Retard', icone: Clock, actif: 'bg-amber-500 text-white' },
  { cle: 'absence', libelle: 'Absent', icone: UserX, actif: 'bg-red-600 text-white' },
];

export default function FeuilleAppel({ ouverte, onFermer }) {
  const { utilisateur } = useAuth();
  const estProfesseur = utilisateur?.role === ROLES.PROFESSEUR;

  const [classe, setClasse] = useState('');
  const [matiere, setMatiere] = useState('');
  const [date, setDate] = useState(aujourdhui());
  const [creneau, setCreneau] = useState('journee');
  const [lignes, setLignes] = useState([]);

  const { data: classesData } = useClasses({ actif: 'true' });
  const { data: matieresData } = useMesMatieres(estProfesseur);
  const matieres = matieresData?.matieres || [];

  // Un professeur pointe depuis sa matiere : la classe en decoule.
  const matiereChoisie = matieres.find((m) => m.id === matiere);
  const classeEffective = estProfesseur ? matiereChoisie?.classe?._id || matiereChoisie?.classe?.id : classe;

  const { data, isFetching } = useEtatAppel(
    { classe: classeEffective, date, creneau, matiere: matiere || undefined },
    ouverte && Boolean(classeEffective)
  );
  const enregistrer = useEnregistrerAppel();

  // Selection par defaut a l'ouverture.
  useEffect(() => {
    if (!ouverte) return;
    if (estProfesseur && !matiere && matieres.length) setMatiere(matieres[0].id);
    if (!estProfesseur && !classe && classesData?.classes?.length) setClasse(classesData.classes[0].id);
  }, [ouverte, estProfesseur, matiere, matieres, classe, classesData]);

  // Chargement de l'etat serveur dans l'etat local editable.
  useEffect(() => {
    if (data?.lignes) {
      setLignes(
        data.lignes.map((l) => ({
          etudiant: l.etudiant.id,
          nomComplet: l.etudiant.nomComplet,
          matricule: l.etudiant.matricule,
          etat: l.present ? 'present' : l.type === 'retard' ? 'retard' : 'absence',
          minutesRetard: l.minutesRetard ?? 10,
        }))
      );
    }
  }, [data]);

  const definirEtat = (index, etat) =>
    setLignes((precedent) => precedent.map((l, i) => (i === index ? { ...l, etat } : l)));

  const absents = lignes.filter((l) => l.etat !== 'present').length;

  const soumettre = async () => {
    await enregistrer.mutateAsync({
      classe: classeEffective,
      date,
      creneau,
      matiere: matiere || undefined,
      lignes: lignes.map((l) => ({
        etudiant: l.etudiant,
        present: l.etat === 'present',
        type: l.etat === 'retard' ? 'retard' : 'absence',
        minutesRetard: l.etat === 'retard' ? Number(l.minutesRetard) : undefined,
      })),
    });
    onFermer();
  };

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Feuille d appel"
      description={
        data?.dejaSaisi
          ? 'Un appel existe deja pour ce creneau : les corrections seront enregistrees.'
          : 'Marquez les absents et les retardataires, puis enregistrez.'
      }
      largeur="lg"
      pied={
        <>
          <span className="mr-auto text-sm text-slate-500">
            {lignes.length - absents} present(s) · {absents} absent(s)
          </span>
          <Bouton variante="secondaire" onClick={onFermer} disabled={enregistrer.isPending}>
            Annuler
          </Bouton>
          <Bouton onClick={soumettre} chargement={enregistrer.isPending} disabled={!lignes.length}>
            <Save className="h-4 w-4" />
            Enregistrer l appel
          </Bouton>
        </>
      }
    >
      {/* Contexte de l'appel */}
      <div className="grid gap-3 sm:grid-cols-3">
        {estProfesseur ? (
          <ChampSelect
            label="Matiere"
            className="sm:col-span-3"
            placeholder="Choisir une matiere"
            options={matieres.map((m) => ({
              valeur: m.id,
              libelle: `${m.nom} — ${m.classe?.nom || ''}`,
            }))}
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
            indication="La classe est deduite de la matiere."
          />
        ) : (
          <ChampSelect
            label="Classe"
            placeholder="Choisir une classe"
            options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
          />
        )}

        <ChampTexte label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <ChampSelect
          label="Creneau"
          options={CRENEAUX}
          value={creneau}
          onChange={(e) => setCreneau(e.target.value)}
        />
      </div>

      <div className="mt-4">
        {isFetching && !lignes.length ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement de la liste...
          </div>
        ) : lignes.length ? (
          <ul className="divide-y divide-slate-100">
            {lignes.map((ligne, index) => (
              <li key={ligne.etudiant} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{ligne.nomComplet}</p>
                  <p className="truncate text-xs text-slate-500">{ligne.matricule}</p>
                </div>

                {ligne.etat === 'retard' && (
                  <input
                    type="number"
                    min="0"
                    max="480"
                    value={ligne.minutesRetard}
                    onChange={(e) =>
                      setLignes((p) =>
                        p.map((l, i) => (i === index ? { ...l, minutesRetard: e.target.value } : l))
                      )
                    }
                    aria-label={`Minutes de retard de ${ligne.nomComplet}`}
                    className="champ w-20 px-2 py-1 text-center text-sm"
                  />
                )}

                <div className="flex overflow-hidden rounded-lg border border-slate-300">
                  {ETATS.map(({ cle, libelle, icone: Icone, actif }) => (
                    <button
                      key={cle}
                      type="button"
                      onClick={() => definirEtat(index, cle)}
                      title={libelle}
                      aria-pressed={ligne.etat === cle}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs transition ${
                        ligne.etat === cle ? actif : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">{libelle}</span>
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            icone={UserX}
            titre="Aucun etudiant"
            message="Cette classe ne compte aucun etudiant inscrit."
          />
        )}
      </div>
    </Modale>
  );
}
