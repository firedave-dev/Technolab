/** Ecran de connexion : react-hook-form + zod, redirection vers la page initialement demandee. */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { messageErreur } from '../../api/client.js';
import ChampTexte from '../../components/ui/ChampTexte.jsx';
import Bouton from '../../components/ui/Bouton.jsx';

const schema = z.object({
  email: z.string().min(1, "L'email est obligatoire").email('Format email invalide'),
  motDePasse: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export default function Connexion() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erreurServeur, setErreurServeur] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', motDePasse: '' } });

  const onSubmit = async (donnees) => {
    setErreurServeur(null);
    try {
      const utilisateur = await login(donnees);
      toast.success(`Bienvenue, ${utilisateur.prenom}`);
      // Retour vers la page demandee avant redirection, sinon tableau de bord.
      navigate(location.state?.from?.pathname || '/tableau-de-bord', { replace: true });
    } catch (error) {
      setErreurServeur(messageErreur(error, 'Connexion impossible'));
    }
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-marine">Connexion</h2>
        <p className="mt-1 text-sm text-slate-500">
          Accedez a votre espace avec les identifiants fournis par l administration.
        </p>
      </div>

      {erreurServeur && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{erreurServeur}</span>
        </div>
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

        <ChampTexte
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          placeholder="********"
          erreur={errors.motDePasse?.message}
          {...register('motDePasse')}
        />

        <div className="flex justify-end">
          <Link to="/mot-de-passe-oublie" className="text-sm text-brand-600 hover:text-brand-700">
            Mot de passe oublie ?
          </Link>
        </div>

        <Bouton type="submit" chargement={isSubmitting} className="w-full" taille="lg">
          {isSubmitting ? 'Connexion...' : 'Se connecter'}
        </Bouton>
      </form>

      <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
        Pas encore de compte ? Les acces sont crees par le secretariat de l etablissement.
      </p>
    </>
  );
}
