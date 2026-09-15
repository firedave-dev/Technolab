# -*- coding: utf-8 -*-
"""
LE TEXTE DU MEMOIRE.

C'est ici qu'on modifie une phrase, qu'on ajoute un paragraphe ou qu'on change
l'ordre d'une section. rapport.py ne fait qu'assembler ; infos.py ne porte que
les noms et les dates.

Chaque fonction correspond a une partie du document, dans l'ordre ou elle
apparait. Les appels `figure(...)` designent un fichier de figures/ ou de
captures/ : si le fichier manque, un cadre visible prend sa place et le
document se genere quand meme.
"""
from pathlib import Path
from docx.shared import Cm, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

from docx_outils import (para, riche, puces, titre1, titre2, titre3, figure,
                         tableau, nouvelle_section)

RACINE = Path(__file__).parent
FIG = RACINE / 'figures'
CAP = RACINE / 'captures'
CENTRE = WD_ALIGN_PARAGRAPH.CENTER


# ==========================================================================
# INTRODUCTION GENERALE
# ==========================================================================
def introduction(doc):
    nouvelle_section(doc, 'decimal', depart=1)
    titre1(doc, 'Introduction générale', nouvelle_page=False)

    titre2(doc, 'Contexte général')
    para(doc, 'L’enseignement supérieur privé occupe une place importante au Mali. Il '
              'accueille une part croissante des bacheliers et couvre des domaines variés : '
              'gestion, informatique, génie civil, énergies, sciences de l’ingénieur. '
              'Chaque établissement y gère, année après année, les mêmes informations : '
              'l’identité et le dossier de ses étudiants, la composition de ses classes, '
              'les matières enseignées et les enseignants qui en ont la charge, les notes, '
              'les absences, les emplois du temps et les frais de scolarité.')
    para(doc, 'Dans la plupart des cas, ces informations vivent dans des supports séparés. '
              'Le secrétariat tient un registre d’inscription. Chaque enseignant conserve '
              'ses notes dans un cahier ou un fichier de tableur qui lui est propre. La '
              'caisse enregistre les versements sur un autre support encore. Les bulletins '
              'sont composés en fin de semestre en rassemblant ces sources une à une. Rien '
              'de tout cela n’est absurde : ces méthodes ont fait leurs preuves quand les '
              'effectifs étaient réduits. Elles atteignent simplement leurs limites '
              'lorsque le nombre d’étudiants augmente et que les familles attendent une '
              'information rapide et fiable.')
    para(doc, 'L’Institut Supérieur de Technologies Appliquées, connu sous le sigle '
              'TechnoLAB-ISTA, se trouve dans cette situation. Fondé en 1998 et agréé par '
              'le gouvernement malien, il forme des étudiants du DUT au Master sur son '
              'site de Sévaré, dans la région de Mopti. L’institut dispose bien d’une '
              'présence en ligne, mais celle-ci est purement informative : elle présente '
              'les formations et les coordonnées, sans offrir d’outil de travail au '
              'personnel ni de service aux étudiants.')

    titre2(doc, 'Intérêt du thème')
    para(doc, 'Le sujet présente un triple intérêt.')
    puces(doc, [
        ('Sur le plan organisationnel, ', 'réunir en un seul endroit l’inscription, la '
         'scolarité, les notes et la comptabilité supprime les recopies d’un support à '
         'l’autre, et avec elles la principale source d’erreurs.'),
        ('Sur le plan du service rendu, ', 'un étudiant et sa famille peuvent consulter à '
         'distance les résultats, les absences et la situation financière, sans dépendre '
         'des horaires du secrétariat.'),
        ('Sur le plan académique, ', 'le projet mobilise l’ensemble des compétences de la '
         'formation : analyse d’un système d’information, modélisation UML, conception de '
         'base de données, développement web, sécurité applicative, tests et déploiement.'),
    ])

    titre2(doc, 'Problématique')
    para(doc, 'La difficulté centrale tient à la dispersion de l’information. Chaque '
              'service détient une partie de la vérité, et ces parties ne communiquent pas '
              'entre elles. Un bulletin ne peut donc être établi qu’au prix d’un '
              'rassemblement manuel, long et faillible. Une note corrigée après coup n’est '
              'pas répercutée sur les documents déjà imprimés. Un étudiant à jour de ses '
              'paiements ne peut pas le prouver sans se déplacer.')
    para(doc, 'À cette dispersion s’ajoute une contrainte propre à l’enseignement '
              'supérieur : le système LMD. Les matières y sont regroupées en unités '
              'd’enseignement, chaque unité porte un nombre de crédits, un semestre doit '
              'en totaliser exactement trente, et la validation se joue au niveau de '
              'l’unité et non de la matière isolée. Ces règles sont simples à énoncer et '
              'pénibles à tenir à la main : il suffit d’une matière mal rattachée pour que '
              'le compte des crédits soit faux sur tout un semestre.')
    para(doc, 'La problématique peut donc être formulée ainsi : comment concevoir une '
              'plateforme capable de centraliser l’ensemble des activités pédagogiques, '
              'administratives et financières d’un établissement d’enseignement supérieur, '
              'tout en garantissant l’exactitude des documents officiels et en ouvrant aux '
              'familles un accès direct à l’information qui les concerne ?')

    titre2(doc, 'Solution envisagée')
    para(doc, 'Nous proposons une plateforme web accessible depuis un simple navigateur, '
              'aussi bien sur ordinateur que sur téléphone. Elle réunit dans une seule base '
              'les comptes, la structure pédagogique, les notes, les absences, l’emploi du '
              'temps et la comptabilité. Chaque profil d’utilisateur y dispose d’un espace '
              'et de droits ajustés à son métier. Les documents officiels sont produits à '
              'la demande au format PDF. Enfin, la partie publique du site présente '
              'l’établissement et ses formations à toute personne extérieure.')
    para(doc, 'Un principe gouverne l’ensemble : aucun résultat calculé n’est conservé en '
              'base. Ni la moyenne d’une matière, ni le total des crédits d’un semestre, ni '
              'le solde d’un étudiant. Tous sont recalculés à partir des données de base '
              'chaque fois qu’on les demande. Corriger une note suffit donc à corriger le '
              'bulletin, le rang et la mention qui en découlent, sans aucune reprise '
              'manuelle.')

    titre2(doc, 'Objectif général')
    para(doc, 'Concevoir et réaliser une plateforme web de gestion scolaire permettant de '
              'centraliser, de sécuriser et de fiabiliser l’ensemble des processus de '
              'TechnoLAB-ISTA, de l’inscription d’un étudiant à l’édition de son bulletin.')

    titre2(doc, 'Objectifs spécifiques')
    puces(doc, [
        'étudier le fonctionnement actuel de l’établissement et recueillir les besoins des '
        'différents services ;',
        'modéliser la solution à l’aide du langage UML : cas d’utilisation, classes, '
        'séquences, activités et déploiement ;',
        'concevoir une base de données cohérente couvrant tous les modules ;',
        'développer une application web à accès contrôlé, distinguant sept profils '
        'd’utilisateurs ;',
        'implanter les règles du système LMD, jusqu’au calcul automatique des crédits et au '
        'regroupement des matières en unités d’enseignement ;',
        'produire automatiquement les documents officiels au format PDF ;',
        'éprouver la solution par une campagne de tests automatisés, puis la déployer et la '
        'rendre accessible en ligne.',
    ])

    titre2(doc, 'Méthodologie adoptée')
    para(doc, 'La démarche s’est articulée en cinq étapes. Elle a commencé par une phase de '
              'collecte : entretiens avec le personnel administratif et pédagogique, '
              'observation des procédures en place, examen des documents réellement '
              'utilisés — fiches d’inscription, cahiers de notes, reçus. A suivi l’analyse '
              'de l’existant et la formalisation des besoins, fonctionnels comme non '
              'fonctionnels. La conception a ensuite traduit ces besoins en modèles UML et '
              'en un schéma de base de données. Le développement a été mené de façon '
              'incrémentale : chaque module a été écrit, éprouvé puis intégré avant que le '
              'suivant ne commence, le tout sous gestion de versions. La dernière étape a '
              'réuni les tests, le déploiement et la mise en ligne.')
    para(doc, 'Un choix de méthode mérite d’être signalé, car il a orienté toute la suite. '
              'Les règles de calcul — moyennes, crédits, regroupement des matières, soldes '
              '— ont été écrites dans des modules dits « purs », c’est-à-dire qui ne lisent '
              'ni la base de données, ni la date du jour, ni aucun réglage extérieur. Ils '
              'reçoivent des valeurs et rendent un résultat. Cette séparation permet de les '
              'éprouver sur des cas que l’on ne saurait pas fabriquer commodément en base, '
              'comme un semestre dont la répartition est devenue impossible.')

    titre2(doc, 'Organisation du document')
    para(doc, 'Ce rapport comprend trois chapitres. Le premier présente l’établissement, '
              'son fonctionnement actuel, les limites de celui-ci et la solution retenue. '
              'Le deuxième détaille l’analyse et la conception : besoins, acteurs, '
              'diagrammes UML, base de données, règles pédagogiques et planification. Le '
              'troisième décrit la réalisation : technologies employées, interfaces '
              'obtenues, sécurité, campagne de tests, mise en ligne, difficultés '
              'rencontrées et perspectives. Une conclusion générale, la bibliographie et '
              'les annexes referment le document.')


