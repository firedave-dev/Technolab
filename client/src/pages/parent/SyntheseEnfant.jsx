/**
 * Synthese d'un enfant, pour son parent — page unique et deroulante.
 *
 * POURQUOI PAS D'ONGLETS. Un parent ne vient pas consulter un module, il vient
 * savoir si tout va bien. Repartir la reponse entre quatre onglets l'oblige a
 * chercher la mauvaise nouvelle onglet par onglet ; ici, un defilement suffit.
 * Les quatre indicateurs du haut donnent l'essentiel sans defiler du tout.
 *
 * CHARGEMENT PROGRESSIF. Les quatre indicateurs partent immediatement ; chaque
 * bloc en aval n'interroge le serveur qu'en approchant de l'ecran. Un parent
 * qui ne fait que jeter un oeil ne declenche donc ni le releve de paiements ni
 * l'emploi du temps.
 *
 * Le serveur verifie de toute facon le lien de parente a chaque appel : cet
 * ecran ne fait que presenter ce qu'il a le droit de voir.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CalendarDays, Check, CreditCard,
  FileSpreadsheet, UserCheck,
} from 'lucide-react';
import { useMesEnfants } from '../../hooks/useGestion.js';
import { useAbsencesEtudiant, useBulletin } from '../../hooks/useScolarite.js';
import { useEcheancierEtudiant } from '../../hooks/useComptabilite.js';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import { formaterMontant } from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';
import { initiales } from '../../utils/roles.js';

/**
 * Le bloc est-il entre dans le champ ?
 *
 * Sert a n'interroger le serveur qu'au moment ou la reponse va etre lue. La
 * marge de 200 px lance la requete juste avant l'arrivee, pour que le contenu
 * soit pret quand le bloc apparait.
 */
function useApproche() {
  const cible = useRef(null);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const element = cible.current;
    if (!element || vu) return undefined;

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        setVu(true);
        observateur.disconnect();
      },
      { rootMargin: '200px' }
    );

    observateur.observe(element);
    return () => observateur.disconnect();
  }, [vu]);

  return [cible, vu];
}

