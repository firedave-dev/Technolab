/** Mon profil : informations personnelles modifiables et changement de mot de passe. */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../api/auth.api.js';
import { messageErreur } from '../api/client.js';
import { initiales } from '../utils/roles.js';
import ChampTexte from '../components/ui/ChampTexte.jsx';
import Bouton from '../components/ui/Bouton.jsx';
import BadgeRole from '../components/ui/BadgeRole.jsx';

const schemaProfil = z.object({
  prenom: z.string().min(2, 'Prenom trop court').max(60),
  nom: z.string().min(2, 'Nom trop court').max(60),
  telephone: z.string().max(25).optional().or(z.literal('')),
  adresse: z.string().max(200).optional().or(z.literal('')),
});

const schemaMotDePasse = z
  .object({
    ancienMotDePasse: z.string().min(1, 'Champ obligatoire'),
    nouveauMotDePasse: z
      .string()
      .min(8, 'Au moins 8 caracteres')
      .regex(/[A-Za-z]/, 'Au moins une lettre')
      .regex(/[0-9]/, 'Au moins un chiffre'),
    confirmation: z.string().min(1, 'Champ obligatoire'),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmation'],
  });

export default function Profil() {
  const { utilisateur, setUtilisateur, appliquerSession } = useAuth();

  const formProfil = useForm({
    resolver: zodResolver(schemaProfil),
    defaultValues: {
      prenom: utilisateur?.prenom || '',
      nom: utilisateur?.nom || '',
      telephone: utilisateur?.telephone || '',
      adresse: utilisateur?.adresse || '',
    },
  });

  const formMotDePasse = useForm({
    resolver: zodResolver(schemaMotDePasse),
    defaultValues: { ancienMotDePasse: '', nouveauMotDePasse: '', confirmation: '' },
  });

  const enregistrerProfil = async (donnees) => {
    try {
      // Les chaines vides ne sont pas envoyees : le serveur refuse les champs vides typés.
      const payload = Object.fromEntries(Object.entries(donnees).filter(([, v]) => v !== ''));
      const reponse = await authApi.updateMe(payload);
      setUtilisateur(reponse.utilisateur);
      toast.success('Profil mis a jour');
    } catch (error) {
      toast.error(messageErreur(error));
    }
  };

  const changerMotDePasse = async ({ ancienMotDePasse, nouveauMotDePasse }) => {
    try {
      // Le serveur revoque les autres sessions et renvoie une nouvelle paire de jetons.
      const reponse = await authApi.changePassword({ ancienMotDePasse, nouveauMotDePasse });
      appliquerSession(reponse);
      formMotDePasse.reset();
      toast.success('Mot de passe modifie, vos autres sessions ont ete fermees');
    } catch (error) {
      toast.error(messageErreur(error));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Carte d'identite */}
      <section className="carte flex flex-col items-center gap-4 p-5 sm:flex-row sm:p-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
          {initiales(utilisateur?.prenom, utilisateur?.nom)}
        </span>
        <div className="min-w-0 text-center sm:text-left">
          <h2 className="truncate text-lg font-semibold text-marine">{utilisateur?.nomComplet}</h2>
          <p className="truncate text-sm text-slate-500">{utilisateur?.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <BadgeRole role={utilisateur?.role} />
            {utilisateur?.matricule && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                {utilisateur.matricule}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Informations personnelles */}
      <section className="carte p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-marine">Informations personnelles</h3>
        <p className="mt-1 text-xs text-slate-500">
          L adresse email et le role ne sont modifiables que par l administration.
        </p>

        <form
          onSubmit={formProfil.handleSubmit(enregistrerProfil)}
          noValidate
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <ChampTexte
            label="Prenom"
            erreur={formProfil.formState.errors.prenom?.message}
            {...formProfil.register('prenom')}
          />
          <ChampTexte
            label="Nom"
            erreur={formProfil.formState.errors.nom?.message}
            {...formProfil.register('nom')}
          />
          <ChampTexte
            label="Telephone"
            erreur={formProfil.formState.errors.telephone?.message}
            {...formProfil.register('telephone')}
          />
          <ChampTexte
            label="Adresse"
            erreur={formProfil.formState.errors.adresse?.message}
            {...formProfil.register('adresse')}
          />

          <div className="sm:col-span-2">
            <Bouton type="submit" chargement={formProfil.formState.isSubmitting}>
              Enregistrer
            </Bouton>
          </div>
        </form>
      </section>

      {/* Securite */}
      <section className="carte p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-marine">Securite</h3>
        <p className="mt-1 text-xs text-slate-500">
          Changer votre mot de passe deconnecte vos autres appareils.
        </p>

        <form
          onSubmit={formMotDePasse.handleSubmit(changerMotDePasse)}
          noValidate
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <ChampTexte
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            className="sm:col-span-2"
            erreur={formMotDePasse.formState.errors.ancienMotDePasse?.message}
            {...formMotDePasse.register('ancienMotDePasse')}
          />
          <ChampTexte
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            erreur={formMotDePasse.formState.errors.nouveauMotDePasse?.message}
            {...formMotDePasse.register('nouveauMotDePasse')}
          />
          <ChampTexte
            label="Confirmer"
            type="password"
            autoComplete="new-password"
            erreur={formMotDePasse.formState.errors.confirmation?.message}
            {...formMotDePasse.register('confirmation')}
          />

          <div className="sm:col-span-2">
            <Bouton
              type="submit"
              variante="secondaire"
              chargement={formMotDePasse.formState.isSubmitting}
            >
              Modifier le mot de passe
            </Bouton>
          </div>
        </form>
      </section>
    </div>
  );
}
