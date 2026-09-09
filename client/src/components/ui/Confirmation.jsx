/** Dialogue de confirmation pour les actions destructrices ou sensibles. */
import Modale from './Modale.jsx';
import Bouton from './Bouton.jsx';

export default function Confirmation({
  ouverte,
  onFermer,
  onConfirmer,
  titre = 'Confirmer l action',
  message,
  libelleConfirmer = 'Confirmer',
  variante = 'danger',
  chargement = false,
}) {
  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={titre}
      largeur="sm"
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={chargement}>
            Annuler
          </Bouton>
          <Bouton variante={variante} onClick={onConfirmer} chargement={chargement}>
            {libelleConfirmer}
          </Bouton>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modale>
  );
}
