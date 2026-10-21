export function normalizeNumericInput(value, min = 0) {
  const digits = String(value).replace(/\D/g, '');
  if (digits === '') return '';
  return Math.max(Number(min) || 0, Number(digits));
}
