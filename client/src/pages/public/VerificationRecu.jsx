/**
 * Verification publique d'un recu de paiement — cible du QR code imprime.
 *
 * Accessible sans compte : celui qui scanne le code tient deja le recu. La page ne
 * fait que confirmer que le serveur reconnait ce numero, avec le montant et la date
 * a comparer au papier. Aucune identite ni aucun solde n'est affiche : verifier
 * l'authenticite d'un document ne doit pas donner acces au dossier d'un etudiant.
 *
 * Page non indexee : elle n'a de sens que pour un numero precis.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BadgeCheck, Ban, Clock } from 'lucide-react';
import api from '../../api/client.js';
import Seo from '../../components/Seo.jsx';
import Logo from '../../components/Logo.jsx';
import Chargement from '../../components/ui/Chargement.jsx';
import { formaterMontant } from '../../utils/montant.js';
import { dateCourte } from '../../utils/formulaire.js';

/** Presentation selon le statut du reglement. */
const ETATS = {
  valide: {
    icone: BadgeCheck,
    titre: 'Recu authentique',
    texte: 'Ce reglement est enregistre et valide par l etablissement.',
    classes: 'border-succes bg-succes-fond text-succes',
  },
  en_attente: {
    icone: Clock,
    titre: 'Recu provisoire',
    texte:
      'Ce reglement est enregistre mais attend la validation de la direction. '
      + 'Il n est pas encore impute sur le solde.',
    classes: 'border-alerte bg-alerte-fond text-alerte',
  },
  annule: {
    icone: Ban,
    titre: 'Recu annule',
    texte: 'Ce reglement a ete annule par l etablissement. Ce document est sans valeur.',
    classes: 'border-retard bg-retard-fond text-retard',
  },
};

export default function VerificationRecu() {
  const { numeroRecu } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['verification-recu', numeroRecu],
    queryFn: () => api.get(`/paiements/verification/${numeroRecu}`).then((r) => r.data),
    retry: false,
  });

  const recu = data?.recu;
  const etat = recu ? ETATS[recu.statut] : null;
  const Icone = etat?.icone || AlertTriangle;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <Seo
        chemin={`/verification/${numeroRecu}`}
        titre="Verification d un recu"
        description="Verification de l authenticite d un recu de paiement Technolab ISTA."
        indexable={false}
      />

      <div className="mb-8 flex justify-center">
        <Logo variante="clair" hauteur={44} />
      </div>

      {isLoading ? (
        <Chargement message="Verification en cours..." />
      ) : isError || !recu ? (
        <div className="carte p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-retard-fond">
            <AlertTriangle className="h-6 w-6 text-retard" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-marine">Recu introuvable</h1>
          <p className="mt-2 text-sm text-slate-600">
            Aucun reglement ne correspond au numero <strong className="font-mono">{numeroRecu}</strong>.
            Verifiez la saisie, ou rapprochez-vous du secretariat.
          </p>
        </div>
      ) : (
        <div className="carte overflow-hidden">
          <div className={`flex items-start gap-4 border-b-2 p-6 ${etat.classes}`}>
            <Icone className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
            <div>
              <h1 className="text-lg font-bold">{etat.titre}</h1>
              <p className="mt-1 text-sm opacity-90">{etat.texte}</p>
            </div>
          </div>

          <dl className="divide-y divide-slate-100">
            {[
              ['Numero de recu', <span className="font-mono">{recu.numero}</span>],
              ['Montant', <strong className="text-marine">{formaterMontant(recu.montant)}</strong>],
              ['Date du paiement', dateCourte(recu.date)],
              ['Etablissement', recu.etablissement],
            ].map(([libelle, valeur]) => (
              <div key={libelle} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                <dt className="text-sm text-slate-500">{libelle}</dt>
                <dd className="text-sm font-medium text-slate-800">{valeur}</dd>
              </div>
            ))}
          </dl>

          <p className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs leading-relaxed text-slate-500">
            Comparez ces informations a celles portees sur le document papier. Toute
            divergence doit etre signalee au secretariat de l etablissement.
          </p>
        </div>
      )}
    </div>
  );
}
