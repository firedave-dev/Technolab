"""
Preparation des photographies du site public.

Execute manuellement quand de nouvelles photos arrivent dans /Images :

    python client/scripts/preparer-photos.py

Ce que fait le script, et pourquoi :

- il ne REDIMENSIONNE JAMAIS VERS LE HAUT. Les originaux fournis sont petits
  (292 px de large pour la plupart) : les agrandir ne creerait pas de detail,
  seulement du flou. Les pages sont donc concues autour de la taille reelle ;
- il produit deux formats par photo, AVIF puis WebP. AVIF pese environ 30 % de
  moins a qualite egale ; WebP sert de repli pour les navigateurs qui l'ignorent.
  La balise <picture> du composant Photo.jsx choisit le premier format supporte ;
- il emet une variante de demi-largeur pour les images assez grandes, afin que
  `srcset` serve un fichier plus leger aux telephones ;
- il RECADRE la photo du festival de Segou : l'original est une capture d'ecran
  de carrousel, avec deux fleches de navigation, deux logos en coin et une
  legende incrustee. Ces elements d'interface n'ont rien a faire dans une
  photographie de site.

Le dossier de sortie (client/public/photos) est versionne : le deploiement
n'a donc besoin ni de Python ni de Pillow.
"""

from pathlib import Path
from PIL import Image

RACINE = Path(__file__).resolve().parents[2]
SOURCE = RACINE / "Images"
SORTIE = RACINE / "client" / "public" / "photos"

# Qualites choisies a l'oeil sur ces photos precises : au-dela, le fichier
# grossit sans gain visible ; en deca, les aplats de ciel se posterisent.
QUALITE_AVIF = 58
QUALITE_WEBP = 80

# Largeur a partir de laquelle une variante mobile vaut la peine d'exister.
SEUIL_VARIANTE = 700

# nom de sortie -> (fichier source, recadrage eventuel en (gauche, haut, droite, bas))
PHOTOS = {
    "remise-diplomes": ("remise de diplome.jpg", None),
    "segou-art": ("festivale ségou art.png", (62, 58, 770, 458)),
    "campus-groupe": ("photo de groupe scolaire.jpg", None),
    "salle-de-classe": ("photo des étudiant dans une salle de classe.avif", None),
    "ceremonie-diplomes": ("remise de diplome 2.avif", None),
    "diplomes-ghana": ("english learning au ghana.avif", None),
    "competition-debat": ("compétition inter universitaire de débat.avif", None),
    "delegation-etudiants": ("photo de groupe basique.avif", None),
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
        print(f"    {chemin.name:<34} {image.width}x{image.height}  "
              f"{chemin.stat().st_size / 1024:6.1f} ko")


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)

    for base, (fichier, recadrage) in PHOTOS.items():
        origine = SOURCE / fichier
        if not origine.exists():
            print(f"  ! introuvable : {fichier}")
            continue

        print(f"\n  {base}  <- {fichier}")
        image = Image.open(origine)

        # Les AVIF fournis portent un canal alpha inutile : il alourdit le
        # fichier sans jamais servir, ces photos etant opaques.
        image = image.convert("RGB")

        if recadrage:
            image = image.crop(recadrage)

        enregistrer(image, base)

        if image.width >= SEUIL_VARIANTE:
            reduite = image.resize(
                (image.width // 2, image.height // 2), Image.LANCZOS
            )
            enregistrer(reduite, base, "@0.5x")


if __name__ == "__main__":
    main()
