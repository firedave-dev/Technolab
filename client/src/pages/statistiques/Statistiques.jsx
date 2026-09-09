/**
 * Statistiques de l'etablissement (direction).
 * Chaque graphique porte une seule serie : la couleur ne sert pas a distinguer des
 * entites, elle reste donc constante. Seule la repartition des moyennes, qui est
 * ordonnee, utilise une rampe monotone.
 */
import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, Cell, CartesianGrid, LabelList,
  ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import Chargement from '../../components/ui/Chargement.jsx';
import EtatVide from '../../components/ui/EtatVide.jsx';
import ChampSelect from '../../components/ui/ChampSelect.jsx';
import {
  CarteGraphique, ENCRE_AXE, GRILLE, Infobulle, RAMPE_ORDINALE, TEINTE, Vignette, axeProps,
} from '../../components/graphiques.jsx';
import { useStatistiquesEtablissement } from '../../hooks/usePlanning.js';
import { PERIODES, couleurMoyenne } from '../../utils/scolarite.js';
import { formaterMontant, formaterMontantCourt, libelleMode } from '../../utils/montant.js';

export default function Statistiques() {
  const [periode, setPeriode] = useState('');
  const { data, isLoading, isError } = useStatistiquesEtablissement({ periode: periode || undefined });

  if (isLoading) return <Chargement message="Calcul des statistiques..." />;

  if (isError || !data?.statistiques) {
    return (
      <div className="carte mx-auto max-w-3xl">
        <EtatVide titre="Statistiques indisponibles" message="Les donnees n ont pas pu etre recuperees." />
      </div>
    );
  }

  const { effectifs, pedagogie, finances, absencesDuJour, repartition, classes, encaissements, modesPaiement } =
    data.statistiques;

  const modes = modesPaiement.map((m) => ({ ...m, libelle: libelleMode(m.mode) }));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-marine">Statistiques</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Vue d ensemble de l etablissement : effectifs, resultats, finances.
          </p>
        </div>

        <ChampSelect
          placeholder="Toute l annee"
          className="w-full sm:w-48"
          options={PERIODES}
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          aria-label="Restreindre a une periode"
        />
      </header>

      {/* Indicateurs de tete : ces nombres sont le message, pas un graphique */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Vignette
          libelle="Etudiants inscrits"
          valeur={effectifs.etudiants}
          detail={`${effectifs.classes} classe(s) · ${effectifs.personnel} membres du personnel`}
        />
        <Vignette
          libelle="Moyenne generale"
          valeur={pedagogie.moyenne === null ? '—' : `${pedagogie.moyenne}/20`}
          detail={`${pedagogie.evalues} etudiant(s) evalue(s)`}
          accent={couleurMoyenne(pedagogie.moyenne)}
        />
        <Vignette
          libelle="Taux de reussite"
          valeur={pedagogie.tauxReussite === null ? '—' : `${pedagogie.tauxReussite} %`}
          detail={`${pedagogie.admis || 0} etudiant(s) a 10 ou plus`}
        />
        <Vignette
          libelle="Taux de recouvrement"
          valeur={finances.tauxRecouvrement === null ? '—' : `${finances.tauxRecouvrement} %`}
          detail={`${formaterMontant(finances.reste)} restant a recouvrer`}
          accent={finances.tauxRecouvrement >= 70 ? 'text-succes' : 'text-alerte'}
        />
      </section>

      {/* Encaissements : serie unique dans le temps */}
      <CarteGraphique
        titre="Encaissements des 12 derniers mois"
        description="Paiements valides, en francs CFA."
        hauteur={280}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={encaissements} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="degradeEncaissements" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TEINTE} stopOpacity={0.18} />
                <stop offset="100%" stopColor={TEINTE} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={GRILLE} vertical={false} />
            <XAxis dataKey="mois" {...axeProps} />
            <YAxis {...axeProps} width={52} tickFormatter={formaterMontantCourt} />
            <Infobulle formater={(v, ligne) => `${formaterMontant(v)} · ${ligne.nombre} paiement(s)`} />

            <Area
              type="monotone"
              dataKey="montant"
              stroke={TEINTE}
              strokeWidth={2}
              fill="url(#degradeEncaissements)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CarteGraphique>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Repartition ordonnee : la rampe monotone rend l'ordre lisible dans la couleur */}
        <CarteGraphique
          titre="Repartition des moyennes"
          description="Nombre d etudiants par tranche de moyenne generale."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pedagogie.repartition}
              margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid stroke={GRILLE} vertical={false} />
              <XAxis
                dataKey="libelle"
                {...axeProps}
                tick={{ fill: ENCRE_AXE, fontSize: 10 }}
                interval={0}
                tickFormatter={(v) => v.split(' ')[0]}
              />
              <YAxis {...axeProps} width={28} allowDecimals={false} />
              <Infobulle formater={(v) => `${v} etudiant(s)`} />

              <Bar dataKey="nombre" radius={[4, 4, 0, 0]} maxBarSize={56}>
                {pedagogie.repartition.map((tranche, index) => (
                  <Cell key={tranche.libelle} fill={RAMPE_ORDINALE[index]} />
                ))}
                <LabelList dataKey="nombre" position="top" fill={ENCRE_AXE} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        {/* Effectifs par niveau : categories ordonnees par l'axe, teinte unique */}
        <CarteGraphique titre="Effectifs par niveau" description="Etudiants affectes a une classe.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={repartition.parNiveau}
              margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid stroke={GRILLE} vertical={false} />
              <XAxis dataKey="libelle" {...axeProps} />
              <YAxis {...axeProps} width={28} allowDecimals={false} />
              <Infobulle formater={(v) => `${v} etudiant(s)`} />

              <Bar dataKey="nombre" fill={TEINTE} radius={[4, 4, 0, 0]} maxBarSize={48}>
                <LabelList dataKey="nombre" position="top" fill={ENCRE_AXE} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Effectifs par filiere" description="Repartition des inscrits.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={repartition.parFiliere}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid stroke={GRILLE} horizontal={false} />
              <XAxis type="number" {...axeProps} allowDecimals={false} />
              <YAxis type="category" dataKey="libelle" {...axeProps} width={96} />
              <Infobulle formater={(v) => `${v} etudiant(s)`} />

              <Bar dataKey="nombre" fill={TEINTE} radius={[0, 4, 4, 0]} maxBarSize={28}>
                <LabelList dataKey="nombre" position="right" fill={ENCRE_AXE} fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CarteGraphique>

        <CarteGraphique titre="Encaissements par mode" description="Cumul des paiements valides.">
          {modes.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={modes}
                layout="vertical"
                margin={{ top: 4, right: 64, left: 0, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid stroke={GRILLE} horizontal={false} />
                <XAxis type="number" {...axeProps} tickFormatter={formaterMontantCourt} />
                <YAxis type="category" dataKey="libelle" {...axeProps} width={96} />
                <Infobulle formater={(v, ligne) => `${formaterMontant(v)} · ${ligne.nombre} paiement(s)`} />

                <Bar dataKey="montant" fill={TEINTE} radius={[0, 4, 4, 0]} maxBarSize={28}>
                  <LabelList
                    dataKey="montant"
                    position="right"
                    fill={ENCRE_AXE}
                    fontSize={11}
                    formatter={formaterMontantCourt}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EtatVide titre="Aucun encaissement" message="Aucun paiement valide n a encore ete enregistre." />
          )}
        </CarteGraphique>
      </div>

      {/* Vue tableau : toutes les valeurs restent lisibles sans survol */}
      <section className="carte overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-marine">Synthese par classe</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Effectif, resultats, absences du jour et recouvrement.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                {['Classe', 'Effectif', 'Moyenne', 'Reussite', 'Absences du jour', 'Recouvrement'].map((t) => (
                  <th key={t} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 tabular-nums">
              {classes.map((ligne) => (
                <tr key={ligne.classe.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{ligne.classe.nom}</p>
                    <p className="text-xs text-slate-500">{ligne.classe.filiere}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ligne.effectif}
                    <span className="text-slate-400"> / {ligne.capacite}</span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${couleurMoyenne(ligne.moyenne)}`}>
                    {ligne.moyenne === null ? '—' : `${ligne.moyenne}/20`}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ligne.tauxReussite === null ? '—' : `${ligne.tauxReussite} %`}
                  </td>
                  <td className={`px-4 py-3 ${ligne.absencesDuJour > 0 ? 'text-alerte' : 'text-slate-400'}`}>
                    {ligne.absencesDuJour}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {ligne.tauxRecouvrement === null ? '—' : `${ligne.tauxRecouvrement} %`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
          Absences constatees aujourd hui, tout l etablissement : {absencesDuJour.total}
          {absencesDuJour.nonJustifiees > 0 && ` — dont ${absencesDuJour.nonJustifiees} non justifiee(s)`}
        </p>
      </section>
    </div>
  );
}
