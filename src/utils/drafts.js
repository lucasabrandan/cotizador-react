// src/utils/drafts.js
// Utilidad simple para guardar/leer/limpiar borradores en localStorage.
// Separa venta y reparación para que no se mezclen.

const KEY_SALE   = "draft_sale_v1";
const KEY_REPAIR = "draft_repair_v1";

function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

export const drafts = {
  sale: {
    load()  {
      const raw = localStorage.getItem(KEY_SALE);
      return safeParse(raw);
    },
    save(v) {
      // Guardamos null si viene vacío para poder "limpiar" sin removeItem
      localStorage.setItem(KEY_SALE, JSON.stringify(v ?? null));
    },
    clear() { localStorage.removeItem(KEY_SALE); }
  },

  repair: {
    load()  {
      const raw = localStorage.getItem(KEY_REPAIR);
      return safeParse(raw);
    },
    save(v) {
      localStorage.setItem(KEY_REPAIR, JSON.stringify(v ?? null));
    },
    clear() { localStorage.removeItem(KEY_REPAIR); }
  }
};
