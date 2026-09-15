/**
 * Journal des actions : qui a fait quoi, et quand.
 *
 * LECTURE SEULE, ET C'EST VOULU. Aucun bouton ne modifie ni ne supprime une
 * ligne : un registre qu'on peut retoucher ne prouve plus rien. Les entrees
 * disparaissent d'elles-memes au bout de deux ans.
 *
 * LES ACTIONS SENSIBLES SONT MISES EN AVANT. Une page qui aligne cinq cents
 * lignes identiques ne se lit pas ; celles qui touchent aux notes, a l'argent
 * ou aux comptes portent une couleur propre, de sorte qu'on les repere en
 * parcourant la colonne de gauche.
 */
import { useMemo, useState } from 'react';
import {
  Activity, CreditCard, GraduationCap, KeyRound, Search, ShieldCheck, Users,
} from 'lucide-react';
import { useDomainesJournal, useJournal } from '../../hooks/useJournal.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import BarreRecherche from '../../components/ui/BarreRecherche.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import Pagination from '../../components/ui/Pagination.jsx';

/** Presentation par domaine : icone et couleur du bandeau. */
const APPARENCE = {
  'Accès': { icone: KeyRound, couleur: 'text-ardoise', fond: 'bg-slate-100' },
  Comptes: { icone: Users, couleur: 'text-marine', fond: 'bg-marine/10' },
  Notes: { icone: GraduationCap, couleur: 'text-ista', fond: 'bg-ista/10' },
  Scolarité: { icone: ShieldCheck, couleur: 'text-vert-bleu', fond: 'bg-vert-bleu/10' },
  'Vie scolaire': { icone: Activity, couleur: 'text-ardoise', fond: 'bg-ardoise/10' },
  Comptabilité: { icone: CreditCard, couleur: 'text-[#b45309]', fond: 'bg-[#fdf6ec]' },
};

const defaut = { icone: Activity, couleur: 'text-slate-500', fond: 'bg-slate-100' };

/** « aujourd'hui à 14:32 », « hier à 09:05 », sinon la date complete. */
function quand(iso) {
  const date = new Date(iso);
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const jour = new Date(date);
  jour.setHours(0, 0, 0, 0);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  const ecart = Math.round((aujourdhui - jour) / 86400000);
  if (ecart === 0) return `aujourd’hui à ${heure}`;
  if (ecart === 1) return `hier à ${heure}`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} à ${heure}`;
}

const ROLES_LISIBLES = {
  admin: 'Administrateur',
  directeur: 'Directeur',
  secretaire: 'Secrétaire',
  professeur: 'Professeur',
  surveillant: 'Surveillant',
  etudiant: 'Étudiant',
  parent: 'Parent',
  anonyme: 'Non identifié',
};

export default function Journal() {
  const [page, setPage] = useState(1);
  const [domaine, setDomaine] = useState('');
  const [recherche, setRecherche] = useState('');
  const [depuis, setDepuis] = useState('');
  const [jusqua, setJusqua] = useState('');

  // Sans temporisation, chaque lettre tapée lancerait une requête.
  const rechercheDifferee = useDebounce(recherche, 350);

  const parametres = useMemo(
    () => ({ page, limite: 50, domaine, recherche: rechercheDifferee, depuis, jusqua }),
    [page, domaine, rechercheDifferee, depuis, jusqua]
  );

  const { data, isLoading } = useJournal(parametres);
  const { data: filtres } = useDomainesJournal();

  const entrees = data?.entrees ?? [];
  const pagination = data?.pagination;

  /** Changer un filtre ramène à la première page : rester en page 7 d’un
   *  résultat qui n’en compte plus que 2 donnerait un tableau vide. */
  const filtrer = (setter) => (valeur) => { setter(valeur); setPage(1); };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Journal des actions</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Toutes les opérations qui modifient les données de la plateforme, avec leur auteur
          et leur horodatage. Les consultations ne sont pas enregistrées ; les entrées sont
          conservées deux ans et ne peuvent être ni modifiées ni supprimées.
        </p>
      </header>

      {/* --- Filtres --- */}
      <div className="carte grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <BarreRecherche
          valeur={recherche}
          onChanger={filtrer(setRecherche)}
          placeholder="Nom ou action..."
        />
        <ChampSelect
          label="Domaine"
          value={domaine}
          onChange={(e) => filtrer(setDomaine)(e.target.value)}
          placeholder="Tous les domaines"
          options={(filtres?.domaines ?? []).map((d) => ({ valeur: d, libelle: d }))}
        />
        <ChampTexte
          label="Depuis le"
          type="date"
          value={depuis}
          onChange={(e) => filtrer(setDepuis)(e.target.value)}
        />
        <ChampTexte
          label="Jusqu’au"
          type="date"
          value={jusqua}
          onChange={(e) => filtrer(setJusqua)(e.target.value)}
        />
      </div>

      {isLoading && !data ? (
        <Chargement message="Chargement du journal..." />
      ) : entrees.length === 0 ? (
        <EtatVide
          icone={Search}
          titre="Aucune action enregistrée"
          message="Aucune entrée ne correspond à ces critères."
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {pagination.total} action{pagination.total > 1 ? 's' : ''} enregistrée
            {pagination.total > 1 ? 's' : ''}
          </p>

          <ul className="space-y-2">
            {entrees.map((entree) => {
              const style = APPARENCE[entree.domaine] ?? defaut;
              const Icone = style.icone;
              const echec = entree.statut >= 400;

              return (
                <li
                  key={entree._id}
                  className={`carte flex items-start gap-4 p-4 ${echec ? 'border-retard/40' : ''}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                      ${echec ? 'bg-retard-fond' : style.fond}`}
                  >
                    <Icone
                      className={`h-4.5 w-4.5 ${echec ? 'text-retard' : style.couleur}`}
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-marine">
                      <strong className="font-semibold">{entree.acteurNom}</strong>
                      <span className="text-slate-400"> · </span>
                      <span className="text-slate-500">
                        {ROLES_LISIBLES[entree.acteurRole] ?? entree.acteurRole}
                      </span>
                    </p>
                    <p className={`mt-0.5 text-sm ${echec ? 'text-retard' : 'text-slate-700'}`}>
                      {entree.libelle}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs text-slate-500">{quand(entree.createdAt)}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                      {entree.domaine}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {pagination.pages > 1 && (
            <Pagination pagination={pagination} onChangerPage={setPage} />
          )}
        </>
      )}
    </div>
  );
}