# ==========================================================================
# CHAPITRE 1
# ==========================================================================
def chapitre1(doc):
    titre1(doc, 'Chapitre 1 : Présentation générale du projet')

    titre2(doc, 'Introduction')
    para(doc, 'Gérer un établissement d’enseignement supérieur, c’est conduire en parallèle '
              'plusieurs processus qui dépendent les uns des autres : inscrire les '
              'étudiants et tenir leur dossier, composer les classes, définir les matières '
              'et les confier à des enseignants, établir les emplois du temps, relever les '
              'notes et les absences, encaisser les frais de scolarité, et produire en fin '
              'de semestre les documents qui font foi. La qualité du service rendu dépend '
              'directement de la circulation de l’information entre ces activités.')
    para(doc, 'Ce chapitre présente l’établissement concerné, décrit son fonctionnement '
              'actuel, en analyse les limites, puis expose la solution que nous proposons.')

    titre2(doc, '1.1. Présentation de l’établissement')
    para(doc, 'L’Institut Supérieur de Technologies Appliquées — TechnoLAB-ISTA — est un '
              'établissement privé d’enseignement supérieur agréé par le gouvernement '
              'malien. Fondé en 1998, il dispense ses enseignements à Sévaré, dans la '
              'région de Mopti.')
    para(doc, 'L’institut organise ses formations en trois cycles — DUT (Bac+2), Licence '
              '(Bac+3) et Master (Bac+5) — répartis sur trois pôles disciplinaires : '
              'sciences économiques et de gestion, sciences et technologies, sciences de '
              'l’ingénieur. Les domaines couverts vont de la gestion et de la comptabilité '
              'à l’informatique, aux réseaux et télécommunications, au génie électrique et '
              'aux énergies renouvelables, au génie civil et aux travaux publics.')
    para(doc, 'Son personnel réunit une direction, un secrétariat chargé des inscriptions '
              'et de la caisse, une surveillance générale qui tient les classes et la vie '
              'scolaire au quotidien, et un corps enseignant intervenant par matière.')

    titre2(doc, '1.2. Étude de l’existant')
    para(doc, 'L’étude menée auprès des différents services montre une gestion presque '
              'entièrement manuelle, organisée par service plutôt que par dossier.')
    para(doc, 'Le secrétariat enregistre chaque inscription sur une fiche papier et reporte '
              'les principales informations dans un registre. L’identité d’un étudiant peut '
              'ainsi être saisie plusieurs fois, avec des orthographes différentes, sans que '
              'rien ne signale le doublon. L’affectation à une classe est notée sur une '
              'liste tenue à part.')
    para(doc, 'Les enseignants relèvent leurs notes sur un cahier personnel ou dans un '
              'fichier de tableur qu’ils conservent. En fin de semestre, ces relevés sont '
              'transmis au secrétariat, qui les rassemble matière par matière pour composer '
              'les bulletins. Chaque report est une occasion d’erreur, et une note corrigée '
              'après l’impression n’est pas répercutée sur les documents déjà distribués.')
    para(doc, 'Les absences sont relevées sur des feuilles de présence conservées par '
              'classe, sans consolidation. La caisse enregistre les versements sur un '
              'support distinct et délivre des reçus numérotés à la main ; savoir si un '
              'étudiant est à jour suppose de parcourir le registre. L’emploi du temps est '
              'composé sur tableau et affiché.')
    para(doc, 'Sur le plan numérique, l’établissement dispose d’un site institutionnel. '
              'L’analyse de cet existant montre toutefois qu’il est purement informatif et '
              'tourné vers le public : présentation des formations, coordonnées, '
              'reconnaissances. Il ne comporte aucune fonction de gestion, aucun espace de '
              'travail pour le personnel, et aucun accès pour les étudiants ou leurs '
              'familles.')

    titre2(doc, '1.3. Critique de l’existant')
    para(doc, 'Ce fonctionnement remplit sa fonction, mais il montre cinq limites nettes.')
    puces(doc, [
        ('Information dispersée. ', 'Aucun service ne dispose d’une vue complète d’un '
         'étudiant. Répondre à une question simple — « cet étudiant est-il à jour, et '
         'quelle est sa moyenne ? » — suppose de consulter deux ou trois supports tenus '
         'par des personnes différentes.'),
        ('Documents fragiles. ', 'Un bulletin est le résultat d’une longue recopie. '
         'L’erreur y est probable, et surtout elle est invisible : rien ne permet de '
         'vérifier a posteriori d’où vient un chiffre.'),
        ('Absence de traçabilité. ', 'On ne sait ni qui a saisi une note, ni quand elle a '
         'été modifiée. En cas de contestation, il n’existe aucune trace à produire.'),
        ('Aucun service aux familles. ', 'Un parent qui veut connaître les résultats ou '
         'les absences de son enfant doit se déplacer et attendre l’ouverture du '
         'secrétariat.'),
        ('Règles LMD difficiles à tenir. ', 'Le regroupement des matières en unités '
         'd’enseignement et le bouclage d’un semestre à trente crédits reposent sur des '
         'vérifications faites de tête. Une répartition qui ne peut plus atteindre trente '
         'crédits n’est découverte qu’à la fin, quand il est trop tard pour la corriger '
         'sans tout reprendre.'),
    ])
    para(doc, 'En conséquence, un site purement informatif ne suffit pas. Il communique, '
              'mais il ne gère rien. Cette insuffisance justifie la mise en place d’une '
              'plateforme de gestion intégrée.')

    titre2(doc, '1.4. Solution proposée')
    para(doc, 'Nous proposons une plateforme web centralisée, hébergée en ligne et '
              'accessible depuis n’importe quel navigateur, sans installation. Elle repose '
              'sur une base de données unique dans laquelle chaque information n’est saisie '
              'qu’une fois.')
    para(doc, 'La plateforme couvre le parcours complet d’un étudiant : inscription et '
              'dossier administratif, affectation à une classe, matières et unités '
              'd’enseignement, saisie des notes par l’enseignant, absences, emploi du temps, '
              'frais de scolarité et paiements, édition des documents officiels. Elle '
              'distingue sept profils d’utilisateurs, chacun ne voyant que ce qui relève de '
              'son métier.')
    para(doc, 'Trois choix de conception méritent d’être signalés dès maintenant, car ils '
              'structurent tout le reste du rapport.')
    puces(doc, [
        ('Les documents sont recalculés, jamais stockés. ', 'Un bulletin n’existe pas en '
         'base : il est reconstitué à chaque consultation à partir des notes. Il ne peut '
         'donc pas être en retard sur elles.'),
        ('Les droits sont vérifiés par le serveur. ', 'L’interface masque les actions non '
         'autorisées, mais c’est le serveur qui refuse. Un enseignant n’accède pas au '
         'bulletin complet ni au dossier d’un étudiant : il saisit les notes de ses '
         'propres matières, et rien de plus.'),
        ('Les règles pédagogiques sont administrables. ', 'La pondération des notes, la '
         'typologie des matières et les affinités qui guident leur regroupement sont des '
         'réglages modifiables depuis l’application, et non des valeurs écrites dans le '
         'code.'),
    ])

    titre2(doc, 'Conclusion')
    para(doc, 'Ce chapitre a présenté TechnoLAB-ISTA et son fonctionnement actuel. '
              'L’analyse critique en a dégagé les limites principales : dispersion de '
              'l’information, fragilité des documents, absence de traçabilité, aucun '
              'service rendu aux familles et difficulté à tenir les règles du LMD. La '
              'solution proposée — une plateforme centralisée à accès contrôlé, produisant '
              'ses documents par le calcul — répond point par point à ces insuffisances. '
              'Le chapitre suivant en présente l’analyse détaillée et la conception.')


