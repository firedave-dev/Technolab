import EnTetePage from '@/composants/structure/EnTetePage';
import Section from '@/composants/structure/Section';
import Reveal from '@/composants/mouvement/Reveal';
import Bouton from '@/composants/ui/Bouton';
import Etapes from '@/composants/ui/Etapes';
import Accordeon from '@/composants/ui/Accordeon';
import { CALENDRIER, DOSSIER_CANDIDATURE, ETAPES, QUESTIONS } from '@/contenu/donnees/admissions';
import { estRenseigne } from '@/contenu/donnees/etablissement';
import {
  ANNEE_TARIFAIRE,
  AVANTAGE_PAIEMENT,
  FRAIS_INSCRIPTION,
  PERIMETRE_TARIFAIRE,
  PIECES_INSCRIPTION,
  POLES,
  TARIFS,
  TARIF_MAITRISE_MASTER2,
} from '@/contenu/donnees/formations';
import { metadonnees } from '@/lib/seo';

/**
 * Page des admissions.
 *
 * Elle repond, dans l'ordre, aux quatre questions d'un candidat : comment on
 * postule, ce qu'il faut apporter, combien cela coute, et le reste.
 *
 * LA GRILLE TARIFAIRE PORTE SON MILLESIME, affiche et non seulement stocke. Une
 * grille sans annee laisse croire qu'elle est a jour, indefiniment — et des
 * montants perimes sur un site d'etablissement sont pires qu'une absence de
 * montants.
 */

export const metadata = metadonnees({
  titre: 'Admissions',
  description:
    `Conditions d’admission à Technolab ISTA : pièces à fournir, frais `
    + `d’inscription et grille des frais académiques ${ANNEE_TARIFAIRE}.`,
  chemin: '/admissions',
});

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: QUESTIONS.map(({ question, reponse }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: reponse },
  })),
};

/** « 375 000 FCFA » — espaces insecables normalisees, comme partout dans le projet. */
const montant = (n) => `${n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')} FCFA`;

