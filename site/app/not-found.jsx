import Bouton from '@/composants/ui/Bouton';

/**
 * Page 404.
 *
 * Elle propose une sortie plutot qu'un constat : une adresse erronee vient
 * presque toujours d'un lien ancien ou d'une faute de frappe, et le visiteur
 * cherchait quelque chose de precis.
 */

export const metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: true },
};

export default function Introuvable() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-page flex-col justify-center px-6 py-section md:px-10">
      <p className="baseline text-ista">Erreur 404</p>
      <h1 className="mt-6 max-w-lecture text-titre">Cette page n’existe pas</h1>
      <p className="mt-6 max-w-lecture leading-relaxed text-neutre">
        L’adresse demandée est introuvable. Elle a peut-être été déplacée, ou le
        lien qui vous a mené ici comporte une erreur.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Bouton href="/">Retour à l’accueil</Bouton>
        <Bouton href="/formations" variante="secondaire">
          Voir les formations
        </Bouton>
      </div>
    </div>
  );
}
