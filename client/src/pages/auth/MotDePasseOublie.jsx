/** Demande de reinitialisation : envoie un lien (jeton valable 30 minutes). */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { authApi } from '../../api/auth.api.js';
import { messageErreur } from '../../api/client.js';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import Bouton from '../../components/ui/Bouton.jsx';

const schema = z.object({
  email: z.string().min(1, "L'email est obligatoire").email('Format email invalide'),
});

export default function MotDePasseOublie() {
  const [envoye, setEnvoye] = useState(false);
  const [lienDev, setLienDev] = useState(null); // jeton renvoye hors production
  const [erreur, setErreur] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (donnees) => {
    setErreur(null);
    try {
      const reponse = await authApi.forgotPassword(donnees);
      setEnvoye(true);
      if (reponse.resetToken) setLienDev(`/reset-password?token=${reponse.resetToken}`);
    } catch (error) {
      setErreur(messageErreur(error));
    }
  };

  if (envoye) {
    return (
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <MailCheck className="h-6 w-6 text-succes" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-marine">Verifiez votre boite mail</h2>
        <p className="mt-2 text-sm text-slate-500">
          Si un compte existe pour cette adresse, un lien de reinitialisation vient d etre envoye.
          Il expire dans 30 minutes.
        </p>

        {/* Raccourci de developpement : l'envoi d'email sera branche en Phase 6. */}
        {lienDev && (
          <Link
            to={lienDev}
            className="mt-4 inline-block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100"
          >
            Mode developpement : ouvrir directement le lien de reinitialisation
          </Link>
        )}

        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour a la connexion
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-marine">Mot de passe oublie</h2>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez votre adresse email, nous vous enverrons un lien de reinitialisation.
        </p>
      </div>

      {erreur && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <ChampTexte
          label="Adresse email"
          type="email"
          autoComplete="email"
          placeholder="prenom.nom@technolab-ista.edu"
          erreur={errors.email?.message}
          {...register('email')}
        />

        <Bouton type="submit" chargement={isSubmitting} className="w-full" taille="lg">
          Envoyer le lien
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
