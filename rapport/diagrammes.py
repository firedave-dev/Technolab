# -*- coding: utf-8 -*-
"""
Genere toutes les figures du rapport dans rapport/figures/.

    python rapport/diagrammes.py

Chaque fonction produit UNE figure et porte le numero sous lequel elle apparait
dans le document. Pour modifier un diagramme, editez la fonction concernee et
relancez le script : le fichier PNG est remplace, et rapport.py le reprendra tel
quel a la prochaine generation du memoire.

Les libelles portent leurs accents : ils sont lus par le jury, contrairement aux
commentaires du code source.
"""
from matplotlib.patches import Rectangle
from uml import (toile, enregistrer, boite, classe, fleche, acteur, cas, paquet,
                 ligne_de_vie, activation, losange, depart_fin,
                 MARINE, VERT, VERT_BLEU, ARDOISE, CLAIR, FOND, GRIS, BLANC)

LIEN = '#a8b6cd'   # trait d'association acteur / cas d'utilisation


# ---------------------------------------------------------------- figure 1
def architecture():
    """Architecture logique en trois couches."""
    fig, ax = toile(118, 88)

    ax.text(59, 85.5, 'React 19  ·  Vite 7  ·  TailwindCSS 4', ha='center',
            fontsize=8.5, color=GRIS, style='italic')
    paquet(ax, 4, 62, 110, 20, 'Couche présentation — navigateur de l’utilisateur')
    boite(ax, 8, 65, 22, 11, 'Pages publiques\n(pré-rendues)', fond='#eef7f0', bord=VERT, taille=8.5)
    boite(ax, 33, 65, 22, 11, 'Espace privé\n(application React)', fond=FOND, bord=MARINE, taille=8.5)
    boite(ax, 58, 65, 22, 11, 'Routage et contrôle\ndes accès', fond=FOND, bord=MARINE, taille=8.5)
    boite(ax, 83, 65, 26, 11, 'Composants partagés\n(tableaux, formulaires)', fond=FOND, bord=MARINE, taille=8.5)

    ax.text(20, 57.5, 'Node.js  ·  Express 5  ·  Mongoose 8', ha='center',
            fontsize=8.5, color=GRIS, style='italic')
    paquet(ax, 4, 26, 110, 28, 'Couche métier — serveur applicatif')
    boite(ax, 8, 40, 24, 10, 'Routes REST\n14 routeurs', fond=BLANC, bord=ARDOISE, taille=8.5)
    boite(ax, 35, 40, 24, 10, 'Intergiciels\nJWT · rôles · quotas', fond=BLANC, bord=ARDOISE, taille=8.5)
    boite(ax, 62, 40, 24, 10, 'Validation\ndes données reçues', fond=BLANC, bord=ARDOISE, taille=8.5)
    boite(ax, 89, 40, 20, 10, 'Traitement\ndes erreurs', fond=BLANC, bord=ARDOISE, taille=8.5)
    boite(ax, 8, 29, 33, 8.5, 'Services de calcul (purs)\nnotation · appariement · comptabilité',
          fond='#eef7f0', bord=VERT, taille=8)
    boite(ax, 44, 29, 31, 8.5, 'Services applicatifs\nscolarité · planning · statistiques',
          fond='#eef7f0', bord=VERT, taille=8)
    boite(ax, 78, 29, 31, 8.5, 'Production de documents\nbulletins · reçus · émargement',
          fond='#eef7f0', bord=VERT, taille=8)

    paquet(ax, 4, 4, 110, 15, 'Couche données')
    boite(ax, 8, 7, 46, 8.5, 'Base MongoDB — 18 collections', fond=BLANC, bord=MARINE, taille=9, gras=True)
    boite(ax, 58, 7, 24, 8.5, 'Service d’envoi\nde courriels', fond='#fdf6ec', bord='#b45309', taille=8)
    boite(ax, 85, 7, 24, 8.5, 'Stockage des\nfichiers déposés', fond='#fdf6ec', bord='#b45309', taille=8)

    fleche(ax, (70, 62), (70, 54.5), texte='Requêtes HTTPS (format JSON)', decalage=1.6, taille=8.5)
    fleche(ax, (59, 26), (59, 19), texte='Requêtes à la base (Mongoose)', decalage=1.5, taille=8.5)
    enregistrer(fig, '01-architecture')


