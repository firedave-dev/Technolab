# -*- coding: utf-8 -*-
"""
Boite a outils de dessin pour les figures du rapport.

POURQUOI DESSINER PLUTOT QU'EXPORTER DEPUIS UN OUTIL UML : les figures doivent
pouvoir etre regenerees apres chaque correction du memoire. Un diagramme dessine
a la main dans StarUML se refait entierement quand une classe change de nom ;
ici, on modifie une ligne de texte et on relance le script.

Toutes les figures partagent la palette de la plateforme, ce qui donne au
document une unite visuelle avec les captures d'ecran de l'application.
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Ellipse, FancyArrowPatch, Circle, Polygon
from pathlib import Path

# --- Palette reprise de client/src/index.css -------------------------------
MARINE = '#2e4474'
VERT = '#038129'
VERT_BLEU = '#156749'
ARDOISE = '#3a598b'
CLAIR = '#c4cddc'
FOND = '#f4f6fa'
GRIS = '#6b7280'
BLANC = '#ffffff'

FIGURES = Path(__file__).parent / 'figures'
FIGURES.mkdir(parents=True, exist_ok=True)

# Times New Roman : la meme police que le corps du rapport, pour que les
# figures ne jurent pas avec le texte qui les entoure.
plt.rcParams['font.family'] = ['Times New Roman', 'DejaVu Serif', 'serif']


def toile(largeur, hauteur):
    """Cree une figure vierge aux proportions demandees (en unites de dessin)."""
    fig, ax = plt.subplots(figsize=(largeur / 10, hauteur / 10))
    ax.set_xlim(0, largeur)
    ax.set_ylim(0, hauteur)
    ax.axis('off')
    ax.set_aspect('equal')
    return fig, ax


def enregistrer(fig, nom):
    chemin = FIGURES / f'{nom}.png'
    fig.savefig(chemin, dpi=200, bbox_inches='tight', facecolor='white', pad_inches=0.12)
    plt.close(fig)
    print(f'  figures/{nom}.png')
    return chemin


def boite(ax, x, y, w, h, texte, fond=BLANC, bord=MARINE, taille=9,
          gras=False, couleur_texte='#111827', arrondi=0.35):
    """Rectangle arrondi contenant un texte centre."""
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f'round,pad=0,rounding_size={arrondi}',
        facecolor=fond, edgecolor=bord, linewidth=1.4))
    ax.text(x + w / 2, y + h / 2, texte, ha='center', va='center',
            fontsize=taille, color=couleur_texte,
            fontweight='bold' if gras else 'normal', linespacing=1.45)


# Une unite de dessin vaut 1/10 de pouce (cf. toile()), soit 7,2 points.
# Les hauteurs de ligne en decoulent : sous-estimer ce rapport fait se
# chevaucher les attributs, ce qui rend la boite illisible.
UNITE_EN_POINTS = 7.2


def hauteur_classe(nb_attributs, taille=7.8, h_titre=2.3, interligne=1.5):
    """Hauteur qu'occupera une boite de classe, en unites de dessin."""
    h_ligne = taille * interligne / UNITE_EN_POINTS
    return h_titre + h_ligne * nb_attributs + 0.9


def classe(ax, x, sommet, w, titre, attributs, fond=BLANC, bord=MARINE, taille=7.8):
    """
    Boite de classe UML : bandeau de titre, puis liste d'attributs.

    Reperee par son SOMMET et non par sa base : la hauteur depend du nombre
    d'attributs, et aligner des boites par le haut est la seule facon de garder
    un diagramme lisible quand on ajoute un champ a l'une d'elles.
    """
    h_titre = 2.3
    h_ligne = taille * 1.5 / UNITE_EN_POINTS
    h = hauteur_classe(len(attributs), taille, h_titre)
    y = sommet - h

    ax.add_patch(Rectangle((x, y), w, h, facecolor=fond, edgecolor=bord, linewidth=1.5))
    ax.add_patch(Rectangle((x, sommet - h_titre), w, h_titre, facecolor=bord, edgecolor=bord))
    ax.text(x + w / 2, sommet - h_titre / 2, titre, ha='center', va='center',
            fontsize=9.5, color=BLANC, fontweight='bold')

    for i, attribut in enumerate(attributs):
        ax.text(x + 0.7, sommet - h_titre - 0.6 - h_ligne * (i + 0.5), attribut,
                ha='left', va='center', fontsize=taille, color='#1f2937')
    return h


