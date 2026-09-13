"""
Image de partage social (Open Graph / Twitter Card).

    python client/scripts/preparer-partage.py

POURQUOI CE FICHIER EXISTE

Le site servait son icone d'application (512 x 512) comme image de partage. Une
icone carree, dans un fil d'actualite ou une conversation, est rendue en vignette
minuscule a cote du titre : le lien ressemble a une piece jointe, pas a une page.

Le format attendu est 1200 x 630 — proportion 1,91:1, celle que Facebook,
LinkedIn, WhatsApp et X decoupent sans rogner. En dessous de 600 px de large,
plusieurs plateformes refusent la grande carte et retombent sur la vignette.

COMPOSITION — une photographie reelle assombrie, le blason, le nom et une ligne
de situation geographique. Cette derniere n'est pas decorative : c'est souvent
le seul texte visible quand le lien est partage dans une conversation, et elle
repond a la question « ou est cette ecole ? » avant meme le clic.
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

RACINE = Path(__file__).resolve().parents[2]
PHOTOS = RACINE / "client" / "public" / "photos"
MARQUE = RACINE / "client" / "public" / "marque"
SORTIE = MARQUE / "partage-1200x630.png"

LARGEUR, HAUTEUR = 1200, 630

MARINE = (46, 68, 116)
VERT = (3, 129, 41)
BLANC = (255, 255, 255)
CLAIR = (196, 205, 220)

# Photographie de fond : une remise de diplomes.
#
# Le choix n'est pas neutre. Une photo de plage — pourtant plus large et donc
# plus confortable a recadrer — faisait ressembler la carte de partage a une
# offre de sejour. Ce qu'un institut superieur doit montrer quand son lien
# circule, c'est l'aboutissement de son cursus.
#
# 1000 px de large pour une cible de 1200 : l'agrandissement de 1,2x est
# imperceptible une fois l'image assombrie et voilee.
FOND = "remise-diplomes.webp"


def police(taille, gras=False):
    """
    Police systeme, avec repli.

    Archivo n'est disponible qu'en WOFF2, format que Pillow ne sait pas lire. On
    emprunte donc une grotesque systeme : l'image de partage n'est pas un
    document de charte, et le nom y est de toute facon compose en gras serre.
    """
    candidats = (
        ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"]
        if gras
        else ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"]
    )
    for nom in candidats:
        try:
            return ImageFont.truetype(nom, taille)
        except OSError:
            continue
    return ImageFont.load_default()


def fond_assombri():
    """Photographie recadree en 1200x630, assombrie pour que le texte porte."""
    photo = Image.open(PHOTOS / FOND).convert("RGB")

    # Recadrage centre a la bonne proportion, sans deformer.
    cible = LARGEUR / HAUTEUR
    actuelle = photo.width / photo.height

    if actuelle > cible:
        largeur = int(photo.height * cible)
        gauche = (photo.width - largeur) // 2
        photo = photo.crop((gauche, 0, gauche + largeur, photo.height))
    else:
        hauteur = int(photo.width / cible)
        haut = (photo.height - hauteur) // 2
        photo = photo.crop((0, haut, photo.width, haut + hauteur))

    photo = photo.resize((LARGEUR, HAUTEUR), Image.LANCZOS)

    # Assombrissement, puis voile marine : le texte blanc doit rester lisible
    # quelle que soit la zone de la photo qu'il recouvre.
    photo = ImageEnhance.Brightness(photo).enhance(0.42)
    voile = Image.new("RGB", (LARGEUR, HAUTEUR), MARINE)
    return Image.blend(photo, voile, 0.55)


def main() -> None:
    image = fond_assombri()
    dessin = ImageDraw.Draw(image)

    # --- Filet de marque, en haut ---
    dessin.rectangle([(0, 0), (LARGEUR, 8)], fill=VERT)

    # --- Blason ---
    blason = Image.open(MARQUE / "logo-technolab.png").convert("RGBA")
    cote = 132
    blason = blason.resize((round(cote * blason.width / blason.height), cote), Image.LANCZOS)
    image.paste(blason, (72, 96), blason)

    x = 72 + blason.width + 28

    # --- Nom et sous-titre ---
    dessin.text((x, 108), "TechnoLAB-ISTA", font=police(56, gras=True), fill=BLANC)
    dessin.text(
        (x, 176),
        "INSTITUT SUPÉRIEUR DE TECHNOLOGIES APPLIQUÉES",
        font=police(19),
        fill=CLAIR,
    )

    # --- Promesse ---
    dessin.text(
        (72, 318),
        "Du DUT au master en gestion, technologies",
        font=police(42, gras=True),
        fill=BLANC,
    )
    dessin.text((72, 372), "et sciences de l’ingénieur", font=police(42, gras=True), fill=BLANC)

    # --- Situation geographique ---
    #
    # Souvent le seul texte visible quand le lien circule dans une conversation :
    # il repond a « ou ? » avant le clic.
    dessin.rectangle([(72, 468), (76, 512)], fill=VERT)
    dessin.text((92, 466), "Sévaré, région de Mopti — Mali", font=police(26, gras=True), fill=BLANC)
    dessin.text((92, 498), "Établissement privé agréé — diplômes reconnus CAMES", font=police(20), fill=CLAIR)

    # --- Bandeau de pied ---
    dessin.rectangle([(0, HAUTEUR - 54), (LARGEUR, HAUTEUR)], fill=MARINE)
    dessin.text((72, HAUTEUR - 38), "technolab-ista.org", font=police(20), fill=CLAIR)

    image.save(SORTIE, optimize=True)
    print(f"  {SORTIE.name}  {LARGEUR}x{HAUTEUR}  {SORTIE.stat().st_size / 1024:.1f} ko")


if __name__ == "__main__":
    main()