# ==========================================================================
# CHAPITRE 2
# ==========================================================================
def chapitre2(doc):
    titre1(doc, 'Chapitre 2 : Analyse et conception de la solution')

    titre2(doc, 'Introduction')
    para(doc, 'Après avoir établi les limites du fonctionnement actuel, il faut préciser ce '
              'que la nouvelle solution doit faire et comment elle sera construite. Ce '
              'chapitre recense les besoins, identifie les acteurs, traduit le tout en '
              'modèles UML, décrit la base de données, expose les règles pédagogiques '
              'retenues et présente la planification du projet.')

    titre2(doc, '2.1. Analyse des besoins')
    para(doc, 'L’analyse des besoins consiste à énumérer les services que le système doit '
              'rendre. Elle distingue les besoins fonctionnels, qui décrivent ce que '
              'l’application permet de faire, des besoins non fonctionnels, qui décrivent '
              'les qualités qu’elle doit présenter.')

    titre3(doc, '2.1.1. Besoins fonctionnels')
    para(doc, 'Les douze besoins ci-dessous résument les fonctions attendues. Le détail '
              'figure en annexe A.')
    tableau(doc, 'Recensement des besoins fonctionnels',
            ['N°', 'Besoin fonctionnel', 'Description'], [
        ('BF1', 'S’authentifier', 'Accès par adresse électronique et mot de passe ; '
         'réinitialisation par courriel ; déconnexion effective.'),
        ('BF2', 'Gérer les comptes et les rôles', 'Créer et désactiver des comptes, '
         'attribuer un rôle, respecter la délégation entre rôles.'),
        ('BF3', 'Gérer les étudiants', 'Inscrire, consulter et modifier un dossier ; '
         'matricule attribué automatiquement ; fiche d’inscription en PDF.'),
        ('BF4', 'Gérer les classes', 'Créer les classes par niveau, filière et année, avec '
         'une capacité et un professeur principal.'),
        ('BF5', 'Gérer les matières', 'Définir les matières, leur coefficient, leur type et '
         'l’enseignant qui en a la charge.'),
        ('BF6', 'Gérer les unités d’enseignement', 'Regrouper les matières en unités, '
         'automatiquement ou à la main, en respectant les trente crédits du semestre.'),
        ('BF7', 'Saisir les notes', 'Grille par classe et par matière ; une note de classe '
         'et une note d’examen ; publication contrôlée.'),
        ('BF8', 'Éditer les bulletins', 'Bulletin officiel recalculé à la demande : '
         'moyennes, crédits, mention, rang, au format PDF.'),
        ('BF9', 'Suivre les absences', 'Relever absences et retards, les justifier, les '
         'consolider par étudiant et par classe.'),
        ('BF10', 'Gérer la scolarité', 'Frais par classe, échéances, encaissements, solde '
         'calculé, reçu numéroté en PDF.'),
        ('BF11', 'Gérer l’emploi du temps', 'Placer les créneaux par classe et par salle, '
         'détecter les conflits, éditer la liste d’émargement.'),
        ('BF12', 'Piloter l’établissement', 'Indicateurs et statistiques par classe, par '
         'filière et par année ; suivi des impayés.'),
    ], largeurs=[1.3, 4.2, 10.0])

    titre3(doc, '2.1.2. Besoins non fonctionnels')
    tableau(doc, 'Recensement des besoins non fonctionnels',
            ['Exigence', 'Description'], [
        ('Sécurité', 'Authentification obligatoire ; mots de passe hachés et jamais '
         'renvoyés ; droits vérifiés côté serveur à chaque requête ; limitation du nombre '
         'de tentatives de connexion.'),
        ('Exactitude', 'Aucun résultat calculé n’est stocké : moyennes, crédits et soldes '
         'sont recalculés à chaque consultation, ce qui rend impossible tout écart entre '
         'une donnée et le document qui en découle.'),
        ('Ergonomie', 'Interface en français, homogène, navigation par menu latéral ; '
         'saisie assistée pour les opérations répétitives ; messages d’erreur explicites.'),
        ('Accessibilité', 'Consultation sur ordinateur comme sur téléphone ; respect des '
         'préférences d’animation réduite ; contrastes suffisants.'),
        ('Performance', 'Réponse inférieure à deux secondes pour les opérations courantes ; '
         'listes paginées ; index posés sur les champs interrogés.'),
        ('Fiabilité', 'Validation des données au niveau du modèle, y compris lors des '
         'modifications directes ; contraintes d’unicité en base.'),
        ('Maintenabilité', 'Règles de calcul isolées dans des modules sans dépendance, donc '
         'testables ; source unique pour les rôles ; gestion de versions.'),
        ('Visibilité', 'Pages publiques lisibles par les moteurs de recherche sans exécution '
         'de script, plan de site et données structurées.'),
    ], largeurs=[3.2, 12.3])

    titre2(doc, '2.2. Identification des acteurs')
    para(doc, 'Sept profils interagissent avec le système. Leur périmètre a été défini '
              'métier par métier, et c’est le point le plus discuté de la conception : '
              'ouvrir trop de droits est aussi préjudiciable que d’en fermer trop.')
    tableau(doc, 'Identification des acteurs et de leur périmètre',
            ['Acteur', 'Rôle dans le système'], [
        ('Administrateur', 'Supervise l’ensemble : comptes, rôles, réglages pédagogiques, '
         'accès à toutes les données.'),
        ('Directeur', 'Pilote l’établissement : indicateurs, structure pédagogique, '
         'personnel, dossiers des étudiants.'),
        ('Secrétaire', 'Inscrit les étudiants, tient les dossiers administratifs, encaisse '
         'les frais et délivre les reçus. N’intervient ni sur la structure pédagogique ni '
         'sur les notes.'),
        ('Surveillant', 'Tient les classes, les matières et les unités d’enseignement, '
         'relève les absences et compose l’emploi du temps.'),
        ('Professeur', 'Consulte ses classes et ses matières, saisit ses notes, marque les '
         'absences de ses séances, édite ses listes d’émargement. N’accède ni au bulletin '
         'complet ni au dossier d’un étudiant.'),
        ('Étudiant', 'Consulte ses résultats, ses absences, son emploi du temps et sa '
         'situation financière.'),
        ('Parent', 'Consulte, pour ses enfants, les mêmes informations en lecture seule.'),
    ], largeurs=[3.2, 12.3])

    titre2(doc, '2.3. Diagrammes UML')
    para(doc, 'La modélisation suit le langage UML. Elle porte sur les fonctions '
              'structurantes plutôt que sur l’exhaustivité : représenter chaque écran '
              'produirait des planches illisibles sans rien apprendre de plus.')

    titre3(doc, '2.3.1. Diagrammes de cas d’utilisation')
    para(doc, 'Le premier diagramme donne la vue d’ensemble : quels acteurs interviennent, '
              'et sur quels domaines.')
    figure(doc, FIG / '03-cas-usage-global.png',
           'Cas d’utilisation — vue d’ensemble des sept profils')
    para(doc, 'Deux profils méritent un diagramme propre, parce que leur périmètre a été '
              'volontairement restreint. Celui du professeur, d’abord.')
    figure(doc, FIG / '04-cas-usage-professeur.png',
           'Cas d’utilisation du professeur, et fonctions qui lui sont refusées')
    para(doc, 'Ce point est une décision de conception, non un oubli. Un bulletin porte les '
              'notes de toutes les matières, et une fiche individuelle porte l’adresse, la '
              'situation familiale et la situation financière : rien de cela ne concerne '
              'l’enseignant d’une matière. Il accède à ses classes et saisit ses propres '
              'notes.')
    figure(doc, FIG / '05-cas-usage-secretaire.png',
           'Cas d’utilisation du secrétaire, et fonctions hors de son périmètre')
    para(doc, 'Le secrétariat, symétriquement, gère les inscriptions, les dossiers et la '
              'caisse, mais ni la structure pédagogique ni les notes.')

    titre3(doc, '2.3.2. Description textuelle de cas d’utilisation')
    tableau(doc, 'Description textuelle du cas « Saisir les notes d’une matière »',
            ['Rubrique', 'Contenu'], [
        ('Acteur principal', 'Professeur'),
        ('Objectif', 'Enregistrer, pour tous les étudiants d’une classe, la note de classe '
         'et la note d’examen d’une matière et d’un semestre donnés.'),
        ('Préconditions', 'Le professeur est authentifié ; la matière lui est attribuée ; '
         'la classe compte au moins un étudiant inscrit.'),
        ('Scénario nominal',
         '1. Le professeur choisit la classe, puis la matière, puis le semestre.\n'
         '2. Le système affiche une grille pré-remplie, une ligne par étudiant, avec les '
         'notes déjà saisies.\n'
         '3. Le professeur saisit ou corrige les notes.\n'
         '4. Il enregistre l’ensemble en une fois.\n'
         '5. Le système vérifie que la matière lui appartient, contrôle que chaque note '
         'est comprise entre 0 et 20, puis enregistre.'),
        ('Scénarios alternatifs',
         '4a. Une note est hors bornes : la ligne est signalée, le reste du lot est '
         'enregistré.\n'
         '5a. La matière n’appartient pas au professeur : la requête est refusée par le '
         'serveur, même si l’interface l’avait proposée.'),
        ('Postconditions', 'Les notes sont enregistrées avec l’identité du saisisseur. '
         'Les bulletins qui en dépendent reflètent immédiatement la modification.'),
    ], largeurs=[3.4, 12.1])

    tableau(doc, 'Description textuelle du cas « Enregistrer un paiement »',
            ['Rubrique', 'Contenu'], [
        ('Acteur principal', 'Secrétaire'),
        ('Objectif', 'Encaisser un versement et délivrer un reçu numéroté.'),
        ('Préconditions', 'Le secrétaire est authentifié ; l’étudiant est inscrit et des '
         'frais de scolarité lui sont associés pour l’année en cours.'),
        ('Scénario nominal',
         '1. Le secrétaire recherche l’étudiant et ouvre sa situation financière.\n'
         '2. Le système affiche le montant dû, le total déjà versé et le solde.\n'
         '3. Le secrétaire saisit le montant, la date et le moyen de paiement.\n'
         '4. Le système enregistre le versement et recalcule le solde.\n'
         '5. Le reçu est produit en PDF et un courriel est envoyé à l’étudiant et au '
         'parent.'),
        ('Scénarios alternatifs',
         '3a. Le montant dépasse le solde restant : la saisie est refusée avec un message '
         'explicite.\n'
         '5a. L’envoi du courriel échoue : le paiement reste enregistré et le reçu reste '
         'téléchargeable.'),
        ('Postconditions', 'Le versement est enregistré ; le solde est à jour ; le reçu '
         'porte un numéro unique.'),
    ], largeurs=[3.4, 12.1])

    titre3(doc, '2.3.3. Diagramme de classes')
    para(doc, 'Le modèle est présenté en deux planches. La première réunit le noyau '
              'pédagogique : de la classe à la note.')
    figure(doc, FIG / '06-classes-pedagogie.png',
           'Diagramme de classes — structure pédagogique')
    para(doc, 'La notation « / » devant un attribut signale une donnée calculée. Les '
              'crédits d’une matière se déduisent de son coefficient, et ceux d’une unité '
              'de la somme de ses matières : aucun des deux n’est saisi, ce qui supprime '
              'tout risque de contradiction entre deux sources.')
    figure(doc, FIG / '07-classes-vie-scolaire.png',
           'Diagramme de classes — vie scolaire et comptabilité')
    para(doc, 'Le même principe s’applique à la comptabilité : le montant payé et le solde '
              'se déduisent des versements enregistrés, et ne sont jamais recopiés dans le '
              'dossier de l’étudiant.')

    titre3(doc, '2.3.4. Diagrammes de séquence')
    para(doc, 'Trois enchaînements méritent d’être détaillés : la connexion, la saisie '
              'd’une note et la consultation d’un bulletin.')
    figure(doc, FIG / '08-sequence-authentification.png',
           'Diagramme de séquence — authentification d’un utilisateur')
    para(doc, 'Le mot de passe n’est jamais conservé en clair : seule son empreinte est '
              'stockée, et la comparaison se fait sur cette empreinte. La connexion '
              'délivre deux jetons de portée différente — l’un court, employé à chaque '
              'requête, l’autre plus long, déposé dans un témoin inaccessible au script de '
              'la page.')
    figure(doc, FIG / '09-sequence-saisie-note.png',
           'Diagramme de séquence — saisie assistée des notes')
    para(doc, 'La grille est pré-remplie : le professeur n’a pas à chercher la liste de ses '
              'étudiants ni à retrouver les notes déjà saisies. Le contrôle d’habilitation '
              'est fait par le serveur au moment de l’enregistrement, et non par '
              'l’interface au moment de l’affichage.')
    figure(doc, FIG / '10-sequence-bulletin.png',
           'Diagramme de séquence — consultation d’un bulletin')
    para(doc, 'Ce dernier diagramme illustre le principe posé au chapitre précédent : le '
              'bulletin est assemblé à la demande, à partir des notes et des unités '
              'd’enseignement, par un service de calcul qui ne touche pas à la base.')

    titre3(doc, '2.3.5. Diagramme d’activité')
    figure(doc, FIG / '11-activite-inscription.png',
           'Diagramme d’activité — de l’inscription au reçu de paiement')
    para(doc, 'Le parcours part de la saisie du dossier et aboutit, selon que le versement '
              'a été reçu ou non, soit à l’édition d’un reçu et à l’envoi d’un courriel, '
              'soit à l’inscription au suivi des impayés.')

    titre3(doc, '2.3.6. Architecture et déploiement')
    para(doc, 'L’application est organisée en trois couches nettement séparées.')
    figure(doc, FIG / '01-architecture.png', 'Architecture logique en trois couches')
    para(doc, 'La couche de présentation s’exécute dans le navigateur. La couche métier '
              'reçoit les requêtes, vérifie les droits, applique les règles et produit les '
              'documents. La couche de données conserve l’information. Les services de '
              'calcul y figurent à part : ce sont les modules purs évoqués en introduction.')
    figure(doc, FIG / '02-deploiement.png', 'Diagramme de déploiement')
    para(doc, 'Le site public et l’application sont servis par un hébergeur spécialisé dans '
              'la diffusion de fichiers ; l’API tourne sur un hébergeur applicatif ; la '
              'base est une grappe répliquée avec sauvegardes automatiques. Chaque envoi de '
              'code sur le dépôt déclenche un nouveau déploiement.')

    titre2(doc, '2.4. Conception de la base de données')
    para(doc, 'La base retenue est orientée documents. Ce choix s’explique par la nature '
              'des données : un dossier d’étudiant comporte des sous-ensembles facultatifs '
              '— informations de scolarité pour un étudiant, informations d’emploi pour un '
              'membre du personnel — que l’on décrit naturellement comme des documents '
              'imbriqués.')
    para(doc, 'Dix-huit collections composent la base. Les relations entre elles sont '
              'exprimées par des références, et des index sont posés sur les champs qui '
              'servent à filtrer : le rôle d’un compte, la classe d’une matière, le '
              'semestre d’une note.')
    tableau(doc, 'Principales collections de la base de données',
            ['Collection', 'Contenu', 'Contraintes notables'], [
        ('users', 'Tous les comptes, quel que soit le rôle', 'Matricule et adresse '
         'électronique uniques ; mot de passe haché ; rôle obligatoire'),
        ('classes', 'Classes par niveau, filière et année', 'Nom unique par année '
         'scolaire'),
        ('matieres', 'Matières, coefficient, type, enseignant', 'Crédits déduits du '
         'coefficient par le modèle lui-même'),
        ('ues', 'Unités d’enseignement d’un semestre', 'Code unique par classe et par '
         'année ; matières rattachées par référence'),
        ('notematieres', 'Note de classe et note d’examen', 'Une seule note par étudiant, '
         'matière, semestre et année'),
        ('absences', 'Absences et retards', 'Rattachées à un étudiant et à une séance'),
        ('creneaus', 'Créneaux de l’emploi du temps', 'Contrôle des conflits de salle et '
         'd’enseignant'),
        ('fraisscolarites', 'Frais dus par étudiant et par année', 'Montant payé et solde '
         'jamais stockés'),
        ('paiements', 'Versements encaissés', 'Numéro de reçu unique'),
        ('typematieres', 'Typologie administrable des matières', 'Code unique'),
        ('affinitetypes', 'Affinités entre types de matières', 'Matrice symétrique : le '
         'couple est ordonné avant enregistrement'),
        ('parametrepedagogiques', 'Réglages de notation et de crédits', 'Document unique ; '
         'validation appliquée même en modification directe'),
    ], largeurs=[3.6, 6.2, 5.7])

    titre2(doc, '2.5. Règles de gestion pédagogique')
    para(doc, 'Cette section expose la partie la plus spécifique de la conception. Elle '
              'traduit en règles calculables ce que le système LMD énonce en principes.')

    titre3(doc, '2.5.1. Calcul de la moyenne d’une matière')
    para(doc, 'La moyenne d’une matière combine deux notes seulement : une note de classe, '
              'qui résume le travail du semestre, et une note d’examen. L’examen pèse deux '
              'fois plus que la classe :')
    para(doc, 'moyenne de la matière = (note de classe + 2 × note d’examen) ÷ 3',
         gras=True, alignement=CENTRE, espace_avant=6)
    para(doc, 'Cette pondération n’est pas écrite dans le code : elle est enregistrée comme '
              'un réglage modifiable depuis l’application. Si l’établissement décide un '
              'jour d’un autre équilibre, il suffit de changer deux nombres, et tous les '
              'bulletins suivent.')

    titre3(doc, '2.5.2. Crédits et unités d’enseignement')
    para(doc, 'Le crédit d’une matière se déduit de son coefficient : une matière dont le '
              'coefficient atteint 3 vaut 3 crédits, sinon elle en vaut 2. Le crédit n’est '
              'donc jamais saisi à la main — c’est une conséquence du poids pédagogique, et '
              'deux sources de vérité finiraient par diverger.')
    para(doc, 'Les unités d’enseignement sont formées de paires de matières de même valeur. '
              'Une unité vaut donc 4 crédits (2 + 2) ou 6 crédits (3 + 3). Comme un '
              'semestre doit totaliser exactement 30 crédits, seules trois répartitions '
              'sont possibles.')
    tableau(doc, 'Les trois répartitions qui bouclent un semestre à 30 crédits',
            ['Matières à 2 crédits', 'Matières à 3 crédits', 'Total des matières',
             'Unités à 4 cr.', 'Unités à 6 cr.'], [
        ('0', '10', '10', '0', '5'),
        ('6', '6', '12', '3', '3'),
        ('12', '2', '14', '6', '1'),
    ], largeurs=[3.2, 3.2, 3.2, 3.0, 2.9])
    para(doc, 'Ce tableau n’a pas été dressé à la main : il est calculé par le programme à '
              'partir des contraintes. Si l’établissement modifiait un jour le total du '
              'semestre, la liste resterait juste.')
    para(doc, 'L’intérêt pratique est l’anticipation. Le système ne se contente pas de '
              'refuser le dépassement de trente crédits : il signale dès qu’aucune '
              'répartition ne reste atteignable. Une saisie peut être bloquée bien avant '
              'le plafond — une matière à 2 crédits accompagnée de sept à 3 crédits n’en '
              'totalise que 23, et pourtant plus rien ne peut la sauver, puisque toute '
              'répartition comportant un nombre impair de matières à 2 crédits est exclue. '
              'Avertir à ce moment-là évite de découvrir l’impasse en fin de semestre.')

    titre3(doc, '2.5.3. Regroupement automatique des matières')
    para(doc, 'Reste à décider quelles matières associer. Les rapprocher au hasard '
              'produirait des unités incohérentes — « Algorithmique et Droit » n’a guère de '
              'sens. Chaque matière reçoit donc un type, et une matrice d’affinité indique '
              'à quel point deux types vont ensemble. Types et affinités sont '
              'administrables : ce sont des choix pédagogiques, pas des constantes '
              'techniques.')
    para(doc, 'Le problème devient alors classique : former des paires en maximisant la '
              'somme des affinités. Le programme en cherche la meilleure solution, et non '
              'une solution acceptable trouvée de proche en proche.')
    figure(doc, FIG / '12-appariement.png',
           'Constitution automatique des unités d’enseignement d’un semestre')
    para(doc, 'Le résultat reste modifiable : le regroupement proposé peut être repris à la '
              'main si l’équipe pédagogique en décide autrement. L’automatisme fait gagner '
              'du temps, il ne confisque pas la décision.')

    titre3(doc, '2.5.4. Validation et compensation')
    para(doc, 'La validation se joue au niveau de l’unité d’enseignement, et non de la '
              'matière isolée. Une unité est acquise si sa moyenne atteint 10 sur 20 : une '
              'matière faible peut donc être compensée par l’autre matière de l’unité. Les '
              'crédits sont attribués intégralement ou pas du tout — il n’existe pas de '
              'demi-crédit. La moyenne générale du semestre est la moyenne des unités, '
              'pondérée par leurs crédits.')

    titre2(doc, '2.6. Planification du projet')
    para(doc, 'Le projet s’est déroulé sur six mois, selon le calendrier suivant.')
    figure(doc, FIG / '13-planning.png', 'Planning prévisionnel du projet')
    para(doc, 'Le développement a été conduit par modules successifs, chacun éprouvé avant '
              'l’ouverture du suivant. La rédaction du mémoire a été menée en parallèle des '
              'derniers développements, pour que les choix soient consignés pendant qu’ils '
              'étaient encore frais.')

    titre2(doc, 'Conclusion')
    para(doc, 'Ce chapitre a posé les fondations de la solution : besoins recensés, acteurs '
              'identifiés et périmètres arbitrés, modèles UML établis, base de données '
              'conçue, et règles pédagogiques traduites en calculs vérifiables. Ces règles '
              'constituent l’apport le plus spécifique du travail : elles transforment des '
              'principes énoncés en toutes lettres par le LMD en contraintes que le système '
              'sait faire respecter. Le chapitre suivant présente la réalisation.')


