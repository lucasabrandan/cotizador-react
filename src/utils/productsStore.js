// src/utils/productsStore.js
// Catálogo de productos persistido en LocalStorage (con seed desde DEFAULT_PRODUCTS)

import { DEFAULT_PRODUCTS } from "../data/products.js";


const KEY = "product_catalog_v1";

/* ---------- Helpers ---------- */
function normalizeProduct(p) {
  return {
    sku: String(p?.sku || "").trim(),
    name: String(p?.name || "").trim(),
    price: Number(p?.price) || 0,
  };
}

function isValid(p) {
  return p && typeof p === "object" && p.sku && p.name && typeof p.price === "number" && !Number.isNaN(p.price);
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRaw(list) {
  localStorage.setItem(KEY, JSON.stringify(list || []));
}

/**
 * Semilla inicial (si no existe catálogo) o “autocuración” si el contenido es inválido.
 * Retorna SIEMPRE una lista válida.
 */
function ensureCatalog() {
  const data = loadRaw();
  if (Array.isArray(data) && data.length) {
    const clean = data.map(normalizeProduct).filter(isValid);
    if (clean.length) return clean;
  }
  // Seed inicial con los defaults
  const seeded = DEFAULT_PRODUCTS.map(normalizeProduct).filter(isValid);
  saveRaw(seeded);
  return seeded;
}

/* ---------- API pública ---------- */

/** Obtiene el catálogo (si no hay, se siembra con DEFAULT_PRODUCTS) */
export function getProducts() {
  return ensureCatalog();
}

/** Reemplaza TODA la lista (normaliza + valida) */
export function setProducts(products) {
  const clean = (Array.isArray(products) ? products : [])
    .map(normalizeProduct)
    .filter(isValid);
  saveRaw(clean);
}

/**
 * Inserta/actualiza por SKU (case-insensitive).
 * - Si existe, mergea y normaliza.
 * - Si no existe, lo agrega.
 */
export function upsertProduct(prod) {
  const list = getProducts();
  const np = normalizeProduct(prod);
  if (!isValid(np)) return;

  const idx = list.findIndex(
    (p) => p.sku.toLowerCase() === np.sku.toLowerCase()
  );
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...np };
  } else {
    list.push(np);
  }
  saveRaw(list);
}

/** Elimina un producto por SKU (case-insensitive) */
export function removeProduct(sku) {
  const target = String(sku || "").trim().toLowerCase();
  const list = getProducts().filter((p) => p.sku.toLowerCase() !== target);
  saveRaw(list);
}

/** Restablece el catálogo a los DEFAULT_PRODUCTS actuales */
export function resetProductsToDefaults() {
  const seeded = DEFAULT_PRODUCTS.map(normalizeProduct).filter(isValid);
  saveRaw(seeded);
}

/**
 * Exporta el catálogo actual como archivo JSON descargable.
 * (Descarga “productos.json”)
 */
export function exportProductsJSON() {
  const blob = new Blob([JSON.stringify(getProducts(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "productos.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Importa desde un File (input type="file") y reemplaza el catálogo.
 * Normaliza/valida y descarta registros inválidos.
 * Devuelve una Promise.
 */
export function importProductsJSON(file) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error("El JSON debe ser un array de productos.");
          const clean = data.map(normalizeProduct).filter(isValid);
          saveRaw(clean);
          resolve({ ok: true, count: clean.length });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    } catch (e) {
      reject(e);
    }
  });
}
// Alias por compatibilidad con componentes que importan "saveProducts"
export const saveProducts = setProducts;
