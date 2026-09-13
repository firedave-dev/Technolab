"""
Preparation des photographies du site public.

Execute manuellement quand de nouvelles photos arrivent dans /Images :

    python client/scripts/preparer-photos.py

Ce que fait le script, et pourquoi :

- il ne REDIMENSIONNE JAMAIS VERS LE HAUT. Les cliches sont utilises a leur
  taille reelle ou en dessous ; un agrandissement ne cree pas de detail, il
  ajoute du flou ;

- il produit deux formats par photo, AVIF puis WebP. AVIF pese environ 30 % de
  moins a qualite egale ; WebP sert de repli. La balise <picture> du composant
  Photo.jsx choisit le premier format supporte ;

- il emet une variante de demi-largeur pour les images assez grandes, afin que
  `srcset` serve un fichier plus leger aux telephones ;

- il RECADRE les cliches exportes pour les reseaux sociaux. Quatre d'entre eux
  portent un bandeau vert incruste, des logos en coin, parfois des fleches de
  carrousel. Ce texte grave dans l'image n'est ni selectionnable, ni traduisible,
  ni lisible par un lecteur d'ecran, et il se retrouverait fige au milieu d'une
  mise en page qui a ses propres titres. Le nom de l'etablissement est porte par
  la page, pas par la photographie.

Le dossier de sortie (client/public/photos) est versionne : le deploiement
n'a donc besoin ni de Python ni de Pillow.
"""

from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
SOURCE = RACINE / "Images"
SORTIE = RACINE / "client" / "public" / "photos"

# Qualites choisies a l'oeil sur ces photos : au-dela, le fichier grossit sans
# gain visible ; en deca, les aplats de ciel se posterisent.
QUALITE_AVIF = 58
QUALITE_WEBP = 80

# Largeur a partir de laquelle une variante mobile vaut la peine d'exister.
SEUIL_VARIANTE = 700

# nom de sortie -> (fichier source, recadrage en (gauche, haut, droite, bas) ou None)
PHOTOS = {
    "remise-diplomes": ("Photo 8 - Remise de diplôme 07.jpg", None),
    "diplomes-groupe": ("Photo 6 - Remise de diplôme 05.jpg", None),
    "remise-certificat": ("Photo 7 - Remise de diplôme 06.jpg", None),
    "ceremonie": ("Photo 3 - Remise de diplôme 03.jpg", None),
    "diplomes-scene": ("Photo 4 - Remise de diplôme 04.jpg", None),
    "remise-directeur": ("Photo 1 - Remise de diplôme 01.jpg", None),
    "seance-travail": ("Photo 8 - Photo de Pro d'Etudiants dans une Salle de Classe 01.jpg", None),
    "etudiants-groupe": ("Photo 8 - Photo de Pro de 4 Etudiants 01.jpg", None),
    "salle-de-classe": ("Photo 11 - Photo de Pro d'Etudiants dans une Salle de Classe 02.jpg", None),
    "assemblee-generale": ("Photo 5 - Photo de Groupe à l'Assemblée  Générale 01.jpg", None),

    # Cliches reseaux sociaux : le bandeau incruste et les logos sont retires.
    "segou-art": (
        "Photo 12 - Photo de  d'Etudiants au Festivale Ségou Art sur le Fleuve Niger 01.jpg",
        (28, 46, 792, 410),
    ),
    "dakar-plage": (
        "Photo 12 - Photo de  d'Etudiants à Dakar (Journée de Détente à la Voile d'Or) 01.jpg",
        (0, 0, 1440, 832),
    ),
    "lac-rose": (
        "Photo 15- Photo de  d'Etudiants à Dakar (Visite au Lac Rose) 01.jpg",
        (0, 0, 1440, 828),
    ),
}


def enregistrer(image: Image.Image, base: str, suffixe: str = "") -> None:
    """Ecrit une image dans les deux formats, et rapporte le poids obtenu."""
    nom = f"{base}{suffixe}"
    for extension, options in (
        ("avif", {"quality": QUALITE_AVIF}),
        ("webp", {"quality": QUALITE_WEBP, "method": 6}),
    ):
        chemin = SORTIE / f"{nom}.{extension}"
        image.save(chemin, **options)
        print(f"    {chemin.name:<32} {image.width}x{image.height}  "
              f"{chemin.stat().st_size / 1024:6.1f} ko")


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)

    # Les anciens cliches, flous, ne doivent pas survivre a la mise a jour :
    # laisses en place ils resteraient servis par leur URL.
    for ancien in SORTIE.glob("*"):
        ancien.unlink()

    manifeste = []

    for base, (fichier, recadrage) in PHOTOS.items():
        origine = SOURCE / fichier
        if not origine.exists():
            print(f"  ! introuvable : {fichier}")
            continue

        print(f"\n  {base}")
        image = Image.open(origine).convert("RGB")

        if recadrage:
            image = image.crop(recadrage)

        enregistrer(image, base)
        variante = image.width >= SEUIL_VARIANTE

        if variante:
            reduite = image.resize((image.width // 2, image.height // 2), Image.LANCZOS)
            enregistrer(reduite, base, "@0.5x")

        manifeste.append((base, image.width, image.height, variante))

    print("\n  Dimensions a reporter dans client/src/utils/photos.js :")
    for base, largeur, hauteur, variante in manifeste:
        print(f"    {base:<22} largeur: {largeur}, hauteur: {hauteur}, variante: "
              f"{'true' if variante else 'false'}")


if __name__ == "__main__":
    main()
