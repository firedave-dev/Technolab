/**
 * Middleware de validation base sur Zod.
 * Usage : router.post('/x', validate({ body: schema }), controller)
 * Les donnees validees remplacent req.body / req.params / req.query.
 */
import { ApiError } from '../utils/ApiError.js';

export const validate = (schemas) => (req, res, next) => {
  for (const source of ['body', 'params', 'query']) {
    const schema = schemas[source];
    if (!schema) continue;

    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        champ: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Donnees invalides', details));
    }
    // req.query est en lecture seule sous Express 5 : on redefinit la propriete.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
  }
  next();
};