export default function Admissions() {
  const dossierDisponible = estRenseigne(DOSSIER_CANDIDATURE);
  const calendrierDisponible = estRenseigne(CALENDRIER.sessions);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <EnTetePage
        baseline="Candidater"
        titre="Rejoindre l’institut"
        chapeau={
          'Le dossier se dépose à la Direction ou dans l’un des centres annexes. '
          + 'Les frais d’inscription valident la candidature.'
        }
        enfants={
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {dossierDisponible ? (
              <Bouton href={DOSSIER_CANDIDATURE} taille="grande">
                Télécharger le dossier de candidature
              </Bouton>
            ) : (
              /*
               * Pas de lien mort en attendant le PDF : un bouton qui ne mene
               * nulle part ne se decouvre qu'au clic, et laisse le candidat
               * penser que le site est casse. On dit ce qu'il faut faire.
               */
              <p className="rounded-xl border border-filet bg-fond-doux px-6 py-4 text-[0.9375rem] text-neutre">
                La fiche d’inscription se retire à la Direction de l’institut et dans
                les centres annexes.
              </p>
            )}
          </div>
        }
      />

      {/* --- Processus --- */}
      <Section titreId="titre-processus">
        <Reveal>
          <p className="baseline text-ista">Le processus</p>
          <h2 id="titre-processus" className="mt-6 max-w-lecture text-titre">
            Quatre étapes
          </h2>
        </Reveal>

        <div className="mt-bloc">
          <Etapes etapes={ETAPES} />
        </div>
      </Section>

      {/* --- Pieces a fournir --- */}
      <Section titreId="titre-pieces" ton="doux">
        <div className="grid gap-bloc lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <p className="baseline text-ista">Le dossier</p>
            <h2 id="titre-pieces" className="mt-6 text-titre">
              Pièces à fournir
            </h2>
            <p className="mt-8 max-w-lecture leading-relaxed text-neutre">
              La demande manuscrite et la fiche d’inscription sont les deux pièces
              qu’on ne peut pas préparer à l’avance : la fiche se retire sur place.
            </p>
          </Reveal>

          <Reveal retard={0.1}>
            <ol className="divide-y divide-filet border-y border-filet">
              {PIECES_INSCRIPTION.map((piece, i) => (
                <li key={piece} className="flex gap-6 py-6">
                  <span aria-hidden="true" className="font-mono text-sm text-neutre">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="leading-relaxed">{piece}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </Section>

      {/* --- Calendrier --- */}
      <Section titreId="titre-calendrier">
        <Reveal>
          <p className="baseline text-ista">Sessions</p>
          <h2 id="titre-calendrier" className="mt-6 max-w-lecture text-titre">
            Calendrier d’admission
          </h2>

          {calendrierDisponible ? (
            <ul className="mt-bloc divide-y divide-filet border-y border-filet">
              {CALENDRIER.sessions.map((s) => (
                <li key={s.periode} className="grid gap-2 py-6 sm:grid-cols-3">
                  <span className="font-semibold">{s.periode}</span>
                  <span className="text-neutre">Dépôt : {s.depot}</span>
                  <span className="text-neutre">Rentrée : {s.rentree}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 max-w-lecture rounded-xl border border-filet bg-fond-doux p-8 leading-relaxed text-neutre">
              Les dates des prochaines sessions sont communiquées par le secrétariat
              de l’institut. Rapprochez-vous de la Direction ou d’un centre annexe
              pour connaître la période de dépôt en cours.
            </p>
          )}
        </Reveal>
      </Section>

      {/* --- Frais --- */}
      <Section titreId="titre-frais" ton="doux">
        <Reveal>
          <p className="baseline text-ista">Frais de scolarité</p>
          <h2 id="titre-frais" className="mt-6 max-w-lecture text-titre">
            Année académique {ANNEE_TARIFAIRE}
          </h2>
          <p className="mt-4 text-[0.9375rem] text-neutre">{PERIMETRE_TARIFAIRE}</p>
        </Reveal>

        <Reveal retard={0.08}>
          <div className="mt-bloc rounded-2xl border border-filet bg-white p-8 md:p-10">
            <h3 className="text-sous-titre font-bold">
              Frais d’inscription : {montant(FRAIS_INSCRIPTION.montant)}
            </h3>
            <p className="mt-4 max-w-lecture leading-relaxed text-neutre">
              {FRAIS_INSCRIPTION.mention}
            </p>
          </div>
        </Reveal>

        <Reveal retard={0.12}>
          {/*
            Le tableau defile horizontalement dans son propre conteneur : sur
            telephone, quatre colonnes de montants ne tiennent pas, et laisser la
            page entiere deborder casserait toute la mise en page.
          */}
          <div className="mt-8 overflow-x-auto rounded-2xl border border-filet bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">
                Frais académiques annuels en francs CFA, par niveau et par pôle
                disciplinaire, pour l’année {ANNEE_TARIFAIRE}.
              </caption>
              <thead>
                <tr className="border-b border-filet">
                  <th scope="col" className="p-6 text-[0.9375rem] font-semibold">
                    Niveau
                  </th>
                  {POLES.map((pole) => (
                    <th
                      key={pole.cle}
                      scope="col"
                      className="p-6 text-[0.9375rem] font-semibold"
                    >
                      {pole.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TARIFS.map((ligne) => (
                  <tr key={ligne.niveau} className="border-b border-filet last:border-0">
                    <th scope="row" className="p-6 text-[0.9375rem] font-semibold">
                      {ligne.niveau}
                    </th>
                    {POLES.map((pole) => (
                      <td key={pole.cle} className="p-6 text-[0.9375rem] text-neutre">
                        {montant(ligne[pole.cle])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal retard={0.16}>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-filet bg-white p-8">
              <h3 className="font-bold">{TARIF_MAITRISE_MASTER2.libelle}</h3>
              <p className="mt-3 text-sous-titre font-bold text-ista">
                {montant(TARIF_MAITRISE_MASTER2.montant)}
              </p>
            </div>
            <div className="rounded-2xl border border-filet bg-white p-8">
              <h3 className="font-bold">Paiement anticipé</h3>
              <p className="mt-3 leading-relaxed text-neutre">{AVANTAGE_PAIEMENT.texte}</p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* --- Questions frequentes --- */}
      <Section titreId="titre-faq">
        <Reveal>
          <p className="baseline text-ista">Questions fréquentes</p>
          <h2 id="titre-faq" className="mt-6 max-w-lecture text-titre">
            Ce qu’on nous demande le plus
          </h2>
        </Reveal>

        <Reveal retard={0.08}>
          <div className="mt-bloc border-t border-filet">
            {QUESTIONS.map(({ question, reponse }, i) => (
              <Accordeon key={question} question={question} ouvertParDefaut={i === 0}>
                {reponse}
              </Accordeon>
            ))}
          </div>
        </Reveal>
      </Section>
    </>
  );
}
