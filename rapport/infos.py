# -*- coding: utf-8 -*-
"""
TOUTES LES DONNEES PERSONNELLES DU RAPPORT SONT ICI.

C'est le seul fichier a modifier pour changer un nom, une date ou un intitule :
le reste du memoire est genere a partir de ces valeurs. Apres chaque
modification, relancez :

    python rapport/rapport.py

Les valeurs encore marquees « A COMPLETER » sont signalees au moment de la
generation : le document se fabrique quand meme, mais elles apparaissent en
rouge dans le fichier Word pour que vous les repariez avant impression.
"""

A_COMPLETER = 'A COMPLETER'

# --------------------------------------------------------------------------
# 1. Page de garde
# --------------------------------------------------------------------------

# Intitule exact du theme, tel qu'il a ete depose. C'est le titre qui figurera
# en gras au centre de la couverture.
THEME = ("Conception et réalisation d’une plateforme web de gestion scolaire "
         "pour un établissement d’enseignement supérieur : cas de TechnoLAB-ISTA")

DIPLOME = 'LICENCE PROFESSIONNELLE'
DOMAINE = 'SCIENCES ET TECHNOLOGIES'
MENTION = A_COMPLETER          # ex. « Sciences de Gestion »
SPECIALITE = A_COMPLETER       # ex. « Methodes Informatiques Appliquees a la Gestion des Entreprises (MIAGE) »

# Un nom par ligne, dans l'ordre qui doit apparaitre sur la couverture.
ETUDIANTS = [
    A_COMPLETER,
]

# Titre compris : « Dr », « Pr », « M. » ou « Mme ».
TUTEUR = A_COMPLETER
EXAMINATEUR = A_COMPLETER      # laissez A_COMPLETER s'il n'est pas encore designe

PROMOTION = A_COMPLETER        # ex. « 2023 - 2026 »
ANNEE_ACADEMIQUE = A_COMPLETER  # ex. « 2025 - 2026 »
DATE_SOUTENANCE = A_COMPLETER  # ex. « 20/09/2026 »

# --------------------------------------------------------------------------
# 2. Dedicace
# --------------------------------------------------------------------------
# Texte libre, volontairement court. Remplacez-le par le votre.
DEDICACE = (
    "À nos parents, pour leur patience et leurs sacrifices ; "
    "à celles et ceux qui nous ont appris que l’on apprend surtout en faisant."
)

# --------------------------------------------------------------------------
# 3. Etablissement (ne change pas d'une annee sur l'autre)
# --------------------------------------------------------------------------
ETABLISSEMENT = 'Institut Supérieur de Technologies Appliquées (TechnoLAB-ISTA)'
MINISTERE = ('Ministère de l’Enseignement Supérieur et de la '
             'Recherche Scientifique')
DIRECTION = ('Direction Générale de l’Enseignement Supérieur et de la '
             'Recherche Scientifique')
REPUBLIQUE = 'République du Mali'
DEVISE = 'Un Peuple - Un But - Une Foi'

# --------------------------------------------------------------------------
# 4. Le projet lui-meme
# --------------------------------------------------------------------------
NOM_PLATEFORME = 'Technolab ISTA'
SITE = 'https://technolab-ista.org'
API = 'https://api.technolab-ista.org'

# Periode de realisation, utilisee par le planning previsionnel.
# Chaque ligne : (tache, mois de debut, nombre de mois)
PERIODE_PROJET = A_COMPLETER   # ex. « mars 2026 - septembre 2026 »
PLANNING = [
    ('Étude de l’existant et recueil des besoins', 0, 1),
    ('Analyse et conception (UML, base de données)', 1, 1),
    ('Développement du noyau (comptes, rôles, scolarité)', 2, 2),
    ('Développement des notes, bulletins et comptabilité', 3, 2),
    ('Refonte visuelle et partie publique du site', 5, 1),
    ('Tests, déploiement et mise en ligne', 5, 1),
    ('Rédaction du mémoire', 4, 2),
]
MOIS = ['Mois 1', 'Mois 2', 'Mois 3', 'Mois 4', 'Mois 5', 'Mois 6']


def manquants():
    """Liste des champs encore a renseigner, pour avertir a la generation."""
    trous = []
    for nom, valeur in sorted(globals().items()):
        if nom.startswith('_') or nom == 'A_COMPLETER':
            continue
        if valeur == A_COMPLETER:
            trous.append(nom)
        elif isinstance(valeur, list) and A_COMPLETER in valeur:
            trous.append(nom)
    return trous
