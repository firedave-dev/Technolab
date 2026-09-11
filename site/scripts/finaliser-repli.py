"""
Convertit le rendu brut de la scene en image de repli livrable.

    python scripts/finaliser-repli.py

Deuxieme moitie du travail commence par scripts/rendre-repli.mjs, qui produit un
PNG a la resolution du rendu. Ici on ramene a une taille fixe et on encode en
WebP — format que « next/image » reprendra pour produire ses propres variantes.

La transparence est conservee : le repli doit pouvoir se poser sur n'importe quel
fond. Aplatir sur du blanc marcherait tant que le hero reste blanc, et laisserait
un rectangle visible le jour ou il ne l'est plus.
"""

import pathlib

from PIL import Image

RACINE = pathlib.Path(__file__).resolve().parents[1]
BRUT = RACINE / 'public' / 'images' / '_repli-brut.png'
SORTIE = RACINE / 'public' / 'images' / 'ordinateur-repli.webp'

# Doit correspondre a LARGEUR / HAUTEUR dans composants/scene/ReplisStatique.jsx.
LARGEUR = 1200
HAUTEUR = 900


def main():
    if not BRUT.exists():
        raise SystemExit(
            f'{BRUT.name} introuvable. Lancez d abord : node scripts/rendre-repli.mjs'
        )

    image = Image.open(BRUT).convert('RGBA')
    print(f'  rendu brut : {image.width} x {image.height}')

    if (image.width / image.height) - (LARGEUR / HAUTEUR) > 0.02:
        print('  ATTENTION : le rapport du rendu ne correspond pas a la sortie.')

    image = image.resize((LARGEUR, HAUTEUR), Image.LANCZOS)
    image.save(SORTIE, quality=86, method=6)

    print(f'  repli      : {SORTIE.relative_to(RACINE)}  '
          f'{SORTIE.stat().st_size / 1024:.0f} Ko')

    BRUT.unlink()


if __name__ == '__main__':
    main()
