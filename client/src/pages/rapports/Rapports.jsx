/**
 * Rapports de direction.
 *
 * CINQ RAPPORTS, UNE SEULE PAGE. Chacun a ses colonnes, mais tous repondent a
 * la meme demarche : choisir un rapport, choisir une periode, lire, puis
 * telecharger. Cinq ecrans separes auraient multiplie les selecteurs de periode
 * sans rien ajouter.
 *
 * LE PDF EST LA MEME CHOSE QUE L'ECRAN. Le bouton de telechargement rejoue
 * exactement la requete affichee : ce que le directeur emporte en reunion est
 * ce qu'il vient de lire, aux memes bornes de periode.
 */
import { useMemo, useState } from 'react';
import {
  Activity, BarChart3, CreditCard, Download, FileText, TrendingDown, Users,
} from 'lucide-react';
import {
  useCatalogueRapports, useRapport, useTelechargerRapport,
} from '../../hooks/useRapports.js';
import { useClasses } from '../../hooks/useGestion.js';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';

const ICONES = {
  encaissements: CreditCard,
  impayes: TrendingDown,
  resultats: BarChart3,
  assiduite: Activity,
  effectifs: Users,
};

const PERIODES = [
  { valeur: 'journalier', libelle: 'Journalier' },
  { valeur: 'hebdomadaire', libelle: 'Hebdomadaire' },
  { valeur: 'mensuel', libelle: 'Mensuel' },
  { valeur: 'trimestriel', libelle: 'Trimestriel' },
  { valeur: 'semestriel', libelle: 'Semestriel' },
  { valeur: 'annuel', libelle: 'Annuel (année scolaire)' },
  { valeur: 'general', libelle: 'Général (depuis l’origine)' },
];

/** Les rapports pedagogiques ne dependent pas d'une periode de caisse. */
const SANS_PERIODE = ['resultats', 'effectifs'];

const somme = (n) => Number(n || 0).toLocaleString('fr-FR');
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

