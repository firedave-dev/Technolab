# Rapport de fin de cycle — mode d'emploi

Ce dossier fabrique le mémoire au format Word. Tout est regénérable : on ne
modifie jamais le `.docx` directement, on modifie une source et on relance.

## Fabriquer le document

```bash
cd rapport
python diagrammes.py     # produit les 13 figures dans figures/
python rapport.py        # produit le .docx
```

Le fichier obtenu est **`Rapport de fin de cycle - Technolab ISTA.docx`**.

À l'ouverture, Word propose de mettre à jour les champs : **acceptez**. La table
des matières, la liste des figures et celle des tableaux se composent alors
toutes seules, avec les bons numéros de page. On peut refaire la manœuvre à tout
moment : `Ctrl+A` puis `F9`.

## Où modifier quoi

| Ce que vous voulez changer | Fichier |
|---|---|
| Noms, tuteur, dates, promotion, thème, dédicace | `infos.py` |
| Le texte des chapitres, l'ordre des sections | `contenu.py` |
| Un diagramme | `diagrammes.py` |
| La couverture, les pages liminaires, le résumé | `rapport.py` |
| La typographie (police, tailles, marges, couleurs) | `docx_outils.py` |

### Le plus fréquent

- **Corriger une phrase** → `contenu.py`, puis `python rapport.py`.
- **Changer un nom ou une date** → `infos.py`, puis `python rapport.py`.
  Les champs encore marqués `A COMPLETER` sont signalés à la génération et
  apparaissent **en rouge** sur la couverture : impossible de les oublier.
- **Retoucher un diagramme** → la fonction correspondante dans `diagrammes.py`,
  puis `python diagrammes.py` puis `python rapport.py`.
- **Passer tous les titres en noir** → dans `docx_outils.py`, remplacer
  `COULEUR_TITRES = RGBColor(0x2E, 0x44, 0x74)` par `RGBColor(0, 0, 0)`.

## Les captures d'écran

Déposez-les dans `captures/` avec les noms indiqués dans
`captures/LISEZ-MOI.txt`. Tant qu'une capture manque, un **cadre rouge** prend
sa place dans le document, avec le nom du fichier attendu : le rapport se génère
quand même, et vous complétez au fur et à mesure.

Le script vous dit à chaque génération combien de captures manquent.

## Conformité au guide de l'institut

Le document applique le *Guide de rédaction du Projet Tutoré de fin de cycle* :

- Times New Roman — 16 pour les titres, 14 pour les sous-titres, 12 pour le corps
- interligne 1,5, texte justifié, marges de 2,54 cm
- pagination : chiffres romains pour les pages liminaires, chiffres arabes
  repartant de 1 au début du corps
- un chapitre par nouvelle page
- légende **sous** les figures, **au-dessus** des tableaux, avec la source en
  dessous
- introduction et conclusion non numérotées ; trois chapitres numérotés

## Produire le PDF pour l'impression

Depuis Word : `Fichier` → `Enregistrer sous` → format PDF. Pensez à mettre les
champs à jour (`Ctrl+A`, `F9`) **avant** l'export, sinon la table des matières
sortira vide.

Le guide demande deux exemplaires papier, imprimés en recto seul, à déposer
auprès du chef de centre.