# ---------------------------------------------------------------- figure 2
def deploiement():
    """Diagramme de déploiement : où tourne chaque partie du système."""
    fig, ax = toile(118, 76)

    boite(ax, 6, 52, 26, 14, 'Poste de travail\nou téléphone\n\nNavigateur web',
          fond=FOND, bord=MARINE, taille=8.5)

    ax.text(57, 65, 'technolab-ista.org', ha='center', fontsize=8.6, color=VERT, fontweight='bold')
    paquet(ax, 40, 46, 34, 22, 'Hébergeur du site (Vercel)')
    boite(ax, 43, 49, 28, 8, 'Réseau de diffusion\nHTML, CSS, images', fond=BLANC, bord=VERT, taille=8)
    ax.text(57, 60.5, 'Certificat HTTPS automatique', ha='center', fontsize=7.6, color=GRIS, style='italic')

    ax.text(98, 65, 'api.technolab-ista.org', ha='center', fontsize=8.6, color=ARDOISE, fontweight='bold')
    paquet(ax, 82, 46, 32, 22, 'Hébergeur applicatif (Railway)')
    boite(ax, 85, 49, 26, 8, 'Serveur Node.js\nAPI REST', fond=BLANC, bord=ARDOISE, taille=8)
    ax.text(98, 60.5, 'Redémarrage automatique', ha='center', fontsize=7.6, color=GRIS, style='italic')

    paquet(ax, 40, 6, 34, 26, 'Base de données (MongoDB Atlas)')
    boite(ax, 43, 9, 28, 18,
          'Grappe répliquée\n\n18 collections\n\nSauvegardes automatiques\n\nAccès restreint par adresse IP',
          fond=BLANC, bord=MARINE, taille=8)

    boite(ax, 84, 18, 28, 9, 'Service de courriels (Resend)\nmails@technolab-ista.org',
          fond='#fdf6ec', bord='#b45309', taille=7.6)
    boite(ax, 84, 5, 28, 8.5, 'Dépôt de code\n(GitHub)', fond=FOND, bord=GRIS, taille=8)

    fleche(ax, (32, 59), (40, 59), texte='HTTPS', decalage=1.7, taille=7.5)
    fleche(ax, (74, 56), (82, 56), texte='Appels API', decalage=1.7, taille=7.5)
    fleche(ax, (95, 46), (60, 32), style='<->', texte='Pilote de base', decalage=1.5, taille=7.5, courbe=0.1)
    fleche(ax, (98, 46), (98, 27), texte='Envoi', decalage=1.6, taille=7.5)
    fleche(ax, (98, 13.5), (98, 18), pointilles=True, couleur=GRIS)
    ax.text(88, 38, 'Déploiement déclenché\nà chaque envoi de code', ha='center',
            fontsize=7.4, color=GRIS, style='italic')
    enregistrer(fig, '02-deploiement')