# ==========================================================================
# CHAPITRE 3
# ==========================================================================
def chapitre3(doc):
    titre1(doc, 'Chapitre 3 : Réalisation de la solution')

    titre2(doc, 'Introduction')
    para(doc, 'Ce chapitre présente la mise en œuvre : l’environnement et les technologies '
              'employés, les interfaces obtenues, les mécanismes de sécurité, la campagne '
              'de tests, la mise en ligne, puis les difficultés rencontrées et les '
              'perspectives.')

    titre2(doc, '3.1. Environnement technique')
    para(doc, 'Le développement a été mené sur des ordinateurs portables sous Windows 11, '
              'avec l’éditeur Visual Studio Code. Le code est versionné avec Git et hébergé '
              'sur un dépôt GitHub partagé, ce qui a permis de travailler à plusieurs sur '
              'la même base et de revenir en arrière lorsqu’une piste s’avérait mauvaise. '
              'La base de données a été exploitée localement pendant le développement, puis '
              'sur une grappe hébergée pour la mise en ligne.')

    titre2(doc, '3.2. Choix technologiques')
    para(doc, 'Les technologies ont été retenues pour trois raisons : un langage unique de '
              'bout en bout, une documentation abondante, et un hébergement accessible sans '
              'infrastructure propre.')
    tableau(doc, 'Technologies employées et raisons du choix',
            ['Élément', 'Technologie', 'Raison du choix'], [
        ('Interface', 'React 19', 'Découpage en composants réutilisables ; mise à jour de '
         'l’affichage sans recharger la page.'),
        ('Outil de construction', 'Vite 7', 'Démarrage immédiat pendant le développement ; '
         'production de fichiers optimisés pour la mise en ligne.'),
        ('Mise en forme', 'TailwindCSS 4', 'Charte graphique centralisée ; cohérence '
         'visuelle sans feuilles de style dispersées.'),
        ('Serveur', 'Node.js et Express 5', 'Même langage que l’interface, donc un seul '
         'langage à maîtriser pour toute l’équipe.'),
        ('Base de données', 'MongoDB et Mongoose 8', 'Documents imbriqués adaptés aux '
         'dossiers ; validation déclarée au niveau du modèle.'),
        ('Authentification', 'JWT et bcrypt', 'Jetons signés vérifiables sans consulter la '
         'base ; mots de passe stockés sous forme d’empreinte irréversible.'),
        ('Documents', 'PDFKit', 'Production des bulletins, reçus et listes d’émargement '
         'directement par le serveur, sans logiciel intermédiaire.'),
        ('Courriels', 'Resend', 'Envoi depuis le domaine de l’établissement, avec suivi des '
         'échecs de distribution.'),
        ('Modélisation', 'Diagrammes produits par programme', 'Figures régénérées à '
         'l’identique après chaque correction du modèle.'),
    ], largeurs=[3.2, 4.0, 8.3])

    titre2(doc, '3.3. Présentation des interfaces')
    para(doc, 'Cette section présente les principaux écrans de la plateforme, dans l’ordre '
              'du parcours d’un utilisateur.')

    titre3(doc, '3.3.1. Partie publique du site')
    figure(doc, CAP / '01-accueil.png', 'Page d’accueil publique')
    para(doc, 'La page d’accueil présente l’établissement, ses chiffres clés et ses '
              'formations. Elle est composée à l’avance sous forme de pages complètes : son '
              'contenu est donc lisible par un moteur de recherche sans qu’aucun script ne '
              's’exécute.')
    figure(doc, CAP / '02-formations.png', 'Page de présentation des formations')
    figure(doc, CAP / '03-admissions.png', 'Page Admissions : pièces du dossier et tarifs')

    titre3(doc, '3.3.2. Connexion et tableau de bord')
    figure(doc, CAP / '04-connexion.png', 'Page de connexion')
    para(doc, 'L’accès à l’espace privé exige une authentification. Le nombre de tentatives '
              'est limité, et un lien permet de recevoir par courriel un message de '
              'réinitialisation du mot de passe.')
    figure(doc, CAP / '05-tableau-bord-admin.png', 'Tableau de bord de l’administrateur')
    para(doc, 'Chaque rôle dispose de son propre tableau de bord. Celui de '
              'l’administrateur rassemble les effectifs, l’état des encaissements et les '
              'alertes ; celui d’un professeur affiche ses classes et ses prochaines '
              'séances.')

    titre3(doc, '3.3.3. Comptes et dossiers')
    figure(doc, CAP / '06-utilisateurs.png', 'Gestion des comptes et des habilitations')
    figure(doc, CAP / '07-etudiants.png', 'Liste des étudiants')
    figure(doc, CAP / '08-fiche-etudiant.png', 'Fiche individuelle d’un étudiant')
    para(doc, 'La fiche réunit l’identité, la classe, la famille, les résultats et la '
              'situation financière. Elle n’est accessible qu’aux profils habilités : '
              'administrateur, directeur, secrétaire et surveillant.')

    titre3(doc, '3.3.4. Structure pédagogique')
    figure(doc, CAP / '09-classes.png', 'Gestion des classes')
    figure(doc, CAP / '10-matieres.png', 'Gestion des matières')
    figure(doc, CAP / '11-unites-enseignement.png',
           'Constitution des unités d’enseignement, avec suivi des crédits')
    para(doc, 'Cet écran applique les règles exposées au chapitre 2. Le compteur de crédits '
              'du semestre est visible en permanence, et le système avertit dès qu’une '
              'répartition à trente crédits devient impossible.')

    titre3(doc, '3.3.5. Notes, bulletins et absences')
    figure(doc, CAP / '12-saisie-notes.png', 'Grille de saisie des notes')
    para(doc, 'La saisie se fait par sélections successives — classe, puis matière, puis '
              'semestre — et aboutit à une grille pré-remplie comportant une ligne par '
              'étudiant. Le professeur saisit les deux notes et enregistre l’ensemble en '
              'une seule fois.')
    figure(doc, CAP / '13-bulletin.png', 'Bulletin officiel au format PDF')
    para(doc, 'Le bulletin est composé en format paysage. Il présente les matières groupées '
              'par unité d’enseignement, la moyenne de chaque unité, les crédits acquis, la '
              'moyenne générale, la mention et le rang. Aucune de ces valeurs n’est '
              'conservée en base : elles sont recalculées à chaque édition.')
    figure(doc, CAP / '14-absences.png', 'Suivi des absences')

    titre3(doc, '3.3.6. Scolarité et documents')
    figure(doc, CAP / '15-paiements.png', 'Encaissement et suivi de la scolarité')
    figure(doc, CAP / '16-recu.png', 'Reçu de paiement au format PDF')
    figure(doc, CAP / '17-emargement.png', 'Liste d’émargement imprimable')
    para(doc, 'La liste d’émargement est produite pour une séance donnée : elle porte les '
              'noms des étudiants inscrits, une colonne de signature, et l’en-tête de '
              'l’établissement. Elle remplace les feuilles recopiées à la main.')

    titre3(doc, '3.3.7. Planning, statistiques et espaces personnels')
    figure(doc, CAP / '18-planning.png', 'Emploi du temps')
    figure(doc, CAP / '19-statistiques.png', 'Tableau de bord statistique')
    figure(doc, CAP / '20-espace-parent.png', 'Espace parental')
    para(doc, 'L’espace parental a été volontairement réduit à une page unique : un parent '
              'ne cherche pas à naviguer, il veut voir en un coup d’œil les résultats, les '
              'absences et la situation financière de son enfant.')
    figure(doc, CAP / '21-espace-etudiant.png', 'Espace étudiant')

    titre2(doc, '3.4. Sécurité et contrôle d’accès')
    para(doc, 'La sécurité repose sur plusieurs mécanismes qui se complètent.')
    puces(doc, [
        ('Mots de passe. ', 'Ils ne sont jamais conservés en clair ni renvoyés par l’API. '
         'Seule une empreinte irréversible est stockée ; la vérification compare les '
         'empreintes.'),
        ('Jetons de session. ', 'La connexion délivre un jeton d’accès de courte durée, '
         'employé à chaque requête, et un jeton de renouvellement déposé dans un témoin '
         'inaccessible au script de la page. La déconnexion révoque effectivement ce '
         'second jeton.'),
        ('Contrôle par rôles. ', 'Les droits sont vérifiés côté serveur à chaque requête. '
         'L’interface masque les actions non autorisées, mais c’est le serveur qui refuse : '
         'une requête forgée hors de l’application est rejetée de la même façon.'),
        ('Cloisonnement des données. ', 'Un professeur ne voit que ses propres matières ; '
         'un étudiant que son propre dossier ; un parent que celui de ses enfants. Ce '
         'filtre est appliqué à la requête, et non après coup à l’affichage.'),
        ('Limitation des tentatives. ', 'Le nombre d’essais de connexion est plafonné, ce '
         'qui rend impraticable la recherche d’un mot de passe par essais successifs.'),
        ('Validation des données. ', 'Chaque valeur reçue est contrôlée avant '
         'enregistrement : bornes des notes, unicité des matricules, cohérence des dates. '
         'Ces contrôles sont déclarés au niveau du modèle, donc appliqués quel que soit le '
         'chemin emprunté pour écrire en base.'),
    ])

    titre2(doc, '3.5. Tests de l’application')

    titre3(doc, '3.5.1. Démarche de test')
    para(doc, 'La validation s’est appuyée sur une campagne de tests automatisés, écrits au '
              'fil du développement et rejoués entièrement après chaque modification '
              'importante. Ils couvrent trois niveaux : les règles de calcul prises '
              'isolément, les enchaînements métier complets, et les refus attendus.')
    para(doc, 'Deux partis pris méritent d’être signalés. Le premier est que les règles de '
              'calcul, écrites dans des modules sans dépendance, peuvent être éprouvées sur '
              'des situations qu’on ne saurait pas fabriquer commodément en base : un '
              'semestre dont la répartition est devenue impossible, une unité dont les deux '
              'matières se compensent exactement.')
    para(doc, 'Le second est l’emploi de tests dits « par mutation ». Plutôt que de se '
              'contenter de vérifier qu’une règle est respectée, on la casse '
              'volontairement et l’on s’assure que le résultat change. Un test qui reste '
              'vert alors que la règle a été supprimée ne prouve rien ; cette vérification '
              'inverse a effectivement révélé des contrôles qui ne contrôlaient rien.')
    para(doc, 'La campagne compte 337 vérifications réparties en huit suites.')
    tableau(doc, 'Répartition des vérifications automatisées',
            ['Suite', 'Domaine couvert', 'Vérifications'], [
        ('1', 'Authentification, jetons et rôles', '15'),
        ('2', 'Comptes, étudiants et classes', '47'),
        ('3', 'Notes, examens et absences', '74'),
        ('4', 'Comptabilité, paiements et reçus', '46'),
        ('5', 'Emploi du temps et statistiques', '34'),
        ('6', 'Charte graphique, courriels et documents', '64'),
        ('7', 'Notation, unités d’enseignement et crédits', '18'),
        ('8', 'Crédits, types de matières et appariement', '39'),
        ('', 'Total', '337'),
    ], largeurs=[2.0, 9.5, 4.0])

    titre3(doc, '3.5.2. Tableau de validation des fonctionnalités')
    para(doc, 'Le tableau ci-dessous résume les principaux scénarios éprouvés. Le cahier '
              'complet figure en annexe B.')
    tableau(doc, 'Extrait du tableau de validation des fonctionnalités',
            ['N°', 'Fonctionnalité testée', 'Résultat attendu', 'État'], [
        ('T1', 'Connexion avec des identifiants valides',
         'Accès au tableau de bord correspondant au rôle', 'Validé'),
        ('T2', 'Connexion avec un mot de passe erroné',
         'Refus, sans indiquer lequel des deux champs est faux', 'Validé'),
        ('T3', 'Déconnexion', 'Le jeton de renouvellement est révoqué', 'Validé'),
        ('T4', 'Inscription d’un étudiant',
         'Compte créé, matricule attribué automatiquement', 'Validé'),
        ('T5', 'Saisie d’une note hors bornes',
         'Refus avec message ; le reste du lot est enregistré', 'Validé'),
        ('T6', 'Saisie sur la matière d’un autre professeur',
         'Refus opposé par le serveur', 'Validé'),
        ('T7', 'Professeur demandant un bulletin complet',
         'Accès refusé', 'Validé'),
        ('T8', 'Correction d’une note après édition du bulletin',
         'Le bulletin suivant reflète la correction', 'Validé'),
        ('T9', 'Unité d’enseignement dépassant 30 crédits',
         'Ajout refusé avec explication', 'Validé'),
        ('T10', 'Répartition devenue impossible à boucler',
         'Alerte émise avant d’atteindre le plafond', 'Validé'),
        ('T11', 'Compensation à l’intérieur d’une unité',
         'Unité acquise, crédits attribués intégralement', 'Validé'),
        ('T12', 'Paiement supérieur au solde restant',
         'Refus avec message explicite', 'Validé'),
        ('T13', 'Enregistrement d’un versement',
         'Solde recalculé, reçu numéroté produit', 'Validé'),
        ('T14', 'Conflit de salle dans l’emploi du temps',
         'Créneau refusé, conflit signalé', 'Validé'),
        ('T15', 'Parent consultant un enfant qui n’est pas le sien',
         'Accès refusé', 'Validé'),
    ], largeurs=[1.2, 5.0, 7.0, 2.3])

    titre3(doc, '3.5.3. Évaluation des performances')
    para(doc, 'Les temps de réponse ont été mesurés sur un jeu de données représentatif. '
              'Les opérations courantes — affichage d’une liste, recherche, enregistrement '
              'd’un formulaire — restent sous la seconde. La production d’un document PDF '
              'demande moins de deux secondes. Les listes volumineuses sont paginées et '
              'les champs interrogés sont indexés, de sorte que le temps de réponse ne se '
              'dégrade pas quand les effectifs augmentent.')

    titre2(doc, '3.6. Mise en ligne et visibilité')
    para(doc, 'La plateforme est déployée et accessible publiquement. Le site et '
              'l’application sont servis depuis un nom de domaine propre à l’établissement, '
              'et l’API depuis un sous-domaine dédié. Les échanges sont chiffrés de bout en '
              'bout.')
    para(doc, 'Un soin particulier a été porté à la visibilité de la partie publique. Les '
              'pages sont composées à l’avance, ce qui les rend lisibles sans exécution de '
              'script ; un plan de site et un fichier d’instructions destiné aux robots '
              'sont produits automatiquement à chaque construction ; les informations de '
              'l’établissement — adresse, coordonnées, formations, reconnaissances — sont '
              'exprimées sous une forme structurée que les moteurs de recherche savent '
              'interpréter. Un résumé factuel est également publié à l’intention des '
              'moteurs de réponse générative, de plus en plus utilisés pour ce type de '
              'recherche.')

    titre2(doc, '3.7. Difficultés rencontrées')
    para(doc, 'La réalisation a rencontré des obstacles d’ordre technique, méthodologique '
              'et organisationnel.')
    puces(doc, [
        ('Difficultés techniques. ', 'La séparation du site et de l’API sur deux '
         'hébergements distincts a posé un problème de session que rien ne signalait : les '
         'témoins de connexion étaient bien déposés, mais le navigateur refusait de les '
         'renvoyer parce que les deux adresses n’étaient pas considérées comme un même '
         'site. Le symptôme — une déconnexion apparemment aléatoire — était très éloigné '
         'de la cause.'),
        ('Cohérence des règles. ', 'Le regroupement automatique des matières a d’abord '
         'semblé fonctionner alors qu’il ne s’appuyait sur rien : le champ décrivant le '
         'type d’une matière ne portait pas le nom attendu, et toutes les matières '
         'retombaient silencieusement sur un appariement par défaut. Seule une '
         'vérification portant sur des données réelles l’a mis au jour.'),
        ('Difficultés méthodologiques. ', 'Certains besoins exprimés oralement se sont '
         'révélés contradictoires une fois écrits. La matrice d’affinité entre types de '
         'matières, notamment, comportait sept couples déclarés dans un sens et dans '
         'l’autre avec des valeurs différentes ; il a fallu trancher chacun.'),
        ('Difficultés organisationnelles. ', 'Mener ce projet en parallèle des autres '
         'enseignements a exigé une discipline de planification, et le travail à plusieurs '
         'sur une même base de code a supposé des conventions communes.'),
    ])

    titre2(doc, '3.8. Perspectives d’amélioration')
    puces(doc, [
        'notification par message court des résultats et des échéances de paiement, la '
        'couverture téléphonique étant plus répandue que l’accès à une boîte électronique ;',
        'application mobile compagnon pour les étudiants et les parents, fonctionnant '
        'partiellement hors connexion ;',
        'reprise automatisée des archives des années précédentes, aujourd’hui sur support '
        'papier ;',
        'module d’aide à la décision pour la direction : suivi des taux de réussite par '
        'filière et par matière, détection précoce des décrochages ;',
        'délivrance d’attestations et de relevés de notes signés numériquement, vérifiables '
        'par un tiers ;',
        'extension à la gestion des ressources humaines : contrats, services d’enseignement '
        'et rémunérations.',
    ])

    titre2(doc, 'Conclusion')
    para(doc, 'Ce chapitre a présenté une application complète, sécurisée, éprouvée par '
              '337 vérifications automatisées et effectivement mise en ligne. Les '
              'difficultés rencontrées ont été de deux natures : des erreurs techniques '
              'dont le symptôme était éloigné de la cause, et des besoins dont la '
              'contradiction n’est apparue qu’à l’écriture. Les unes comme les autres ont '
              'été instructives.')


