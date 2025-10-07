// src/utils/storageRepairs.js
// Storage independiente para REPARACIONES (no se mezcla con ventas)

const KEY = "repairs_v1";

/** Lee todas las reparaciones guardadas */
export function getRepairs() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Crea/actualiza una reparación (si payload trae id, actualiza; si no, crea una nueva) */
export function saveRepairQuote(payload) {
  const list = getRepairs();

  const withId =
    payload && payload.id
      ? payload
      : { ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };

  const idx = list.findIndex((x) => x.id === withId.id);
  if (idx >= 0) list[idx] = withId;
  else list.push(withId);

  localStorage.setItem(KEY, JSON.stringify(list));
  return withId.id;
}

/** Elimina una reparación por id */
export function removeRepairQuote(id) {
  const list = getRepairs().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** Limpia todas las reparaciones */
export function clearRepairs() {
  localStorage.removeItem(KEY);
}

/** Exporta todas las reparaciones en un .json (descarga) */
export function exportRepairsJSON() {
  const blob = new Blob([JSON.stringify(getRepairs(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reparaciones.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Importa reparaciones desde un .json (reemplaza por completo) */
export function importRepairsJSON(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data)) throw new Error("Formato inválido, se esperaba un arreglo.");
        localStorage.setItem(KEY, JSON.stringify(data));
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = reject;
    r.readAsText(file);
  });
}
// Alias para mantener compatibilidad con las vistas
export const getRepairQuotes = getRepairs;