/** Carte d'indicateur du bandeau de synthese. */
function Indicateur({ libelle, valeur, alerte }) {
  return (
    <div className="carte p-4">
      <p className="label-indicateur text-slate-500">{libelle}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${alerte ? 'text-retard' : 'text-marine'}`}>
        {valeur}
      </p>
    </div>
  );
}

/** Tableau simple, colonnes decrites par le rapport affiche. */
function Tableau({ colonnes, lignes }) {
  if (!lignes?.length) {
    return <p className="carte p-6 text-center text-sm text-slate-500">Aucune donnée sur cette période.</p>;
  }

  return (
    <div className="carte overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {colonnes.map((c) => (
              <th
                key={c.cle}
                scope="col"
                className={`px-3 py-2.5 label-indicateur text-slate-500 ${
                  c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}
              >
                {c.titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lignes.map((ligne, i) => (
            <tr key={ligne.id ?? ligne.matricule ?? ligne.recu ?? i} className="hover:bg-slate-50/70">
              {colonnes.map((c) => (
                <td
                  key={c.cle}
                  className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums'
                    : c.align === 'center' ? 'text-center tabular-nums' : ''} ${c.classe?.(ligne) ?? ''}`}
                >
                  {c.rendu ? c.rendu(ligne[c.cle], ligne) : (ligne[c.cle] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ titre, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-vert-bleu">{titre}</h2>
      {children}
    </section>
  );
}

/* ----------------------------------------------- un rendu par rapport */

const VUES = {
  encaissements: (r) => (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Total encaissé" valeur={`${somme(r.total)} F`} />
        <Indicateur libelle="Nombre de reçus" valeur={r.nombre} />
        <Indicateur
          libelle="Montant moyen"
          valeur={r.nombre ? `${somme(Math.round(r.total / r.nombre))} F` : '—'}
        />
        <Indicateur libelle="Classes concernées" valeur={r.parClasse.length} />
      </div>

      <Section titre="Par mode de paiement">
        <Tableau
          colonnes={[
            { cle: 'libelle', titre: 'Mode' },
            { cle: 'nombre', titre: 'Nombre', align: 'center' },
            { cle: 'montant', titre: 'Montant (FCFA)', align: 'right', rendu: somme },
          ]}
          lignes={r.parMode}
        />
      </Section>

      <Section titre="Par classe">
        <Tableau
          colonnes={[
            { cle: 'libelle', titre: 'Classe' },
            { cle: 'nombre', titre: 'Nombre', align: 'center' },
            { cle: 'montant', titre: 'Montant (FCFA)', align: 'right', rendu: somme },
          ]}
          lignes={r.parClasse}
        />
      </Section>

      <Section titre={`Détail — ${r.lignes.length} encaissement${r.lignes.length > 1 ? 's' : ''}`}>
        <Tableau
          colonnes={[
            { cle: 'date', titre: 'Date', rendu: jour },
            { cle: 'recu', titre: 'N° reçu' },
            { cle: 'etudiant', titre: 'Étudiant' },
            { cle: 'classe', titre: 'Classe' },
            { cle: 'motif', titre: 'Motif' },
            { cle: 'mode', titre: 'Mode' },
            { cle: 'montant', titre: 'Montant', align: 'right', rendu: somme },
          ]}
          lignes={r.lignes}
        />
      </Section>
    </>
  ),

  impayes: (r) => (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Reste à recouvrer" valeur={`${somme(r.total)} F`} alerte={r.total > 0} />
        <Indicateur libelle="Échéances concernées" valeur={r.nombre} />
        <Indicateur libelle="Dont échues" valeur={r.echus} alerte={r.echus > 0} />
        <Indicateur libelle="Montant échu" valeur={`${somme(r.montantEchu)} F`} alerte={r.montantEchu > 0} />
      </div>

      <Section titre="Par classe">
        <Tableau
          colonnes={[
            { cle: 'libelle', titre: 'Classe' },
            { cle: 'etudiants', titre: 'Étudiants', align: 'center' },
            { cle: 'nombre', titre: 'Échéances', align: 'center' },
            { cle: 'montant', titre: 'Reste dû (FCFA)', align: 'right', rendu: somme },
          ]}
          lignes={r.parClasse}
        />
      </Section>

      <Section titre="Détail par échéance">
        <Tableau
          colonnes={[
            { cle: 'etudiant', titre: 'Étudiant' },
            { cle: 'matricule', titre: 'Matricule' },
            { cle: 'classe', titre: 'Classe' },
            { cle: 'libelle', titre: 'Échéance' },
            { cle: 'echeance', titre: 'Date', rendu: jour },
            { cle: 'du', titre: 'Dû', align: 'right', rendu: somme },
            { cle: 'paye', titre: 'Payé', align: 'right', rendu: somme },
            {
              cle: 'reste', titre: 'Reste', align: 'right', rendu: somme,
              classe: () => 'font-semibold text-retard',
            },
            {
              cle: 'joursRetard', titre: 'Retard', align: 'center',
              rendu: (v) => (v > 0 ? `${v} j` : '—'),
            },
          ]}
          lignes={r.lignes}
        />
      </Section>
    </>
  ),

  resultats: (r) => (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Effectif" valeur={r.effectif} />
        <Indicateur libelle="Admis" valeur={r.admis} />
        <Indicateur
          libelle="Taux de réussite"
          valeur={r.tauxReussite === null ? '—' : `${r.tauxReussite} %`}
          alerte={r.tauxReussite !== null && r.tauxReussite < 50}
        />
        <Indicateur libelle="Classes" valeur={r.blocs.length} />
      </div>

      {r.blocs.map((bloc) => (
        <Section
          key={bloc.classe}
          titre={`${bloc.classe} — moyenne ${bloc.moyenneClasse ?? '—'} / 20 · `
            + `${bloc.admis}/${bloc.effectif} admis (${bloc.tauxReussite ?? '—'} %)`}
        >
          <Tableau
            colonnes={[
              { cle: 'rang', titre: 'Rang', align: 'center' },
              { cle: 'etudiant', titre: 'Étudiant' },
              { cle: 'matricule', titre: 'Matricule' },
              {
                cle: 'moyenne', titre: 'Moyenne', align: 'center',
                rendu: (v) => (v === null ? '—' : v.toFixed(2).replace('.', ',')),
                classe: (l) => (l.admis ? 'font-semibold text-succes' : 'font-semibold text-retard'),
              },
              { cle: 'mention', titre: 'Mention' },
              {
                cle: 'creditsAcquis', titre: 'Crédits', align: 'center',
                rendu: (v, l) => `${v} / ${l.creditsTotal}`,
              },
              {
                cle: 'admis', titre: 'Décision', align: 'center',
                rendu: (v) => (v ? 'Admis' : 'Ajourné'),
                classe: (l) => (l.admis ? 'text-succes' : 'text-retard'),
              },
            ]}
            lignes={bloc.lignes}
          />
        </Section>
      ))}
    </>
  ),

  assiduite: (r) => (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur libelle="Total signalements" valeur={r.total} />
        <Indicateur libelle="Absences" valeur={r.absences} />
        <Indicateur libelle="Retards" valeur={r.retards} />
        <Indicateur libelle="Justifiés" valeur={r.justifiees} />
      </div>

      <Section titre="Par classe">
        <Tableau
          colonnes={[
            { cle: 'libelle', titre: 'Classe' },
            { cle: 'absences', titre: 'Absences', align: 'center' },
            { cle: 'retards', titre: 'Retards', align: 'center' },
            { cle: 'justifiees', titre: 'Justifiés', align: 'center' },
          ]}
          lignes={r.parClasse}
        />
      </Section>

      <Section titre="Par étudiant — les plus concernés en tête">
        <Tableau
          colonnes={[
            { cle: 'etudiant', titre: 'Étudiant' },
            { cle: 'matricule', titre: 'Matricule' },
            { cle: 'classe', titre: 'Classe' },
            { cle: 'absences', titre: 'Absences', align: 'center' },
            { cle: 'retards', titre: 'Retards', align: 'center' },
            { cle: 'justifiees', titre: 'Justifiés', align: 'center' },
          ]}
          lignes={r.lignes}
        />
      </Section>
    </>
  ),

  effectifs: (r) => (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Indicateur libelle="Étudiants" valeur={r.effectif} />
        <Indicateur libelle="Enseignants" valeur={r.professeurs} />
        <Indicateur libelle="Personnel" valeur={r.personnel} />
        <Indicateur libelle="Comptes parents" valeur={r.parents} />
        <Indicateur libelle="Filles / garçons" valeur={`${r.femmes} / ${r.hommes}`} />
      </div>

      <Section titre="Répartition par classe">
        <Tableau
          colonnes={[
            { cle: 'classe', titre: 'Classe' },
            { cle: 'niveau', titre: 'Niveau', align: 'center' },
            { cle: 'filiere', titre: 'Filière' },
            { cle: 'effectif', titre: 'Effectif', align: 'center' },
            { cle: 'capacite', titre: 'Capacité', align: 'center' },
            {
              cle: 'occupation', titre: 'Occupation', align: 'center',
              rendu: (v) => (v === null ? '—' : `${v} %`),
            },
            { cle: 'femmes', titre: 'Filles', align: 'center' },
            { cle: 'hommes', titre: 'Garçons', align: 'center' },
          ]}
          lignes={r.blocs}
        />
      </Section>
    </>
  ),
};

/* ------------------------------------------------------------- la page */

export default function Rapports() {
  const [cle, setCle] = useState('encaissements');
  const [periode, setPeriode] = useState('annuel');
  const [reference, setReference] = useState('');
  const [classe, setClasse] = useState('');
  const [semestre, setSemestre] = useState('semestre1');

  const { data: catalogue } = useCatalogueRapports();
  const { data: donneesClasses } = useClasses({ limite: 100 });

  const classes = donneesClasses?.classes ?? [];
  // L'annee scolaire suit les classes existantes : aucune saisie a faire.
  const anneeScolaire = classes[0]?.anneeScolaire;

  const parametres = useMemo(
    () => ({ periode, reference: reference || undefined, anneeScolaire, classe, semestre }),
    [periode, reference, anneeScolaire, classe, semestre]
  );

  const { data, isLoading, isFetching } = useRapport(cle, parametres);
  const telecharger = useTelechargerRapport();

  const rapport = data?.rapport;
  const sansPeriode = SANS_PERIODE.includes(cle);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Rapports</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Encaissements, impayés, résultats, assiduité et effectifs, sur la période de votre
          choix. Chaque rapport est recalculé à la demande et peut être téléchargé au format
          PDF pour être présenté ou archivé.
        </p>
      </header>

      {/* --- Choix du rapport --- */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(catalogue?.rapports ?? []).map((r) => {
          const Icone = ICONES[r.cle] ?? FileText;
          const actif = r.cle === cle;
          return (
            <button
              key={r.cle}
              type="button"
              onClick={() => setCle(r.cle)}
              aria-pressed={actif}
              className={`carte carte-interactive flex items-center gap-3 p-4 text-left transition
                ${actif ? 'border-ista ring-2 ring-ista/20' : ''}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                ${actif ? 'bg-ista/10' : 'bg-slate-100'}`}
              >
                <Icone className={`h-4.5 w-4.5 ${actif ? 'text-ista' : 'text-slate-500'}`} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-marine">{r.titre}</span>
                <span className="block text-xs text-slate-500">{r.domaine}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* --- Filtres --- */}
      <div className="carte grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {sansPeriode ? (
          <ChampSelect
            label="Semestre"
            value={semestre}
            onChange={(e) => setSemestre(e.target.value)}
            options={[
              { valeur: 'semestre1', libelle: 'Semestre 1' },
              { valeur: 'semestre2', libelle: 'Semestre 2' },
            ]}
            indication={cle === 'effectifs' ? 'Sans effet sur ce rapport' : undefined}
          />
        ) : (
          <>
            <ChampSelect
              label="Période"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              options={PERIODES}
            />
            <ChampTexte
              label="Date de référence"
              type="date"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              indication="Une date située dans la période voulue"
              disabled={periode === 'general'}
            />
          </>
        )}

        <ChampSelect
          label="Classe"
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          placeholder="Toutes les classes"
          options={classes.map((c) => ({ valeur: c._id ?? c.id, libelle: c.nom }))}
        />

        <div className="flex items-end">
          <Bouton
            onClick={() => telecharger.mutate({
              cle,
              params: parametres,
              nom: `${rapport?.titre ?? cle} - ${rapport?.periode ?? ''}`.trim(),
            })}
            chargement={telecharger.isPending}
            disabled={!rapport}
            className="w-full"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Télécharger en PDF
          </Bouton>
        </div>
      </div>

      {isLoading && !rapport ? (
        <Chargement message="Calcul du rapport..." />
      ) : !rapport ? (
        <EtatVide icone={FileText} titre="Rapport indisponible" message="Aucune donnée à afficher." />
      ) : (
        <div className={`space-y-6 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <p className="text-sm text-slate-500">
            <strong className="text-marine">{rapport.titre}</strong> — {rapport.periode}
          </p>
          {VUES[rapport.type]?.(rapport)}
        </div>
      )}
    </div>
  );
}
