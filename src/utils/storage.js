// src/utils/storage.js
// ===============================================
// Maneja los PRESUPUESTOS DE VENTA (NO reparaciones)
// ===============================================

// Clave de almacenamiento local
const KEY = "quotes_v2";

/**
 * Devuelve todos los presupuestos guardados.
 * @returns {Array} Lista de presupuestos.
 */
export function getQuotes() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Guarda o actualiza un presupuesto.
 * @param {Object} quote - Datos del presupuesto.
 * @returns {string} id del presupuesto guardado.
 */
export function saveQuote(quote) {
  const list = getQuotes();

  // Generar un ID si no existe
  const withId =
    quote && quote.id
      ? quote
      : {
          ...quote,
          id:
            (crypto?.randomUUID && crypto.randomUUID()) ||
            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };

  // Si ya existe, lo reemplaza; si no, lo agrega
  const idx = list.findIndex((q) => q.id === withId.id);
  if (idx >= 0) list[idx] = withId;
  else list.push(withId);

  // Guardar en localStorage
  localStorage.setItem(KEY, JSON.stringify(list));
  return withId.id;
}

/**
 * Elimina un presupuesto por su ID.
 * @param {string} id
 */
export function removeQuote(id) {
  const list = getQuotes().filter((q) => q.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

/**
 * Limpia todos los presupuestos guardados.
 */
export function clearQuotes() {
  localStorage.removeItem(KEY);
}