def fleche(ax, depart, arrivee, style='->', couleur=MARINE, texte=None,
           pointilles=False, decalage=0.0, taille=8, courbe=0.0):
    ax.add_patch(FancyArrowPatch(
        depart, arrivee,
        arrowstyle=style, mutation_scale=13,
        color=couleur, linewidth=1.3,
        linestyle='--' if pointilles else '-',
        connectionstyle=f'arc3,rad={courbe}',
        shrinkA=2, shrinkB=2))
    if texte:
        mx = (depart[0] + arrivee[0]) / 2
        my = (depart[1] + arrivee[1]) / 2 + decalage
        ax.text(mx, my, texte, ha='center', va='center', fontsize=taille,
                color='#1f2937',
                bbox=dict(boxstyle='round,pad=0.22', facecolor='white',
                          edgecolor='none', alpha=0.95))


def acteur(ax, x, y, nom, couleur=MARINE, echelle=1.0):
    """Bonhomme batons UML."""
    e = echelle
    ax.add_patch(Circle((x, y + 1.5 * e), 0.42 * e, facecolor='white',
                        edgecolor=couleur, linewidth=1.5))
    ax.plot([x, x], [y + 1.08 * e, y + 0.1 * e], color=couleur, linewidth=1.5)
    ax.plot([x - 0.6 * e, x + 0.6 * e], [y + 0.78 * e, y + 0.78 * e], color=couleur, linewidth=1.5)
    ax.plot([x, x - 0.5 * e], [y + 0.1 * e, y - 0.72 * e], color=couleur, linewidth=1.5)
    ax.plot([x, x + 0.5 * e], [y + 0.1 * e, y - 0.72 * e], color=couleur, linewidth=1.5)
    ax.text(x, y - 1.2 * e, nom, ha='center', va='top', fontsize=8.5,
            color='#111827', fontweight='bold')


def cas(ax, x, y, w, h, texte, fond=BLANC, bord=VERT_BLEU, taille=7.8):
    """Ellipse de cas d'utilisation."""
    ax.add_patch(Ellipse((x, y), w, h, facecolor=fond, edgecolor=bord, linewidth=1.3))
    ax.text(x, y, texte, ha='center', va='center', fontsize=taille,
            color='#111827', linespacing=1.3)


def paquet(ax, x, y, w, h, titre, couleur=ARDOISE, fond='#fbfcfe'):
    """
    Cadre de regroupement (systeme, noeud de deploiement, sous-ensemble).

    Le libelle est pose SUR la bordure, avec un fond blanc qui interrompt le
    trait : sans cela le pointille traverse le texte et le rend illisible.
    """
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fond, edgecolor=couleur,
                           linewidth=1.4, linestyle='--'))
    ax.text(x + 1.6, y + h, titre, ha='left', va='center',
            fontsize=9, color=couleur, fontweight='bold', style='italic',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='none'))


def ligne_de_vie(ax, x, haut, bas, nom, sous_titre=None, couleur=MARINE, largeur=7.0):
    """
    Participant d'un diagramme de sequence : en-tete + ligne pointillee.

    La hauteur de l'en-tete est calculee depuis la taille du texte (cf.
    UNITE_EN_POINTS) : fixee a l'avance, elle laissait le nom et son sous-titre
    se chevaucher.
    """
    h = (3.6 if sous_titre else 2.4)
    ax.add_patch(FancyBboxPatch(
        (x - largeur / 2, haut), largeur, h,
        boxstyle='round,pad=0,rounding_size=0.3',
        facecolor=couleur, edgecolor=couleur))
    if sous_titre:
        ax.text(x, haut + h - 1.25, nom, ha='center', va='center',
                fontsize=8.5, color=BLANC, fontweight='bold')
        ax.text(x, haut + 1.0, sous_titre, ha='center', va='center',
                fontsize=7, color=CLAIR, style='italic')
    else:
        ax.text(x, haut + h / 2, nom, ha='center', va='center',
                fontsize=8.5, color=BLANC, fontweight='bold')
    ax.plot([x, x], [bas, haut], color=GRIS, linewidth=1.0, linestyle=(0, (4, 4)))


def activation(ax, x, bas, haut, couleur=CLAIR, largeur=0.55):
    """Barre d'activation sur une ligne de vie."""
    ax.add_patch(Rectangle((x - largeur / 2, bas), largeur, haut - bas,
                           facecolor=couleur, edgecolor=MARINE, linewidth=0.9))


def losange(ax, x, y, taille=1.1, couleur=MARINE, fond=BLANC):
    """Noeud de decision d'un diagramme d'activite."""
    ax.add_patch(Polygon(
        [(x, y + taille), (x + taille, y), (x, y - taille), (x - taille, y)],
        facecolor=fond, edgecolor=couleur, linewidth=1.4))


def depart_fin(ax, x, y, final=False, couleur='#111827'):
    """Noeud initial (disque plein) ou final (disque cercle)."""
    ax.add_patch(Circle((x, y), 0.46, facecolor=couleur, edgecolor=couleur))
    if final:
        ax.add_patch(Circle((x, y), 0.75, facecolor='none', edgecolor=couleur, linewidth=1.4))