# ---------------------------------------------------------------- figure 3
def cas_usage_global():
    """Vue d’ensemble des sept profils et de leurs domaines d’intervention."""
    fig, ax = toile(124, 96)

    paquet(ax, 28, 3, 68, 88, 'Plateforme Technolab ISTA', couleur=MARINE)

    for nom, y in [('Administrateur', 81), ('Directeur', 64), ('Secrétaire', 47),
                   ('Surveillant', 30), ('Professeur', 13)]:
        acteur(ax, 13, y, nom, couleur=MARINE, echelle=0.95)
    for nom, y in [('Étudiant', 64), ('Parent', 30)]:
        acteur(ax, 111, y, nom, couleur=VERT_BLEU, echelle=0.95)

    usages = [
        (86, 'Administrer les comptes\net les habilitations', MARINE),
        (75, 'Piloter l’établissement\n(statistiques, indicateurs)', MARINE),
        (64, 'Inscrire les étudiants\net tenir les dossiers', VERT_BLEU),
        (53, 'Encaisser et suivre\nla scolarité', VERT_BLEU),
        (42, 'Organiser l’offre de formation\n(classes, matières, UE)', VERT_BLEU),
        (31, 'Saisir les notes\net les absences', VERT),
        (20, 'Éditer bulletins, reçus\net listes d’émargement', VERT),
        (9, 'Consulter ses résultats\net sa situation', VERT),
    ]
    for y, texte, couleur in usages:
        cas(ax, 62, y, 44, 8.6, texte, bord=couleur, taille=8.2)

    for x, y, cibles in [
        (13, 81, [86, 75, 64, 53, 42, 31, 20]),
        (13, 64, [86, 75, 64, 53, 42, 20]),
        (13, 47, [64, 53, 20]),
        (13, 30, [42, 31, 20]),
        (13, 13, [31, 20]),
    ]:
        for cy in cibles:
            fleche(ax, (x + 2.3, y + 0.4), (40.2, cy), style='-', couleur=LIEN)
    for cy in [9, 20]:
        fleche(ax, (108.5, 64.4), (83.8, cy), style='-', couleur=LIEN)
    fleche(ax, (108.5, 30.4), (83.8, 9), style='-', couleur=LIEN)
    enregistrer(fig, '03-cas-usage-global')


# ---------------------------------------------------------------- figure 4
def cas_usage_professeur():
    """Périmètre volontairement étroit de l’enseignant."""
    fig, ax = toile(112, 62)

    acteur(ax, 12, 30, 'Professeur', couleur=MARINE, echelle=1.15)
    paquet(ax, 26, 3, 82, 56, 'Périmètre autorisé', couleur=VERT)

    for y, texte in [
        (51, 'Consulter ses classes\net ses matières'),
        (40, 'Saisir la note de classe\net la note d’examen'),
        (29, 'Marquer les absences\nde ses séances'),
        (18, 'Éditer la liste d’émargement\nde ses séances'),
        (8, 'Consulter son emploi\ndu temps'),
    ]:
        cas(ax, 56, y, 44, 8.4, texte, bord=VERT, taille=8.2)
        fleche(ax, (14.5, 30.4), (33.8, y), style='-', couleur=LIEN)

    # Ce qui est refusé est affiché à dessein : c’est une décision de conception.
    boite(ax, 26, -21, 82, 19,
          'Explicitement refusé par le serveur\n\n'
          'Bulletin complet d’un étudiant   ·   Fiche individuelle et coordonnées\n'
          'Situation financière   ·   Notes des matières d’un autre enseignant\n'
          'Création ou modification de classes, matières et unités d’enseignement',
          fond='#fdf2f2', bord='#b91c1c', taille=8.2)
    ax.set_ylim(-24, 62)
    enregistrer(fig, '04-cas-usage-professeur')


# ---------------------------------------------------------------- figure 5
def cas_usage_secretaire():
    fig, ax = toile(112, 64)

    acteur(ax, 12, 32, 'Secrétaire', couleur=MARINE, echelle=1.15)
    paquet(ax, 26, 3, 82, 58, 'Périmètre autorisé', couleur=VERT_BLEU)

    for y, texte in [
        (53, 'Inscrire un étudiant et éditer\nsa fiche d’inscription'),
        (42, 'Tenir le dossier administratif\net les coordonnées de la famille'),
        (31, 'Enregistrer un paiement\net délivrer le reçu'),
        (20, 'Suivre les impayés\net les échéances'),
        (9, 'Créer les comptes\nétudiant et parent'),
    ]:
        cas(ax, 56, y, 46, 8.4, texte, bord=VERT_BLEU, taille=8.2)
        fleche(ax, (14.5, 32.4), (32.8, y), style='-', couleur=LIEN)

    boite(ax, 26, -18, 82, 17,
          'Hors périmètre\n\n'
          'Structure pédagogique (classes, matières, unités d’enseignement)\n'
          'Saisie des notes   ·   Gestion des comptes du personnel',
          fond='#fdf2f2', bord='#b91c1c', taille=8.2)
    ax.set_ylim(-21, 64)
    enregistrer(fig, '05-cas-usage-secretaire')


