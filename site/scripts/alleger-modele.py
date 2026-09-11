"""
Retire du modele 3D les textures qu'il embarque.

    python scripts/alleger-modele.py

Le fichier distribue pese 759 Ko, dont 709 Ko de textures PNG :

  - une premiere image (478 Ko) porte l'atlas clavier + ecran. Elle est
    desormais remplacee a l'execution par laptop-ecran.webp (60 Ko), qui
    contient le meme clavier et le vrai tableau de bord a la place du bureau
    Windows de l'auteur du modele ;
  - une seconde (231 Ko) sert de carte speculaire, via l'extension
    KHR_materials_specular. Sur un materiau mat et un eclairage reduit a deux
    sources, son effet est imperceptible ; elle part avec le reste.

Les retirer laisse un fichier de geometrie pure d'environ 50 Ko. Avec la
texture WebP, le hero passe de 759 Ko a une centaine — ce qui compte pour un
public qui visite souvent depuis des connexions limitees.

Le script est sur : il verifie qu'aucun accesseur ne pointe vers les vues de
tampon supprimees, et refuse d'ecrire si ce n'est pas le cas.
"""

import json
import pathlib
import struct

RACINE = pathlib.Path(__file__).resolve().parents[1]
SOURCE = RACINE / 'public' / 'models' / 'laptop.glb'
SORTIE = RACINE / 'public' / 'models' / 'laptop-geometrie.glb'

ENTETE_JSON = 0x4E4F534A
ENTETE_BIN = 0x004E4942


def lire(chemin):
    donnees = chemin.read_bytes()
    _, _, longueur = struct.unpack('<III', donnees[:12])
    position, js, binaire = 12, None, None
    while position < longueur:
        taille, type_ = struct.unpack('<II', donnees[position:position + 8])
        bloc = donnees[position + 8:position + 8 + taille]
        if type_ == ENTETE_JSON:
            js = json.loads(bloc)
        elif type_ == ENTETE_BIN:
            binaire = bloc
        position += 8 + taille
    return js, binaire


def bourrage(donnees, octet):
    """Chaque bloc d'un .glb doit s'aligner sur quatre octets."""
    reste = (-len(donnees)) % 4
    return donnees + octet * reste


def main():
    js, binaire = lire(SOURCE)
    poids_avant = SOURCE.stat().st_size

    vues_images = {img['bufferView'] for img in js.get('images', [])}
    print(f'  vues de tampon portant une image : {sorted(vues_images)}')

    # Une vue utilisee par un accesseur ne doit surtout pas etre supprimee.
    vues_geometrie = {a['bufferView'] for a in js['accessors'] if 'bufferView' in a}
    conflit = vues_images & vues_geometrie
    if conflit:
        raise SystemExit(f'Refus : les vues {conflit} portent aussi de la geometrie.')

    # Les images occupent-elles bien la fin du tampon ? Si oui, une simple
    # troncature suffit et aucun index n'a besoin d'etre renumerote.
    debut_images = min(js['bufferViews'][v].get('byteOffset', 0) for v in vues_images)
    fin_geometrie = max(
        js['bufferViews'][v].get('byteOffset', 0) + js['bufferViews'][v]['byteLength']
        for v in vues_geometrie
    )
    if debut_images < fin_geometrie:
        raise SystemExit('Refus : les images ne sont pas en fin de tampon.')

    print(f'  geometrie : 0 a {fin_geometrie} octets')
    print(f'  images    : {debut_images} a {len(binaire)} octets')

    # --- Suppression ---
    js['bufferViews'] = [
        bv for i, bv in enumerate(js['bufferViews']) if i not in vues_images
    ]
    js.pop('images', None)
    js.pop('textures', None)
    js.pop('samplers', None)

    # Le materiau ne peut plus designer une texture qui n'existe plus.
    #
    # Le nettoyage est RECURSIF, et ce detail a son importance : la seconde image
    # du fichier n'etait pas orpheline comme une lecture rapide le laissait
    # croire. Elle est referencee depuis l'extension KHR_materials_specular,
    # c'est-a-dire dans une branche que les emplacements standard du materiau ne
    # montrent pas. Ne retirer que ceux-la laissait un renvoi vers une texture
    # supprimee, et le chargeur echouait sur un index introuvable.
    def retirer_textures(noeud):
        if isinstance(noeud, dict):
            for cle in [k for k in noeud if k.endswith('Texture')]:
                del noeud[cle]
            for valeur in noeud.values():
                retirer_textures(valeur)
        elif isinstance(noeud, list):
            for valeur in noeud:
                retirer_textures(valeur)

    for materiau in js.get('materials', []):
        retirer_textures(materiau)
        pbr = materiau.setdefault('pbrMetallicRoughness', {})
        pbr.setdefault('baseColorFactor', [1, 1, 1, 1])

    binaire = binaire[:debut_images]
    js['buffers'][0]['byteLength'] = len(binaire)

    # --- Reassemblage ---
    bloc_json = bourrage(json.dumps(js, separators=(',', ':')).encode('utf-8'), b' ')
    bloc_bin = bourrage(binaire, b'\x00')

    corps = (
        struct.pack('<II', len(bloc_json), ENTETE_JSON) + bloc_json
        + struct.pack('<II', len(bloc_bin), ENTETE_BIN) + bloc_bin
    )
    fichier = struct.pack('<III', 0x46546C67, 2, 12 + len(corps)) + corps

    SORTIE.write_bytes(fichier)
    print(f'\n  {SOURCE.name:<24} {poids_avant / 1024:7.0f} Ko')
    print(f'  {SORTIE.name:<24} {len(fichier) / 1024:7.0f} Ko'
          f'   ({100 * (1 - len(fichier) / poids_avant):.0f} % de moins)')


if __name__ == '__main__':
    main()
