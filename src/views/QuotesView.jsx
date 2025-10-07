import React, { useEffect, useMemo, useState } from "react";
import { getQuotes, removeQuote } from "@/utils/storage.js";
import generateQuotePdf, { currency } from "@/utils/pdf.js";


export default function QuotesView(){
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");

  function refresh(){ setAll(getQuotes().filter(x => (x.type||"venta")==="venta")); }
  useEffect(()=>{ refresh(); },[]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return all;
    return all.filter(x => {
      const hay = [
        x.quoteNumber, x.clientName, x.type, x.clientContact, x.clientEmail, x.clientCuit
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  },[all,q]);

  async function handlePdf(qu) {
  await generateQuotePdf({
    type: "venta",
    quoteNumber: qu.quoteNumber,
    date: qu.date,
    clientName: qu.clientName,
    clientContact: qu.clientContact,
    clientEmail: qu.clientEmail,
    clientCuit: qu.clientCuit,
    clientFiscal: qu.clientFiscal,
    items: qu.items || [],
    subtotal: Number(qu.subtotal) || 0,
    applyDiscount: !!qu.applyDiscount,
    discount: Number(qu.discount) || 0,
    hasShipping: !!qu.hasShipping,
    shipping: Number(qu.shipping) || 0,
    finalTotal: Number(qu.finalTotal) || 0,
    notes: qu.notes || "",
  });
}

  function handleDelete(id){
    if(!confirm("¿Eliminar presupuesto?")) return;
    removeQuote(id);
    refresh();
  }

  return (
    <div className="card">
      <h2>Presupuestos guardados (Ventas)</h2>

      <div className="filters">
        <input placeholder="Buscar por N°, cliente o tipo…" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>N°</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Total</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length===0 && (
              <tr><td colSpan={6} style={{textAlign:"center", color:"#9aa7bd"}}>Sin resultados.</td></tr>
            )}
            {filtered.map(qu => (
              <tr key={qu.id}>
                <td data-label="Fecha">{qu.date}</td>
                <td data-label="N°">{qu.quoteNumber}</td>
                <td data-label="Cliente">{qu.clientName}</td>
                <td data-label="Tipo">{(qu.type||"venta").toUpperCase()}</td>
                <td data-label="Total" className="num">{currency.format(Number(qu.finalTotal)||0)}</td>
                <td>
                  <div className="actions">
                    <button className="btn" onClick={()=>handlePdf(qu)}>PDF</button>
                    <button className="btn danger" onClick={()=>handleDelete(qu.id)}>Eliminar</button>
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
