/**
 * Creation / modification d'un compte, dans une modale.
 * Les champs affiches dependent du role choisi : bloc scolarite pour un etudiant,
 * bloc contrat pour un membre du personnel, rien de plus pour un parent.
 * A la creation sans mot de passe, le serveur en genere un : il est affiche une seule fois.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, KeyRound } from 'lucide-react';
import Modale from '../../components/ui/Modale.jsx';
import Bouton from '../../components/ui/Bouton.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useClasses, useCreerUtilisateur, useModifierUtilisateur, useRolesGerables } from '../../hooks/useGestion.js';
import { ADMIN_ROLES, ROLE_LABELS, ROLES } from '../../utils/roles.js';
import { dateInput, nettoyerPayload } from '../../utils/formulaire.js';

const ROLES_PERSONNEL = [
  ROLES.DIRECTEUR, ROLES.SECRETAIRE, ROLES.PROFESSEUR, ROLES.SURVEILLANT, ROLES.ADMIN,
];

const schema = z.object({
  prenom: z.string().trim().min(2, 'Prenom trop court'),
  nom: z.string().trim().min(2, 'Nom trop court'),
  email: z.string().trim().email('Format email invalide'),
  role: z.string().min(1, 'Choisissez un role'),
  telephone: z.string().max(25).optional(),
  adresse: z.string().max(200).optional(),
  dateNaissance: z.string().optional(),
  sexe: z.string().optional(),
  motDePasse: z
    .string()
    .refine((v) => !v || (v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v)),
      '8 caracteres minimum, lettres et chiffres')
    .optional(),
  infosEtudiant: z.object({
    classe: z.string().optional(),
    anneeInscription: z.string().optional(),
    statut: z.string().optional(),
    nationalite: z.string().optional(),
    lieuNaissance: z.string().optional(),
  }).optional(),
  infosPersonnel: z.object({
    fonction: z.string().optional(),
    specialite: z.string().optional(),
    typeContrat: z.string().optional(),
    dateEmbauche: z.string().optional(),
    salaire: z.string().optional(),
  }).optional(),
});

const valeursDepuis = (utilisateur) => ({
  prenom: utilisateur?.prenom || '',
  nom: utilisateur?.nom || '',
  email: utilisateur?.email || '',
  role: utilisateur?.role || '',
  telephone: utilisateur?.telephone || '',
  adresse: utilisateur?.adresse || '',
  dateNaissance: dateInput(utilisateur?.dateNaissance),
  sexe: utilisateur?.sexe || '',
  motDePasse: '',
  infosEtudiant: {
    classe: utilisateur?.infosEtudiant?.classe?._id || utilisateur?.infosEtudiant?.classe || '',
    anneeInscription: utilisateur?.infosEtudiant?.anneeInscription?.toString() || '',
    statut: utilisateur?.infosEtudiant?.statut || 'inscrit',
    nationalite: utilisateur?.infosEtudiant?.nationalite || '',
    lieuNaissance: utilisateur?.infosEtudiant?.lieuNaissance || '',
  },
  infosPersonnel: {
    fonction: utilisateur?.infosPersonnel?.fonction || '',
    specialite: utilisateur?.infosPersonnel?.specialite || '',
    typeContrat: utilisateur?.infosPersonnel?.typeContrat || '',
    dateEmbauche: dateInput(utilisateur?.infosPersonnel?.dateEmbauche),
    salaire: utilisateur?.infosPersonnel?.salaire?.toString() || '',
  },
});

export default function FormulaireUtilisateur({ ouverte, onFermer, utilisateur, roleImpose }) {
  const modeEdition = Boolean(utilisateur);
  const { utilisateur: acteur } = useAuth();
  const [identifiants, setIdentifiants] = useState(null); // mot de passe provisoire genere
  const [copie, setCopie] = useState(false);

  const { data: rolesData } = useRolesGerables();
  const { data: classesData } = useClasses({ actif: 'true' });
  const creer = useCreerUtilisateur();
  const modifier = useModifierUtilisateur();

  const {
    register, handleSubmit, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: valeursDepuis(utilisateur) });

  // Reinitialise le formulaire a chaque ouverture (creation ou edition d'un autre compte).
  useEffect(() => {
    if (!ouverte) return;
    reset({ ...valeursDepuis(utilisateur), role: utilisateur?.role || roleImpose || '' });
    setIdentifiants(null);
    setCopie(false);
  }, [ouverte, utilisateur, roleImpose, reset]);

  const roleChoisi = watch('role');
  const estEtudiant = roleChoisi === ROLES.ETUDIANT;
  const estPersonnel = ROLES_PERSONNEL.includes(roleChoisi);
  const voitSalaire = ADMIN_ROLES.includes(acteur?.role);

  const rolesDisponibles = (rolesData?.roles || [])
    .filter((r) => !roleImpose || r === roleImpose || ROLES_PERSONNEL.includes(r) === ROLES_PERSONNEL.includes(roleImpose))
    .map((r) => ({ valeur: r, libelle: ROLE_LABELS[r] }));

  const classes = (classesData?.classes || []).map((c) => ({
    valeur: c.id,
    libelle: `${c.nom} (${c.effectif}/${c.capacite})`,
  }));

  const onSubmit = async (valeurs) => {
    const payload = nettoyerPayload({
      ...valeurs,
      infosEtudiant: estEtudiant ? valeurs.infosEtudiant : undefined,
      infosPersonnel: estPersonnel ? valeurs.infosPersonnel : undefined,
    });

    if (modeEdition) {
      delete payload.motDePasse; // le mot de passe se change via l'action dediee
      await modifier.mutateAsync({ id: utilisateur.id, donnees: payload });
      onFermer();
      return;
    }

    const reponse = await creer.mutateAsync(payload);
    if (reponse.motDePasseProvisoire) {
      // On garde la modale ouverte pour transmettre le mot de passe a l'administration.
      setIdentifiants({ email: reponse.utilisateur.email, motDePasse: reponse.motDePasseProvisoire });
    } else {
      onFermer();
    }
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(
        `Email : ${identifiants.email}\nMot de passe : ${identifiants.motDePasse}`
      );
      setCopie(true);
    } catch {
      setCopie(false); // presse-papiers indisponible : la valeur reste lisible a l'ecran
    }
  };

  // Ecran affiche apres creation avec mot de passe genere
  if (identifiants) {
    return (
      <Modale
        ouverte={ouverte}
        onFermer={onFermer}
        titre="Compte cree"
        description="Transmettez ces identifiants a l utilisateur : ils ne seront plus affiches."
        largeur="sm"
        pied={<Bouton onClick={onFermer}>Terminer</Bouton>}
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium">Identifiants provisoires</span>
          </div>

          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-500">Email</dt>
              <dd className="break-all font-medium text-slate-800">{identifiants.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-500">Mot de passe</dt>
              <dd className="font-mono font-medium text-slate-800">{identifiants.motDePasse}</dd>
            </div>
          </dl>

          <Bouton variante="secondaire" taille="sm" onClick={copier} className="mt-3">
            {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copie ? 'Copie' : 'Copier'}
          </Bouton>
        </div>
      </Modale>
    );
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={modeEdition ? 'Modifier le compte' : 'Nouveau compte'}
      description={modeEdition ? utilisateur.email : 'Les identifiants seront generes automatiquement.'}
      largeur="lg"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={isSubmitting}>
            Annuler
          </Bouton>
          <Bouton type="submit" form="formulaire-utilisateur" chargement={isSubmitting}>
            {modeEdition ? 'Enregistrer' : 'Creer le compte'}
          </Bouton>
        </>
      }
    >
      <form id="formulaire-utilisateur" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Identite */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ChampTexte label="Prenom" erreur={errors.prenom?.message} {...register('prenom')} />
          <ChampTexte label="Nom" erreur={errors.nom?.message} {...register('nom')} />
          <ChampTexte label="Email" type="email" erreur={errors.email?.message} {...register('email')} />
          <ChampSelect
            label="Role"
            placeholder="Choisir un role"
            options={rolesDisponibles}
            erreur={errors.role?.message}
            disabled={modeEdition && utilisateur.id === acteur?.id}
            {...register('role')}
          />
          <ChampTexte label="Telephone" erreur={errors.telephone?.message} {...register('telephone')} />
          <ChampSelect
            label="Sexe"
            placeholder="Non renseigne"
            options={[
              { valeur: 'M', libelle: 'Masculin' },
              { valeur: 'F', libelle: 'Feminin' },
              { valeur: 'autre', libelle: 'Autre' },
            ]}
            {...register('sexe')}
          />
          <ChampTexte label="Date de naissance" type="date" {...register('dateNaissance')} />
          <ChampTexte label="Adresse" erreur={errors.adresse?.message} {...register('adresse')} />
        </div>

        {/* Bloc scolarite */}
        {estEtudiant && (
          <fieldset className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Scolarite
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampSelect
                label="Classe"
                placeholder="Non affecte"
                options={classes}
                {...register('infosEtudiant.classe')}
              />
              <ChampSelect
                label="Statut"
                options={[
                  { valeur: 'inscrit', libelle: 'Inscrit' },
                  { valeur: 'suspendu', libelle: 'Suspendu' },
                  { valeur: 'diplome', libelle: 'Diplome' },
                  { valeur: 'abandon', libelle: 'Abandon' },
                ]}
                {...register('infosEtudiant.statut')}
              />
              <ChampTexte
                label="Annee d inscription"
                type="number"
                placeholder="2025"
                {...register('infosEtudiant.anneeInscription')}
              />
              <ChampTexte label="Nationalite" {...register('infosEtudiant.nationalite')} />
              <ChampTexte
                label="Lieu de naissance"
                className="sm:col-span-2"
                {...register('infosEtudiant.lieuNaissance')}
              />
            </div>
          </fieldset>
        )}

        {/* Bloc contrat */}
        {estPersonnel && (
          <fieldset className="rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              Informations professionnelles
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <ChampTexte label="Fonction" {...register('infosPersonnel.fonction')} />
              <ChampTexte label="Specialite" {...register('infosPersonnel.specialite')} />
              <ChampSelect
                label="Type de contrat"
                placeholder="Non renseigne"
                options={[
                  { valeur: 'CDI', libelle: 'CDI' },
                  { valeur: 'CDD', libelle: 'CDD' },
                  { valeur: 'vacataire', libelle: 'Vacataire' },
                  { valeur: 'stage', libelle: 'Stage' },
                ]}
                {...register('infosPersonnel.typeContrat')}
              />
              <ChampTexte label="Date d embauche" type="date" {...register('infosPersonnel.dateEmbauche')} />
              {voitSalaire && (
                <ChampTexte
                  label="Salaire mensuel (FCFA)"
                  type="number"
                  indication="Visible uniquement par la direction"
                  className="sm:col-span-2"
                  {...register('infosPersonnel.salaire')}
                />
              )}
            </div>
          </fieldset>
        )}

        {/* Mot de passe : uniquement a la creation */}
        {!modeEdition && (
          <ChampTexte
            label="Mot de passe (optionnel)"
            type="password"
            autoComplete="new-password"
            indication="Laissez vide pour generer un mot de passe provisoire."
            erreur={errors.motDePasse?.message}
            {...register('motDePasse')}
          />
        )}
      </form>
    </Modale>
  );
}