# ---------------------------------------------------------------- figure 6
def classes_pedagogie():
    """
    Coeur du modele : de la classe a la note.

    Le diagramme est scinde en deux figures a dessein. Les neuf classes tiennent
    sur une seule planche, mais les associations s'y croisent au point qu'on ne
    suit plus aucune ligne ; separer le noyau pedagogique de la vie scolaire
    rend chacune des deux lisible.
    """
    fig, ax = toile(134, 74)

    classe(ax, 4, 70, 36, 'Classe', [
        'nom : chaîne', 'niveau : DUT1 … M2', 'filière : chaîne',
        'annéeScolaire : chaîne', 'capacité : entier', 'actif : booléen'])
    classe(ax, 50, 70, 36, 'UE', [
        'code : chaîne', 'intitulé : chaîne', 'semestre : S1 | S2',
        'ordre : entier', '/ créditsEcts : entier'], bord=VERT_BLEU)
    classe(ax, 4, 38, 36, 'Utilisateur', [
        'matricule : chaîne', 'nom, prénom : chaîne', 'email : chaîne',
        'motDePasse : haché', 'rôle : 7 valeurs', 'actif : booléen'])
    classe(ax, 50, 38, 36, 'Matière', [
        'code : chaîne', 'nom : chaîne', 'coefficient : 1 … 10',
        'typeMatière : référence', '/ créditsEcts : 2 | 3',
        'semestre : S1 | S2'], bord=VERT_BLEU)
    classe(ax, 96, 38, 36, 'NoteMatière', [
        'noteClasse : 0 … 20', 'noteExamen : 0 … 20', 'appréciation : chaîne',
        'publiée : booléen', 'saisiePar : référence'], bord=VERT)

    fleche(ax, (40, 63), (50, 63), style='-', texte='1..*', decalage=1.7, taille=7.5)
    fleche(ax, (14, 57), (14, 38), style='-', texte='inscrit dans', decalage=0, taille=7.5)
    fleche(ax, (68, 58.7), (68, 38), style='-', texte='1..*', decalage=0, taille=7.5)
    fleche(ax, (34, 57), (56, 38), style='-', texte='1..*', decalage=1.6, taille=7.5)
    fleche(ax, (40, 30), (50, 30), style='-', texte='enseigne', decalage=1.7, taille=7.5)
    fleche(ax, (86, 30), (96, 30), style='-', texte='1..*', decalage=1.7, taille=7.5)

    # Trace orthogonal plutot qu'une courbe : une association qui relie les deux
    # extremites du diagramme traverserait sinon les boites intermediaires.
    ax.plot([14, 14, 114, 114], [25.05, 17, 17, 26.7], color=MARINE, linewidth=1.3)
    ax.text(64, 17, 'obtient', ha='center', fontsize=7.5,
            bbox=dict(boxstyle='round,pad=0.25', facecolor='white', edgecolor='none'))

    ax.text(67, 73, 'Les attributs précédés de « / » sont calculés à la demande, jamais stockés.',
            ha='center', fontsize=8.4, color=GRIS, style='italic')
    ax.set_ylim(13, 76)
    enregistrer(fig, '06-classes-pedagogie')


