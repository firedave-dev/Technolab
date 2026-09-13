"""
Detourage et declinaisons du logo officiel TechnoLAB-ISTA.

    python client/scripts/preparer-logo.py

POURQUOI CE SCRIPT EXISTE

Le fichier fourni (Images/logo-TECHNOLAB-ISTA.png) porte un fond blanc OPAQUE :
son canal alpha existe mais vaut 255 partout. Pose sur l'en-tete bleu profond de
la charte, il afficherait un rectangle blanc autour de l'embleme.

Le detourage ne peut pas se faire en rendant « tout ce qui est blanc »
transparent : les pages du livre, au centre de l'embleme, sont blanches elles
aussi, et seraient perforees. On propage donc depuis les BORDS de l'image
(remplissage par diffusion) : seul le blanc relie a l'exterieur devient
transparent, celui enclos dans le dessin est conserve.

Le blanc du fond n'est pas uniforme — le fichier a transite par une compression
avec pertes, d'ou des pixels a (255,254,255) ou (231,255,232). La tolerance
absorbe ce bruit ; au-dela de ~40 elle commencerait a mordre sur le vert clair
de la couronne.
"""

from collections import deque
from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
SOURCE = RACINE / "Images" / "logo-TECHNOLAB-ISTA.png"
SORTIE = RACINE / "client" / "public" / "marque"
# Le serveur embarque sa propre copie : les documents PDF et les emails sont
# generes cote serveur, sans acces au dossier public du client.
SORTIE_SERVEUR = RACINE / "server" / "src" / "marque"

TOLERANCE = 34          # distance au blanc encore consideree comme fond
FOND_SOMBRE = (46, 68, 116)   # #2E4474, pour la declinaison sur fond fonce


def detourer(image: Image.Image) -> Image.Image:
    """Rend transparent le fond clair accessible depuis les bords."""
    image = image.convert("RGBA")
    largeur, hauteur = image.size
    pixels = image.load()

    def est_fond(p):
        r, v, b, _ = p
        return (255 - r) + (255 - v) + (255 - b) <= TOLERANCE

    vus = [[False] * hauteur for _ in range(largeur)]
    file = deque()

    # Amorce : tous les pixels de bordure qui ressemblent au fond.
    for x in range(largeur):
        for y in (0, hauteur - 1):
            if est_fond(pixels[x, y]):
                file.append((x, y)); vus[x][y] = True
    for y in range(hauteur):
        for x in (0, largeur - 1):
            if est_fond(pixels[x, y]) and not vus[x][y]:
                file.append((x, y)); vus[x][y] = True

    # Diffusion a 4 voisins : on ne franchit jamais un pixel colore.
    while file:
        x, y = file.popleft()
        pixels[x, y] = (255, 255, 255, 0)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < largeur and 0 <= ny < hauteur and not vus[nx][ny]:
                if est_fond(pixels[nx, ny]):
                    vus[nx][ny] = True
                    file.append((nx, ny))

    return image


def adoucir_frange(image: Image.Image) -> Image.Image:
    """
    Attenue le lisere clair qui borde le dessin.

    Le remplissage par diffusion tranche net : un pixel est retire ou conserve,
    sans demi-teinte. Les pixels d'anti-crenelage de l'image d'origine — a
    mi-chemin entre le dessin et l'ancien fond blanc — restent donc pleinement
    opaques et dessinent un halo, visible des que le logo est pose sur fond
    fonce. On rend leur opacite proportionnelle a leur eloignement du blanc.
    """
    image = image.copy()
    largeur, hauteur = image.size
    pixels = image.load()

    for y in range(hauteur):
        for x in range(largeur):
            r, v, b, a = pixels[x, y]
            if a == 0:
                continue
            # Un voisin transparent signale un pixel de bordure.
            borde_le_vide = any(
                0 <= x + dx < largeur and 0 <= y + dy < hauteur
                and pixels[x + dx, y + dy][3] == 0
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
            )
            if not borde_le_vide:
                continue
            clarte = (r + v + b) / 3
            if clarte > 200:
                pixels[x, y] = (r, v, b, int(a * max(0.0, (255 - clarte) / 55)))

    return image


def icone(logo: Image.Image, cote: int) -> Image.Image:
    """
    Icone carree de `cote` pixels, dessin centre sur fond blanc.

    Le fond est opaque et non transparent : une icone d'application est
    systematiquement posee sur un fond inconnu — tuile de bureau, onglet en
    theme sombre — et un embleme detoure y perdrait sa lisibilite.

    Le dessin occupe 82 % du carre, ce qui le maintient dans la zone sure des
    icones « maskable », que certains systemes rognent en cercle.
    """
    utile = int(cote * 0.82)
    echelle = min(utile / logo.width, utile / logo.height)
    taille = (max(1, round(logo.width * echelle)), max(1, round(logo.height * echelle)))

    fond = Image.new("RGBA", (cote, cote), (255, 255, 255, 255))
    dessin = logo.resize(taille, Image.LANCZOS)
    fond.paste(dessin, ((cote - taille[0]) // 2, (cote - taille[1]) // 2), dessin)
    return fond.convert("RGB")


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)

    origine = Image.open(SOURCE)
    print(f"  source : {origine.size[0]}x{origine.size[1]}")

    detoure = detourer(origine)
    opaques = sum(1 for p in detoure.getdata() if p[3] > 0)
    total = detoure.size[0] * detoure.size[1]
    print(f"  fond retire : {100 * (1 - opaques / total):.1f} % de la surface")

    # On recadre sur le dessin : le fond retire laissait des marges vides qui
    # auraient fausse tous les calages ulterieurs.
    boite = detoure.getbbox()
    detoure = adoucir_frange(detoure.crop(boite))
    print(f"  recadre sur le dessin : {detoure.size[0]}x{detoure.size[1]}  (boite {boite})")

    chemin = SORTIE / "logo-technolab.png"
    detoure.save(chemin)
    print(f"    {chemin.name:<28} {chemin.stat().st_size / 1024:6.1f} ko")

    # Declinaison aplatie sur le bleu profond : utile la ou la transparence
    # n'est pas disponible, notamment dans un document PDF.
    sur_fonce = Image.new("RGB", detoure.size, FOND_SOMBRE)
    sur_fonce.paste(detoure, mask=detoure.getchannel("A"))
    chemin = SORTIE / "logo-technolab-sur-marine.png"
    sur_fonce.save(chemin)
    print(f"    {chemin.name:<28} {chemin.stat().st_size / 1024:6.1f} ko")

    SORTIE_SERVEUR.mkdir(parents=True, exist_ok=True)
    detoure.save(SORTIE_SERVEUR / "blason.png")
    # Version aplatie pour les emails : le rendu de la transparence PNG reste
    # inegal d'un client de messagerie a l'autre, l'aplat evite la loterie.
    sur_fonce.save(SORTIE_SERVEUR / "blason-sur-marine.png")
    print(f"    -> server/src/marque/ : blason.png + blason-sur-marine.png")

    print("")
    print("  Icones :")
    for cote in (16, 32, 180, 192, 512):
        img = icone(detoure, cote)
        chemin = SORTIE / f"icone-{cote}.png"
        img.save(chemin)
        # Au-dela de la taille native, le dessin est interpole : on le signale.
        interpole = " (interpolee : source 263 px)" if cote * 0.82 > detoure.width else ""
        print(f"    {chemin.name:<28} {chemin.stat().st_size / 1024:6.1f} ko{interpole}")


if __name__ == "__main__":
    main()
