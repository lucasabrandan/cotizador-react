// src/views/RepairQuoteView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getProducts } from "@/utils/productsStore.js";
import { saveRepairQuote } from "@/utils/storageRepairs.js";
import generateRepairPdf, { currency } from "@/utils/pdfRepair.js";

const FISCAL_OPTIONS = [
  "Consumidor Final",
  "Responsable Inscripto",
  "Monotributista",
  "Exento",
  "No Responsable",
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const maxDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 50);
  return d.toISOString().slice(0, 10);
};
const defaultRepNum = () =>
  "REP-" + todayStr().slice(5, 10).replace("-", "") + "-A";

const DRAFT_KEY = "draft_repair_v1";

function blankEquipment() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()),
    marca: "",
    modelo: "",
    serie: "",
    descripcion: "",
    manoObra: 0,
    repuestoSearch: "",
    repuestos: [], // {sku,name,price,qty}
    sugOpen: false,
    sugIndex: -1,
  };
}

export default function RepairQuoteView() {
  // Cabecera
  const [quoteNumber, setQuoteNumber] = useState(defaultRepNum());
  const [date, setDate] = useState(todayStr());
  const minDate = todayStr();
  const maxDate = maxDateStr();

  // Cliente
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCuit, setClientCuit] = useState("");
  const [clientFiscal, setClientFiscal] = useState(FISCAL_OPTIONS[0]);

  // Equipos
  const [equipos, setEquipos] = useState([blankEquipment()]);
  const searchRefs = useRef({}); // para devolver foco por equipo

  // Notas
  const [notes, setNotes] = useState(
    "Este presupuesto posee una validez de 7 días a partir de su emisión."
  );

  /* ========== Restaurar borrador ========== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);

      setQuoteNumber(d.quoteNumber ?? defaultRepNum());
      setDate(d.date ?? todayStr());
      setClientName(d.clientName ?? "");
      setClientContact(d.clientContact ?? "");
      setClientEmail(d.clientEmail ?? "");
      setClientCuit(d.clientCuit ?? "");
      setClientFiscal(d.clientFiscal ?? FISCAL_OPTIONS[0]);

      if (Array.isArray(d.equipos) && d.equipos.length) {
        setEquipos(
          d.equipos.map((e) => ({
            ...blankEquipment(),
            ...e,
            id: e.id || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())),
            repuestos: Array.isArray(e.repuestos) ? e.repuestos : [],
            sugOpen: false,
            sugIndex: -1,
          }))
        );
      }
      setNotes(d.notes ?? notes);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ========== Guardar borrador ========== */
  useEffect(() => {
    const payload = {
      quoteNumber,
      date,
      clientName,
      clientContact,
      clientEmail,
      clientCuit,
      clientFiscal,
      equipos,
      notes,
      _ts: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [
    quoteNumber,
    date,
    clientName,
    clientContact,
    clientEmail,
    clientCuit,
    clientFiscal,
    equipos,
    notes,
  ]);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    alert("Borrador de reparación limpiado ✅");
  }

  /* ========== Sugerencias por equipo ========== */
  function suggestionsFor(equipo) {
    const list = getProducts();
    const q = (equipo.repuestoSearch || "").trim().toLowerCase();
    if (!q) return [];
    return list
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 30);
  }

  function updateEquipo(id, patch) {
    setEquipos((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function addEquipo() {
    setEquipos((prev) => [...prev, blankEquipment()]);
  }

  function removeEquipo(id) {
    setEquipos((prev) => prev.filter((e) => e.id !== id));
  }

  function addRepuesto(equipoId, prod) {
    setEquipos((prev) =>
      prev.map((e) => {
        if (e.id !== equipoId) return e;
        const i = e.repuestos.findIndex((x) => x.sku === prod.sku);
        if (i >= 0) {
          const copy = [...e.repuestos];
          copy[i] = {
            ...copy[i],
            qty: (Number(copy[i].qty) || 0) + 1,
            price: Number(prod.price) || 0,
            name: prod.name,
          };
          return { ...e, repuestos: copy, repuestoSearch: "", sugOpen: false, sugIndex: -1 };
        }
        return {
          ...e,
          repuestos: [
            ...e.repuestos,
            { sku: prod.sku, name: prod.name, price: Number(prod.price) || 0, qty: 1 },
          ],
          repuestoSearch: "",
          sugOpen: false,
          sugIndex: -1,
        };
      })
    );
    searchRefs.current[equipoId]?.focus();
  }

  function updateQty(equipoId, sku, val) {
    const v = Math.max(1, Number(val) || 1);
    setEquipos((prev) =>
      prev.map((e) =>
        e.id === equipoId
          ? { ...e, repuestos: e.repuestos.map((r) => (r.sku === sku ? { ...r, qty: v } : r)) }
          : e
      )
    );
  }

  function removeRepuesto(equipoId, sku) {
    setEquipos((prev) =>
      prev.map((e) =>
        e.id === equipoId ? { ...e, repuestos: e.repuestos.filter((r) => r.sku !== sku) } : e
      )
    );
  }

  /* ========== Totales ========== */
  const subtotal = useMemo(() => {
    let sum = 0;
    for (const e of equipos) {
      const rep = e.repuestos.reduce(
        (a, r) => a + (Number(r.price) || 0) * (Number(r.qty) || 0),
        0
      );
      sum += rep + (Number(e.manoObra) || 0);
    }
    return sum;
  }, [equipos]);

  const finalTotal = subtotal;

  /* ========== Validaciones ========== */
  const clientOk = clientName.trim().length > 0;
  const dateOk = date >= minDate && date <= maxDate;
  const equiposOk = equipos.every(
    (e) =>
      (e.marca.trim() || e.modelo.trim() || e.serie.trim() || e.descripcion.trim()) &&
      (e.repuestos.length > 0 || Number(e.manoObra) > 0)
  );
  const canAct = clientOk && dateOk && equiposOk && subtotal > 0;

  /* ========== Ítems aplanados (para PDF/guardar/WA) ========== */
  function flattenItems() {
    const items = [];
    for (const e of equipos) {
      if (e.manoObra) {
        items.push({
          sku: "MO",
          name: `Mano de obra — ${e.marca || ""} ${e.modelo || ""} ${
            e.serie ? `(${e.serie})` : ""
          }`.trim(),
          price: Number(e.manoObra) || 0,
          qty: 1,
        });
      }
      for (const r of e.repuestos) {
        items.push({
          sku: r.sku,
          name: `${r.name} — ${e.marca || ""} ${e.modelo || ""}`.trim(),
          price: Number(r.price) || 0,
          qty: Number(r.qty) || 1,
        });
      }
    }
    return items;
  }

  /* ========== Guardar ========== */
  function handleSave() {
    if (!canAct) return;
    const payload = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: "reparacion",
      quoteNumber,
      date,
      clientName,
      clientContact,
      clientEmail,
      clientCuit,
      clientFiscal,
      equipments: equipos, // detalle
      items: flattenItems(), // aplanado
      subtotal,
      finalTotal,
      notes,
      createdAt: new Date().toISOString(),
    };
    saveRepairQuote(payload);
    alert("Reparación guardada ✅");
  }

  /* ========== PDF ========== */
  async function handlePdf() {
    if (!canAct) return;
    await generateRepairPdf({
      type: "reparacion",
      quoteNumber,
      date,
      clientName,
      clientContact,
      clientEmail,
      clientCuit,
      clientFiscal,
      equipments: equipos,
      items: flattenItems(),
      subtotal,
      finalTotal,
      notes,
    });
  }

  /* ========== WhatsApp ========== */
  function shareWhatsApp() {
    if (!canAct) return;
    const items = flattenItems();
    const top = items.slice(0, 12);
    const equiposResumen = equipos
      .map((e, i) => `• E${i + 1}: ${[e.marca, e.modelo, e.serie].filter(Boolean).join(" ")}${e.descripcion ? ` — ${e.descripcion}` : ""}`)
      .join("\n");

    const lines = [
      `*Presupuesto de Reparación*`,
      `N°: ${quoteNumber}`,
      `Fecha: ${date}`,
      `Cliente: ${clientName}`,
      clientContact ? `Contacto: ${clientContact}` : null,
      clientEmail ? `Email: ${clientEmail}` : null,
      clientCuit ? `CUIT/CUIL: ${clientCuit}` : null,
      clientFiscal ? `Cond. Fiscal: ${clientFiscal}` : null,
      ``,
      `*Equipos (${equipos.length})*`,
      equiposResumen || "-",
      ``,
      `*Ítems (${items.length})*`,
      ...top.map(
        (it) =>
          `• ${it.sku} — ${it.name} x${it.qty} @ ${currency.format(Number(it.price) || 0)} = ${currency.format(
            (Number(it.price) || 0) * (Number(it.qty) || 0)
          )}`
      ),
      items.length > top.length ? `… (${items.length - top.length} más)` : null,
      ``,
      `TOTAL: *${currency.format(finalTotal)}*`,
      notes ? `\nNotas: ${notes}` : null,
    ].filter(Boolean);

    const txt = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/?text=${txt}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="card">
      <h2>Nueva Reparación</h2>

      {/* Cabecera */}
      <div className="row">
        <div>
          <label>N° de reparación</label>
          <input
            value={quoteNumber}
            onChange={(e) => setQuoteNumber(e.target.value)}
            placeholder="REP-2509-A"
          />
        </div>
        <div>
          <label>Fecha (máx. +50 días)</label>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="error" style={{ display: dateOk ? "none" : "block" }}>
            La fecha debe estar entre hoy y 50 días hacia adelante.
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div className="row">
        <div>
          <label>Cliente</label>
          <input
            placeholder="Nombre / Empresa"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={clientOk ? "" : "input-error"}
          />
          {!clientOk && <div className="error">Ingresá el nombre del cliente</div>}
        </div>
        <div>
          <label>Contacto</label>
          <input
            placeholder="Teléfono"
            value={clientContact}
            onChange={(e) => setClientContact(e.target.value)}
          />
        </div>
      </div>

      <div className="row">
        <div>
          <label>Email</label>
          <input
            placeholder="correo@dominio.com"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
        </div>
        <div>
          <label>CUIT/CUIL</label>
          <input
            placeholder="XX-XXXXXXXX-X"
            value={clientCuit}
            onChange={(e) => setClientCuit(e.target.value)}
          />
        </div>
      </div>

      <div className="row">
        <div>
          <label>Condición fiscal</label>
          <select value={clientFiscal} onChange={(e) => setClientFiscal(e.target.value)}>
            {FISCAL_OPTIONS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
          <button className="btn ghost" onClick={clearDraft}>Limpiar borrador</button>
        </div>
      </div>

      {/* Gateo UI si falta cliente/fecha */}
      {(!clientOk || !dateOk) && (
        <div className="card" style={{ opacity: 0.6, pointerEvents: "none", marginTop: 10 }}>
          <h3>Equipos</h3>
          <div className="error">Completá los datos de Cliente y Fecha para cargar equipos.</div>
        </div>
      )}

      {/* Equipos */}
      {clientOk && dateOk && (
        <div style={{ marginTop: 10 }}>
          <h3>Equipos</h3>

          {equipos.map((eq) => {
            const sugs = suggestionsFor(eq);
            return (
              <div key={eq.id} className="card" style={{ marginTop: 10 }}>
                <div className="row">
                  <div>
                    <label>Marca</label>
                    <input
                      placeholder="Ej: Bacope / Ushuaia / Tria…"
                      value={eq.marca}
                      onChange={(e) => updateEquipo(eq.id, { marca: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Modelo</label>
                    <input
                      placeholder="Ej: Antares / Zafiro / Patagonia…"
                      value={eq.modelo}
                      onChange={(e) => updateEquipo(eq.id, { modelo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="row">
                  <div>
                    <label>N° de serie</label>
                    <input
                      placeholder="Opcional"
                      value={eq.serie}
                      onChange={(e) => updateEquipo(eq.id, { serie: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>Descripción / Falla</label>
                    <input
                      placeholder="Breve descripción de la falla"
                      value={eq.descripcion}
                      onChange={(e) => updateEquipo(eq.id, { descripcion: e.target.value })}
                    />
                  </div>
                </div>

                {/* Repuestos del equipo */}
                <div className="row">
                  <div className="searchbox">
                    <label>Agregar repuesto (SKU o nombre)</label>
                    <input
                      ref={(el) => (searchRefs.current[eq.id] = el)}
                      value={eq.repuestoSearch}
                      onChange={(e) =>
                        updateEquipo(eq.id, {
                          repuestoSearch: e.target.value,
                          sugOpen: true,
                          sugIndex: -1,
                        })
                      }
                      onFocus={() => updateEquipo(eq.id, { sugOpen: true })}
                      onKeyDown={(e) => {
                        if (!sugs.length) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          updateEquipo(eq.id, {
                            sugIndex: (eq.sugIndex + 1) % sugs.length,
                            sugOpen: true,
                          });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          updateEquipo(eq.id, {
                            sugIndex: (eq.sugIndex - 1 + sugs.length) % sugs.length,
                            sugOpen: true,
                          });
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const chosen = sugs[eq.sugIndex] || sugs[0];
                          if (chosen) addRepuesto(eq.id, chosen);
                        } else if (e.key === "Escape") {
                          updateEquipo(eq.id, { sugOpen: false, sugIndex: -1 });
                        }
                      }}
                      placeholder="Ej: TC80, filtro, motor…"
                    />
                    <ul className={`suggestions ${eq.sugOpen && sugs.length ? "show" : ""}`}>
                      {sugs.map((p, i) => (
                        <li
                          key={p.sku}
                          className={i === eq.sugIndex ? "active" : ""}
                          onMouseDown={() => addRepuesto(eq.id, p)}
                        >
                          <b>{p.sku}</b> — {p.name} · {currency.format(p.price)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ display: "flex", alignItems: "end" }}>
                    <button
                      className="btn"
                      onClick={() => {
                        if (sugs[0]) addRepuesto(eq.id, sugs[0]);
                      }}
                      disabled={!sugs.length}
                    >
                      Agregar repuesto
                    </button>
                  </div>
                </div>

                {/* Tabla repuestos */}
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Repuesto</th>
                        <th>Cant.</th>
                        <th>P. Unit.</th>
                        <th>Total</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eq.repuestos.length === 0 && (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", color: "#9aa7bd" }}>
                            Sin repuestos para este equipo.
                          </td>
                        </tr>
                      )}
                      {eq.repuestos.map((r) => (
                        <tr key={r.sku}>
                          <td data-label="SKU">{r.sku}</td>
                          <td data-label="Repuesto">{r.name}</td>
                          <td data-label="Cant.">
                            <input
                              className="qty"
                              type="number"
                              min="1"
                              value={r.qty}
                              onChange={(e) => updateQty(eq.id, r.sku, e.target.value)}
                            />
                          </td>
                          <td data-label="P. Unit." className="num">
                            {currency.format(Number(r.price) || 0)}
                          </td>
                          <td data-label="Total" className="num">
                            {currency.format((Number(r.price) || 0) * (Number(r.qty) || 0))}
                          </td>
                          <td>
                            <button className="btn danger" onClick={() => removeRepuesto(eq.id, r.sku)}>
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mano de obra / eliminar equipo */}
                <div className="row" style={{ marginTop: 8 }}>
                  <div>
                    <label>Mano de obra</label>
                    <input
                      type="number"
                      min="0"
                      value={eq.manoObra}
                      onChange={(e) =>
                        updateEquipo(eq.id, { manoObra: Number(e.target.value) || 0 })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "end", justifyContent: "flex-end" }}>
                    <button
                      className="btn danger"
                      onClick={() => removeEquipo(eq.id)}
                      disabled={equipos.length === 1}
                      title={equipos.length === 1 ? "Debe quedar al menos un equipo" : "Eliminar equipo"}
                    >
                      Eliminar equipo
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="actions" style={{ marginTop: 10 }}>
            <button className="btn success" onClick={addEquipo}>+ Agregar equipo</button>
          </div>
        </div>
      )}

      {/* Observaciones */}
      <div className="row" style={{ marginTop: 10 }}>
        <div>
          <label>Observaciones</label>
          <textarea
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Texto por defecto editable para validez u otros comentarios"
          />
        </div>
      </div>

      {/* Totales */}
      <div className="totals" style={{ marginTop: 10 }}>
        <div className="totalbox">
          <div className="tline">
            <span>Subtotal:</span>
            <span>{currency.format(subtotal)}</span>
          </div>
          <div className="final">
            <span>TOTAL FINAL:</span>
            <span className="amount">{currency.format(finalTotal)}</span>
          </div>
        </div>
      </div>

      <div className="actions" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        <button className="btn secondary" onClick={handleSave} disabled={!canAct}>
          Guardar
        </button>
        <button className="btn" onClick={handlePdf} disabled={!canAct}>
          Generar PDF
        </button>
        <button className="btn success" onClick={shareWhatsApp} disabled={!canAct}>
          Compartir por WhatsApp
        </button>
      </div>
    </div>
  );
}