# ---------------------------------------------------------------- figure 7
def classes_vie_scolaire():
    """Vie scolaire et comptabilité, rattachées au même utilisateur."""
    fig, ax = toile(134, 78)

    classe(ax, 4, 56, 34, 'Utilisateur', [
        'matricule : chaîne', 'nom, prénom : chaîne', 'rôle : 7 valeurs'])
    classe(ax, 48, 74, 36, 'Absence', [
        'date : date', 'type : absence | retard', 'justifiée : booléen',
        'motif : chaîne'], bord=ARDOISE)
    classe(ax, 48, 44, 36, 'Créneau', [
        'jour : lundi … samedi', 'heureDébut, heureFin', 'salle : chaîne'], bord=ARDOISE)
    classe(ax, 48, 18, 36, 'FraisScolarité', [
        'annéeScolaire : chaîne', 'montantTotal : entier',
        '/ montantPayé : entier', '/ solde : entier'], bord='#b45309')
    classe(ax, 96, 34, 36, 'Échéance', [
        'date : date', 'montant : entier', 'statut : à venir | échue'], bord='#b45309')
    classe(ax, 96, 16, 36, 'Paiement', [
        'montant : entier', 'date : date', 'moyen : espèces | virement',
        'numéroReçu : chaîne'], bord='#b45309')

    fleche(ax, (38, 50), (48, 64), style='-', texte='constate', decalage=1.6, taille=7.5)
    fleche(ax, (38, 46), (48, 38), style='-', texte='occupe', decalage=1.6, taille=7.5)
    ax.plot([14, 14, 48], [43.9, 8, 8], color=MARINE, linewidth=1.3)
    ax.text(31, 9.6, 'doit', ha='center', fontsize=7.5,
            bbox=dict(boxstyle='round,pad=0.22', facecolor='white', edgecolor='none'))
    fleche(ax, (84, 14), (96, 24), style='-', texte='1..*', decalage=1.6, taille=7.5)
    fleche(ax, (84, 10), (96, 8), style='-', texte='1..*', decalage=1.6, taille=7.5)

    ax.text(67, 77, 'Le montant payé et le solde se déduisent des paiements : jamais recopiés.',
            ha='center', fontsize=8.4, color=GRIS, style='italic')
    ax.set_ylim(2, 80)
    enregistrer(fig, '07-classes-vie-scolaire')


# ---------------------------------------------------------------- figure 8
def sequence_authentification():
    """Connexion : jeton court en mémoire, jeton de renouvellement en témoin."""
    fig, ax = toile(118, 70)

    haut, bas = 62, 6
    for x, nom, sous in [(14, 'Utilisateur', None), (42, 'Application', 'navigateur'),
                         (72, 'API', '/auth/login'), (100, 'Base', 'utilisateurs')]:
        ligne_de_vie(ax, x, haut, bas, nom, sous, largeur=21)

    activation(ax, 42, 8, 57)
    activation(ax, 72, 14, 51)
    activation(ax, 100, 42, 45)
    activation(ax, 100, 20, 23)

    for y, a, b, texte, retour in [
        (56, 14, 42, 'Saisit son adresse et son mot de passe', False),
        (50, 42, 72, 'Envoie les identifiants', False),
        (44, 72, 100, 'Recherche le compte', False),
        (38, 100, 72, 'Compte trouvé, mot de passe haché', True),
        (22, 72, 100, 'Enregistre le jeton de renouvellement', False),
        (15, 72, 42, 'Jeton d’accès + témoin sécurisé', True),
        (9, 42, 14, 'Ouvre l’espace correspondant au rôle', True),
    ]:
        fleche(ax, (a, y), (b, y), couleur=GRIS if retour else MARINE,
               pointilles=retour, texte=texte, decalage=1.6, taille=7.8)

    # Message reflexif : l'API compare les empreintes sans sortir d'elle-meme.
    ax.add_patch(Rectangle((72, 28), 9, 3.4, facecolor='none', edgecolor=MARINE, linewidth=1.1))
    fleche(ax, (72.3, 31.4), (81, 31.4), couleur=MARINE)
    fleche(ax, (81, 31.4), (72.3, 28), couleur=MARINE)
    ax.text(83, 29.7, 'Compare les empreintes (bcrypt)', ha='left', va='center', fontsize=7.8)

    ax.text(59, 68, 'Le jeton d’accès expire en 15 minutes ; le témoin de renouvellement '
                    'reste inaccessible au JavaScript de la page.',
            ha='center', fontsize=8, color=GRIS, style='italic')
    enregistrer(fig, '08-sequence-authentification')


