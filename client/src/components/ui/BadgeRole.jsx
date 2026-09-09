/** Pastille coloree indiquant le role d'un utilisateur. */
import { ROLE_BADGE, ROLE_LABELS } from '../../utils/roles.js';

export default function BadgeRole({ role, className = '' }) {
  if (!role) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                  ${ROLE_BADGE[role] || 'bg-slate-100 text-slate-600'} ${className}`}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}
