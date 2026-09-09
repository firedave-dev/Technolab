/**
 * Dossier d'un etudiant : identite, scolarite et parents rattaches.
 * Le secretariat et la direction peuvent affecter une classe et gerer les liaisons ;
 * les autres profils autorises (professeur, surveillant, parent, etudiant) sont en lecture seule.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarX2, FileSpreadsheet, Link2Off, Mail, Phone, Plus, UserSquare2 } from 'lucide-react';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import BadgeStatut from '../../components/ui/BadgeStatut.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import AjoutParent from './AjoutParent.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  useAffecterClasse,
  useClasses,
  useDelierParent,
  useDossierEtudiant,
} from '../../hooks/useGestion.js';
import { ADMIN_ROLES, ROLES, initiales } from '../../utils/roles.js';
import { dateCourte } from '../../utils/formulaire.js';

/** Ligne d'information reutilisee dans les cartes du dossier. */
function Info({ libelle, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-40 shrink-0 text-sm text-slate-500">{libelle}</dt>
      <dd className="text-sm text-slate-800">{children || '—'}</dd>
    </div>
  );
}

export default function DossierEtudiant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur: acteur } = useAuth();

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [aDelier, setADelier] = useState(null);

  const { data, isLoading, isError } = useDossierEtudiant(id);
  const peutModifier = [...ADMIN_ROLES, ROLES.SECRETAIRE].includes(acteur?.role);
  // Les profils en lecture seule n'appellent pas /classes : ils n'y ont pas droit.
  const { data: classesData } = useClasses({ actif: 'true' }, peutModifier);

  const affecter = useAffecterClasse();
  const delier = useDelierParent();

  if (isLoading) return <Chargement message="Ouverture du dossier..." />;

  if (isError || !data?.etudiant) {
    return (
      <EtatVide
        titre="Dossier indisponible"
        message="Ce dossier n existe pas ou ne vous est pas accessible."
        action={<Bouton variante="secondaire" onClick={() => navigate(-1)}>Retour</Bouton>}
      />
    );
  }

  const etudiant = data.etudiant;
  const classeActuelle = etudiant.infosEtudiant?.classe;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour
      </button>

      {/* En-tete du dossier */}
      <section className="carte flex flex-col items-center gap-4 p-5 sm:flex-row sm:p-6">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
          {initiales(etudiant.prenom, etudiant.nom)}
        </span>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="truncate text-lg font-semibold text-marine">{etudiant.nomComplet}</h2>
          <p className="truncate text-sm text-slate-500">{etudiant.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <BadgeStatut statut={etudiant.infosEtudiant?.statut} />
            <BadgeStatut statut={etudiant.actif ? 'actif' : 'inactif'} />
            {etudiant.matricule && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                {etudiant.matricule}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Identite */}
      <section className="carte p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-marine">Informations personnelles</h3>
        <dl className="space-y-3">
          <Info libelle="Telephone">{etudiant.telephone}</Info>
          <Info libelle="Date de naissance">{dateCourte(etudiant.dateNaissance)}</Info>
          <Info libelle="Lieu de naissance">{etudiant.infosEtudiant?.lieuNaissance}</Info>
          <Info libelle="Nationalite">{etudiant.infosEtudiant?.nationalite}</Info>
          <Info libelle="Adresse">{etudiant.adresse}</Info>
        </dl>
      </section>

      {/* Scolarite */}
      <section className="carte p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-semibold text-marine">Scolarite</h3>

        <dl className="space-y-3">
          <Info libelle="Annee d inscription">{etudiant.infosEtudiant?.anneeInscription}</Info>
          <Info libelle="Classe">
            {classeActuelle
              ? `${classeActuelle.nom} — ${classeActuelle.filiere} (${classeActuelle.anneeScolaire})`
              : 'Non affecte'}
          </Info>
        </dl>

        {peutModifier && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <ChampSelect
              label="Changer de classe"
              placeholder="Retirer de sa classe"
              options={(classesData?.classes || []).map((c) => ({
                valeur: c.id,
                libelle: `${c.nom} — ${c.effectif}/${c.capacite} places`,
              }))}
              value={classeActuelle?._id || classeActuelle?.id || ''}
              disabled={affecter.isPending}
              onChange={(e) => affecter.mutate({ id: etudiant.id, classe: e.target.value })}
              indication="La modification est enregistree immediatement."
              className="max-w-sm"
            />
          </div>
        )}
      </section>

      {/* Acces rapide aux modules pedagogiques de cet etudiant */}
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          ['Bulletin', `/notes/bulletin/${etudiant.id}`, FileSpreadsheet, 'Moyennes, rang et detail par matiere'],
          ['Absences', `/absences?etudiant=${etudiant.id}`, CalendarX2, 'Historique des absences et retards'],
        ].map(([libelle, vers, Icone, description]) => (
          <Link
            key={libelle}
            to={vers}
            className="carte group flex items-center gap-3 p-4 transition hover:border-brand-300 hover:shadow"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icone className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800">{libelle}</span>
              <span className="block truncate text-xs text-slate-500">{description}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Parents rattaches */}
      <section className="carte p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-marine">
            Parents rattaches ({etudiant.parents?.length || 0})
          </h3>
          {peutModifier && (
            <Bouton variante="secondaire" taille="sm" onClick={() => setAjoutOuvert(true)}>
              <Plus className="h-4 w-4" />
              Rattacher un parent
            </Bouton>
          )}
        </div>

        {etudiant.parents?.length ? (
          <ul className="divide-y divide-slate-100">
            {etudiant.parents.map((parent) => (
              <li key={parent._id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-semibold text-pink-700">
                  {initiales(parent.prenom, parent.nom)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {parent.prenom} {parent.nom}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {parent.email}
                    </span>
                    {parent.telephone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden="true" />
                        {parent.telephone}
                      </span>
                    )}
                  </div>
                </div>

                {peutModifier && (
                  <button
                    type="button"
                    onClick={() => setADelier(parent)}
                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-retard"
                    title="Retirer ce parent"
                  >
                    <Link2Off className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            icone={UserSquare2}
            titre="Aucun parent rattache"
            message={
              peutModifier
                ? 'Rattachez un compte parent pour lui donner acces au suivi de cet etudiant.'
                : 'Aucun tuteur legal n est enregistre pour cet etudiant.'
            }
          />
        )}
      </section>

      {peutModifier && (
        <p className="text-center text-xs text-slate-400">
          Les informations d identite se modifient depuis{' '}
          <Link to="/utilisateurs" className="text-brand-600 hover:underline">
            la gestion des comptes
          </Link>
          .
        </p>
      )}

      {peutModifier && (
        <AjoutParent
          ouverte={ajoutOuvert}
          onFermer={() => setAjoutOuvert(false)}
          etudiant={etudiant}
        />
      )}

      <Confirmation
        ouverte={Boolean(aDelier)}
        onFermer={() => setADelier(null)}
        onConfirmer={async () => {
          await delier.mutateAsync({ id: etudiant.id, parentId: aDelier._id });
          setADelier(null);
        }}
        chargement={delier.isPending}
        titre="Retirer ce parent ?"
        message={`${aDelier?.prenom} ${aDelier?.nom} perdra l acces au suivi de cet etudiant. Le compte parent lui-meme n est pas supprime.`}
        libelleConfirmer="Retirer"
      />
    </div>
  );
}