# ---------------------------------------------------------------- figure 9
def sequence_saisie_note():
    """Saisie assistée d’une note par l’enseignant."""
    fig, ax = toile(122, 70)

    haut, bas = 62, 5
    for x, nom, sous in [(13, 'Professeur', None), (40, 'Grille', 'de saisie'),
                         (70, 'API', '/notes'), (100, 'Base', 'notes')]:
        ligne_de_vie(ax, x, haut, bas, nom, sous, largeur=21)

    activation(ax, 40, 6, 58)
    activation(ax, 70, 6, 52)
    activation(ax, 100, 38, 46)
    activation(ax, 100, 6, 12)

    for y, a, b, texte, retour in [
        (57, 13, 40, 'Choisit la classe, la matière et le semestre', False),
        (51, 40, 70, 'Demande la grille pré-remplie', False),
        (45, 70, 100, 'Lit les inscrits et les notes existantes', False),
        (39, 100, 70, 'Liste des étudiants', True),
        (33, 70, 40, 'Grille complète, une ligne par étudiant', True),
        (27, 13, 40, 'Saisit note de classe et note d’examen', False),
        (21, 40, 70, 'Enregistre le lot de notes', False),
        (11, 70, 100, 'Écrit les notes du lot', False),
        (6, 100, 40, 'Confirmation', True),
    ]:
        fleche(ax, (a, y), (b, y), couleur=GRIS if retour else MARINE,
               pointilles=retour, texte=texte, decalage=1.6, taille=7.8)

    # La verification d'habilitation est placee a gauche de la ligne de vie de
    # l'API : a droite, elle recouvrirait celle de la base.
    ax.add_patch(Rectangle((44, 14), 22, 5.4, facecolor='#fdf2f2',
                           edgecolor='#b91c1c', linewidth=1.1))
    ax.text(55, 16.7, 'Vérifie que la matière appartient\nbien à ce professeur — sinon refus',
            ha='center', va='center', fontsize=7.4, color='#b91c1c')
    ax.plot([66, 70], [16.7, 16.7], color='#b91c1c', linewidth=1.0, linestyle=(0, (3, 3)))
    enregistrer(fig, '09-sequence-saisie-note')


# ---------------------------------------------------------------- figure 10
def sequence_bulletin():
    """Consultation du bulletin : recalculé à chaque demande, jamais stocké."""
    fig, ax = toile(134, 68)

    haut, bas = 60, 10
    for x, nom, sous in [(13, 'Étudiant', None), (40, 'Application', None),
                         (68, 'API', '/scolarité'), (96, 'Base', None),
                         (122, 'Service', 'de notation')]:
        ligne_de_vie(ax, x, haut, bas, nom, sous, largeur=20)

    activation(ax, 40, 11, 55)
    activation(ax, 68, 17, 49)
    activation(ax, 96, 35, 43)
    activation(ax, 122, 23, 31)

    for y, a, b, texte, retour in [
        (54, 13, 40, 'Ouvre « Mes résultats »', False),
        (48, 40, 68, 'Demande le bulletin du semestre', False),
        (42, 68, 96, 'Lit les notes et les unités d’enseignement', False),
        (36, 96, 68, 'Notes brutes', True),
        (30, 68, 122, 'Transmet les notes à calculer', False),
        (24, 122, 68, 'Moyennes, crédits, mention, rang', True),
        (18, 68, 40, 'Bulletin complet', True),
        (12, 40, 13, 'Affiche le bulletin', True),
    ]:
        fleche(ax, (a, y), (b, y), couleur=GRIS if retour else MARINE,
               pointilles=retour, texte=texte, decalage=1.6, taille=7.6)

    boite(ax, 18, 0, 100, 7,
          'Aucun bulletin n’est enregistré en base : corriger une note suffit à corriger '
          'tous les documents qui en découlent.',
          fond='#eef7f0', bord=VERT, taille=8.2)
    ax.set_ylim(-2, 68)
    enregistrer(fig, '10-sequence-bulletin')


