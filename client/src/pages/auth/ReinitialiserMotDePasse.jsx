/** Definition d'un nouveau mot de passe a partir du jeton recu par email. */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api.js';
import { messageErreur } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import Bouton from '../../components/ui/Bouton.jsx';

// Regles alignees sur la validation serveur (server/src/validations/auth.validation.js)
const schema = z
  .object({
    motDePasse: z
      .string()
      .min(8, 'Au moins 8 caracteres')
      .regex(/[A-Za-z]/, 'Au moins une lettre')
      .regex(/[0-9]/, 'Au moins un chiffre'),
    confirmation: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((d) => d.motDePasse === d.confirmation, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmation'],
  });

export default function ReinitialiserMotDePasse() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { appliquerSession } = useAuth();
  const [erreur, setErreur] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { motDePasse: '', confirmation: '' } });

  // Lien incomplet : inutile d'afficher le formulaire.
  if (!token) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert className="h-6 w-6 text-retard" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-marine">Lien invalide</h2>
        <p className="mt-2 text-sm text-slate-500">
          Ce lien de reinitialisation est incomplet ou a expire. Relancez la procedure.
        </p>
        <Link
          to="/mot-de-passe-oublie"
          className="mt-6 inline-block text-sm text-brand-600 hover:text-brand-700"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  const onSubmit = async ({ motDePasse }) => {
    setErreur(null);
    try {
      // Le serveur ouvre directement une session apres reinitialisation.
      const reponse = await authApi.resetPassword({ token, motDePasse });
      appliquerSession(reponse);
      toast.success('Mot de passe mis a jour');
      navigate('/tableau-de-bord', { replace: true });
    } catch (error) {
      setErreur(messageErreur(error));
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-marine">Nouveau mot de passe</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez un mot de passe d au moins 8 caracteres contenant lettres et chiffres.
        </p>
      </div>

      {erreur && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <ChampTexte
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          erreur={errors.motDePasse?.message}
          {...register('motDePasse')}
        />

        <ChampTexte
          label="Confirmer le mot de passe"
          type="password"
          autoComplete="new-password"
          erreur={errors.confirmation?.message}
          {...register('confirmation')}
        />

        <Bouton type="submit" chargement={isSubmitting} className="w-full" taille="lg">
          Reinitialiser
        </Bouton>
      </form>

      <Link
        to="/login"
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour a la connexion
      </Link>
    </>
  );
}