# ==========================================================================
# CONCLUSION GENERALE
# ==========================================================================
def conclusion(doc):
    titre1(doc, 'Conclusion générale')

    para(doc, 'Ce projet tutoré est parti d’un problème concret et largement répandu dans '
              'les établissements privés d’enseignement supérieur : une information '
              'dispersée entre des supports qui ne communiquent pas, d’où des lenteurs, '
              'des erreurs de recopie, une traçabilité inexistante et l’impossibilité, pour '
              'une famille, de consulter une situation sans se déplacer.')
    para(doc, 'Partant du cas de TechnoLAB-ISTA, nous avons conçu et réalisé une plateforme '
              'web couvrant le parcours complet d’un étudiant : inscription et dossier '
              'administratif, classes, matières et unités d’enseignement, saisie des notes '
              'et édition des bulletins, absences, emploi du temps, frais de scolarité et '
              'reçus, espaces personnels pour les étudiants et leurs familles.')
    para(doc, 'La démarche a suivi les étapes de l’ingénierie des systèmes d’information : '
              'étude de l’existant, formalisation des besoins, modélisation UML, conception '
              'de la base de données, développement incrémental, puis tests, déploiement et '
              'mise en ligne. Les résultats sont conformes aux objectifs fixés : '
              'l’application fonctionne, distingue sept profils métier, produit ses '
              'documents officiels au format PDF et est accessible en ligne.')
    para(doc, 'Deux apports nous paraissent mériter d’être soulignés, parce qu’ils '
              'dépassent la simple informatisation de procédures existantes.')
    puces(doc, [
        ('Le calcul plutôt que le stockage. ', 'Aucun résultat dérivé n’est conservé : ni '
         'moyenne, ni total de crédits, ni solde. Tous sont reconstitués à la demande. '
         'Cette décision, prise tôt, supprime une catégorie entière de défauts — celle des '
         'documents qui contredisent les données dont ils sont censés découler.'),
        ('La traduction des règles LMD en contraintes vérifiables. ', 'Le calcul '
         'automatique des crédits, l’énumération des seules répartitions qui bouclent un '
         'semestre à trente, l’avertissement émis dès qu’aucune ne reste atteignable et le '
         'regroupement des matières par affinité transforment en garde-fous des principes '
         'jusque-là tenus de tête.'),
    ])
    para(doc, 'Le travail comporte aussi des limites, qui dessinent la suite. Les archives '
              'des années antérieures restent à reprendre. La notification par message '
              'court, plus adaptée au contexte que le courriel, n’est pas encore en place. '
              'Une application mobile et un module d’aide à la décision restent à '
              'construire. Enfin, l’appropriation par les équipes suppose un accompagnement '
              'qui dépasse le cadre de ce projet.')
    para(doc, 'Au-delà du logiciel produit, ce projet nous a permis de mettre en œuvre '
              'l’ensemble des compétences de la formation sur un cas réel, avec ses '
              'contraintes propres et ses arbitrages. Il nous a surtout appris qu’un '
              'système d’information ne se juge pas à ce qu’il permet de faire, mais à ce '
              'qu’il empêche de faire de travers.')


