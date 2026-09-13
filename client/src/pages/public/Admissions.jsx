/**
 * Page publique « Admissions et tarifs ».
 *
 * Cette page manipule la seule information du site qui puisse couter de l'argent a
 * un lecteur s'il s'y fie a tort. Trois regles s'y appliquent :
 *
 * 1. LE MILLESIME EST AFFICHE. La grille porte visiblement son annee academique et
 *    son perimetre geographique. Une grille sans date laisse croire qu'elle est a
 *    jour, indefiniment.
 *
 * 2. LE MONTANT N'EST PAS UN ENGAGEMENT. La page renvoie au secretariat, qui fait foi.
 *
 * 3. LA GRILLE EST TRANSCRITE, PAS RECOMPOSEE. Un montant par niveau et par pole,
 *    exactement comme sur la brochure — les cles de pole sont celles du catalogue
 *    de formations, ce qui rend impossible d'afficher un parcours sous un pole et
 *    de le facturer sous un autre.
 */
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, FileText, ShieldCheck, Wallet, Download, ChevronDown } from 'lucide-react';
import Seo, {
  SCHEMA_ETABLISSEMENT, assembler, schemaFilAriane, schemaQuestions,
} from '../../components/Seo.jsx';
import Photo from '../../components/Photo.jsx';
import { formaterMontant } from '../../utils/montant.js';
import { useDocumentsPublics } from '../../hooks/useScolarite.js';
import {
  ANNEE_TARIFAIRE,
  AVANTAGE_PAIEMENT,
  FRAIS_INSCRIPTION,
  MONTANT_MAX,
  MONTANT_MIN,
  PERIMETRE_TARIFAIRE,
  PIECES_INSCRIPTION,
  QUESTIONS_ADMISSION,
  POLES,
  TARIFS,
  TARIF_MAITRISE_MASTER2,
  nomPole,
} from '../../utils/formations.js';

