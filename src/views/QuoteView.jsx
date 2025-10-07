// src/views/QuoteView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { getProducts } from "@/utils/productsStore.js";
import { saveQuote } from "@/utils/storage.js";
import generateQuotePdf, { currency } from "@/utils/pdf.js";

/** Opciones de condición fiscal */
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

// clave para el borrador
const DRAFT_KEY = "draft_sale_v1";

export default function QuoteView() {
  // --------- Cabecera ---------
  const [quoteNumber, setQuoteNumber] = useState(
    "VEN-" + todayStr().slice(5, 10).replace("-", "") + "-A"
  );
  const [date, setDate] = useState(todayStr());
  const minDate = todayStr();
  const maxDate = maxDateStr();

  // --------- Cliente ---------
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCuit, setClientCuit] = useState("");
  const [clientFiscal, setClientFiscal] = useState(FISCAL_OPTIONS[0]);

  // --------- Productos ---------
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // navegación ↑/↓
  const searchRef = useRef(null);

  // --------- Extras ---------
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [hasShipping, setHasShipping] = useState(false);
  const [shipping, setShipping] = useState(0);
  const [notes, setNotes] = useState("");

  // --------- Restaurar borrador al montar ---------
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);

      setQuoteNumber(d.quoteNumber ?? quoteNumber);
      setDate(d.date ?? todayStr());
      setClientName(d.clientName ?? "");
      setClientContact(d.clientContact ?? "");
      setClientEmail(d.clientEmail ?? "");
      setClientCuit(d.clientCuit ?? "");
      setClientFiscal(d.clientFiscal ?? FISCAL_OPTIONS[0]);

      setItems(Array.isArray(d.items) ? d.items : []);
      setApplyDiscount(!!d.applyDiscount);
      setDiscount(Number(d.discount) || 0);
      setHasShipping(!!d.hasShipping);
      setShipping(Number(d.shipping) || 0);
      setNotes(d.notes ?? "");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------- Guardar borrador automáticamente ---------
  useEffect(() => {
    const payload = {
      quoteNumber,
      date,
      clientName,
      clientContact,
      clientEmail,
      clientCuit,
      clientFiscal,
      items,
      applyDiscount,
      discount,
      hasShipping,
      shipping,
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
    items,
    applyDiscount,
    discount,
    hasShipping,
    shipping,
    notes,
  ]);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    alert("Borrador limpiado ✅");
  }

  // --------- Sugerencias (usa catálogo editable) ---------
  const suggestions = useMemo(() => {
    const list = getProducts();
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return list
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [search]);

  function addItem(prod) {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.sku === prod.sku);
      if (i >= 0) {
        const next = [...prev];
        next[i] = {
          ...next[i],
          qty: Number(next[i].qty || 0) + 1,
          price: Number(prod.price) || 0,
          name: prod.name,
        };
        return next;
      }
      return [...prev, { sku: prod.sku, name: prod.name, price: Number(prod.price) || 0, qty: 1 }];
    });
    setSearch("");
    setShowSug(false);
    setActiveIndex(-1);
    searchRef.current?.focus();
  }

  function onKeyDownSearch(e) {
    if (!showSug && suggestions.length) setShowSug(true);
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = suggestions[activeIndex] || suggestions[0];
      if (chosen) addItem(chosen);
    } else if (e.key === "Escape") {
      setShowSug(false);
      setActiveIndex(-1);
    }
  }

  function updateQty(sku, val) {
    const v = Math.max(1, Number(val) || 1);
    setItems((prev) => prev.map((it) => (it.sku === sku ? { ...it, qty: v } : it)));
  }

  function removeItem(sku) {
    setItems((prev) => prev.filter((it) => it.sku !== sku));
  }

  // --------- Totales ---------
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
    [items]
  );
  const discountAmount = useMemo(
    () => (applyDiscount ? subtotal * ((Number(discount) || 0) / 100) : 0),
    [applyDiscount, discount, subtotal]
  );
  const finalTotal = useMemo(
    () => Math.max(0, subtotal - discountAmount + (hasShipping ? Number(shipping) || 0 : 0)),
    [subtotal, discountAmount, hasShipping, shipping]
  );

  // --------- Habilitar acciones ---------
  const clientOk = clientName.trim().length > 0;
  const dateOk = date >= minDate && date <= maxDate;
  const canAct = clientOk && dateOk && items.length > 0;

  // --------- Acciones ---------
  async function handlePdf() {
    if (!canAct) return;
    await generateQuotePdf({
      type: "venta",
      quoteNumber,
      date,
      clientName,
      clientContact,
      clientEmail,
      clientCuit,
      clientFiscal,
      items,
      subtotal,
      applyDiscount,
      discount,
      hasShipping,
      shipping,
      finalTotal,
      notes,
    });
  }

  function handleSave() {
    if (!canAct) return;
    const toSave = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: "venta",
      quoteNumber,
      date,
      clientName,
      clientContact,
      clientEmail,
      clientCuit,
      clientFiscal,
      items,
      subtotal,
      applyDiscount,
      discount,
      hasShipping,
      shipping,
      finalTotal,
      notes,
      createdAt: new Date().toISOString(),
    };
    saveQuote(toSave);
    alert("Presupuesto guardado ✅");
  }

  // --------- Compartir por WhatsApp ---------
  function shareWhatsApp() {
    if (!canAct) return;

    // Preparo un resumen breve para pegar en WhatsApp
    const top = items.slice(0, 12); // evitar mensajes larguísimos
    const lines = [
      `*Presupuesto de Venta*`,
      `N°: ${quoteNumber}`,
      `Fecha: ${date}`,
      `Cliente: ${clientName}`,
      clientContact ? `Contacto: ${clientContact}` : null,
      clientEmail ? `Email: ${clientEmail}` : null,
      clientCuit ? `CUIT/CUIL: ${clientCuit}` : null,
      clientFiscal ? `Cond. Fiscal: ${clientFiscal}` : null,
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
      `Subtotal: ${currency.format(subtotal)}`,
      applyDiscount ? `Descuento: ${Number(discount) || 0}%` : null,
      hasShipping ? `Envío: ${currency.format(Number(shipping) || 0)}` : null,
      `TOTAL: *${currency.format(finalTotal)}*`,
      notes ? `\nNotas: ${notes}` : null,
    ].filter(Boolean);

    const txt = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/?text=${txt}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="card">
      <h2>Nueva Cotización — Venta</h2>

      {/* Cabecera */}
      <div className="row">
        <div>
          <label>N° de presupuesto</label>
          <input
            value={quoteNumber}
            onChange={(e) => setQuoteNumber(e.target.value)}
            placeholder="VEN-2509-A"
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

      {/* Buscador + sugerencias */}
      <div className="row">
        <div className="searchbox">
          <label>Buscar por SKU o nombre</label>
          <input
            ref={searchRef}
            placeholder="Ej: TC80 o Termostato…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowSug(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setShowSug(true)}
            onKeyDown={onKeyDownSearch}
          />
          <ul className={`suggestions ${showSug && suggestions.length ? "show" : ""}`}>
            {suggestions.map((p, i) => (
              <li
                key={p.sku}
                className={i === activeIndex ? "active" : ""}
                onMouseDown={() => addItem(p)}
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
              if (suggestions[0]) addItem(suggestions[0]);
            }}
            disabled={!suggestions.length}
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>P. Unitario</th>
              <th>Total</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "#9aa7bd" }}>
                  Sin productos. Buscá arriba y agregá.
                </td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.sku}>
                <td data-label="SKU">{it.sku}</td>
                <td data-label="Producto">{it.name}</td>
                <td data-label="Cant.">
                  <input
                    className="qty"
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) => updateQty(it.sku, e.target.value)}
                  />
                </td>
                <td data-label="P. Unitario" className="num">
                  {currency.format(Number(it.price) || 0)}
                </td>
                <td data-label="Total" className="num">
                  {currency.format((Number(it.price) || 0) * (Number(it.qty) || 0))}
                </td>
                <td>
                  <button className="btn danger" onClick={() => removeItem(it.sku)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles debajo de la tabla */}
      <div className="controls-bar">
        <div className="item">
          <label className="checklabel">
            <input
              type="checkbox"
              checked={applyDiscount}
              onChange={(e) => setApplyDiscount(e.target.checked)}
            />
            Aplicar descuento
          </label>
          <input
            type="number"
            min="0"
            max="100"
            disabled={!applyDiscount}
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="item">
          <label className="checklabel">
            <input
              type="checkbox"
              checked={hasShipping}
              onChange={(e) => setHasShipping(e.target.checked)}
            />
            Agregar costo de envío
          </label>
          <input
            type="number"
            min="0"
            disabled={!hasShipping}
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Notas */}
      <div className="row" style={{ marginTop: 10 }}>
        <div>
          <label>Observaciones</label>
          <textarea
            rows="3"
            placeholder="Notas adicionales…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
          {applyDiscount && (
            <div className="tline">
              <span>Descuento:</span>
              <span>{Number(discount) || 0}%</span>
            </div>
          )}
          {hasShipping && (
            <div className="tline">
              <span>Envío:</span>
              <span>{currency.format(Number(shipping) || 0)}</span>
            </div>
          )}
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
