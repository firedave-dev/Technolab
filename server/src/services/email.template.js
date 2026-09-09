/**
 * Gabarit HTML des emails transactionnels, aux couleurs de la charte.
 *
 * Contraintes propres a l'email :
 * - mise en page en tableaux et styles en ligne : c'est le seul rendu fiable
 *   sur l'ensemble des clients (Outlook compris) ;
 * - Archivo n'etant pas chargeable dans la plupart des clients, la pile de polices
 *   retombe sur une sans-serif systeme, conformement a la charte ;
 * - le logo est joint au message (cid) plutot que lie : il s'affiche meme quand le
 *   client bloque les images distantes ;
 * - largeur du logo fixee a 200 px, au-dessus du plancher de 28 mm (~106 px) de la charte.
 */

const MARINE = '#0B2E52';
const ISTA = '#1F6FE0';
const CLAIR_SUR_FONCE = '#7FB6F7';
const ARDOISE = '#475569';
const BORDURE = '#e2e8f0';

const POLICE = "Archivo, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Identifiant de la piece jointe portant le logo. */
export const CID_LOGO = 'logo-technolab-ista';

/** Echappe le texte insere dans le HTML. */
const echapper = (texte = '') =>
  String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Compose un email complet.
 * @param titre       titre affiche en tete du corps
 * @param intro       paragraphe d'introduction
 * @param corps       tableau de paragraphes (chaines) ou blocs HTML deja formates
 * @param action      { libelle, url } bouton principal, optionnel
 * @param complement  texte discret sous le bouton, optionnel
 */
export function composerEmail({ titre, intro, corps = [], action, complement }) {
  const paragraphes = corps
    .map(
      (texte) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${ARDOISE};">${texte}</p>`
    )
    .join('');

  const bouton = action
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td style="border-radius:8px;background:${ISTA};">
            <a href="${echapper(action.url)}"
               style="display:inline-block;padding:13px 26px;font-family:${POLICE};
                      font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
              ${echapper(action.libelle)}
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const noteComplementaire = complement
    ? `<p style="margin:0;padding-top:16px;border-top:1px solid ${BORDURE};
                 font-size:13px;line-height:1.6;color:#94a3b8;">${complement}</p>`
    : '';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${echapper(titre)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:${POLICE};">
    <!-- Ligne de previsualisation, masquee dans le corps du message -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapper(intro || titre)}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;
                        border:1px solid ${BORDURE};">

            <!-- En-tete : zone d'autorite, aplat marine et logo sur fond marine -->
            <tr>
              <td style="background:${MARINE};padding:26px 32px;" align="left">
                <img src="cid:${CID_LOGO}" alt="Technolab ISTA — Universite privee"
                     width="200" style="display:block;width:200px;height:auto;border:0;" />
              </td>
            </tr>

            <!-- Corps -->
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:700;
                           color:${MARINE};letter-spacing:-0.015em;">
                  ${echapper(titre)}
                </h1>
                ${intro ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${ARDOISE};">${intro}</p>` : ''}
                ${paragraphes}
                ${bouton}
                ${noteComplementaire}
              </td>
            </tr>

            <!-- Pied : aplat marine, texte secondaire en bleu clair -->
            <tr>
              <td style="background:${MARINE};padding:20px 32px;" align="center">
                <p style="margin:0 0 4px;font-size:10px;font-weight:500;letter-spacing:0.28em;
                          text-transform:uppercase;color:${CLAIR_SUR_FONCE};">
                  Universite privee
                </p>
                <p style="margin:0;font-size:12px;color:${CLAIR_SUR_FONCE};">
                  &copy; ${new Date().getFullYear()} Technolab ISTA — Message automatique, ne pas repondre
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Version texte brut : certains clients ne rendent que celle-ci. */
export function composerTexte({ titre, intro, corps = [], action, complement }) {
  const sansBalises = (t) => String(t).replace(/<[^>]+>/g, '');

  return [
    'TECHNOLAB ISTA — Universite privee',
    '',
    sansBalises(titre),
    '',
    intro ? sansBalises(intro) : null,
    ...corps.map(sansBalises),
    action ? `\n${action.libelle} : ${action.url}` : null,
    complement ? `\n${sansBalises(complement)}` : null,
    '',
    'Message automatique, merci de ne pas y repondre.',
  ]
    .filter((l) => l !== null)
    .join('\n');
}