export default function Admissions() {
  const { data: documents } = useDocumentsPublics();
  const ficheDisponible = (documents?.documents || []).some(
    (d) => d.cle === 'fiche-inscription' && d.disponible
  );

  return (
    <>
      <Seo
        chemin="/admissions"
        titre="Admissions et tarifs"
        description={
          `Frais de scolarité ${ANNEE_TARIFAIRE} de TechnoLAB-ISTA : de `
          + `${formaterMontant(MONTANT_MIN)} à ${formaterMontant(MONTANT_MAX)} par an selon le `
          + `cycle et le pôle, ${formaterMontant(FRAIS_INSCRIPTION.montant)} de frais `
          + 'd’inscription. Pièces à fournir et modalités.'
        }
        schema={assembler(
          SCHEMA_ETABLISSEMENT,
          schemaFilAriane([{ nom: 'Admissions et tarifs', chemin: '/admissions' }]),
          schemaQuestions(QUESTIONS_ADMISSION),
        )}
      />

      <section className="border-b border-slate-200 bg-brand-50/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="libelle-capitales text-[11px] text-ista">Rejoindre l’institut</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-marine">
            Admissions et tarifs
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            L’admission est prononcée sur dossier. Les frais de scolarité dépendent du
            cycle et du pôle disciplinaire choisis.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6">
        {/* Pièces à fournir */}
        <section
          className="grid items-start gap-10 lg:grid-cols-[1fr_292px]"
          aria-labelledby="titre-pieces"
        >
          <div>
            <h2 id="titre-pieces" className="text-3xl font-bold tracking-tight text-marine">
              Pièces à fournir pour l’inscription
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600">
              Le dossier complet est déposé auprès de la Direction ou d’un centre annexe.
            </p>

            <ol className="mt-8 space-y-3">
              {PIECES_INSCRIPTION.map((piece, index) => (
                <li key={piece} className="carte flex items-start gap-4 p-5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-ista">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed text-slate-700">{piece}</span>
                </li>
              ))}
            </ol>
          </div>

          <figure className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-slate-900/5">
            <Photo nom="etudiants-groupe" className="h-auto w-full object-cover" />
          </figure>
        </section>

        {/* Frais d'inscription */}
        <section aria-labelledby="titre-inscription">
          <h2 id="titre-inscription" className="text-3xl font-bold tracking-tight text-marine">
            Ce qu’il faut prévoir
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <article className="carte p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-ista">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="label-indicateur mt-4">Frais d’inscription</p>
              <p className="valeur-cle mt-1">{formaterMontant(FRAIS_INSCRIPTION.montant)}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {FRAIS_INSCRIPTION.mention}
              </p>
            </article>

            <article className="carte p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-ista">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="label-indicateur mt-4">Frais académiques</p>
              <p className="valeur-cle mt-1">
                {formaterMontant(MONTANT_MIN)}
                <span className="text-base font-medium text-slate-500"> à </span>
                {formaterMontant(MONTANT_MAX)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Par an, selon le cycle et le pôle — voir le détail ci-dessous.
              </p>
            </article>

            <article className="carte p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-ista">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="label-indicateur mt-4">Paiement anticipé</p>
              <p className="valeur-cle mt-1">
                {Math.round(AVANTAGE_PAIEMENT.seuil * 100)} %
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {AVANTAGE_PAIEMENT.texte}
              </p>
            </article>
          </div>
        </section>

        {/* Grille tarifaire */}
        <section aria-labelledby="titre-grille">
          <h2 id="titre-grille" className="text-3xl font-bold tracking-tight text-marine">
            Frais académiques {ANNEE_TARIFAIRE}
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Montants annuels en FCFA. {PERIMETRE_TARIFAIRE}.
          </p>

          {/*
            Avertissement délibérément placé AVANT le tableau, et non en note de bas
            de page : il doit être lu par quelqu'un qui vient chercher un chiffre.
          */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-alerte bg-alerte-fond p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alerte" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-alerte">
              Grille de l’année académique {ANNEE_TARIFAIRE}, communiquée à titre indicatif.
              Confirmez les montants en vigueur auprès du secrétariat avant tout versement.
            </p>
          </div>

          {/* Le tableau défile dans son propre cadre : la page, elle, ne bouge pas. */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <caption className="sr-only">
                Frais académiques annuels par niveau et par pôle, année {ANNEE_TARIFAIRE}
              </caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th scope="col" className="px-6 py-3 text-sm font-bold text-marine">
                    Niveau
                  </th>
                  {POLES.map((pole) => (
                    <th
                      key={pole.cle}
                      scope="col"
                      className="px-6 py-3 text-right text-sm font-bold text-marine"
                    >
                      {nomPole(pole, 'licence')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TARIFS.map((ligne, index) => (
                  <tr key={ligne.niveau} className={index % 2 ? 'bg-slate-50/60' : 'bg-white'}>
                    <th scope="row" className="px-6 py-3.5 text-sm font-medium text-slate-700">
                      {ligne.niveau}
                    </th>
                    {POLES.map((pole) => (
                      <td
                        key={pole.cle}
                        className="whitespace-nowrap px-6 py-3.5 text-right text-sm font-bold text-marine"
                      >
                        {formaterMontant(ligne[pole.cle])}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Cas particulier : tarif unique, hors grille par pôle. */}
                <tr className="border-t-2 border-slate-200 bg-brand-50/40">
                  <th scope="row" className="px-6 py-3.5 text-sm font-medium text-slate-700">
                    {TARIF_MAITRISE_MASTER2.libelle}
                  </th>
                  <td
                    colSpan={POLES.length}
                    className="whitespace-nowrap px-6 py-3.5 text-right text-sm font-bold text-marine"
                  >
                    {formaterMontant(TARIF_MAITRISE_MASTER2.montant)}
                    <span className="ml-2 font-medium text-slate-500">toutes filières</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>


        {/*
          Questions frequentes.

          Affichees en clair, et non repliees derriere un accordeon ferme : le
          contenu masque par defaut pese moins dans l'evaluation d'une page, et
          surtout un moteur generatif ne cite que ce qu'il lit. `<details>` sert
          ici a la commodite de lecture, avec le premier element ouvert.
        */}
        <section aria-labelledby="titre-questions">
          <h2 id="titre-questions" className="text-3xl font-bold tracking-tight text-marine">
            Questions fréquentes
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Les réponses ci-dessous reprennent les informations de la brochure officielle
            de l’établissement.
          </p>

          <div className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {QUESTIONS_ADMISSION.map(({ question, reponse }, index) => (
              <details key={question} open={index === 0} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-left font-bold text-marine transition hover:bg-slate-50">
                  <h3 className="text-base">{question}</h3>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-6 pb-5 leading-relaxed text-slate-600">{reponse}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="sur-marine rounded-2xl bg-marine px-8 py-12 sm:px-12" aria-labelledby="titre-suite">
          <h2 id="titre-suite" className="text-2xl font-bold tracking-tight text-white">
            Une question sur votre dossier ?
          </h2>
          <p className="mt-3 max-w-xl text-clair-sur-fonce">
            Le secrétariat instruit chaque candidature. Une fois inscrit, l’étudiant
            retrouve son échéancier, ses règlements et ses reçus dans son espace
            personnel.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {/*
              Le bouton n'apparaît QUE si le fichier est réellement en place :
              l'API annonce ce qu'elle sait servir. Un lien de téléchargement qui
              échoue ferait croire au candidat que le site est en panne.
            */}
            {ficheDisponible && (
              <a
                href="/api/public/fiche-inscription"
                download
                className="action-relief inline-flex items-center gap-2 rounded-lg bg-ista px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Télécharger la fiche d’inscription
              </a>
            )}
            <Link
              to="/a-propos"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-marine transition hover:bg-slate-100"
            >
              Contacter l’établissement
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              to="/formations"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Voir les formations
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