/** Indicateur du bandeau de synthese. */
function Indicateur({ icone: Icone, libelle, valeur, detail, ton = 'text-marine' }) {
  return (
    <div className="carte p-4">
      <span className="flex items-center gap-1.5 label-indicateur">
        <Icone className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        {libelle}
      </span>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${ton}`}>{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

/** Section deroulante, avec son titre et son chargement differe. */
function Bloc({ titre, icone: Icone, action, children, conteneur }) {
  return (
    <section ref={conteneur} className="scroll-mt-24" aria-labelledby={`bloc-${titre}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`bloc-${titre}`} className="flex items-center gap-2 titre-section">
          <Icone className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {titre}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const lien = 'text-sm font-medium text-ista hover:underline';

export default function SyntheseEnfant() {
  const { id } = useParams();

  const { data: mesEnfants, isLoading: chargeEnfants } = useMesEnfants();
  const enfant = (mesEnfants?.enfants || []).find((e) => String(e.id) === String(id));

  // Le bulletin porte la moyenne : il fait partie de la synthese haute.
  const { data: donneesBulletin, isLoading: chargeBulletin } = useBulletin(id, {});
  const bulletin = donneesBulletin?.bulletin;

  const [refAbsences, absencesVues] = useApproche();
  const [refPaiements, paiementsVus] = useApproche();
  const [refPlanning, planningVu] = useApproche();

  const { data: donneesAbsences } = useAbsencesEtudiant(absencesVues ? id : null);
  const { data: donneesPaiements } = useEcheancierEtudiant(paiementsVus ? id : null, {});

  if (chargeEnfants) return <Chargement message="Chargement du dossier..." />;

  if (!enfant) {
    return (
      <EtatVide
        titre="Dossier introuvable"
        message="Cet étudiant n’est pas rattaché à votre compte."
        action={<Link to="/mes-enfants" className={lien}>Retour à mes enfants</Link>}
      />
    );
  }

  const absences = donneesAbsences?.absences || [];
  const aJustifier = absences.filter((a) => !a.justifiee).length;

  const echeances = donneesPaiements?.echeances || [];
  const resteDu = echeances.reduce((s, e) => s + Math.max(0, e.montant - e.montantPaye), 0);
  const enRetard = echeances.some((e) => e.enRetard);

  /*
   * La note la plus recente, toutes matieres confondues. On la cherche dans le
   * bulletin plutot que d'ajouter un appel : elle y est deja.
   */
  const derniere = (bulletin?.matieres || [])
    .filter((m) => m.note !== null && m.note !== undefined)
    .sort((a, b) => b.note - a.note)[0];

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-12">
      {/* --- En-tete --- */}
      <header className="sticky top-16 z-20 -mx-4 flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <Link
          to="/mes-enfants"
          className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-marine"
          aria-label="Retour à mes enfants"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ista text-sm font-bold text-white">
          {initiales(enfant.prenom, enfant.nom)}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-marine">
            {enfant.prenom} {enfant.nom}
          </h1>
          <p className="truncate text-sm text-slate-500">
            {enfant.classe?.nom || 'Classe non renseignée'}
            {enfant.matricule && (
              <> · <span className="font-mono text-xs">Matricule : {enfant.matricule}</span></>
            )}
          </p>
        </div>
      </header>

      {/* --- Synthese : ce qu'on voit sans defiler --- */}
      <section aria-label="Synthèse" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicateur
          icone={FileSpreadsheet}
          libelle="Moyenne générale"
          valeur={
            chargeBulletin ? '…'
              : bulletin?.moyenneGenerale === null || bulletin?.moyenneGenerale === undefined
                ? '—'
                : `${bulletin.moyenneGenerale.toFixed(2).replace('.', ',')}/20`
          }
          detail={bulletin?.mention || undefined}
          ton={
            bulletin?.moyenneGenerale >= 10 ? 'text-succes'
              : bulletin?.moyenneGenerale >= 0 ? 'text-retard' : 'text-marine'
          }
        />

        <Indicateur
          icone={Check}
          libelle="Crédits validés"
          valeur={bulletin ? `${bulletin.creditsAcquis ?? 0}/${bulletin.creditsTotal ?? 0}` : '—'}
          detail={derniere ? `Dernière note : ${derniere.matiere.nom}` : undefined}
        />

        <Indicateur
          icone={CreditCard}
          libelle="Scolarité"
          valeur={paiementsVus ? (resteDu > 0 ? formaterMontant(resteDu) : 'À jour') : '…'}
          detail={resteDu > 0 ? (enRetard ? 'Échéance dépassée' : 'Reste à régler') : undefined}
          ton={resteDu > 0 ? (enRetard ? 'text-retard' : 'text-alerte') : 'text-succes'}
        />

        <Indicateur
          icone={UserCheck}
          libelle="Absences"
          valeur={absencesVues ? absences.length : '…'}
          detail={aJustifier > 0 ? `${aJustifier} à justifier` : 'Toutes justifiées'}
          ton={aJustifier > 0 ? 'text-alerte' : 'text-succes'}
        />
      </section>

      {/* --- Bloc 1 : notes --- */}
      <Bloc
        titre="Notes et bulletin"
        icone={FileSpreadsheet}
        action={
          bulletin?.ues?.length ? (
            <Link to={`/notes/bulletin/${id}`} className={lien}>
              Voir le bulletin complet
            </Link>
          ) : null
        }
      >
        {chargeBulletin ? (
          <Chargement message="Chargement des notes..." />
        ) : !bulletin?.matieres?.length ? (
          <p className="carte p-6 text-sm text-slate-500">
            Aucune note n’est encore publiée pour cette période.
          </p>
        ) : (
          <div className="carte overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  {['Matière', 'Classe', 'Examen', 'Moyenne'].map((titre) => (
                    <th key={titre} className="px-4 py-2.5 label-indicateur text-slate-500">
                      {titre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulletin.matieres.map((m) => (
                  <tr key={m.matiere.id}>
                    <td className="px-4 py-2.5 text-sm font-medium text-marine">{m.matiere.nom}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">
                      {m.noteClasse ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">
                      {m.noteExamen ?? '—'}
                    </td>
                    <td className={`px-4 py-2.5 text-sm font-bold tabular-nums ${
                      m.note === null || m.note === undefined ? 'text-slate-300'
                        : m.note >= 10 ? 'text-succes' : 'text-retard'
                    }`}>
                      {m.note === null || m.note === undefined
                        ? '—'
                        : m.note.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>

      {/* --- Bloc 2 : absences --- */}
      <Bloc titre="Absences" icone={UserCheck} conteneur={refAbsences}>
        {!absencesVues ? (
          <div className="carte h-24 animate-pulse" />
        ) : !absences.length ? (
          <p className="carte p-6 text-sm text-slate-500">Aucune absence enregistrée.</p>
        ) : (
          <>
            {aJustifier > 0 && (
              <p className="mb-3 flex items-start gap-2 rounded-lg border border-alerte bg-alerte-fond p-3 text-sm text-alerte">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {aJustifier} absence{aJustifier > 1 ? 's' : ''} en attente de justificatif.
                  Remettez-le au surveillant, qui l’enregistrera.
                </span>
              </p>
            )}

            <ul className="carte divide-y divide-slate-100">
              {absences.slice(0, 5).map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-marine">
                      {a.matiere?.nom || 'Journée entière'}
                    </span>
                    <span className="text-xs text-slate-500">{dateCourte(a.date)}</span>
                  </span>
                  <span className={a.justifiee ? 'pastille-succes' : 'pastille-alerte'}>
                    {a.justifiee ? 'Justifiée' : 'À justifier'}
                  </span>
                </li>
              ))}
            </ul>

            {absences.length > 5 && (
              <p className="mt-2 text-xs text-slate-500">
                {absences.length - 5} absence{absences.length - 5 > 1 ? 's' : ''} plus ancienne
                {absences.length - 5 > 1 ? 's' : ''} non affichée
                {absences.length - 5 > 1 ? 's' : ''}.
              </p>
            )}
          </>
        )}
      </Bloc>

      {/* --- Bloc 3 : paiements --- */}
      <Bloc
        titre="Scolarité"
        icone={CreditCard}
        conteneur={refPaiements}
        action={<Link to="/paiements" className={lien}>Voir tous les règlements</Link>}
      >
        {!paiementsVus ? (
          <div className="carte h-24 animate-pulse" />
        ) : !echeances.length ? (
          <p className="carte p-6 text-sm text-slate-500">
            Aucun échéancier n’est encore établi pour cet étudiant.
          </p>
        ) : (
          <div className="carte overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  {['Échéance', 'Date limite', 'Montant', 'Réglé', 'Reste'].map((titre) => (
                    <th key={titre} className="px-4 py-2.5 label-indicateur text-slate-500">
                      {titre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {echeances.map((e) => {
                  const reste = Math.max(0, e.montant - e.montantPaye);
                  return (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 text-sm font-medium text-marine">{e.libelle}</td>
                      <td className={`px-4 py-2.5 text-sm ${e.enRetard ? 'font-medium text-retard' : 'text-slate-500'}`}>
                        {dateCourte(e.dateEcheance)}
                      </td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-slate-600">
                        {formaterMontant(e.montant)}
                      </td>
                      <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">
                        {formaterMontant(e.montantPaye)}
                      </td>
                      <td className={`px-4 py-2.5 text-sm font-bold tabular-nums ${reste > 0 ? 'text-alerte' : 'text-succes'}`}>
                        {reste > 0 ? formaterMontant(reste) : 'Soldé'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>

      {/* --- Bloc 4 : emploi du temps --- */}
      <Bloc
        titre="Emploi du temps"
        icone={CalendarDays}
        conteneur={refPlanning}
        action={<Link to="/planning" className={lien}>Voir la semaine complète</Link>}
      >
        <p className="carte p-6 text-sm text-slate-500">
          {planningVu
            ? 'Les cours de la semaine sont consultables depuis le module Emploi du temps.'
            : ' '}
        </p>
      </Bloc>
    </div>
  );
}
