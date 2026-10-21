const CAMPOS_EDITAVEIS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function isTextEditingTarget(target) {
  return Boolean(
    target?.isContentEditable || CAMPOS_EDITAVEIS.has(String(target?.tagName || '').toUpperCase())
  );
}
