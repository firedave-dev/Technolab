/**
 * Vues du tableau de bord, une par famille de profils.
 *
 * Chacune consomme la charge utile que le serveur a jugee appropriee au role :
 * l'interface ne filtre rien, elle met en forme ce qu'elle recoit.
 *
 * Chaque indicateur porte une icone contextuelle et, quand la donnee de comparaison
 * existe cote serveur, une fleche de tendance. Les indicateurs sans comparaison
 * disponible n'en affichent pas : une fleche inventee tromperait le lecteur.
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, Award, BookOpen, CalendarDays, Clock, Eye, GraduationCap, ListChecks, TrendingUp, Trophy, UserX, Users, Wallet } from 'lucide-react';
import { Alertes, CarteSection, ProchainsExamens, RangeeIndicateurs, SeancesDuJour } from './blocs.jsx';
import { couleurMoyenne } from '../../utils/scolarite.js';
import { formaterMontant, formaterMontantCourt } from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';

/**
 * Traduit la tendance renvoyee par le serveur en propriete d'affichage.
 * Renvoie `undefined` quand la periode de reference etait vide : pas de fleche.
 */
const tendanceEncaissement = (tendance) =>
  tendance?.variation === null || tendance?.variation === undefined
    ? undefined
    : { variation: tendance.variation, sens: 'hausse-positive', periode: 'sur 30 jours' };

/** Direction : effectifs, resultats, finances et alertes de l'etablissement. */
export function VueDirection({ tableau }) {
  const { effectifs, pedagogie, finances, absencesDuJour, seancesDuJour, alertes } = tableau;

  return (
    <>
      <RangeeIndicateurs
        titre="Etablissement"
        indicateurs={[
          {
            libelle: 'Etudiants inscrits',
            valeur: effectifs.etudiants,
            detail: `${effectifs.classes} classe(s)`,
            icone: GraduationCap,
          },
          {
            libelle: 'Moyenne generale',
            valeur: pedagogie.moyenne === null ? '—' : `${pedagogie.moyenne}/20`,
            detail: pedagogie.tauxReussite === null ? undefined : `${pedagogie.tauxReussite} % de reussite`,
            icone: Award,
            accent: couleurMoyenne(pedagogie.moyenne),
          },
          {
            libelle: 'Recouvrement',
            valeur: finances.tauxRecouvrement === null ? '—' : `${finances.tauxRecouvrement} %`,
            detail: `${formaterMontantCourt(finances.reste)} FCFA a recouvrer`,
            icone: TrendingUp,
            ton: finances.tauxRecouvrement >= 70 ? 'succes' : 'alerte',
            tendance: tendanceEncaissement(tableau.tendanceEncaissements),
          },
          {
            libelle: 'Absences aujourd hui',
            valeur: absencesDuJour.total,
            detail: `${seancesDuJour.nombre} seance(s) au programme`,
            icone: UserX,
            ton: absencesDuJour.total > 0 ? 'alerte' : 'neutre',
          },
        ]}
      />

      <Alertes
        alertes={[
          { libelle: 'Paiements en attente de validation', nombre: alertes.paiementsAValider, vers: '/paiements' },
          { libelle: 'Absences non justifiees', nombre: alertes.absencesNonJustifiees, vers: '/absences' },
          { libelle: 'Echeances en retard', nombre: alertes.echeancesEnRetard, vers: '/paiements' },
          { libelle: 'Evaluations non publiees', nombre: alertes.notesNonPubliees, vers: '/notes' },
        ]}
      />

      <p className="text-center text-xs text-slate-500">
        Analyse detaillee :{' '}
        <Link to="/statistiques" className="font-medium text-ista hover:underline">
          ouvrir les statistiques
        </Link>
      </p>
    </>
  );
}

/** Secretariat : inscriptions, caisse et absences du jour. */
export function VueSecretariat({ tableau }) {
  const { effectifs, finances, absencesDuJour, alertes } = tableau;

  return (
    <>
      <RangeeIndicateurs
        titre="Activite"
        indicateurs={[
          {
            libelle: 'Etudiants inscrits',
            valeur: effectifs.etudiants,
            detail: `${effectifs.classes} classe(s)`,
            icone: GraduationCap,
          },
          { libelle: 'Parents rattaches', valeur: effectifs.parents, icone: Users },
          {
            libelle: 'Recouvrement',
            valeur: finances.tauxRecouvrement === null ? '—' : `${finances.tauxRecouvrement} %`,
            detail: `${formaterMontant(finances.reste)} restant`,
            icone: Wallet,
            tendance: tendanceEncaissement(tableau.tendanceEncaissements),
          },
          {
            libelle: 'Absences aujourd hui',
            valeur: absencesDuJour.total,
            icone: UserX,
            ton: absencesDuJour.total > 0 ? 'alerte' : 'neutre',
          },
        ]}
      />

      <Alertes
        alertes={[
          { libelle: 'Paiements en attente de validation', nombre: alertes.paiementsAValider, vers: '/paiements' },
        ]}
      />
    </>
  );
}