# ==========================================================================
# REFERENCES
# ==========================================================================
def references(doc):
    titre1(doc, 'Références bibliographiques')
    for ligne in [
        'Banks, A. et Porcello, E. (2020). Learning React: Modern Patterns for Developing '
        'React Apps (2ᵉ éd.). O’Reilly Media.',
        'Booch, G., Rumbaugh, J. et Jacobson, I. (2005). The Unified Modeling Language User '
        'Guide (2ᵉ éd.). Addison-Wesley.',
        'Bradshaw, S., Brazil, E. et Chodorow, K. (2019). MongoDB: The Definitive Guide '
        '(3ᵉ éd.). O’Reilly Media.',
        'Commission européenne. (2015). Guide d’utilisation ECTS. Office des publications '
        'de l’Union européenne.',
        'Fowler, M. (2018). Refactoring: Improving the Design of Existing Code (2ᵉ éd.). '
        'Addison-Wesley.',
        'Fowler, M. et Scott, K. (2004). UML Distilled: A Brief Guide to the Standard '
        'Object Modeling Language (3ᵉ éd.). Addison-Wesley.',
        'Jones, M., Bradley, J. et Sakimura, N. (2015). JSON Web Token (JWT), RFC 7519. '
        'Internet Engineering Task Force.',
        'Kuhn, H. W. (1955). The Hungarian Method for the Assignment Problem. Naval '
        'Research Logistics Quarterly, 2(1-2), 83-97.',
        'Ministère de l’Enseignement Supérieur et de la Recherche Scientifique. (s.d.). '
        'Textes relatifs à l’organisation du système Licence-Master-Doctorat. République '
        'du Mali.',
        'Provos, N. et Mazières, D. (1999). A Future-Adaptable Password Scheme. Actes de la '
        'conférence USENIX Annual Technical Conference.',
        'Roques, P. (2018). UML 2 par la pratique : études de cas et exercices corrigés '
        '(8ᵉ éd.). Eyrolles.',
        'TechnoLAB-ISTA. (s.d.). Guide de rédaction du Projet Tutoré de fin de cycle. '
        'Document interne.',
    ]:
        p = para(doc, ligne, interligne=1.15)
        p.paragraph_format.left_indent = Cm(1.0)
        p.paragraph_format.first_line_indent = Cm(-1.0)
        p.paragraph_format.space_after = Pt(8)


