# Documents publics

Les fichiers de ce dossier sont servis par l'API **sans authentification**, via
`GET /api/public/<cle>`.

| Fichier attendu | Route | Rôle |
|---|---|---|
| `Fiche_inscription.pdf` | `/api/public/fiche-inscription` | Formulaire à remplir par le candidat |

## Pourquoi les héberger ici

Un lien vers un site tiers casse le jour où celui-ci est refait, et personne ne
s'en aperçoit avant qu'un candidat ne se plaigne. Un fichier déposé ici suit le
déploiement.

## Tant qu'un fichier est absent

La route répond 404 avec un message explicite, et **le bouton de téléchargement
n'apparaît pas** sur la page Admissions : `GET /api/public/documents` annonce ce
qui est réellement disponible, et la page s'y conforme. Un lien mort ferait
croire au visiteur que le site est en panne.
