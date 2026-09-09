/** Notifications internes de l'utilisateur connecte. */
import { Notification } from '../models/Notification.js';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiError } from '../utils/ApiError.js';

/** GET /api/notifications */
export const lister = catchAsync(async (req, res) => {
  const filtre = { destinataire: req.user._id };
  if (req.query.lu !== undefined) filtre.lu = req.query.lu;

  const [notifications, nonLues] = await Promise.all([
    Notification.find(filtre).sort({ createdAt: -1 }).limit(req.query.limite).lean(),
    Notification.countDocuments({ destinataire: req.user._id, lu: false }),
  ]);

  res.json({
    success: true,
    notifications: notifications.map((n) => ({ ...n, id: n._id })),
    nonLues,
  });
});

/** PATCH /api/notifications/:id/lecture */
export const marquerLue = catchAsync(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    destinataire: req.user._id, // on ne marque que ses propres notifications
  });
  if (!notification) throw ApiError.notFound('Notification introuvable');

  notification.lu = true;
  notification.lueLe = new Date();
  await notification.save();

  res.json({ success: true, notification });
});

/** PATCH /api/notifications/lecture — tout marquer comme lu */
export const toutMarquerLu = catchAsync(async (req, res) => {
  const { modifiedCount } = await Notification.updateMany(
    { destinataire: req.user._id, lu: false },
    { $set: { lu: true, lueLe: new Date() } }
  );

  res.json({ success: true, message: `${modifiedCount} notification(s) marquee(s) comme lue(s)` });
});
