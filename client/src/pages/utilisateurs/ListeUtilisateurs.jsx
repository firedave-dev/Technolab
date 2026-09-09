/**
 * Liste des comptes avec recherche, filtres et actions.
 * Le meme composant sert la page "Utilisateurs" (tous les profils) et la page
 * "Personnel" (roles de l'etablissement uniquement) via la prop `rolesCibles`.
 */
import { useState } from 'react';
import { KeyRound, Pencil, Plus, Power, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import Tableau from '../../components/ui/Tableau.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import BadgeRole from '../../components/ui/BadgeRole.jsx';
import BadgeStatut from '../../components/ui/BadgeStatut.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Confirmation from '../../components/ui/Confirmation.jsx';
import FormulaireUtilisateur from './FormulaireUtilisateur.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useBasculerActif,
  useReinitialiserMotDePasse,
  useSupprimerUtilisateur,
  useUtilisateurs,
} from '../../hooks/useGestion.js';
import { ROLE_LABELS } from '../../utils/roles.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ListeUtilisateurs({
  titre = 'Utilisateurs',
  sousTitre = 'Comptes de la plateforme, tous profils confondus.',
  rolesCibles,
  roleImposeCreation,
}) {
  const { utilisateur: acteur } = useAuth();

  const [recherche, setRecherche] = useState('');
  const [role, setRole] = useState('');
  const [actif, setActif] = useState('');
  const [page, setPage] = useState(1);

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [aSupprimer, setASupprimer] = useState(null);
  const [aReinitialiser, setAReinitialiser] = useState(null);

  const q = useDebounce(recherche);

  const { data, isLoading, isError } = useUtilisateurs({
    page,
    limite: 20,
    q: q || undefined,
    role: role || undefined,
    roles: !role && rolesCibles ? rolesCibles.join(',') : undefined,
    actif: actif || undefined,
  });

  const basculer = useBasculerActif();
  const supprimer = useSupprimerUtilisateur();
  const reinitialiser = useReinitialiserMotDePasse();

  /** Remet la pagination a la premiere page quand un filtre change. */
  const changerFiltre = (setter) => (valeur) => {
    setter(valeur);
    setPage(1);
  };

  const ouvrirCreation = () => {
    setEnEdition(null);
    setFormulaireOuvert(true);
  };

  const ouvrirEdition = (ligne) => {
    setEnEdition(ligne);
    setFormulaireOuvert(true);
  };

  const confirmerSuppression = async () => {
    await supprimer.mutateAsync(aSupprimer.id);
    setASupprimer(null);
  };

  const confirmerReinitialisation = async () => {
    const cible = aReinitialiser;
    const reponse = await reinitialiser.mutateAsync({ id: cible.id, donnees: {} });
    setAReinitialiser(null);

    if (reponse.motDePasseProvisoire) {
      // Toast long : l'administration doit avoir le temps de noter le mot de passe.
      toast.success(
        `Mot de passe provisoire de ${cible.prenom} : ${reponse.motDePasseProvisoire}`,
        { duration: 20000 }
      );
    }
  };

  const optionsRoles = (rolesCibles || Object.keys(ROLE_LABELS)).map((r) => ({
    valeur: r,
    libelle: ROLE_LABELS[r],
  }));

  const colonnes = [
    {
      cle: 'nom',
      libelle: 'Nom',
      rendu: (u) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{u.nomComplet}</p>
          <p className="truncate text-xs text-slate-500">{u.email}</p>
        </div>
      ),
    },
    { cle: 'matricule', libelle: 'Matricule', masquerMobile: true, rendu: (u) => u.matricule || '—' },
    { cle: 'role', libelle: 'Role', rendu: (u) => <BadgeRole role={u.role} /> },
    {
      cle: 'telephone',
      libelle: 'Telephone',
      masquerMobile: true,
      rendu: (u) => u.telephone || '—',
    },
    {
      cle: 'actif',
      libelle: 'Statut',
      rendu: (u) => <BadgeStatut statut={u.actif ? 'actif' : 'inactif'} />,
    },
    {
      cle: 'actions',
      libelle: '',
      classe: 'text-right',
      rendu: (u) => {
        const estMoi = u.id === acteur?.id;
        const bouton = 'rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30';

        return (
          <div className="flex items-center justify-end gap-1">
            <button type="button" className={bouton} onClick={() => ouvrirEdition(u)} title="Modifier">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={bouton}
              onClick={() => setAReinitialiser(u)}
              title="Reinitialiser le mot de passe"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={bouton}
              onClick={() => basculer.mutate(u.id)}
              disabled={estMoi}
              title={estMoi ? 'Action impossible sur votre compte' : u.actif ? 'Desactiver' : 'Reactiver'}
            >
              <Power className={`h-4 w-4 ${u.actif ? '' : 'text-emerald-500'}`} />
            </button>
            <button
              type="button"
              className={`${bouton} hover:text-retard`}
              onClick={() => setASupprimer(u)}
              disabled={estMoi}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marine">{titre}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{sousTitre}</p>
        </div>
        <Bouton onClick={ouvrirCreation}>
          <Plus className="h-4 w-4" />
          Nouveau compte
        </Bouton>
      </header>

      {/* Filtres */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BarreRecherche
          valeur={recherche}
          onChanger={changerFiltre(setRecherche)}
          placeholder="Nom, email, matricule..."
          className="lg:col-span-2"
        />
        <ChampSelect
          placeholder="Tous les roles"
          options={optionsRoles}
          value={role}
          onChange={(e) => changerFiltre(setRole)(e.target.value)}
          aria-label="Filtrer par role"
        />
        <ChampSelect
          placeholder="Tous les statuts"
          options={[
            { valeur: 'true', libelle: 'Comptes actifs' },
            { valeur: 'false', libelle: 'Comptes desactives' },
          ]}
          value={actif}
          onChange={(e) => changerFiltre(setActif)(e.target.value)}
          aria-label="Filtrer par statut"
        />
      </div>

      {/* Liste */}
      <div className="carte overflow-hidden">
        {isError ? (
          <EtatVide
            titre="Chargement impossible"
            message="La liste des comptes n a pas pu etre recuperee. Reessayez dans un instant."
          />
        ) : (
          <>
            <Tableau
              colonnes={colonnes}
              donnees={data?.utilisateurs || []}
              chargement={isLoading}
              vide={
                <EtatVide
                  icone={UserPlus}
                  titre="Aucun compte trouve"
                  message={
                    q || role || actif
                      ? 'Aucun compte ne correspond a ces criteres.'
                      : 'Commencez par creer le premier compte.'
                  }
                  action={<Bouton onClick={ouvrirCreation}>Creer un compte</Bouton>}
                />
              }
            />
            <Pagination pagination={data?.pagination} onChangerPage={setPage} />
          </>
        )}
      </div>

      <FormulaireUtilisateur
        ouverte={formulaireOuvert}
        onFermer={() => setFormulaireOuvert(false)}
        utilisateur={enEdition}
        roleImpose={roleImposeCreation}
      />

      <Confirmation
        ouverte={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={confirmerSuppression}
        chargement={supprimer.isPending}
        titre="Supprimer ce compte ?"
        message={`Le compte de ${aSupprimer?.nomComplet} sera definitivement supprime, ainsi que ses liaisons parent-enfant. Pour conserver l historique, preferez la desactivation.`}
        libelleConfirmer="Supprimer"
      />

      <Confirmation
        ouverte={Boolean(aReinitialiser)}
        onFermer={() => setAReinitialiser(null)}
        onConfirmer={confirmerReinitialisation}
        chargement={reinitialiser.isPending}
        variante="primaire"
        titre="Reinitialiser le mot de passe ?"
        message={`Un mot de passe provisoire sera genere pour ${aReinitialiser?.nomComplet}. Ses sessions en cours seront fermees.`}
        libelleConfirmer="Reinitialiser"
      />
    </div>
  );
}
