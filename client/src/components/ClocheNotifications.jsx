/**
 * Cloche de notifications de la barre superieure.
 * Le compteur se rafraichit toutes les minutes (voir useNotifications).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, CheckCheck, FileSpreadsheet, Info, UserX } from 'lucide-react';
import { useMarquerNotificationLue, useNotifications, useToutMarquerLu } from '../hooks/useScolarite.js';

const ICONES = {
  absence: UserX,
  note: FileSpreadsheet,
  examen: CalendarClock,
  paiement: Info,
  information: Info,
};

/** Ecart lisible : "il y a 5 min", "il y a 3 h", "il y a 2 j". */
function depuis(date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'a l instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`;
  return `il y a ${Math.round(minutes / 1440)} j`;
}

export default function ClocheNotifications() {
  const [ouverte, setOuverte] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const { data } = useNotifications();
  const marquerLue = useMarquerNotificationLue();
  const toutMarquer = useToutMarquerLu();

  useEffect(() => {
    const gerer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOuverte(false);
    };
    document.addEventListener('mousedown', gerer);
    return () => document.removeEventListener('mousedown', gerer);
  }, []);

  const notifications = data?.notifications || [];
  const nonLues = data?.nonLues || 0;

  const ouvrir = (notification) => {
    if (!notification.lu) marquerLue.mutate(notification.id);
    setOuverte(false);
    if (notification.lien) navigate(notification.lien);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuverte((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Notifications${nonLues ? ` (${nonLues} non lues)` : ''}`}
        aria-expanded={ouverte}
      >
        <Bell className="h-5 w-5" />
        {nonLues > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      {ouverte && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-medium text-slate-800">Notifications</p>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={() => toutMarquer.mutate()}
                className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length ? (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const Icone = ICONES[n.type] || Info;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => ouvrir(n)}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          n.lu ? '' : 'bg-brand-50/40'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            n.lu ? 'bg-slate-100 text-slate-400' : 'bg-brand-100 text-brand-600'
                          }`}
                        >
                          <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-800">{n.titre}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{n.message}</span>
                          <span className="mt-1 block text-[11px] text-slate-400">{depuis(n.createdAt)}</span>
                        </span>

                        {!n.lu && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Aucune notification</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