# ---------------------------------------------------------------- figure 11
def activite_inscription():
    """Activité : de l’inscription au reçu de paiement."""
    fig, ax = toile(96, 108)

    depart_fin(ax, 20, 104)
    etapes = [
        (96, 'Le secrétariat saisit l’identité\net les coordonnées de l’étudiant'),
        (86, 'Le système attribue un matricule\net crée le compte'),
        (76, 'Affectation à une classe'),
        (66, 'Édition de la fiche d’inscription'),
    ]
    for y, texte in etapes:
        boite(ax, 4, y - 4, 44, 8, texte, fond=FOND, bord=MARINE, taille=8)
    fleche(ax, (20, 103.5), (20, 100))
    for a, b in [(92, 90), (82, 80), (72, 70)]:
        fleche(ax, (26, a), (26, b))

    fleche(ax, (26, 62), (26, 55))
    losange(ax, 26, 51, 5.0)
    ax.text(26, 51, 'Paiement\nreçu ?', ha='center', va='center', fontsize=7.4)

    fleche(ax, (31, 51), (58, 51), texte='oui', decalage=1.6, taille=7.6)
    boite(ax, 58, 47, 36, 8, 'Enregistrement du versement\net calcul du solde',
          fond='#eef7f0', bord=VERT, taille=8)
    fleche(ax, (76, 47), (76, 40))
    boite(ax, 58, 32, 36, 8, 'Édition du reçu numéroté (PDF)', fond='#eef7f0', bord=VERT, taille=8)
    fleche(ax, (76, 32), (76, 25))
    boite(ax, 58, 17, 36, 8, 'Courriel automatique\nà l’étudiant et au parent',
          fond='#fdf6ec', bord='#b45309', taille=8)

    fleche(ax, (26, 46), (26, 40), texte='non', decalage=0, taille=7.6)
    boite(ax, 8, 32, 36, 8, 'Inscription au suivi des impayés\net relance à l’échéance',
          fond='#fdf2f2', bord='#b91c1c', taille=8)
    fleche(ax, (26, 32), (26, 12))
    fleche(ax, (76, 17), (76, 8))
    fleche(ax, (76, 8), (30, 8))
    depart_fin(ax, 26, 8, final=True)
    enregistrer(fig, '11-activite-inscription')


