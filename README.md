# Technolab ISTA — Plateforme de gestion scolaire

Application web de gestion d'une université privée : utilisateurs et rôles, notes, examens,
absences, comptabilité, planning et statistiques.

**Stack** : React 19 + Vite + TailwindCSS 4 · Node.js + Express 5 · MongoDB (Mongoose) · JWT + RBAC

---

## État d'avancement

| Phase | Contenu | Statut |
|---|---|---|
| 1 | Setup projet, authentification, rôles et permissions | ✅ Livrée |
| 2 | Utilisateurs, personnel, étudiants, classes, parents | ✅ Livrée |
| 3 | Notes, examens, absences, notifications | ✅ Livrée |
| 4 | Comptabilité, paiements, échéanciers, reçus PDF | ✅ Livrée |
| 5 | Planning horaires, tableau de bord, statistiques | ✅ Livrée |
| 6 | Identité visuelle, emails transactionnels, accessibilité | ✅ Livrée |
| 7 | Site public, SEO, refonte UI, bulletin paysage et reçu | ✅ Livrée |
| 8 | Contenu éditorial, photographies, guide de déploiement | ✅ Livrée |

---

## Démarrage

Prérequis : Node.js 20+ et une instance MongoDB accessible.

```bash
npm run install:all          # installe client + server
cp server/.env.example server/.env   # puis renseigner les secrets JWT
npm run seed                 # comptes, classes, matières, notes, examens, absences,
                             #   tarifs, échéanciers, paiements et emploi du temps
npm run dev                  # API sur :5000, front sur :5173
npm test                     # 237 tests de bout en bout
npm run build --prefix client  # build + pre-rendu des pages publiques
```

Le front appelle `/api` et Vite proxifie vers `http://localhost:5000` — aucune URL à configurer
en développement.

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | admin@technolab-ista.edu | `Admin@1234` |
| Directeur | directeur@technolab-ista.edu | `Passer@123` |
| Secrétaire | secretaire@technolab-ista.edu | `Passer@123` |
| Professeur | professeur@technolab-ista.edu | `Passer@123` |
| Surveillant | surveillant@technolab-ista.edu | `Passer@123` |
| Étudiant | etudiant@technolab-ista.edu | `Passer@123` |
| Parent | parent@technolab-ista.edu | `Passer@123` |

---

## Arborescence

```
.
├── server/
│   ├── .env.example
│   ├── tests/                       # 6 suites de bout en bout + run.mjs
│   └── src/
│       ├── index.js                 # démarrage : connexion DB puis écoute HTTP
│       ├── app.js                   # construction de l'app Express
│       ├── config/                  # env.js, db.js, roles.js (source de vérité RBAC)
│       ├── models/                  # User, RefreshToken, Classe, Matiere, Evaluation, Note,
│       │                            #   Examen, Absence, Notification, FraisScolarite,
│       │                            #   Echeance, Paiement, Creneau
│       ├── middleware/              # auth.js (protect/restrictTo), validate.js, errorHandler.js, rateLimit.js
│       ├── validations/             # schémas Zod des payloads
│       ├── controllers/             # auth, user, student, classe, matiere, evaluation,
│       │                            #   bulletin, examen, absence, notification,
│       │                            #   comptabilite, paiement, planning, statistique
│       ├── routes/                  # un fichier par domaine, agrégés dans index.js
│       ├── services/                # token, user, scolarite (bulletins), notification,
│       │                            #   comptabilite (soldes), recu (PDF pdfkit),
│       │                            #   planning (conflits), statistiques (agrégats),
│       │                            #   email (+ gabarit HTML de la charte)
│       ├── marque/                   # logo horizontal (fond clair et fond marine)
│       ├── utils/                   # ApiError.js, catchAsync.js, montantEnLettres.js
│       └── seed/                    # seed.js + scolarite / comptabilite / planning
└── client/
    ├── public/marque/               # logos SVG (horizontal, vertical, icône),
    │                                #   favicons PNG 16/32, icônes PWA 180/192/512
    ├── public/photos/               # photographies du site public, en AVIF et WebP
    ├── public/manifest.webmanifest
    ├── scripts/                     # prerender.mjs, composer-page.mjs,
    │                                #   preparer-photos.py (préparation des images)
    └── src/
        ├── main.jsx                 # providers : QueryClient, Router, Auth, Toaster
        ├── App.jsx                  # table de routage (écrans en React.lazy)
        ├── entry-prerender.jsx      # rendu statique des pages publiques au build
        ├── api/                     # client.js (axios + refresh auto), auth, users,
        │                            #   scolarite, comptabilite
        ├── hooks/                   # useGestion, useScolarite, useComptabilite,
        │                            #   usePlanning, useDebounce
        ├── context/AuthContext.jsx  # session courante
        ├── router/                  # navigation.js (menu par rôle), RouteProtegee.jsx
        ├── layouts/                 # LayoutPublic, LayoutAuth, LayoutApplication,
        │                            #   BarreLaterale, BarreSuperieure, PiedDePage
        ├── components/              # Logo.jsx, Photo.jsx, Seo.jsx, graphiques.jsx,
        │                            #   ClocheNotifications…
        ├── components/ui/           # Bouton, ChampTexte, ChampSelect, Tableau, Modale, Pagination…
        ├── pages/public/            # Accueil, Formations, Admissions, APropos,
        │                            #   VerificationRecu
        ├── pages/                   # auth/, utilisateurs/, etudiants/, classes/, matieres/,
        │                            #   notes/, examens/, absences/, paiements/, planning/,
        │                            #   statistiques/, tableau/, parent/…
        └── utils/                   # roles.js (miroir client), formulaire.js, scolarite.js,
                                     #   montant.js, formations.js (catalogue public),
                                     #   photos.js (dimensions et textes alternatifs)
```

---

## Authentification (Phase 1)

### Modèle de session

- **Access token** : JWT de 15 minutes, renvoyé dans le corps de la réponse et conservé
  **en mémoire** côté client (pas de `localStorage` → surface XSS réduite).
- **Refresh token** : chaîne aléatoire de 48 octets, déposée dans un cookie `httpOnly`
  restreint au chemin `/api/auth`. Seul son **hash SHA-256** est stocké en base.
- **Rotation** : chaque appel à `/auth/refresh` supprime l'ancien token et en émet un nouveau ;
  rejouer un token déjà consommé échoue.
- Un intercepteur axios rejoue automatiquement la requête après un 401, en ne lançant
  qu'un seul refresh même si plusieurs appels échouent simultanément.

### Endpoints

