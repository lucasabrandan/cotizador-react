// src/views/ProductsAdmin.jsx
import React, { useMemo, useState } from "react";
import {
  getProducts,
  upsertProduct,
  removeProduct,
  exportProductsJSON,
  importProductsJSON,
  resetProductsToDefaults,
  setProducts,
} from "../utils/productsStore.js";

export default function ProductsAdmin() {
  // Estado base
  const [rows, setRows] = useState(getProducts());
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  function refresh() {
    setRows(getProducts());
  }

  // ---------- Alta / actualización desde el formulario ----------
  const canAdd = useMemo(
    () => sku.trim() && name.trim() && Number(price) >= 0,
    [sku, name, price]
  );

  function handleAdd(e) {
    e.preventDefault();
    setErr("");
    if (!canAdd) return;

    const existsOther = rows.some(
      (p) => p.sku.trim().toLowerCase() === sku.trim().toLowerCase()
    );

    // Permitimos “Actualizar” si el SKU ya existe
    upsertProduct({ sku: sku.trim(), name: name.trim(), price: Number(price) || 0 });
    refresh();

    setSku("");
    setName("");
    setPrice("");
  }

  // ---------- Edición inline en la tabla ----------
  function handleUpdate(i, field, value) {
    const next = [...rows];
    next[i] = {
      ...next[i],
      [field]: field === "price" ? Number(value) || 0 : value,
    };
    setRows(next);
  }

  function handleBlur(i) {
    setErr("");
    const r = rows[i];

    const cleanSku = String(r.sku || "").trim();
    const cleanName = String(r.name || "").trim();
    const cleanPrice = Number(r.price) || 0;

    if (!cleanSku || !cleanName) {
      // Si el usuario borró datos críticos, simplemente recargamos desde storage
      refresh();
      return;
    }

    // Validar SKU duplicado (distinto índice)
    const duplicate = rows.some(
      (x, idx) => idx !== i && x.sku.trim().toLowerCase() === cleanSku.toLowerCase()
    );
    if (duplicate) {
      setErr("Ya existe otro producto con ese SKU.");
      refresh();
      return;
    }

    upsertProduct({ sku: cleanSku, name: cleanName, price: cleanPrice });
    refresh();
  }

  // ---------- Filtros ----------
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.sku.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s)
    );
  }, [q, rows]);

  // ---------- Importar / Exportar / Reset / Vaciar ----------
  async function handleImport(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      await importProductsJSON(file);
      refresh();
      alert("Catálogo importado ✅");
    } catch (e) {
      alert("Error importando: " + (e?.message || e));
    } finally {
      ev.target.value = "";
    }
  }

  function handleReset() {
    if (!confirm("¿Restaurar catálogo por defecto? Se perderán los cambios.")) return;
    resetProductsToDefaults();
    refresh();
  }

  function handleClearAll() {
    if (!confirm("¿Vaciar TODO el catálogo? Esta acción no se puede deshacer.")) return;
    setProducts([]);
    refresh();
  }

  return (
    <div className="card">
      <h2>Catálogo de productos</h2>

      {/* Toolbar superior */}
      <div className="actions" style={{ justifyContent: "space-between", marginTop: 8, marginBottom: 8 }}>
        <input
          placeholder="Buscar por SKU o nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 260 }}
        />

        <div className="actions" style={{ gap: 8 }}>
          <button className="btn secondary" onClick={exportProductsJSON}>Exportar JSON</button>

          <label className="btn secondary" style={{ cursor: "pointer" }}>
            Importar JSON
            <input
              type="file"
              accept="application/json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>

          <button className="btn ghost" onClick={handleReset}>Restaurar defaults</button>
          <button className="btn danger" onClick={handleClearAll}>Vaciar catálogo</button>
        </div>
      </div>

      {/* Formulario alta/actualización rápida */}
      <form onSubmit={handleAdd} className="row" style={{ marginTop: 10 }}>
        <div>
          <label>SKU</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Ej: TC80"
          />
        </div>
        <div>
          <label>Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Termostato…"
          />
        </div>
        <div>
          <label>Precio</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
          />
        </div>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button className="btn" disabled={!canAdd}>
            Agregar / Actualizar
          </button>
        </div>
      </form>

      {err && <div className="error" style={{ marginTop: 6 }}>{err}</div>}

      {/* Tabla editable */}
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th className="num" style={{ width: 160 }}>Precio</th>
              <th style={{ width: 160 }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#9aa7bd" }}>
                  Sin productos.
                </td>
              </tr>
            )}

            {filtered.map((r, i) => (
              <tr key={`${r.sku}-${i}`}>
                <td data-label="SKU">
                  <input
                    value={r.sku}
                    onChange={(e) => handleUpdate(i, "sku", e.target.value)}
                    onBlur={() => handleBlur(i)}
                    placeholder="SKU"
                  />
                </td>
                <td data-label="Producto">
                  <input
                    value={r.name}
                    onChange={(e) => handleUpdate(i, "name", e.target.value)}
                    onBlur={() => handleBlur(i)}
                    placeholder="Nombre"
                  />
                </td>
                <td data-label="Precio" className="num">
                  <input
                    type="number"
                    min="0"
                    value={r.price}
                    onChange={(e) => handleUpdate(i, "price", e.target.value)}
                    onBlur={() => handleBlur(i)}
                    placeholder="0"
                    style={{ textAlign: "right" }}
                  />
                </td>
                <td>
                  <button
                    className="btn danger"
                    onClick={() => {
                      if (confirm("¿Eliminar producto?")) {
                        removeProduct(r.sku);
                        refresh();
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
