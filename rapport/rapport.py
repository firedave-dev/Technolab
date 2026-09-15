# -*- coding: utf-8 -*-
"""
Genere le memoire au format Word.

    python rapport/rapport.py

Produit « Rapport de fin de cycle - Technolab ISTA.docx » a cote de ce fichier.
Les donnees personnelles (noms, dates, theme) sont dans infos.py ; les figures
sont produites par diagrammes.py ; les captures d'ecran sont lues dans
captures/ et remplacees par un cadre visible tant qu'elles manquent.

A L'OUVERTURE DU FICHIER, Word propose de mettre a jour les champs : acceptez.
La table des matieres, la liste des figures et celle des tableaux se remplissent
alors toutes seules. On peut refaire la manoeuvre a tout moment avec Ctrl+A
puis F9.
"""
import sys
from pathlib import Path
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH

sys.path.insert(0, str(Path(__file__).parent))
import infos
from docx_outils import (preparer, nouvelle_section, numeroter, pied_de_page,
                         para, riche, puces, titre1, titre2, titre3, figure,
                         tableau, champ, actualiser_a_louverture, saut_de_page,
                         _police, CORPS, TITRE, SOUS_TITRE, COULEUR_TITRES, ROUGE)

RACINE = Path(__file__).parent
FIGURES = RACINE / 'figures'
CAPTURES = RACINE / 'captures'
SORTIE = RACINE / 'Rapport de fin de cycle - Technolab ISTA.docx'

CENTRE = WD_ALIGN_PARAGRAPH.CENTER
GAUCHE = WD_ALIGN_PARAGRAPH.LEFT


def valeur(champ_infos):
    """Rend visible, en rouge dans le document, tout champ non renseigne."""
    return champ_infos


# ==========================================================================
# 1. COUVERTURE
# ==========================================================================
def couverture(doc):
    section = doc.sections[0]
    pied_de_page(section, avec_numero=False)

    entete = doc.add_table(rows=1, cols=2)
    entete.autofit = True
    gauche, droite = entete.rows[0].cells

    for texte, gras, taille in [
        (infos.MINISTERE, False, 11), ('*******************', False, 10),
        (infos.DIRECTION, False, 11), ('*******************', False, 10),
        (infos.ETABLISSEMENT, True, 11),
    ]:
        p = gauche.add_paragraph()
        p.alignment = CENTRE
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(1)
        _police(p.add_run(texte), taille, gras)

    for texte, gras, taille in [
        (infos.REPUBLIQUE, True, 11), (infos.DEVISE, False, 11),
        ('***************', False, 10),
    ]:
        p = droite.add_paragraph()
        p.alignment = CENTRE
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(1)
        _police(p.add_run(texte), taille, gras)

    for cellule in (gauche, droite):
        cellule.paragraphs[0]._element.getparent().remove(cellule.paragraphs[0]._element)

    logo = RACINE.parent / 'client' / 'public' / 'marque' / 'logo-technolab.png'
    if logo.exists():
        p = para(doc, alignement=CENTRE, espace_avant=10)
        p.add_run().add_picture(str(logo), width=Cm(4.6))

    para(doc, 'PROJET TUTORÉ DE FIN DE CYCLE', taille=16, gras=True,
         alignement=CENTRE, espace_avant=10, interligne=1.0)
    para(doc, 'EN VUE DE L’OBTENTION DU DIPLÔME DE', taille=12,
         alignement=CENTRE, interligne=1.0)
    para(doc, f'{infos.DIPLOME} EN {infos.DOMAINE}', taille=13, gras=True,
         alignement=CENTRE, interligne=1.0)
    para(doc, f'Mention : {infos.MENTION}', taille=12, alignement=CENTRE, interligne=1.0)
    para(doc, f'Spécialité : {infos.SPECIALITE}', taille=12, alignement=CENTRE, interligne=1.0)

    # Le theme est l'element que le jury lit en premier : encadre et en gras.
    cadre = doc.add_table(rows=1, cols=1)
    cadre.style = 'Table Grid'
    cellule = cadre.cell(0, 0)
    p = cellule.paragraphs[0]
    p.alignment = CENTRE
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.line_spacing = 1.3
    _police(p.add_run('Thème : '), 13, gras=True)
    _police(p.add_run(infos.THEME), 14, gras=True, couleur=COULEUR_TITRES)

    para(doc, espace_avant=6, interligne=1.0)

    jury = doc.add_table(rows=1, cols=2)
    presente, encadre = jury.rows[0].cells

    p = presente.add_paragraph()
    p.alignment = GAUCHE
    p.paragraph_format.line_spacing = 1.0
    _police(p.add_run('Présenté par :'), 12, gras=True)
    for etudiant in infos.ETUDIANTS:
        p = presente.add_paragraph()
        p.alignment = GAUCHE
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(1)
        _police(p.add_run(etudiant), 12,
                couleur=ROUGE if etudiant == infos.A_COMPLETER else None)

    for libelle, nom in [('Tuteur', infos.TUTEUR), ('Examinateur', infos.EXAMINATEUR)]:
        p = encadre.add_paragraph()
        p.alignment = GAUCHE
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(1)
        _police(p.add_run(f'{libelle} :'), 12, gras=True)
        p = encadre.add_paragraph()
        p.alignment = GAUCHE
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(6)
        _police(p.add_run(nom), 12, couleur=ROUGE if nom == infos.A_COMPLETER else None)

    for cellule in (presente, encadre):
        cellule.paragraphs[0]._element.getparent().remove(cellule.paragraphs[0]._element)

    para(doc, f'Promotion : {infos.PROMOTION}', taille=12, gras=True,
         alignement=CENTRE, espace_avant=10, interligne=1.0)
    para(doc, f'Année académique {infos.ANNEE_ACADEMIQUE}', taille=12,
         alignement=CENTRE, interligne=1.0)
    para(doc, f'Date de soutenance : {infos.DATE_SOUTENANCE}', taille=12,
         gras=True, alignement=CENTRE, interligne=1.0)