| Méthode | Route | Accès |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/refresh` | cookie de refresh |
| POST | `/api/auth/logout` | public |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public (jeton, 30 min) |
| GET | `/api/auth/me` | authentifié |
| PATCH | `/api/auth/me` | authentifié |
| PATCH | `/api/auth/change-password` | authentifié |
| POST | `/api/auth/register` | admin, directeur |
| GET | `/api/health` | public |

Il n'y a **pas d'inscription libre** : les comptes sont créés par l'administration.

### Rôles

`admin` · `directeur` · `secretaire` · `professeur` · `surveillant` · `etudiant` · `parent`

Ils sont définis dans [server/src/config/roles.js](server/src/config/roles.js) et reflétés dans
[client/src/utils/roles.js](client/src/utils/roles.js). Côté serveur la protection se fait par
`protect` + `restrictTo(...roles)` ; côté client, [client/src/router/navigation.js](client/src/router/navigation.js)
déclare une seule fois les rôles autorisés par module — la barre latérale **et** les gardes de
route en découlent, ce qui rend impossible l'affichage d'un lien inaccessible.

### Mesures de sécurité en place

- Mots de passe hashés avec bcrypt (12 tours), jamais renvoyés par l'API (`select: false`).
- Validation Zod de tous les payloads côté serveur.
- `helmet`, CORS restreint à `CLIENT_URL` avec cookies, limite de débit sur les routes d'auth.
- Message de connexion générique et réponse identique sur `forgot-password` : pas d'énumération
  des comptes existants.
- Changement ou réinitialisation de mot de passe → révocation de toutes les sessions actives,
  et invalidation des access tokens émis avant le changement.
- Comptes désactivés (`actif: false`) refusés à la connexion et sur chaque requête.

### Tests effectués

Flux validé de bout en bout (15/15) : connexion, rejet d'un mauvais mot de passe, `/me`,
rotation du refresh token, révocation de l'ancien, RBAC (professeur refusé / admin autorisé sur
`register`), validation Zod, jeton invalide, cycle mot de passe oublié → réinitialisation →
reconnexion, absence d'énumération de comptes.

---

## Gestion des comptes (Phase 2)

### Modèle de données

Un **seul** modèle `User` porte tous les profils, avec deux blocs optionnels selon le rôle :

- `infosEtudiant` — classe, année d'inscription, statut (`inscrit` / `suspendu` / `diplome` / `abandon`),
  nationalité, lieu de naissance ;
- `infosPersonnel` — fonction, spécialité, date d'embauche, type de contrat, salaire.

La relation **parent ↔ enfant** est stockée dans les deux sens (`parents[]` et `enfants[]`) : consulter
les enfants d'un parent ne coûte aucune requête inverse. Les deux tableaux sont écrits ensemble à
chaque liaison et nettoyés à la suppression d'un compte.

Le modèle `Classe` (nom, niveau, filière, année scolaire, capacité, professeur principal) servira
de pivot aux phases suivantes pour le planning, les notes et les examens.

### Matrice de délégation

Au-delà de l'accès au module, un acteur ne peut agir que sur certains rôles :

| Acteur | Peut créer / modifier / supprimer |
|---|---|
| Administrateur | tous les rôles |
| Directeur | tous sauf administrateur |
| Secrétaire | étudiants et parents uniquement |
| Autres rôles | aucun (module inaccessible) |

Définie dans [server/src/config/roles.js](server/src/config/roles.js) (`peutGererRole`) et appliquée
à chaque écriture. Le sélecteur de rôle du formulaire est alimenté par `GET /api/users/roles-gerables`,
donc l'interface ne propose jamais un rôle que le serveur refuserait.

### Endpoints

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/users` | admin, directeur, secrétaire |
| POST | `/api/users` | idem + matrice de délégation |
| GET/PATCH/DELETE | `/api/users/:id` | idem |
| PATCH | `/api/users/:id/statut` | idem (activation / désactivation) |
| POST | `/api/users/:id/mot-de-passe` | idem (réinitialisation) |
| GET | `/api/users/statistiques` | idem |
| GET | `/api/users/roles-gerables` | idem |
| GET | `/api/etudiants` | personnel |
| GET | `/api/etudiants/:id` | personnel, le parent de l'élève, l'élève lui-même |
| GET | `/api/etudiants/mes-enfants` | parent |
| PATCH | `/api/etudiants/:id/classe` | admin, directeur, secrétaire |
| POST | `/api/etudiants/:id/parents` | idem |
| DELETE | `/api/etudiants/:id/parents/:parentId` | idem |
| GET | `/api/classes`, `/api/classes/:id` | tout le personnel |
| POST/PATCH | `/api/classes` | admin, directeur, secrétaire |
| DELETE | `/api/classes/:id` | admin, directeur |

Filtres de liste : `q` (nom, prénom, email, matricule), `role`, `roles` (liste séparée par des
virgules), `actif`, `classe`, `statut`, `page`, `limite`, `tri`.

### Règles métier appliquées

- **Matricule automatique** au format `PRÉFIXE-ANNÉE-SÉQUENCE` (ex. `ETU-2026-0007`), unique par série.
- **Mot de passe provisoire** généré si l'administration n'en fournit pas ; renvoyé **une seule fois**,
  à la création ou à la réinitialisation.
- **Salaire** filtré côté serveur : seuls l'administrateur et le directeur le reçoivent.
- **Confidentialité des dossiers** : un parent n'ouvre que ceux de ses enfants, un étudiant que le sien.
- **Capacité de classe** contrôlée à l'affectation ; capacité non abaissable sous l'effectif ;
  suppression d'une classe refusée tant qu'elle est peuplée.
- **Garde-fous** : impossible de désactiver, supprimer ou changer le rôle de son propre compte.
- Désactivation ou réinitialisation → **révocation immédiate** des sessions du compte concerné.

### Écrans livrés

