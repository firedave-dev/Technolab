/** Enrobe un handler async pour transmettre les rejets au middleware d'erreurs. */
export const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