# ==========================================================================
# 2. PAGES LIMINAIRES
# ==========================================================================
def liminaires(doc):
    nouvelle_section(doc, 'upperRoman', depart=1)

    titre1(doc, 'Dédicace', nouvelle_page=False)
    para(doc, infos.DEDICACE, italique=True, alignement=CENTRE, espace_avant=40)

    titre1(doc, 'Remerciements')
    pluriel = len(infos.ETUDIANTS) > 1
    para(doc, 'Nous rendons grâce à Dieu pour la santé et la persévérance qui nous ont '
              'accompagnés tout au long de ce travail.')
    para(doc, 'Nous remercions nos parents, dont le soutien moral et financier a rendu '
              'ce parcours possible, et dont la patience n’a jamais fait défaut.')
    para(doc, f'Notre reconnaissance va à notre tuteur, {infos.TUTEUR}, pour sa '
              'disponibilité, la justesse de ses remarques et l’exigence qui nous a fait '
              'reprendre plus d’une fois ce que nous croyions terminé.')
    para(doc, 'Nous remercions l’ensemble du corps enseignant de TechnoLAB-ISTA pour la '
              'qualité de la formation reçue, ainsi que l’équipe administrative de '
              'l’établissement, qui nous a ouvert ses portes et expliqué son travail '
              'quotidien : sans ces échanges, la plateforme décrite ici serait restée '
              'un exercice théorique.')
    if pluriel:
        para(doc, 'Nous nous remercions enfin les uns les autres : ce projet a été mené '
                  'en équipe, et il le doit à chacun de ses membres.')

    titre1(doc, 'Table des matières')
    p = para(doc, interligne=1.0)
    champ(p, r'TOC \o "1-3" \h \z \u', 'Faites Ctrl+A puis F9 pour composer la table des matières.')

    titre1(doc, 'Liste des figures')
    p = para(doc, interligne=1.0)
    champ(p, r'TOC \h \z \c "Figure"', 'Faites Ctrl+A puis F9 pour composer la liste des figures.')

    titre1(doc, 'Liste des tableaux')
    p = para(doc, interligne=1.0)
    champ(p, r'TOC \h \z \c "Tableau"', 'Faites Ctrl+A puis F9 pour composer la liste des tableaux.')

    titre1(doc, 'Sigles et abréviations')
    tableau(doc, 'Sigles et abréviations employés dans ce document',
            ['Sigle', 'Signification', 'Définition'], [
        ('API', 'Application Programming Interface',
         'Interface par laquelle deux logiciels échangent des données.'),
        ('BTP', 'Bâtiment et Travaux Publics', 'L’un des pôles de formation de l’institut.'),
        ('CAMES', 'Conseil Africain et Malgache pour l’Enseignement Supérieur',
         'Organisme qui reconnaît les diplômes des pays membres.'),
        ('CRUD', 'Create, Read, Update, Delete',
         'Les quatre opérations de base sur une donnée : créer, lire, modifier, supprimer.'),
        ('CSS', 'Cascading Style Sheets', 'Langage de mise en forme des pages web.'),
        ('DUT', 'Diplôme Universitaire de Technologie', 'Diplôme de niveau Bac+2.'),
        ('ECTS', 'European Credit Transfer System',
         'Système de crédits qui mesure le volume de travail d’un enseignement.'),
        ('HTML', 'HyperText Markup Language', 'Langage qui structure le contenu d’une page web.'),
        ('HTTPS', 'HyperText Transfer Protocol Secure',
         'Protocole du web, chiffré : personne ne peut lire les données en chemin.'),
        ('JSON', 'JavaScript Object Notation',
         'Format texte d’échange de données entre le navigateur et le serveur.'),
        ('JWT', 'JSON Web Token',
         'Jeton signé qui prouve l’identité d’un utilisateur à chaque requête.'),
        ('LMD', 'Licence – Master – Doctorat',
         'Organisation des études supérieures en semestres et en crédits.'),
        ('PDF', 'Portable Document Format',
         'Format de document dont la mise en page ne varie pas d’un appareil à l’autre.'),
        ('RBAC', 'Role-Based Access Control',
         'Contrôle des accès fondé sur le rôle de l’utilisateur.'),
        ('REST', 'Representational State Transfer',
         'Style d’organisation d’une API, fondé sur les adresses et les verbes du web.'),
        ('SEO', 'Search Engine Optimization',
         'Ensemble des techniques qui rendent un site visible des moteurs de recherche.'),
        ('UE', 'Unité d’Enseignement',
         'Regroupement de matières validé globalement, qui porte les crédits.'),
        ('UML', 'Unified Modeling Language',
         'Langage graphique normalisé de modélisation des systèmes.'),
    ], source=None, largeurs=[2.0, 5.0, 8.5])

    titre1(doc, 'Résumé')
    para(doc, 'Les établissements privés d’enseignement supérieur du Mali gèrent chaque '
              'année un volume important d’informations : inscriptions, dossiers des '
              'étudiants, emplois du temps, notes, bulletins, absences et frais de '
              'scolarité. Ces opérations reposent encore largement sur des registres '
              'papier et des fichiers de tableur isolés, sans lien entre les services. '
              'Il en résulte des lenteurs, des erreurs de recopie, des documents perdus '
              'et, surtout, l’impossibilité pour un étudiant ou sa famille de consulter '
              'sa situation sans se déplacer.')
    para(doc, 'Le présent projet tutoré porte sur la conception et la réalisation d’une '
              'plateforme web de gestion scolaire pour l’Institut Supérieur de '
              'Technologies Appliquées (TechnoLAB-ISTA), à Sévaré. La démarche a consisté '
              'à étudier le fonctionnement existant, à formaliser les besoins, à modéliser '
              'la solution en UML, puis à développer une application web organisée en '
              'modules : comptes et habilitations, structure pédagogique, notes et '
              'bulletins, absences, emploi du temps, comptabilité et espace des familles.')
    para(doc, 'La plateforme distingue sept profils d’utilisateurs, chacun disposant d’un '
              'espace et de droits ajustés à son métier. Elle applique les règles du '
              'système LMD : les matières sont regroupées en unités d’enseignement, '
              'chaque unité porte des crédits, et un semestre en totalise exactement '
              'trente. Le regroupement des matières est calculé automatiquement à partir '
              'de leur nature et de leur poids. Les documents officiels — bulletins, '
              'reçus de paiement, listes d’émargement — sont produits à la demande au '
              'format PDF. Une campagne de 337 vérifications automatisées, réparties en '
              'huit suites, valide les règles de calcul et les contrôles d’accès. '
              'L’application est déployée et accessible en ligne.')
    riche(doc, [('Mots-clés : ', True),
                'gestion scolaire, enseignement supérieur, application web, UML, '
                'système LMD, crédits ECTS, bulletin, contrôle d’accès par rôles.'])

    titre1(doc, 'Abstract')
    para(doc, 'Private higher-education institutions in Mali handle a large amount of '
              'information every year: enrolments, student records, timetables, marks, '
              'report cards, absences and tuition fees. These operations still rely '
              'largely on paper registers and isolated spreadsheets, with no link between '
              'departments. The result is delay, copying errors, lost documents and, above '
              'all, the impossibility for a student or a family to check their situation '
              'without travelling to the school.')
    para(doc, 'This tutored project covers the design and development of a web platform '
              'for school management at the Institut Supérieur de Technologies Appliquées '
              '(TechnoLAB-ISTA) in Sévaré. The approach consisted of studying the existing '
              'system, formalising requirements, modelling the solution in UML, and then '
              'developing a modular web application: accounts and permissions, academic '
              'structure, marks and report cards, absences, timetable, accounting and a '
              'family portal.')
    para(doc, 'The platform distinguishes seven user profiles, each with a workspace and '
              'access rights matched to their role. It implements the rules of the LMD '
              'system: subjects are grouped into teaching units, each unit carries credits, '
              'and a semester totals exactly thirty. The grouping of subjects is computed '
              'automatically from their nature and weight. Official documents — report '
              'cards, payment receipts, attendance sheets — are produced on demand as PDF '
              'files. A campaign of 337 automated checks, spread over eight suites, '
              'validates the calculation rules and access controls. The application is '
              'deployed and available online.')
    riche(doc, [('Keywords: ', True),
                'school management, higher education, web application, UML, LMD system, '
                'ECTS credits, report card, role-based access control.'])