`Utilisateurs` (liste, recherche, filtres, création/édition, activation, réinitialisation, suppression) ·
`Personnel` (même écran restreint aux rôles de l'établissement) · `Étudiants` + **dossier étudiant**
(identité, scolarité, affectation de classe, parents rattachés) · `Classes` (effectifs, professeur
principal, CRUD) · `Mes enfants` (vue parent). Le tableau de bord affiche désormais des effectifs réels.

### Tests effectués

44/44 de bout en bout : pagination et filtres, recherche, filtre multi-rôles, confidentialité du
salaire, matrice de délégation (secrétaire refusé sur un professeur), matricule et mot de passe
provisoire, connexion avec ce mot de passe, capacité et suppression de classe, affectation, liaison
parent-enfant et refus des doublons, accès aux dossiers par parent/étudiant, garde-fous sur son
propre compte, désactivation coupant la connexion, changement de rôle nettoyant le bloc scolarité,
email déjà pris, suppression en cascade des liaisons.

---

## Notes, examens et absences (Phase 3)

### Modèle de données

`Matiere` est le pivot du module : elle relie une **classe** à son **professeur titulaire** pour une
année scolaire. Tout s'y rattache — évaluations, examens, absences — et c'est elle qui porte les
permissions : un professeur n'agit que sur les matières qui lui sont assignées.

- `Evaluation` — titre, type, date, barème, coefficient, période, et un indicateur `publiee`.
- `Note` — une par étudiant et par évaluation ; `absent` distingue une copie non rendue d'un zéro
  mérité (l'absent est exclu de la moyenne, le zéro non).
- `Examen` — créneau, salle, surveillants assignés, statut.
- `Absence` — date normalisée à minuit, créneau, type (absence/retard), justification.
- `Notification` — alerte interne, purgée automatiquement au bout de 90 jours.

**Le bulletin n'est pas stocké.** Moyennes, mention et rang sont recalculés à la demande par
[scolarite.service.js](server/src/services/scolarite.service.js) : aucune donnée dérivée à
resynchroniser quand une note change.

### Calcul des moyennes

Chaque note est d'abord **ramenée sur 20** — une interrogation sur 10 et un devoir sur 20 pèsent
alors identiquement à coefficient égal — puis pondérée par le coefficient de l'évaluation. Les
copies marquées « absent » sont exclues : une copie non rendue n'est pas un zéro mérité.

**La moyenne d'une matière ne moyenne pas toutes ses notes ensemble.** Les évaluations sont
réparties en deux groupes, chacun moyenné de son côté :

| Composante | Types d'évaluation |
| --- | --- |
| Moyenne de classe | `devoir`, `interrogation`, `tp`, `projet` |
| Moyenne d'examen | `examen` |

puis composées en donnant à l'examen le double du poids du contrôle continu :

```
moyenne de matière = (moyenne d'examen × 2 + moyenne de classe) / 3
```

**Pourquoi séparer avant de composer** plutôt que d'attribuer un gros coefficient à l'examen : le
poids de l'examen serait alors dilué par le **nombre** de devoirs. Une matière à douze
interrogations et une matière à deux devoirs ne répartiraient plus le même équilibre entre contrôle
continu et examen, alors que la règle de l'établissement est la même partout. En moyennant chaque
groupe d'abord, le rapport ⅔–⅓ est garanti quel que soit le nombre d'évaluations de chaque côté.

**Tant qu'un des deux groupes est vide** — le cas normal avant la session d'examens — la moyenne de
la matière est celle du groupe renseigné. Appliquer la formule à un groupe absent reviendrait à le
compter pour zéro et à afficher, en cours d'année, une moyenne effondrée qui ne veut rien dire.

La moyenne générale pondère ensuite les moyennes de matières par le coefficient de la matière. Le
rang est établi en calculant la moyenne générale de chaque étudiant de la classe.

#### Deux « moyennes de classe » à ne pas confondre

Le terme désigne deux choses différentes selon l'échelle, et l'API les nomme distinctement :

| Champ | Portée | Sens |
| --- | --- | --- |
| `matieres[].moyenneClasse` | une matière | le contrôle continu de **l'étudiant** |
| `moyenneGeneraleClasse` | le bulletin | la moyenne générale de **la promotion** |

Le second portait auparavant le nom `moyenneClasse`. Il a été renommé lors de l'introduction de la
règle ci-dessus : les confondre afficherait à l'étudiant la moyenne de ses camarades à la place de
la sienne. Un test le verrouille (`la moyenne de la promotion porte un nom distinct`).

Le bulletin imprime les deux composantes à côté de la moyenne qui en découle, et rappelle la formule
en pied de document : le lecteur doit pouvoir refaire l'opération à la main depuis le papier.

### Publication des notes

Une évaluation reste en **brouillon** tant que le professeur ne la publie pas : il corrige à son
rythme, en plusieurs fois. Étudiants et parents ne voient que les évaluations publiées ; le personnel
voit le bulletin provisoire, évaluations non publiées comprises. La publication déclenche une
notification pour chaque étudiant noté **et ses parents**.

### Endpoints

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/matieres`, `/api/matieres/:id` | personnel (professeur : les siennes) |
| POST/PATCH/DELETE | `/api/matieres` | admin, directeur, secrétaire |
| GET/POST | `/api/evaluations` | admin, directeur, secrétaire, professeur |
| GET/PUT | `/api/evaluations/:id/notes` | idem (professeur : ses matières) |
| PATCH | `/api/evaluations/:id/publication` | idem |
| GET | `/api/bulletins/:id` | personnel, le parent de l'élève, l'élève |
| GET | `/api/bulletins/classe/:id` | admin, directeur, secrétaire, professeur |
| GET | `/api/examens`, `/api/examens/:id` | tous (élèves et parents filtrés sur leur classe) |
| GET | `/api/examens/mes-surveillances` | personnel |
| POST/PATCH | `/api/examens` | admin, directeur, secrétaire |
| GET/POST | `/api/absences/appel` | admin, directeur, secrétaire, professeur, surveillant |
| GET | `/api/absences`, `/api/absences/statistiques` | tous (périmètre restreint pour élève/parent) |
| GET | `/api/absences/etudiant/:id` | personnel, le parent de l'élève, l'élève |
| PATCH | `/api/absences/:id/justification` | admin, directeur, secrétaire, surveillant |
| GET/PATCH | `/api/notifications` | chacun, ses propres notifications |

### Règles métier appliquées

- **Conflits d'examen** détectés à l'enregistrement : une salle ne peut accueillir deux épreuves qui
  se chevauchent, et une classe n'est jamais convoquée à deux endroits au même moment.
- **Feuille d'appel rejouable** : repasser l'appel ne crée pas de doublon, et marquer un étudiant
  « présent » retire la saisie erronée. Un professeur ne pointe que dans ses propres matières.
- **Notes bornées par le barème** ; une ligne laissée vide retire la note de la base.
- Une note ne peut être saisie que pour un étudiant **réellement inscrit** dans la classe.
- Une matière n'est pas supprimable tant qu'elle porte des évaluations.
- Chaque absence saisie **notifie l'étudiant et ses parents**.

### Écrans livrés

`Matières` (CRUD, vue filtrée pour le professeur) · `Notes et bulletins` — deux vues selon le profil :
gestion des évaluations avec grille de saisie et relevé de classe (taux de réussite, moyenne, rangs)
pour les enseignants, bulletin imprimable pour l'élève et le parent · `Examens` (calendrier groupé
par jour, planification avec surveillants) · `Absences` — suivi filtrable avec justification et
feuille d'appel pour le personnel, historique pour l'élève et le parent · **cloche de notifications**
dans l'en-tête.

### Tests

`npm test` lance les six suites : **252 assertions** de bout en bout (15 + 47 + 54 + 41 + 34 + 61).

La suite Phase 3 (54 assertions) couvre la délégation par matière, le barème, l'exclusion des
absents du calcul, la bascule de publication et sa notification, le rang et le taux de réussite,
les deux types de conflits d'examen, l'appel rejouable, la justification et le cloisonnement
élève/parent.

Quatre assertions verrouillent la composition de la moyenne. La première ne se contente pas de
vérifier que la formule tombe juste : elle **recalcule les deux composantes** depuis les notes du
bulletin, matière par matière. C'est ce qui prouve que le serveur a rangé chaque évaluation dans le
bon groupe — un examen compté à tort dans le contrôle continu donnerait une formule exacte sur des
composantes fausses. Les trois autres vérifient qu'une matière porte bien les deux composantes,
que la moyenne obtenue penche du côté de l'examen dès que les deux diffèrent, et que la moyenne de
la promotion porte un nom distinct.

---

## Comptabilité et paiements (Phase 4)

### Chaîne comptable

```
FraisScolarite  →  Echeance  ←  Paiement
 (par classe)     (par étudiant)  (encaissement)
```

1. La direction définit les **frais par classe** : montant total, nombre de tranches, intervalle
   et date de première échéance.
2. Le secrétariat **génère l'échéancier** d'un étudiant (ou de toute une classe) : chaque frais
   produit ses tranches, le reliquat d'arrondi tombant sur la dernière.
3. Les **paiements** s'imputent sur une échéance, ou restent des versements libres.

**Règle centrale : `montantPaye` n'est jamais incrémenté à la main.** Il est recalculé depuis la
somme des paiements *validés* après chaque création, validation ou annulation — les soldes restent
donc justes même après un chèque sans provision annulé trois semaines plus tard.

La génération d'échéancier est **rejouable** (`upsert` sur étudiant + frais + tranche) : on peut la
relancer pour un étudiant inscrit en cours d'année sans créer de doublon.

### Circuit de validation

Un paiement saisi par le **secrétariat** naît `en_attente` et n'affecte aucun solde. La **direction**
le valide (ou l'encaisse elle-même, auquel cas il est validé d'emblée). Un paiement annulé est
conservé pour la piste d'audit — seul son statut change, et le motif figure sur le reçu.

### Reçus PDF

Générés par [recu.service.js](server/src/services/recu.service.js) avec `pdfkit` et **écrits
directement dans la réponse HTTP** : aucun fichier temporaire sur le serveur. Le reçu porte l'identité
de l'étudiant, le détail du règlement, le montant **en chiffres et en toutes lettres**
([montantEnLettres.js](server/src/utils/montantEnLettres.js), orthographe classique respectée), la
situation du compte et deux emplacements de signature. Un reçu provisoire ou annulé est explicitement
marqué comme tel.

Côté client, le PDF transite en `blob` : le jeton d'authentification reste dans l'en-tête
`Authorization` et n'apparaît jamais dans une URL.

### Endpoints

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/frais` | personnel |
| POST/PATCH/DELETE | `/api/frais` | admin, directeur |
| GET | `/api/echeances` | tous (périmètre restreint pour élève/parent) |
| GET | `/api/echeances/etudiant/:id` | personnel, le parent de l'élève, l'élève |
| GET | `/api/echeances/solde/:id` | idem |
| GET | `/api/echeances/statistiques` | admin, directeur, secrétaire |
| POST | `/api/echeances/etudiant/:id`, `/api/echeances/classe` | admin, directeur, secrétaire |
| PATCH | `/api/echeances/:id` | admin, directeur (remise, report) |
| GET | `/api/paiements`, `/api/paiements/:id` | tous (périmètre restreint) |
| GET | `/api/paiements/:id/recu` | personnel, le parent de l'élève, l'élève |
| POST | `/api/paiements` | admin, directeur, secrétaire |
| PATCH | `/api/paiements/:id/validation`, `/annulation` | admin, directeur |

### Règles métier appliquées

- **Encaissement plafonné au reste dû** d'une échéance : le message invite à saisir un versement
  libre s'il s'agit d'une avance.
- Un paiement ne peut être rattaché qu'à une échéance **du même étudiant**, et jamais à une échéance
  annulée.
- Le montant d'une échéance ne peut pas être abaissé **sous le déjà perçu**.
- Un frais n'est pas supprimable tant que des échéances en dépendent.
- Modifier un frais **ne réécrit pas** les échéanciers déjà générés : l'API le signale et invite à
  relancer la génération.
- Chaque encaissement validé **notifie l'étudiant et ses parents**.

### Écrans livrés

**Comptabilité** (personnel de caisse) — synthèse en quatre indicateurs (attendu, encaissé, impayés
en retard, en attente de validation) et trois onglets : *Paiements* (journal filtrable, validation,
annulation motivée, reçu PDF), *Échéanciers* (sélection d'un étudiant, solde, encaissement, génération
individuelle ou par classe), *Grille tarifaire* (CRUD avec **aperçu du découpage en tranches en direct**
dans le formulaire).

**Mes paiements** (étudiant, parent) — solde avec barre d'avancement, échéancier, alerte sur les
retards, et reçus PDF téléchargeables.

Le tableau de bord de la direction affiche désormais taux de recouvrement, impayés et paiements à valider.

### Tests

La suite Phase 4 (41 assertions) couvre la délégation des tarifs, l'unicité par classe/année, la
répartition en tranches, la génération rejouable, le plafond d'encaissement, le circuit
en attente → validé, le recalcul du solde après validation **et après annulation**, le format et
l'en-tête du PDF, ainsi que le cloisonnement élève/parent.

---

## Planning et statistiques (Phase 5)

### Emploi du temps

Le modèle `Creneau` décrit une **séance hebdomadaire récurrente**. `classe` et `professeur`
y sont dénormalisés depuis la matière : la détection des conflits n'interroge donc qu'une seule
collection, et une séance ne peut pas être incohérente avec sa matière.

**Trois conflits sont bloqués** à l'enregistrement, dès que deux plages du même jour se
chevauchent (`début₁ < fin₂ ∧ début₂ < fin₁`) :

| Ressource partagée | Message |
|---|---|
| Même classe | « La classe L1 Informatique A a déjà "Algorithmique" le jeudi de 08:00-10:00 » |
| Même professeur | « M. Diallo enseigne déjà le jeudi de 08:00-10:00 » |
| Même salle | « La salle B2 est occupée le jeudi de 08:00-10:00 » |

La **duplication** d'un emploi du temps vers une autre classe apparie les matières par code,
et signale celles qui manquent ou qui entreraient en conflit plutôt que d'échouer en bloc —
utile à la rentrée.

Côté client, la grille positionne les séances **en absolu sur une échelle de minutes** : la durée
réelle de chaque cours est lisible d'un coup d'œil. Sur mobile elle bascule en liste par jour,
une grille à six colonnes y étant illisible.

### Tableau de bord adapté au rôle

`GET /api/statistiques/mon-tableau` renvoie une **charge utile différente selon le rôle** :
c'est le serveur qui décide des indicateurs auxquels chacun a droit, l'interface se contente de
choisir la mise en forme. Un professeur ne reçoit aucun chiffre financier ; un étudiant ne reçoit
que son propre solde.

| Rôle | Ce qu'il reçoit |
|---|---|
| Administrateur, directeur | Effectifs, moyenne et réussite, recouvrement, absences du jour, 4 alertes actionnables |
| Secrétaire | Effectifs, caisse, absences du jour, paiements à valider |
| Professeur | Ses cours du jour, ses matières et effectifs, corrections inachevées, notes à publier |
| Surveillant | Absences et retards du jour, total à justifier, ses convocations de surveillance |
| Étudiant | Moyenne, rang, absences, reste à payer, cours du jour, prochains examens |
| Parent | Le même bloc, un par enfant rattaché |

Les alertes à zéro ne s'affichent pas : un tableau de bord vide est une bonne nouvelle.

### Statistiques d'établissement

`GET /api/statistiques/etablissement` (direction) agrège effectifs, résultats, finances et
absences. Les moyennes suivent **exactement les règles du bulletin** — note ramenée sur 20,
pondérée par le coefficient de l'évaluation, puis moyenne des matières pondérée par leur propre
coefficient. La suite de tests vérifie cette égalité de bout en bout : la moyenne affichée sur le
tableau de bord d'un étudiant est identique à celle de son bulletin.

### Choix de visualisation

Toutes les séries de l'application sont **uniques** (un seul jeu de données par graphique) : la
couleur n'a donc aucune identité à porter, la longueur des barres dit déjà tout. Une seule teinte
de marque est utilisée partout — colorer des catégories nominales par leur valeur dépenserait le
canal identité pour ré-encoder ce que la barre montre.

Seule la **répartition des moyennes** est ordinale (Insuffisant → Très bien) : elle reçoit une
rampe monotone d'une seule teinte, validée avec l'outil de la méthode dataviz (lightness monotone,
écarts ≥ 0.06, extrémité claire à 3,0:1 sur la surface). Grilles en filets pleins — jamais de
pointillés, qui se lisent à tort comme un seuil —, valeurs directement étiquetées quand elles
tiennent, et une vue tableau pour que rien ne dépende du survol.

### Endpoints

| Méthode | Route | Accès |
|---|---|---|
| GET | `/api/planning` | tous (élève/parent filtrés sur leur classe, professeur sur ses cours) |
| GET | `/api/planning/salles` | personnel |
| POST/PATCH/DELETE | `/api/planning` | admin, directeur, secrétaire |
| POST | `/api/planning/dupliquer` | admin, directeur, secrétaire |
| GET | `/api/statistiques/mon-tableau` | tous, charge utile selon le rôle |
| GET | `/api/statistiques/etablissement` | admin, directeur |

### Découpage du bundle

Les écrans de module sont chargés à la demande (`React.lazy`), et les dépendances stables
isolées en chunks séparés. Le premier écran servi ne transporte plus le code des onze autres :
la bibliothèque de graphiques (147 kB) ne se charge qu'en ouvrant `/statistiques`.

### Tests

La suite Phase 5 (34 assertions) couvre les trois types de conflits et le chevauchement partiel,
la déduction classe/professeur depuis la matière, le périmètre de consultation par rôle, la forme
de la charge utile pour chacun des profils — y compris l'absence de données financières chez
le professeur —, la série d'encaissements sur 12 mois,
la répartition en 5 tranches, et l'égalité entre la moyenne du tableau de bord et celle du bulletin.

---

## Identité visuelle et finitions (Phase 6)

### Design tokens

La charte est déclarée une seule fois, dans [client/src/index.css](client/src/index.css) :

| Token | Valeur | Rôle |
|---|---|---|
| `marine` | `#0B2E52` | autorité — barre latérale, pied de page, titres, texte fort |
| `ista` | `#1F6FE0` | action — boutons primaires, liens, accents |
| `clair-sur-fonce` | `#7FB6F7` | **fonds foncés uniquement** — le nom du token porte la règle |
| `--font-sans` | Archivo | police unique, chargée depuis Google Fonts |

La rampe applicative `brand-*` a été **re-dérivée du bleu ISTA** (`brand-600` *est* `#1F6FE0`,
`brand-900` *est* le marine). Les quarante écrans existants suivent donc la charte sans qu'aucun
n'ait été réécrit. Deux classes utilitaires encodent les spécifications typographiques :
`.titre-institutionnel` (Bold, capitales, interlettrage −1,5 %) et `.libelle-capitales`
(Medium, +28 %).

### Contrastes vérifiés (point 6 du cahier des charges)

**Le bleu ISTA n'a pas eu besoin d'être restreint aux gros éléments** : il atteint 4,76:1 sur
blanc, au-dessus du seuil AA de 4,5:1 pour le petit texte. La règle de répartition de la charte
suffit donc telle quelle. Le texte informatif reste néanmoins en marine (13,75:1, niveau AAA),
ce qui est à la fois plus lisible et conforme à la répartition prescrite.

| Combinaison | Ratio | Verdict |
|---|---|---|
| Bleu ISTA sur blanc | 4,76:1 | ✅ AA petit texte |
| Blanc sur bouton bleu ISTA | 4,76:1 | ✅ AA |
| Marine sur blanc | 13,75:1 | ✅ AAA |
| Blanc sur barre latérale marine | 13,75:1 | ✅ AAA |
| Bleu clair sur marine | 6,51:1 | ✅ AA |
| Bleu clair sur blanc | 2,11:1 | ❌ — d'où l'interdiction de la charte |

Ces six ratios sont **vérifiés automatiquement** par la suite de tests : une régression de palette
casse le build.

### Répartition appliquée

- **Barre latérale** et **pied de page** : aplat marine, logo sur fond marine, libellés secondaires
  en bleu clair — le seul endroit où ce bleu apparaît.
- **En-tête** : logo horizontal fond clair (visible sur mobile, où la barre latérale est repliée),
  titre de page en marine.
- **Écran de connexion** : logo horizontal fond clair au-dessus de la carte.
- **Boutons** : primaire en aplat bleu ISTA, secondaire à libellé marine.
- **Graphiques** : la rampe ordinale part de `#4A8CE8` et **non** du bleu clair `#7FB6F7`, qui
  serait à 2,1:1 sur une carte blanche. Rampe re-validée après le changement de charte.

### Logo

[client/src/components/Logo.jsx](client/src/components/Logo.jsx) encapsule les règles : cinq
variantes (`clair`, `marine`, `vertical`, `vertical-inverse`, `icone`), hauteur pilotée — la
largeur suit, jamais de réétirement — et un plancher par variante déduit du minimum de 28 mm de
la charte (29 px pour l'horizontal, 128 px pour le vertical dont le lockup est plus étroit
relativement au fichier). La zone de protection (marge = hauteur d'icône ÷ 2) est intégrée au
`viewBox` de chaque fichier, aucun écran n'a à la connaître.

**Le navigateur reçoit les SVG** : nets à toute taille, et deux fois plus légers à poids
transféré (5,8 ko contre 13,3 ko gzippés pour le lockup horizontal). Le bitmap ne subsiste que
là où le vectoriel n'est pas exploitable — icônes PWA, en-tête des emails, documents PDF
(pdfkit n'accepte que du PNG/JPEG, et la plupart des clients mail retirent le SVG).

Les fichiers fournis ont demandé quatre corrections avant intégration, appliquées par script —
`viewBox` recalculé, aucun tracé déformé ni recoloré :

| Défaut de l'export | Correction |
|---|---|
| Aucun `viewBox`, seulement `width`/`height` | `viewBox` calculé sur la boîte réelle du lockup — sans lui, un SVG ne se redimensionne pas en CSS |
| Cadre gris 1 px sur tout le pourtour (`#D6D3D1`, `#E4E1DF`) | tracés retirés du fichier livré |
| Jusqu'à 70 % d'espace mort autour du lockup | recadrage, puis reconstitution de la zone de protection |
| Coordonnées à 8 décimales | arrondi à 2 décimales — 31 % de poids en moins, pour une précision cinq fois plus fine qu'un pixel |

Une variante n'est **pas livrée** : le vertical bichrome, dont le lockup mesure 339 × 306 contre
344 × 310 pour les deux variantes saines, et touche le bord gauche du canevas. Il est amputé
d'environ 4 px — dans le vecteur comme dans le bitmap.

### Emails transactionnels

[email.template.js](server/src/services/email.template.js) produit un HTML en tableaux et styles
en ligne — le seul rendu fiable sur l'ensemble des clients, Outlook compris. En-tête et pied sur
aplat marine, bouton d'action en bleu ISTA, pile de polices Archivo avec repli sans-serif système.

Le logo est **joint au message** (`cid:`) plutôt que lié : il s'affiche même quand le client bloque
les images distantes. Chaque message part avec une version texte brut.

[email.service.js](server/src/services/email.service.js) bascule sur un transport « journal » tant
que `SMTP_HOST` est vide : développement et tests fonctionnent sans compte de messagerie, et rien
ne part vers de vraies adresses. **Un échec d'envoi ne fait jamais échouer l'action métier** — une
réinitialisation de mot de passe reste valable si le serveur de messagerie est indisponible.

Trois messages sont branchés : lien de réinitialisation, identifiants d'un compte créé, et
notification. Le relais par email n'est **pas** systématique : publier les notes d'une classe de
quarante élèves créerait quatre-vingts notifications, pertinentes dans l'application mais une
avalanche par courrier. Sont relayés les événements qu'une famille doit connaître le jour même —
absences et mouvements de paiement.

### Documents PDF

Le reçu de paiement porte le bandeau marine avec le logo à 200 pt (177 pt de lockup, au-dessus du
plancher de 28 mm), et le montant en bleu ISTA. Le logo à fond marine se fond exactement dans le
bandeau, sa plaque étant au même `#0B2E52`.

### Accessibilité clavier

- **Lien d'évitement** en premier élément focusable, vers le contenu principal.
- **Piège de focus dans les modales** : le focus entre à l'ouverture, Tab et Maj+Tab bouclent à
  l'intérieur, Échap ferme, et le focus revient sur l'élément déclencheur à la fermeture.
- Anneau de focus visible partout, décliné en bleu clair sur les zones marine.
- `aria-busy` sur les boutons en cours de chargement, `aria-labelledby` sur les dialogues.

### Tests

La suite Phase 6 (61 assertions) vérifie les six ratios de contraste, la monotonie et l'extrémité
claire de la rampe des graphiques, l'intégrité des fichiers de marque, la présence des trois
couleurs dans le gabarit email, l'échappement du HTML, la version texte brut, le repli du
transport email, le fait qu'un échec d'envoi ne lève pas d'exception, et l'embarquement du logo
dans le PDF.

---

## Site public, refonte UI et documents (Phase 7)

### Site public et SEO

Pages indexables — **`/` accueil, `/formations`, `/admissions`, `/a-propos`** — servies par un
`LayoutPublic` en balises sémantiques strictes (`header` / `nav` / `main` / `footer`).

Le tableau de bord a **libéré la racine** pour `/tableau-de-bord` : `/` est l'URL qu'un
moteur considère comme canonique, elle ne pouvait pas rester privée. Les pages publiques
restent accessibles à un utilisateur connecté (l'en-tête bascule sur « Mon espace »).

**Pré-rendu au build.** Une SPA sert un `<div id="root">` vide ; le contenu n'existe
qu'après exécution du JavaScript. `npm run build` enchaîne désormais trois étapes :

```
vite build                         → bundle navigateur
vite build --ssr entry-prerender   → rendu serveur des pages publiques
node scripts/prerender.mjs         → HTML statique + sitemap.xml + robots.txt
```

Les pages publiques sont importées **eagerly** dans `entry-prerender.jsx` : `renderToString`
est synchrone et rendrait le fallback de Suspense à la place du contenu si elles étaient en
`React.lazy`. Le résultat est un HTML complet (16 ko pour l'accueil) lisible sans JavaScript,
avec `<title>`, `description`, `canonical`, Open Graph et JSON-LD déjà dans le `<head>`.

| Élément | Mise en œuvre |
|---|---|
| Métadonnées par page | `<Seo>`, via le hoisting natif de React 19 — aucune dépendance |
| Données structurées | `EducationalOrganization` (accueil, à propos), `ItemList` de `Course` (formations) |
| `sitemap.xml` | généré au build depuis la liste des routes publiques |
| `robots.txt` | 17 chemins privés exclus, `/api/` exclu, sitemap déclaré |
| Espace privé | `noindex, nofollow` en plus du blocage `robots.txt` |

### Refonte visuelle

- **Hiérarchie** : classes dédiées par niveau — valeur clé 30 px / 700 contre libellé 12 px / 500.
  L'écart porte sur la taille **et** la graisse.
- **Couleurs sémantiques** : les statuts utilisaient `emerald-600` (3,77:1) et `amber-600`
  (3,19:1), **tous deux non conformes AA**. Remplacés par des tokens aux pas -700
  (5,5:1 / 5,0:1 / 6,5:1) — 60 occurrences corrigées.
- **Archivo auto-hébergée** : fonte variable 400→700 dans un seul fichier de 35 ko, contre
  quatre graisses statiques et deux connexions tierces. Le build ne fait plus **aucune**
  requête vers un domaine externe.
- **Barre latérale** : trois groupes (Vie scolaire / Administration / Pilotage) et un état
  actif à trois signaux — liseré, fond, graisse — donc lisible sans distinguer les couleurs.
- **Tendances** : `tendanceEncaissements()` compare les **30 derniers jours aux 30 précédents**
  et non deux mois calendaires, qui donneraient une chute artificielle en début de mois.
  Une flèche n'est affichée que là où la donnée de comparaison existe.

### Bulletin — format paysage

A4 paysage : la largeur aligne toutes les évaluations d'une matière sur une seule ligne.
En-tête (logo, identité, période) sur une bande, quatre indicateurs de synthèse, grille
zébrée `Matière | Coef. | Interrogations | Devoirs et examens | Moyenne | Appréciation`,
puis mentions et zones de signature.

Les notes portent leur barème (`8/10`) : un « 8 » isolé serait ambigu. L'appréciation retenue
est celle de l'évaluation **la plus pondérée** qui en porte une. La moyenne reçoit un fond
discret selon le seuil.

L'impression n'imprime **que le document** : `@media print` masque tout puis rend visible la
seule classe `document-imprimable` — une barre ajoutée plus tard ne réapparaîtra pas par oubli.

### Reçu — refonte

Format portrait conservé. Le **numéro de reçu** passe dans un cartouche blanc sur le bandeau
marine, et le **montant perçu** devient l'élément dominant : aplat bleu pleine largeur,
chiffre en 30 points. Les blocs sont différenciés par leur fond plutôt qu'empilés à l'identique.

**QR de vérification** pointant vers `/verification/:numeroRecu`, une page publique réelle —
un QR encodant une URL morte serait décoratif. L'endpoint est **volontairement avare** : numéro,
montant, date, statut. Aucune identité, aucun solde. Celui qui scanne tient déjà le reçu ;
l'API confirme seulement que le serveur le reconnaît.

Les mentions légales (raison sociale, RCCM, NIF, adresse) viennent de la configuration
(`ETABLISSEMENT_*`) : une mention non renseignée est **omise** plutôt qu'affichée vide.

---

## Site public — contenu et photographies (Phase 8)

### Catalogue de formation

L'offre publiée est **transcrite de la brochure institutionnelle** TechnoLAB-ISTA, dans
[client/src/utils/formations.js](client/src/utils/formations.js) : **67 parcours**, croisant
trois cycles et trois pôles disciplinaires.

|  | Sciences économiques et de gestion | Sciences et technologies | Sciences de l'ingénieur |
| --- | --- | --- | --- |
| **DUT** (Bac+2) | 7 parcours | 5 | 3 |
| **Licence** (Bac+3) | 13 | 9 | 3 |
| **Master** (Bac+5) | 12 | 11 | 4 |

C'est exactement la structure de la grille tarifaire — un montant par cycle et par pôle. Les
deux tableaux partagent donc les mêmes clés (`gestion`, `technologies`, `ingenierie`), ce qui
rend **impossible d'afficher un parcours sous un pôle et de le facturer sous un autre**.

Un écart de vocabulaire de la brochure est conservé tel quel : le pôle technique s'y intitule
« Sciences Techniques » en DUT et « Sciences de l'Ingénieur » en licence et master. `nomPole()`
choisit le libellé selon le cycle ; la clé et le tarif, eux, restent uniques.

Cette source unique alimente les pages **et** les données structurées schema.org — 67 objets
`Course`, un par parcours, avec son `educationalLevel`. C'est le parcours que cherche un
candidat : c'est donc lui qui doit pouvoir remonter seul dans un résultat de recherche.

**Un superlatif de la brochure n'est pas republié.** Elle avance « le taux d'insertion
professionnelle le plus élevé ». Une comparaison entre établissements demande une source, et
un site officiel qui l'affirme sans mesure publiée s'expose autant qu'il se valorise. À
réintégrer si la direction fournit l'étude.

### Identité et reconnaissances

Reprises de la brochure et affichées sur `/a-propos` : fondation en 1998, agrément du
gouvernement malien, reconnaissance CAMES (plus de trente diplômes) et FEDE, accréditations
Académie Cisco et Académie Huawei ICT — avec les certifications CISCO ITE et CCNA intégrées
aux programmes —, doubles diplômes avec le Groupe ESG de Paris et l'Université Catholique de
Milan, partenariats au Maroc, en Russie et en Chine.

Les agréments alimentent aussi le schema.org de l'établissement, en
`EducationalOccupationalCredential`. Le domaine officiel est **`technolab-ista.net`** (et non
`.edu`) : c'est la valeur par défaut de `VITE_SITE_URL` et de l'origine du plan de site.

### Page Admissions

Page publique `/admissions` : pièces à fournir, frais d'inscription, grille tarifaire croisée
et avantage lié au paiement anticipé.

C'est la seule page du site dont une information erronée peut coûter de l'argent au lecteur.
Trois règles s'y appliquent :

1. **le millésime et le périmètre sont affichés** (`ANNEE_TARIFAIRE`, `PERIMETRE_TARIFAIRE`) —
   une grille sans date laisse croire qu'elle est à jour, indéfiniment ;
2. **l'avertissement précède le tableau**, et non en note de bas de page : il doit être lu par
   quelqu'un qui vient chercher un chiffre ;
3. **le secrétariat fait foi**, ce que la page dit explicitement.

Les bornes annoncées dans la description SEO (`MONTANT_MIN`, `MONTANT_MAX`) sont **calculées**
depuis la grille, jamais recopiées : elles ne peuvent pas diverger d'elle.

Mettre à jour `ANNEE_TARIFAIRE` et `TARIFS` suffit à rafraîchir la page.

### Photographies

Neuf clichés fournis par la direction, préparés par
[client/scripts/preparer-photos.py](client/scripts/preparer-photos.py) et déposés dans
`client/public/photos/` (556 ko au total, dossier versionné — le déploiement n'a donc
besoin ni de Python ni de Pillow).

| Traitement | Raison |
| --- | --- |
| AVIF **et** WebP pour chaque cliché | l'AVIF pèse ~30 % de moins ; le WebP sert de repli |
| Aucun agrandissement | les originaux font 292 px de large pour la plupart ; les étirer ne créerait que du flou. Les pages sont dessinées autour de la taille réelle |
| Variante `@0.5x` au-delà de 700 px | `srcset` sert un fichier plus léger aux téléphones |
| Recadrage de la photo de Ségou | l'original est une capture d'écran de carrousel : deux flèches de navigation, deux logos en coin et une légende incrustée, retirés |
| Canal alpha supprimé | les AVIF fournis en portaient un, inutile sur des photos opaques |

Le composant [Photo.jsx](client/src/components/Photo.jsx) émet un `<picture>` et porte
`width`/`height` réels, ce qui permet au navigateur de réserver la place **avant** le
téléchargement — sans quoi le texte saute quand l'image arrive. Tout est différé
(`loading="lazy"`) sauf l'image du premier écran, qui la retarderait.

Dimensions et textes alternatifs sont centralisés dans
[client/src/utils/photos.js](client/src/utils/photos.js), en liste : c'est la seule façon
de relire d'un coup d'œil qu'aucun cliché ne porte une description approximative. Une
personne au lecteur d'écran doit recevoir la scène, pas un slogan.

**Une photo n'a pas été retenue** : celle de l'assemblée générale (logo « FIDE », écrans
« 2024 assemblée générale »). Rien n'y rattache la scène à l'institut ; l'afficher comme
un moment de la vie de l'établissement serait une affirmation que nous ne pouvons pas
justifier. À confirmer par la direction.

### Contrôles automatisés ajoutés

La suite Phase 6 surveille trois défaillances qui ne provoquent **aucune erreur au build**,
et laissent partir la page en ligne avec un trou :

- une page référence une photo absente du catalogue (faute de frappe) ;
- le catalogue annonce un cliché dont le fichier n'a pas été produit ;
- un fichier est ré-exporté à une autre taille que celle déclarée, ce qui réintroduit le
  décalage de mise en page que `width`/`height` évitait. Les dimensions réelles sont lues
  dans l'en-tête VP8 du WebP.

### Retrait du rôle « concierge »

Le rôle a été retiré du référentiel : il ne portait aucune permission propre, et
aucun écran ne lui était réservé.

Le retrait touche **cinq** endroits, et le référentiel n'en est qu'un :

| Fichier | Ce qui y était déclaré |
| --- | --- |
| [server/src/config/roles.js](server/src/config/roles.js) | l'énumération elle-même |
| [server/src/models/User.js](server/src/models/User.js) | le préfixe de matricule |
| [client/src/router/navigation.js](client/src/router/navigation.js) | les modules visibles |
| [client/src/utils/roles.js](client/src/utils/roles.js) | le libellé et la pastille |
| [server/src/seed/index.js](server/src/seed/index.js) | le compte de démonstration |

**Les comptes existants ne sont pas supprimés.** Dix-huit champs d'autres collections
désignent un utilisateur — qui a pointé une absence, qui a encaissé un paiement, qui l'a
validé. Effacer un compte laisserait ces références dans le vide et rendrait la piste
d'audit illisible rétroactivement : on ne saurait plus qui a saisi une opération
comptable de l'an dernier.

La migration les **désactive** donc, ce qui coupe la connexion et les droits tout en
laissant l'historique lisible :

```bash
cd server
node src/seed/retirer-role.js concierge              # rapport, sans écriture
node src/seed/retirer-role.js concierge --appliquer  # désactive
```

Ces comptes portent alors un rôle absent de l'énumération. C'est sans effet à la lecture
— Mongoose ne valide qu'à l'écriture — mais toute modification ultérieure de la fiche
échouera tant qu'un rôle courant ne lui est pas attribué. Le rapport le signale.

**Un test verrouille le retrait** ([phase2](server/tests/phase2-gestion.test.mjs)) : retirer
un rôle du référentiel ne suffit pas si la validation Zod, elle, l'accepte encore. Le test
tente de créer un compte « concierge » et exige un refus — sans quoi le rôle
reviendrait par la porte de l'API.

---

## Déploiement

### Architecture servie

```
Navigateur
    |
    v
  nginx  (443, TLS)
    |
    +--  /            -> fichiers statiques  client/dist/   (pages pré-rendues)
    |
    +--  /api/        -> proxy vers  127.0.0.1:5000  (Node / Express)
                                          |
                                          v
                                      MongoDB
```

**L'API ne sert pas le front.** Les pages publiques sont pré-rendues en HTML statique au
build : les servir comme des fichiers est à la fois ce qu'attend un moteur de recherche et
bien moins coûteux que de les faire passer par Node.

### 1. Prérequis

| Composant | Version | Remarque |
| --- | --- | --- |
| Node.js | 20 LTS ou plus | Express 5 et Vite 7 l'exigent |
| MongoDB | 6 ou plus | locale, ou Atlas |
| nginx | 1.18 ou plus | ou tout autre proxy inverse |
| Nom de domaine | — | requis pour le certificat TLS |

### 2. Variables d'environnement du serveur

Copier `server/.env.example` vers `server/.env`, puis renseigner :

| Variable | Rôle | En production |
| --- | --- | --- |
| `NODE_ENV` | mode d'exécution | **`production`** — active le cookie `secure`, le `sameSite: strict` et coupe les journaux de développement |
| `PORT` | port d'écoute local | `5000`, jamais exposé directement |
| `CLIENT_URL` | origine publique du site | `https://votre-domaine` — sert à l'en-tête CORS **et** à l'URL encodée dans le QR des reçus |
| `MONGODB_URI` | connexion base | `mongodb://127.0.0.1:27017/technolab_ista` ou l'URI Atlas |
| `JWT_ACCESS_SECRET` | signature du jeton d'accès | **à régénérer**, voir ci-dessous |
| `JWT_REFRESH_SECRET` | signature du jeton de session | **à régénérer** |
| `JWT_ACCESS_EXPIRES` | durée du jeton d'accès | `15m` |
| `JWT_REFRESH_EXPIRES_DAYS` | durée de session | `7` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | premier compte administrateur | à changer avant le premier `npm run seed` |
| `SMTP_*` | messagerie | voir la section 4 |
| `ETABLISSEMENT_*` | mentions légales des reçus | une mention vide est **omise** du document, jamais affichée vide |

Générer les deux secrets :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **Trois pièges à connaître.**
> `server/.env` est ignoré par git : il ne se déploie pas tout seul, il faut le créer sur
> le serveur. **N'y laissez aucun identifiant en commentaire** — une URI Atlas commentée
> reste une URI Atlas en clair. Enfin, `CLIENT_URL` doit correspondre **exactement** à
> l'origine servie (protocole et sous-domaine compris) : une divergence bloque la connexion
> au premier appel CORS.

### 3. Variables d'environnement du client

Créer `client/.env.production` à partir de `client/.env.example` :

```ini
VITE_API_URL=https://votre-domaine/api
VITE_SITE_URL=https://votre-domaine
```

`VITE_SITE_URL` alimente les URL canoniques, `sitemap.xml` et les images de partage. Elle
doit être **absolue et sans barre finale**.

> Ces valeurs sont **figées à la compilation**, pas lues à l'exécution : les changer impose
> de reconstruire le front.

### 4. Activer l'envoi des emails

Sans `SMTP_HOST`, le service fonctionne en **mode journal** : il compose le message, l'écrit
dans la console et n'envoie rien. C'est le comportement voulu en développement.

Pour Gmail, `SMTP_PASS` attend un **mot de passe d'application**, jamais le mot de passe du
compte — Google refuse depuis 2022 l'authentification simple sur SMTP :

1. le compte doit avoir la **validation en deux étapes** activée
   (*Compte Google → Sécurité*) ; sans elle, l'option suivante n'apparaît pas ;
2. ouvrir <https://myaccount.google.com/apppasswords> ;
3. nommer l'application (« Technolab ISTA ») et valider ;
4. copier les **16 caractères** affichés — c'est la seule fois où ils sont montrés ;
5. les coller dans `SMTP_PASS`, espaces inclus ou non, les deux fonctionnent.

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=stages.istalab@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx
SMTP_FROM=Technolab ISTA <stages.istalab@gmail.com>
```

`SMTP_FROM` doit porter **la même adresse** que `SMTP_USER` : Gmail réécrit toute autre
adresse d'expéditeur, ce qui rend les réponses inexploitables.

> **Pour un usage réel, Gmail n'est pas le bon choix.** La limite est de 500 destinataires
> par jour, et une notification d'absence part vers toute une classe. Un service
> transactionnel — Brevo (300 messages/jour gratuits), Mailgun, Amazon SES — accepte un
> `SMTP_FROM` au nom de l'établissement et fournit les enregistrements SPF et DKIM sans
> lesquels les messages tombent en indésirables. Seules les quatre variables changent.

Ports : `587` négocie STARTTLS (cas courant), `465` chiffre dès la connexion — le service
bascule seul sur `secure` quand le port vaut 465.

### 5. Base de données

```bash
cd server
npm ci
npm run seed        # crée l'administrateur et le jeu de démonstration
```

> `npm run seed` **écrase** les données de démonstration. Sur une base déjà exploitée, ne
> le relancez pas.

### 6. Construire le front

```bash
cd client
npm ci
npm run build
```

Produit `client/dist/` :

| Contenu | Rôle |
| --- | --- |
| `index.html`, `formations/`, `admissions/`, `a-propos/` | pages pré-rendues, indexables sans exécuter de JavaScript |
| `assets/` | JS et CSS, noms porteurs d'une empreinte de contenu |
| `photos/`, `marque/` | photographies et éléments de marque |
| `sitemap.xml`, `robots.txt` | plan de site et exclusion des 17 chemins privés |

### 7. Lancer l'API comme service

Avec systemd — `/etc/systemd/system/technolab-api.service` :

```ini
[Unit]
Description=API Technolab ISTA
After=network.target mongod.service

[Service]
Type=simple
User=technolab
WorkingDirectory=/var/www/technolab/server
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now technolab-api
sudo systemctl status technolab-api
```

Alternative sans systemd : `pm2 start src/index.js --name technolab-api && pm2 save && pm2 startup`.

### 8. Configurer nginx

```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine;

    ssl_certificate     /etc/letsencrypt/live/votre-domaine/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine/privkey.pem;

    root /var/www/technolab/client/dist;
    index index.html;

    # --- Compression ---
    # Elle porte aussi sur les reponses proxifiees de l'API (gzip_proxied).
    gzip              on;
    gzip_vary         on;
    gzip_proxied      any;
    gzip_min_length   1024;
    gzip_types        text/plain text/css application/javascript application/json
                      image/svg+xml application/xml;
    # Les .avif et .webp sont deja compresses : les repasser en gzip les alourdit.

    # --- API ---
    location /api/ {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # --- Ressources a empreinte : jamais revalidees ---
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # --- Photos et marque : noms stables, donc duree moderee ---
    location ~* ^/(photos|marque)/ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # --- Pages : revalidees a chaque visite ---
    # Sans cela, un visiteur garderait l'ancienne page apres une mise a jour, tout en
    # demandant des fichiers /assets/ que le nouveau build a renommes : page blanche.
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri.html $uri/index.html /index.html;
    }
}

server {
    listen 80;
    server_name votre-domaine;
    return 301 https://$host$request_uri;
}
```

Le `try_files` mérite un mot : il cherche d'abord le fichier demandé, puis la page
**pré-rendue** correspondante (`/admissions` → `admissions/index.html`), et ne retombe sur
`index.html` — le rendu côté navigateur — que pour les routes privées. Sans la deuxième et
la troisième règle, les pages pré-rendues ne seraient jamais servies, et tout le travail de
référencement serait perdu.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 9. HTTPS

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine -d www.votre-domaine
```

Le renouvellement est automatique. **HTTPS n'est pas optionnel ici** : en production le
cookie de session porte l'attribut `secure` et n'est tout simplement pas émis en clair —
l'authentification ne fonctionne pas en HTTP.

Le cookie porte aussi `sameSite: strict` et le chemin `/api/auth`. Le front et l'API doivent
donc être servis sur **le même domaine**, ce que fait la configuration ci-dessus. Les héberger
sur deux domaines distincts casserait le rafraîchissement de session.

### 10. Vérifier la mise en ligne

| Vérification | Commande ou geste | Attendu |
| --- | --- | --- |
| API vivante | `curl -i https://votre-domaine/api/health` | `200` |
| Page pré-rendue servie | `curl -s https://votre-domaine/admissions` puis compter `<title>` | exactement 1 |
| Contenu sans JavaScript | chercher « Technologies Appliquées » dans le HTML brut de `/` | présent |
| Plan de site | ouvrir `/sitemap.xml` | 4 URL, en `https` et au bon domaine |
| Exclusions | ouvrir `/robots.txt` | 17 chemins privés en `Disallow` |
| Compression | `curl -sI -H "Accept-Encoding: gzip" https://votre-domaine/` | en-tête `Content-Encoding: gzip` |
| Connexion | se connecter puis rafraîchir la page | la session tient (cookie de rafraîchissement accepté) |
| Messagerie | « mot de passe oublié » sur une vraie adresse | message reçu ; sinon `journalctl -u technolab-api` |
| Reçu | ouvrir un reçu PDF, scanner le QR | la page de vérification s'ouvre sur le bon numéro |
| Impression | imprimer un bulletin | A4 paysage, sans l'interface |

### 11. Mettre à jour

```bash
cd /var/www/technolab
git pull

cd server && npm ci && sudo systemctl restart technolab-api
cd ../client && npm ci && npm run build
```

Aucune purge de cache n'est nécessaire : les fichiers `/assets/` changent de nom à chaque
build, et les pages sont revalidées à chaque visite.

### Contenu à compléter

Ces éléments manquent encore, et sont **absents plutôt qu'inventés** :

| Élément | Où il servira | Fourni par |
| --- | --- | --- |
| Conditions d'admission et pièces à fournir | page `/admissions` | direction (illisibles sur la brochure photographiée) |
| Deux options du parcours « Gestion des entreprises et des administrations » | page `/formations` | direction (idem) |
| Grille tarifaire de l'année en cours | `ANNEE_TARIFAIRE` et `TARIFS` | secrétariat — la grille publiée est celle de 2024-2025 |
| Adresse complète, téléphone, agrément | `ETABLISSEMENT_*`, données schema.org | direction |
| `ETABLISSEMENT_RCCM`, `ETABLISSEMENT_NIF` | mentions légales des reçus | direction |
| Nature de la photo « assemblée générale » | site public | direction — écartée faute de lien établi avec l'institut |

---

## Notes pour les phases suivantes

- Tous les modules prévus sont livrés. `PHASE_ACTUELLE` dans
  [client/src/router/navigation.js](client/src/router/navigation.js) pilote encore l'affichage
  des badges de phase et le placeholder `EnConstruction`, prêts pour un module futur.
- L'envoi réel des emails est branché (Phase 6). Sans SMTP configuré, le lien reste affiché
  dans la console du serveur et exposé dans la réponse, comme auparavant.
- Le tableau de bord est désormais piloté par le serveur, un profil à la fois
  ([statistique.controller.js](server/src/controllers/statistique.controller.js)).
- Les notifications internes sont relayées par email pour les absences et les paiements, via
  [notification.service.js](server/src/services/notification.service.js).
- Pour mettre les emails en production : renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS` et `SMTP_FROM` dans `server/.env` — procédure détaillée en section
  « Déploiement / 4. Activer l’envoi des emails ». Sans cela, les messages sont journalisés.
- Le choix du transport est vérifié sur une fonction pure (`optionsTransport`) : la suite
  de tests passe que la machine ait ou non un SMTP configuré, et n’exerce l’envoi de bout en
  bout que lorsqu’il ne peut atteindre aucun destinataire réel.
- Reste ouvert côté performance : service worker et invite d’installation (PWA), puis audit
  Lighthouse. La compression et les en-têtes de cache sont traités au niveau de nginx,
  documentés en section Déploiement.
- Reste ouvert : pagination du planning sur plusieurs années scolaires, et export PDF des
  bulletins (aujourd'hui imprimés depuis le navigateur).