# ---------------------------------------------------------------- figure 12
def appariement():
    """Constitution automatique des unités d’enseignement d’un semestre."""
    fig, ax = toile(132, 92)

    ax.text(66, 89, 'Exemple : 12 matières, réparties en 6 unités d’enseignement, soit 30 crédits',
            ha='center', fontsize=8.6, color=GRIS, style='italic')

    matieres = [
        ('Algorithmique', 'informatique', 3), ('Base de données', 'informatique', 3),
        ('Réseaux', 'informatique', 3), ('Programmation web', 'informatique', 3),
        ('Mathématiques', 'sciences', 3), ('Statistiques', 'sciences', 3),
        ('Comptabilité', 'gestion', 2), ('Gestion de projet', 'gestion', 2),
        ('Anglais', 'langues', 2), ('Communication', 'langues', 2),
        ('Droit', 'droit', 2), ('Économie', 'économie', 2),
    ]
    for i, (nom, type_, credits) in enumerate(matieres):
        y = 80 - i * 6.4
        couleur = VERT if credits == 3 else VERT_BLEU
        boite(ax, 2, y - 2.4, 30, 4.8, f'{nom}   ·   {credits} cr.', fond=BLANC,
              bord=couleur, taille=7.6)
        ax.text(33.4, y, type_, ha='left', va='center', fontsize=6.6,
                color=GRIS, style='italic')

    boite(ax, 48, 34, 26, 24,
          'Matrice\nd’affinité\n\nentre types\nde matières\n\n(symétrique,\nadministrable)',
          fond=FOND, bord=ARDOISE, taille=8)
    ax.text(61, 31, 'Couplage de poids maximal', ha='center', fontsize=7.6,
            color=ARDOISE, style='italic')

    ues = [
        ('UE1 — Informatique', 'Algorithmique + Base de données', 6),
        ('UE2 — Systèmes', 'Réseaux + Programmation web', 6),
        ('UE3 — Sciences', 'Mathématiques + Statistiques', 6),
        ('UE4 — Gestion', 'Comptabilité + Gestion de projet', 4),
        ('UE5 — Langues', 'Anglais + Communication', 4),
        ('UE6 — Environnement', 'Droit + Économie', 4),
    ]
    for i, (titre, contenu, credits) in enumerate(ues):
        y = 76 - i * 12
        couleur = VERT if credits == 6 else VERT_BLEU
        ax.add_patch(Rectangle((84, y - 4.6), 46, 9.2, facecolor='#fbfdfb',
                               edgecolor=couleur, linewidth=1.4))
        ax.text(86, y + 2.1, titre, ha='left', va='center', fontsize=8, fontweight='bold', color=couleur)
        ax.text(86, y - 1.1, contenu, ha='left', va='center', fontsize=7.2, color='#374151')
        ax.text(127.5, y + 2.1, f'{credits} cr.', ha='right', va='center', fontsize=8,
                fontweight='bold', color=couleur)
        fleche(ax, (74, 46), (84, y), style='-', couleur=LIEN)

    for i in range(12):
        fleche(ax, (32.2, 80 - i * 6.4), (48, 46), style='-', couleur=LIEN)

    boite(ax, 84, 0, 46, 6, 'Total du semestre :  30 / 30 crédits', fond='#eef7f0',
          bord=VERT, taille=9.5, gras=True)
    enregistrer(fig, '12-appariement')


# ---------------------------------------------------------------- figure 13
def planning():
    """
    Planning previsionnel, sous forme de diagramme de Gantt.

    Les taches viennent de infos.py : corriger le calendrier la-bas suffit a
    regenerer la figure, sans retoucher ce fichier.
    """
    import infos

    taches = infos.PLANNING
    mois = infos.MOIS
    hauteur = len(taches) * 7 + 16
    fig, ax = toile(128, hauteur)

    largeur_colonne = 68 / len(mois)
    base = 58

    # En-tetes de mois et lignes de repere verticales.
    for i, libelle in enumerate(mois):
        x = base + i * largeur_colonne
        ax.add_patch(Rectangle((x, hauteur - 12), largeur_colonne, 6,
                               facecolor=FOND, edgecolor=ARDOISE, linewidth=0.9))
        ax.text(x + largeur_colonne / 2, hauteur - 9, libelle, ha='center',
                va='center', fontsize=7.4, color=MARINE, fontweight='bold')
        ax.plot([x, x], [4, hauteur - 12], color='#e5e9f0', linewidth=0.8, zorder=0)
    ax.plot([base + 68, base + 68], [4, hauteur - 12], color='#e5e9f0', linewidth=0.8, zorder=0)

    for rang, (nom, debut, duree) in enumerate(taches):
        y = hauteur - 20 - rang * 7
        ax.text(base - 3, y + 2, nom, ha='right', va='center', fontsize=7.6, color='#111827')
        couleur = VERT if rang % 2 == 0 else VERT_BLEU
        ax.add_patch(Rectangle((base + debut * largeur_colonne, y),
                               duree * largeur_colonne, 4.2,
                               facecolor=couleur, edgecolor=couleur))

    enregistrer(fig, '13-planning')


if __name__ == '__main__':
    print('Génération des figures :')
    for f in (architecture, deploiement, cas_usage_global, cas_usage_professeur,
              cas_usage_secretaire, classes_pedagogie, classes_vie_scolaire,
              sequence_authentification, sequence_saisie_note, sequence_bulletin,
              activite_inscription, appariement, planning):
        f()
    print('Terminé.')