# ==========================================================================
# 4. ASSEMBLAGE
# ==========================================================================
def construire():
    import contenu

    doc = preparer(Document())

    couverture(doc)
    liminaires(doc)
    contenu.introduction(doc)
    contenu.chapitre1(doc)
    contenu.chapitre2(doc)
    contenu.chapitre3(doc)
    contenu.conclusion(doc)
    contenu.references(doc)
    contenu.annexes(doc)

    actualiser_a_louverture(doc)
    doc.save(SORTIE)
    return doc


def compte_rendu():
    trous = infos.manquants()
    if trous:
        print('\n  ! Champs encore a renseigner dans infos.py :')
        for nom in trous:
            print(f'      - {nom}')
        print('    Ils apparaissent en ROUGE sur la couverture du document.')

    attendues = [ligne.split()[0] for ligne in (CAPTURES / 'LISEZ-MOI.txt').read_text(
        encoding='utf-8').splitlines() if ligne.startswith('  ') and '.png' in ligne]
    absentes = [nom for nom in attendues if not (CAPTURES / nom).exists()]
    if absentes:
        print(f'\n  ! Captures d ecran manquantes : {len(absentes)} sur {len(attendues)}')
        print('    Deposez-les dans rapport/captures/ (voir LISEZ-MOI.txt).')
        print('    En attendant, un cadre rouge marque leur emplacement.')
    else:
        print(f'\n  Toutes les captures sont presentes ({len(attendues)}).')

    print(f'\n  Document genere : {SORTIE.name}')
    print('  A l ouverture, acceptez la mise a jour des champs (ou Ctrl+A puis F9)')
    print('  pour composer la table des matieres et les listes de figures.\n')


if __name__ == '__main__':
    if not FIGURES.exists() or not any(FIGURES.glob('*.png')):
        print('Figures absentes : lancez d abord  python diagrammes.py')
        raise SystemExit(1)
    construire()
    compte_rendu()
