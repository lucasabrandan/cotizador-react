// src/views/RepairQuotesView.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  getRepairs,
  removeRepairQuote,
  exportRepairsJSON,
  importRepairsJSON,
} from "../utils/storageRepairs.js";
import generateRepairPdf, { currency } from "../utils/pdfRepair.js";

export default function RepairQuotesView() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);

  function refresh() {
    // Ordena por fecha (desc) y luego por createdAt
    const list = getRepairs().slice().sort((a, b) => {
      const da = (a.date || "").localeCompare(b.date || "");
      if (da !== 0) return -da;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
    setRows(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = [
        r.quoteNumber,
        r.clientName,
        r.clientContact,
        r.clientEmail,
        r.clientCuit,
        r.notes,
        (r.equipments || [])
          .map(
            (e) =>
              `${e.marca || ""} ${e.modelo || ""} ${e.serie || ""} ${e.descripcion || ""}`
          )
          .join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  async function handlePdf(r) {
    await generateRepairPdf({
      type: "reparacion",
      quoteNumber: r.quoteNumber,
      date: r.date,
      clientName: r.clientName,
      clientContact: r.clientContact,
      clientEmail: r.clientEmail,
      clientCuit: r.clientCuit,
      clientFiscal: r.clientFiscal,
      equipments: r.equipments || [],
      items: r.items || [],
      subtotal: Number(r.subtotal) || 0,
      finalTotal: Number(r.finalTotal) || 0,
      notes: r.notes || "",
    });
  }

  function handleDelete(id) {
    if (!confirm("¿Eliminar esta reparación?")) return;
    removeRepairQuote(id);
    refresh();
  }

  async function onImportChange(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importRepairsJSON(file);
      refresh();
      alert("Reparaciones importadas ✅");
    } catch (e) {
      alert("Error importando: " + (e?.message || e));
    } finally {
      setImporting(false);
      ev.target.value = "";
    }
  }

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Reparaciones guardadas</h2>

      {/* Filtros / acciones */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por N°, cliente, equipo, etc."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn secondary" onClick={exportRepairsJSON}>
          Exportar JSON
        </button>
        <label className="btn secondary" style={{ cursor: "pointer" }}>
          Importar JSON
          <input
            type="file"
            accept="application/json"
            onChange={onImportChange}
            style={{ display: "none" }}
            disabled={importing}
          />
        </label>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>N°</th>
              <th>Cliente</th>
              <th>Equipos</th>
              <th className="num">Total</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#9aa7bd" }}>
                  No hay reparaciones.
                </td>
              </tr>
            )}

            {filtered.map((r) => (
              <tr key={r.id}>
                <td data-label="Fecha">{r.date || "-"}</td>
                <td data-label="N°">{r.quoteNumber || "-"}</td>
                <td data-label="Cliente">{r.clientName || "-"}</td>
                <td data-label="Equipos">{(r.equipments || []).length}</td>
                <td data-label="Total" className="num">
                  {currency.format(Number(r.finalTotal) || 0)}
                </td>
                <td data-label="Acción">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => handlePdf(r)}>
                      PDF
                    </button>
                    <button className="btn danger" onClick={() => handleDelete(r.id)}>
                      Eliminar
                    </button>
                    {/* Si en el futuro querés “Editar”, tendríamos que guardar la reparación en un estado global
                        o pasar por URL con ID y rehidratar en RepairQuoteView. */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