# ==========================================================================
# ANNEXES
# ==========================================================================
def annexes(doc):
    titre1(doc, 'Annexes')

    titre2(doc, 'Annexe A — Besoins fonctionnels détaillés')
    tableau(doc, 'Besoins fonctionnels détaillés',
            ['N°', 'Besoin fonctionnel', 'Description détaillée'], [
        ('BF1', 'Authentifier les utilisateurs', 'Connexion par adresse électronique et '
         'mot de passe ; empreinte irréversible du mot de passe ; limitation des tentatives ; '
         'réinitialisation par courriel ; déconnexion révoquant le jeton.'),
        ('BF2', 'Gérer les comptes et les rôles', 'Créer, modifier, activer et désactiver '
         'un compte ; attribuer un rôle parmi sept ; respecter la délégation : le '
         'secrétariat gère les étudiants et les parents, la direction gère le personnel, '
         'seul un administrateur agit sur un administrateur.'),
        ('BF3', 'Gérer les étudiants', 'Dossier complet : identité, date et lieu de '
         'naissance, nationalité, coordonnées, famille, classe, année d’inscription, '
         'statut ; matricule généré automatiquement selon le rôle ; fiche d’inscription '
         'en PDF.'),
        ('BF4', 'Gérer les classes', 'Création par niveau (DUT1 à M2), filière et année '
         'scolaire ; capacité ; professeur principal ; activation et désactivation.'),
        ('BF5', 'Gérer les matières', 'Code, intitulé, coefficient de 1 à 10, type, '
         'semestre, enseignant responsable, classe de rattachement ; crédits déduits '
         'automatiquement du coefficient.'),
        ('BF6', 'Gérer les unités d’enseignement', 'Constitution automatique par affinité '
         'entre types, ou à la main ; contrôle permanent du total de trente crédits ; '
         'avertissement dès qu’aucune répartition ne reste atteignable.'),
        ('BF7', 'Administrer les règles pédagogiques', 'Pondération entre note de classe '
         'et note d’examen ; seuil de validation ; nombre de crédits par semestre ; '
         'typologie des matières ; matrice d’affinité symétrique.'),
        ('BF8', 'Saisir les notes', 'Sélection en cascade de la classe, de la matière et '
         'du semestre ; grille pré-remplie ; enregistrement par lot ; appréciation ; '
         'publication contrôlée ; identité du saisisseur conservée.'),
        ('BF9', 'Éditer les bulletins', 'Bulletin officiel en format paysage : matières '
         'groupées par unité, moyenne par unité, crédits acquis, moyenne générale, '
         'mention, rang et effectif ; recalculé à chaque édition.'),
        ('BF10', 'Suivre les absences', 'Relevé par séance ; distinction entre absence et '
         'retard ; justification ; consolidation par étudiant, par classe et par matière.'),
        ('BF11', 'Gérer la scolarité', 'Frais par classe et par année ; échéances ; '
         'encaissements de plusieurs natures ; montant payé et solde toujours calculés ; '
         'reçu numéroté en PDF ; suivi des impayés.'),
        ('BF12', 'Gérer l’emploi du temps', 'Créneaux par classe, matière, enseignant et '
         'salle ; détection des conflits ; liste d’émargement imprimable par séance.'),
        ('BF13', 'Piloter l’établissement', 'Effectifs par classe et par filière ; '
         'répartition par sexe et par niveau ; taux de réussite ; état des encaissements.'),
        ('BF14', 'Informer les utilisateurs', 'Notifications internes lors de la '
         'publication des notes et des événements importants ; courriels envoyés depuis le '
         'domaine de l’établissement.'),
        ('BF15', 'Présenter l’établissement au public', 'Pages publiques composées à '
         'l’avance : formations, admissions, tarifs, contact ; plan de site et données '
         'structurées produits automatiquement.'),
    ], largeurs=[1.2, 3.8, 10.5])

    titre2(doc, 'Annexe B — Cahier de tests détaillé')
    tableau(doc, 'Cahier de tests détaillé',
            ['N°', 'Domaine', 'Scénario', 'Résultat attendu', 'État'], [
        ('T1', 'Authentification', 'Connexion valide pour chacun des sept rôles',
         'Accès au tableau de bord du rôle', 'Validé'),
        ('T2', 'Authentification', 'Mot de passe erroné',
         'Refus sans indiquer le champ fautif', 'Validé'),
        ('T3', 'Authentification', 'Tentatives répétées',
         'Blocage temporaire au-delà du seuil', 'Validé'),
        ('T4', 'Authentification', 'Déconnexion', 'Jeton de renouvellement révoqué', 'Validé'),
        ('T5', 'Comptes', 'Secrétaire créant un compte de professeur',
         'Refus : hors de sa délégation', 'Validé'),
        ('T6', 'Comptes', 'Adresse électronique déjà utilisée', 'Création refusée', 'Validé'),
        ('T7', 'Étudiants', 'Inscription', 'Matricule attribué automatiquement', 'Validé'),
        ('T8', 'Étudiants', 'Professeur ouvrant une fiche individuelle',
         'Accès refusé par le serveur', 'Validé'),
        ('T9', 'Matières', 'Coefficient porté à 3', 'Crédits passant de 2 à 3', 'Validé'),
        ('T10', 'Matières', 'Modification directe contournant le formulaire',
         'Validation appliquée malgré tout', 'Validé'),
        ('T11', 'Unités', 'Ajout dépassant 30 crédits', 'Refus expliqué', 'Validé'),
        ('T12', 'Unités', 'Une matière à 2 crédits et sept à 3',
         'Impasse signalée avant le plafond', 'Validé'),
        ('T13', 'Unités', 'Regroupement automatique', 'Paires de meilleure affinité', 'Validé'),
        ('T14', 'Notes', 'Note hors de l’intervalle 0-20',
         'Ligne refusée, lot enregistré', 'Validé'),
        ('T15', 'Notes', 'Saisie sur la matière d’un autre professeur',
         'Refus du serveur', 'Validé'),
        ('T16', 'Notes', 'Une seule des deux notes saisie',
         'Enregistrement accepté, moyenne différée', 'Validé'),
        ('T17', 'Bulletins', 'Correction d’une note après édition',
         'Bulletin suivant corrigé', 'Validé'),
        ('T18', 'Bulletins', 'Compensation à l’intérieur d’une unité',
         'Unité acquise, crédits attribués en totalité', 'Validé'),
        ('T19', 'Bulletins', 'Professeur demandant un bulletin complet', 'Accès refusé', 'Validé'),
        ('T20', 'Absences', 'Justification tardive', 'Statut mis à jour, historique conservé', 'Validé'),
        ('T21', 'Comptabilité', 'Versement supérieur au solde', 'Refus expliqué', 'Validé'),
        ('T22', 'Comptabilité', 'Versement partiel', 'Solde recalculé, reçu produit', 'Validé'),
        ('T23', 'Comptabilité', 'Deux reçus successifs', 'Numéros distincts', 'Validé'),
        ('T24', 'Planning', 'Deux créneaux dans la même salle',
         'Second créneau refusé', 'Validé'),
        ('T25', 'Planning', 'Édition d’une liste d’émargement',
         'PDF contenant les inscrits de la séance', 'Validé'),
        ('T26', 'Espaces', 'Parent consultant un enfant qui n’est pas le sien',
         'Accès refusé', 'Validé'),
        ('T27', 'Espaces', 'Étudiant consultant le dossier d’un autre',
         'Accès refusé', 'Validé'),
        ('T28', 'Documents', 'Charte graphique des PDF produits',
         'Couleurs et logo conformes', 'Validé'),
    ], largeurs=[1.1, 2.6, 5.2, 4.8, 1.8])

    titre2(doc, 'Annexe C — Paramètres de déploiement')
    para(doc, 'La mise en ligne repose sur des paramètres de configuration fournis à '
              'l’hébergement, et non écrits dans le code : c’est ce qui permet de faire '
              'tourner la même application en développement et en production sans la '
              'modifier.')
    tableau(doc, 'Paramètres de configuration nécessaires au déploiement',
            ['Paramètre', 'Rôle'], [
        ('Adresse de la base de données', 'Localisation et identifiants de la grappe '
         'MongoDB.'),
        ('Clé de signature des jetons', 'Secret qui rend les jetons de session '
         'infalsifiables.'),
        ('Durée de validité des jetons', 'Jeton d’accès court, jeton de renouvellement plus '
         'long.'),
        ('Adresse publique du site', 'Sert aux liens des courriels et au plan de site.'),
        ('Adresse de l’API', 'Indique à l’application où adresser ses requêtes.'),
        ('Clé du service de courriels', 'Autorise l’envoi depuis le domaine de '
         'l’établissement.'),
        ('Compte administrateur initial', 'Adresse et mot de passe du premier compte, créé '
         'au premier démarrage.'),
    ], largeurs=[5.0, 10.5], source=None)