/** Professeur : ses cours du jour, ses matieres et l'etat de ses corrections. */
export function VueProfesseur({ tableau }) {
  const { matieres, seancesDuJour, aCorriger, aPublier, prochainsExamens } = tableau;

  return (
    <>
      <RangeeIndicateurs
        titre="Vos enseignements"
        indicateurs={[
          { libelle: 'Matieres assignees', valeur: matieres.length, icone: BookOpen },
          {
            libelle: 'Etudiants suivis',
            valeur: matieres.reduce((somme, m) => somme + m.effectif, 0),
            icone: Users,
          },
          {
            libelle: 'Corrections en cours',
            valeur: aCorriger.length,
            icone: ListChecks,
            ton: aCorriger.length > 0 ? 'alerte' : 'succes',
          },
          {
            libelle: 'Notes a publier',
            valeur: aPublier,
            icone: Eye,
            ton: aPublier > 0 ? 'alerte' : 'succes',
          },
        ]}
      />

      <SeancesDuJour donnees={seancesDuJour} />

      {aCorriger.length > 0 && (
        <CarteSection titre="Corrections a terminer" icone={ListChecks}>
          <ul className="divide-y divide-slate-100">
            {aCorriger.map((evaluation) => (
              <li key={evaluation.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{evaluation.titre}</p>
                  <p className="truncate text-xs text-slate-500">
                    {evaluation.matiere} · {dateCourte(evaluation.date)} · {evaluation.saisies} note(s) saisie(s)
                  </p>
                </div>
                <Link to="/notes" className="text-xs font-medium text-ista hover:underline">
                  Saisir
                </Link>
              </li>
            ))}
          </ul>
        </CarteSection>
      )}

      <CarteSection titre="Vos matieres" icone={BookOpen}>
        <ul className="divide-y divide-slate-100">
          {matieres.map((matiere) => (
            <li key={matiere.id} className="flex flex-wrap items-center gap-4 px-6 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{matiere.nom}</p>
                <p className="truncate text-xs text-slate-500">
                  {matiere.classe} · {matiere.effectif} etudiant(s)
                </p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                {matiere.code}
              </span>
            </li>
          ))}
        </ul>
      </CarteSection>

      <ProchainsExamens examens={prochainsExamens} />
    </>
  );
}

/** Surveillance : absences a traiter et convocations. */
export function VueSurveillant({ tableau }) {
  const { absencesDuJour, alertes, surveillances, seancesDuJour } = tableau;

  return (
    <>
      <RangeeIndicateurs
        titre="Aujourd hui"
        indicateurs={[
          { libelle: 'Absences constatees', valeur: absencesDuJour.absences, icone: UserX },
          { libelle: 'Retards', valeur: absencesDuJour.retards, icone: Clock },
          {
            libelle: 'A justifier (total)',
            valeur: alertes.absencesNonJustifiees,
            icone: AlertTriangle,
            ton: alertes.absencesNonJustifiees > 0 ? 'alerte' : 'succes',
          },
          { libelle: 'Seances au programme', valeur: seancesDuJour.nombre, icone: CalendarDays },
        ]}
      />

      <Alertes
        alertes={[
          { libelle: 'Absences a justifier', nombre: alertes.absencesNonJustifiees, vers: '/absences' },
        ]}
      />

      <ProchainsExamens examens={surveillances} titre="Vos surveillances" />
    </>
  );
}

/** Resume d'un etudiant : scolarite, absences, finances. Reutilise pour le parent. */
export function ResumeEtudiant({ resume, avecEnTete = false }) {
  const { etudiant, scolarite, absences, finances, prochainsExamens, seancesDuJour } = resume;

  return (
    <div className="space-y-6">
      {avecEnTete && (
        <h2 className="titre-section">
          {etudiant.nomComplet}
          {etudiant.classe && (
            <span className="ml-2 text-sm font-medium text-slate-500">{etudiant.classe}</span>
          )}
        </h2>
      )}

      <RangeeIndicateurs
        indicateurs={[
          {
            libelle: 'Moyenne generale',
            valeur: scolarite.moyenne === null ? '—' : `${scolarite.moyenne}/20`,
            detail: scolarite.mention || undefined,
            icone: Award,
            accent: couleurMoyenne(scolarite.moyenne),
          },
          {
            libelle: 'Rang',
            valeur: scolarite.rang ? `${scolarite.rang} / ${scolarite.effectif}` : '—',
            detail:
              scolarite.moyenneClasse === null
                ? undefined
                : `moyenne de classe ${scolarite.moyenneClasse}/20`,
            icone: Trophy,
          },
          {
            libelle: 'Absences',
            valeur: absences.total,
            detail: `${absences.nonJustifiees} non justifiee(s)`,
            icone: UserX,
            ton: absences.nonJustifiees > 0 ? 'alerte' : 'succes',
          },
          {
            libelle: 'Reste a payer',
            valeur: formaterMontant(finances.reste),
            detail: finances.tauxReglement === null ? undefined : `${finances.tauxReglement} % regle`,
            icone: Wallet,
            ton: finances.reste > 0 ? 'retard' : 'succes',
            accent: finances.reste > 0 ? 'text-retard' : 'text-succes',
          },
        ]}
      />

      <SeancesDuJour donnees={seancesDuJour} afficherClasse={false} />
      <ProchainsExamens examens={prochainsExamens} />
    </div>
  );
}

/** Parent : un bloc par enfant. */
export function VueParent({ tableau }) {
  const enfants = tableau.enfants || [];

  if (!enfants.length) {
    return (
      <p className="carte p-8 text-center text-sm text-slate-500">
        Aucun enfant n est rattache a votre compte. Contactez le secretariat.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {enfants.map((resume) => (
        <ResumeEtudiant key={resume.etudiant.id} resume={resume} avecEnTete={enfants.length > 1} />
      ))}
    </div>
  );
}
