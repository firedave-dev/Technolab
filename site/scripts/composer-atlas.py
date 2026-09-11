"""
Remplace l'ecran de l'ordinateur 3D par une capture du tableau de bord reel.

    python scripts/composer-atlas.py

Le modele n'a QU'UN materiau : le clavier et l'ecran partagent le meme atlas de
1024 x 1024. On ne peut donc pas remplacer l'ecran seul par une autre texture —
il faut reecrire la zone d'ecran a l'interieur de l'atlas, et laisser le reste
intact.

Cette zone n'est pas devinee : elle est lue dans les coordonnees de texture du
maillage du capot (v de 0,0009 a 0,5607, soit les 574 premieres lignes de
l'image). glTF place l'origine des UV EN HAUT A GAUCHE, sans inversion — d'ou
une correspondance directe entre v et la ligne de pixels.

Pourquoi c'est necessaire, et pas seulement souhaitable : la texture d'origine
est une capture du bureau Windows de l'auteur du modele, avec ses icones
personnelles, sa barre des taches et le filigrane « Windows n'est pas active ».
Elle n'a rien a faire sur le site d'un etablissement.
"""

import io
import json
import pathlib
import struct

from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parents[1]
MODELE = RACINE / 'public' / 'models' / 'laptop.glb'
CAPTURE = RACINE / 'travail' / 'tableau-de-bord.png'
SORTIE = RACINE / 'public' / 'models' / 'laptop-ecran.webp'


def lire_glb(chemin):
    """Renvoie (json, binaire) d'un fichier .glb."""
    donnees = chemin.read_bytes()
    _, _, longueur = struct.unpack('<III', donnees[:12])
    position, js, binaire = 12, None, None
    while position < longueur:
        taille, type_ = struct.unpack('<II', donnees[position:position + 8])
        bloc = donnees[position + 8:position + 8 + taille]
        if type_ == 0x4E4F534A:
            js = json.loads(bloc)
        elif type_ == 0x004E4942:
            binaire = bloc
        position += 8 + taille
    return js, binaire


def vue(js, binaire, index):
    bv = js['bufferViews'][index]
    debut = bv.get('byteOffset', 0)
    return binaire[debut:debut + bv['byteLength']]


def bornes_uv(js, binaire, maillage):
    """Bornes verticales, en pixels, occupees par un maillage dans l'atlas."""
    primitive = js['meshes'][maillage]['primitives'][0]
    acc = js['accessors'][primitive['attributes']['TEXCOORD_0']]
    bv = js['bufferViews'][acc['bufferView']]
    debut = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    valeurs = struct.unpack_from('<' + 'f' * (acc['count'] * 2), binaire, debut)
    v = valeurs[1::2]
    return min(v), max(v)


def recadrer_en_couvrant(image, largeur, hauteur):
    """Redimensionne en remplissant le cadre, puis rogne le debord."""
    facteur = max(largeur / image.width, hauteur / image.height)
    intermediaire = image.resize(
        (round(image.width * facteur), round(image.height * facteur)),
        Image.LANCZOS,
    )
    gauche = (intermediaire.width - largeur) // 2
    haut = (intermediaire.height - hauteur) // 2
    return intermediaire.crop((gauche, haut, gauche + largeur, haut + hauteur))


def main():
    js, binaire = lire_glb(MODELE)

    atlas_brut = vue(js, binaire, js['images'][0]['bufferView'])
    atlas = Image.open(io.BytesIO(atlas_brut)).convert('RGB')
    print(f'  atlas d origine : {atlas.width} x {atlas.height}')

    v_min, v_max = bornes_uv(js, binaire, 1)
    haut = round(v_min * atlas.height)
    bas = round(v_max * atlas.height)
    largeur, hauteur = atlas.width, bas - haut
    print(f'  zone d ecran    : lignes {haut} a {bas}  ({largeur} x {hauteur})')

    capture = Image.open(CAPTURE).convert('RGB')
    print(f'  capture         : {capture.width} x {capture.height}')

    atlas.paste(recadrer_en_couvrant(capture, largeur, hauteur), (0, haut))

    SORTIE.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(SORTIE, quality=88, method=6)
    poids = SORTIE.stat().st_size / 1024
    print(f'  ecrit           : {SORTIE.relative_to(RACINE)}  {poids:.0f} Ko')
    print(f'  (atlas PNG d origine : {len(atlas_brut) / 1024:.0f} Ko)')


if __name__ == '__main__':
    main()
