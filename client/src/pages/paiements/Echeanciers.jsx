/**
 * Echeancier d'un etudiant : lignes a payer, solde et encaissement.
 * La generation s'appuie sur la grille tarifaire de la classe ; elle est rejouable,
 * ce qui permet de rattraper un etudiant inscrit en cours d'annee.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileText, ListPlus, Receipt, Wallet } from 'lucide-react';
import Tableau from '../../components/ui/Tableau.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulairePaiement from './FormulairePaiement.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useClasses, useEtudiants } from '../../hooks/useGestion.js';
import {
  useEcheancierEtudiant,
  useGenererEcheancier,
  useGenererEcheancierClasse,
  useOuvrirRecu,
} from '../../hooks/useComptabilite.js';
import {
  COULEUR_STATUT_ECHEANCE,
  formaterMontant,
  libelleMode,
  libelleStatutEcheance,
} from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';

export default function Echeanciers() {
  const [recherche, setRecherche] = useState('');
  const [classe, setClasse] = useState('');
  const [etudiantId, setEtudiantId] = useState(null);
  const [paiementOuvert, setPaiementOuvert] = useState(false);
  const [echeanceCible, setEcheanceCible] = useState(null);
  const [generationClasse, setGenerationClasse] = useState(false);

  const q = useDebounce(recherche);
  const { data: classesData } = useClasses();
  const { data: etudiantsData, isLoading: chargementListe } = useEtudiants({
    q: q || undefined,
    classe: classe || undefined,
    limite: 50,
  });

  const { data: dossier, isLoading } = useEcheancierEtudiant(etudiantId);
  const generer = useGenererEcheancier();
  const genererClasse = useGenererEcheancierClasse();
  const recu = useOuvrirRecu();

  const etudiants = etudiantsData?.etudiants || [];
  const solde = dossier?.solde;

  const colonnes = [
    {
      cle: 'libelle',
      libelle: 'Echeance',
      rendu: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{e.libelle}</p>
          <p className="truncate text-xs text-slate-500">
            Echue le {dateCourte(e.dateEcheance)}
            {e.enRetard && <span className="ml-1 font-medium text-retard">· en retard</span>}
          </p>
        </div>
      ),
    },
    { cle: 'montant', libelle: 'Montant', rendu: (e) => formaterMontant(e.montant) },
    {
      cle: 'montantPaye',
      libelle: 'Regle',
      rendu: (e) => (
        <span className={e.montantPaye > 0 ? 'text-succes' : 'text-slate-400'}>
          {formaterMontant(e.montantPaye)}
        </span>
      ),
    },
    {
      cle: 'reste',
      libelle: 'Reste',
      rendu: (e) => (
        <span className={e.reste > 0 ? 'font-medium text-slate-900' : 'text-slate-400'}>
          {formaterMontant(e.reste)}
        </span>
      ),
    },
    {
      cle: 'statut',
      libelle: 'Statut',
      rendu: (e) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_ECHEANCE[e.statut]}`}
        >
          {libelleStatutEcheance(e.statut)}
        </span>
      ),
    },
    {
      cle: 'actions',
      libelle: '',
      classe: 'text-right',
      rendu: (e) =>
        e.statut !== 'paye' && e.statut !== 'annule' ? (
          <Bouton
            taille="sm"
            variante="secondaire"
            onClick={() => {
              setEcheanceCible(e);
              setPaiementOuvert(true);
            }}
          >
            Encaisser
          </Bouton>
        ) : null,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* Colonne de selection */}
      <aside className="space-y-3">
        <BarreRecherche valeur={recherche} onChanger={setRecherche} placeholder="Nom, matricule..." />
        <ChampSelect
          placeholder="Toutes les classes"
          options={(classesData?.classes || []).map((c) => ({ valeur: c.id, libelle: c.nom }))}
          value={classe}
          onChange={(e) => setClasse(e.target.value)}
          aria-label="Filtrer par classe"
        />

        {classe && (
          <Bouton
            variante="secondaire"
            taille="sm"
            className="w-full"
            onClick={() => setGenerationClasse(true)}
          >
            <ListPlus className="h-4 w-4" />
            Generer pour la classe
          </Bouton>
        )}

        <div className="carte max-h-[28rem] overflow-y-auto">
          {chargementListe ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Chargement...</p>
          ) : etudiants.length ? (
            <ul className="divide-y divide-slate-100">
              {etudiants.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setEtudiantId(e.id)}
                    className={`w-full px-4 py-2.5 text-left transition ${
                      etudiantId === e.id ? 'bg-brand-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p
                      className={`truncate text-sm ${
                        etudiantId === e.id ? 'font-medium text-brand-700' : 'text-slate-800'
                      }`}
                    >
                      {e.nomComplet}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {e.infosEtudiant?.classe?.nom || 'Sans classe'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Aucun etudiant</p>
          )}
        </div>
      </aside>

      {/* Dossier financier */}
      <div className="min-w-0 space-y-4">
        {!etudiantId ? (
          <div className="carte">
            <EtatVide
              icone={Wallet}
              titre="Selectionnez un etudiant"
              message="Choisissez un etudiant dans la liste pour consulter son echeancier et encaisser un paiement."
            />
          </div>
        ) : isLoading ? (
          <div className="carte">
            <EtatVide titre="Chargement du dossier..." message="" />
          </div>
        ) : (
          <>
            {/* En-tete et solde */}
            <section className="carte p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-marine">
                    {dossier.etudiant.nomComplet}
                  </h3>
                  <p className="truncate text-sm text-slate-500">
                    {dossier.etudiant.classe?.nom || 'Sans classe'}
                    {dossier.etudiant.matricule ? ` · ${dossier.etudiant.matricule}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Bouton
                    variante="secondaire"
                    taille="sm"
                    chargement={generer.isPending}
                    onClick={() => generer.mutate({ id: etudiantId })}
                  >
                    <ListPlus className="h-4 w-4" />
                    Generer l echeancier
                  </Bouton>
                  <Bouton
                    taille="sm"
                    onClick={() => {
                      setEcheanceCible(null);
                      setPaiementOuvert(true);
                    }}
                  >
                    <Receipt className="h-4 w-4" />
                    Encaisser
                  </Bouton>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ['Total du', formaterMontant(solde.total), 'text-slate-900'],
                  ['Regle', formaterMontant(solde.paye), 'text-succes'],
                  ['Reste', formaterMontant(solde.reste), solde.reste > 0 ? 'text-retard' : 'text-slate-900'],
                  ['Taux de reglement', solde.tauxReglement === null ? '—' : `${solde.tauxReglement} %`, 'text-slate-900'],
                ].map(([libelle, valeur, couleur]) => (
                  <div key={libelle} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{libelle}</p>
                    <p className={`mt-0.5 text-sm font-semibold ${couleur}`}>{valeur}</p>
                  </div>
                ))}
              </div>

              {solde.echeancesEnRetard > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {solde.echeancesEnRetard} echeance(s) en retard, soit{' '}
                    {formaterMontant(solde.montantEnRetard)} a recouvrer.
                  </span>
                </p>
              )}
            </section>

            {/* Echeancier */}
            <section className="carte overflow-hidden">
              <h4 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-marine">
                Echeancier
              </h4>
              <Tableau
                colonnes={colonnes}
                donnees={dossier.echeances}
                chargement={false}
                vide={
                  <EtatVide
                    icone={Wallet}
                    titre="Aucune echeance"
                    message="Generez l echeancier depuis la grille tarifaire de la classe."
                  />
                }
              />
            </section>

            {/* Historique */}
            <section className="carte overflow-hidden">
              <h4 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-marine">
                Historique des paiements
              </h4>

              {dossier.paiements.length ? (
                <ul className="divide-y divide-slate-100">
                  {dossier.paiements.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-slate-800">
                          <span className="font-mono text-xs text-slate-500">{p.numeroRecu}</span>{' '}
                          — {formaterMontant(p.montant)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {dateCourte(p.datePaiement)} · {libelleMode(p.mode)}
                          {p.encaissePar ? ` · ${p.encaissePar.prenom} ${p.encaissePar.nom}` : ''}
                        </p>
                      </div>

                      {p.statut === 'en_attente' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-alerte">
                          En attente
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => recu.mutate({ id: p.id, numeroRecu: p.numeroRecu })}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title="Ouvrir le reçu PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Aucun paiement enregistre.</p>
              )}
            </section>

            <p className="text-center text-xs text-slate-400">
              Dossier scolaire complet :{' '}
              <Link to={`/etudiants/${etudiantId}`} className="text-brand-600 hover:underline">
                ouvrir la fiche etudiant
              </Link>
            </p>
          </>
        )}
      </div>

      <FormulairePaiement
        ouverte={paiementOuvert}
        onFermer={() => setPaiementOuvert(false)}
        etudiant={dossier?.etudiant}
        echeancePreselectionnee={echeanceCible}
      />

      <Confirmation
        ouverte={generationClasse}
        onFermer={() => setGenerationClasse(false)}
        onConfirmer={async () => {
          await genererClasse.mutateAsync({ classe });
          setGenerationClasse(false);
        }}
        chargement={genererClasse.isPending}
        variante="primaire"
        titre="Generer les echeanciers de la classe ?"
        message="Chaque etudiant de la classe recevra les echeances issues de la grille tarifaire. Les lignes deja existantes sont conservees, aucun doublon n est cree."
        libelleConfirmer="Generer"
      />
    </div>
  );
}
