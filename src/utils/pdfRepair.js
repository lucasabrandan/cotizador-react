// src/utils/pdfRepair.js
// PDF específico para REPARACIONES (equipos, repuestos por equipo y mano de obra)

// Paleta
const PRIMARY = "#e74c3c";   // rojo marca
const ACCENT  = "#0067ff";   // azul detalles
const BLACK   = "#000000";
const GRAY    = "#6b7280";
const BORDER  = "#e5e7eb";

// Formateador ARS exportado
export const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

// Carga perezosa para evitar problemas en build/SSR
async function ensureLibs() {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return { html2canvas, jsPDF };
}

/**
 * Construye un DOM oculto con estructura clara de REPARACIÓN:
 * - Encabezado
 * - Datos cliente / presupuesto
 * - Sección por EQUIPO con:
 *    · Datos del equipo (marca, modelo, serie, descripción)
 *    · Tabla de repuestos del equipo
 *    · Mano de obra del equipo (si aplica)
 * - Totales generales
 * - Observaciones editables
 */
function buildTemplate(data) {
  const {
    type = "reparacion",
    quoteNumber = "",
    date = "",
    clientName = "",
    clientContact = "",
    clientEmail = "",
    clientCuit = "",
    clientFiscal = "",
    equipments = [],   // [{ marca, modelo, serie, descripcion, manoObra, repuestos:[{sku,name,price,qty}] }]
    items = [],        // aplanado (no se usa para pintar por equipo, pero queda por compatibilidad)
    subtotal = 0,
    finalTotal = 0,
    notes = "",
  } = data;

  // Root oculto
  const root = document.createElement("div");
  root.id = "pdf-repair-template";
  root.style.cssText = `
    position: fixed;
    left: -10000px; top: 0;
    width: 794px;            /* A4 @96dpi */
    background: #ffffff;
    color: ${BLACK};
    font-family: Montserrat, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  `;

  const inner = document.createElement("div");
  inner.style.cssText = `
    width: 730px;
    margin: 0 auto;
    padding: 28px 0 24px 0;
  `;
  root.appendChild(inner);

  // Header
  const header = document.createElement("div");
  header.style.cssText = `
    display:flex; align-items:center; gap:16px;
    border-bottom: 3px solid ${ACCENT};
    padding-bottom: 12px; margin-bottom: 16px;
  `;
  header.innerHTML = `
    <img src="/logo.png" alt="logo" style="height:44px;width:auto;object-fit:contain"/>
    <h1 style="
      margin:0; font-size:26px; letter-spacing:.3px;
      color:${PRIMARY}; font-weight:800;">
      PRESUPUESTO DE REPARACIÓN
    </h1>
  `;
  inner.appendChild(header);

  // Datos cliente / presupuesto
  const info = document.createElement("div");
  info.style.cssText = "display:flex; gap:20px; margin-bottom:14px;";
  info.innerHTML = `
    <div style="flex:1; border:1px solid ${BORDER}; border-radius:8px; padding:12px;">
      <div style="font-size:12px; color:${GRAY}; margin-bottom:6px; font-weight:700;">Datos del Cliente</div>
      <div style="font-size:13px; line-height:1.35;">
        <div><strong>Nombre:</strong> ${clientName || "-"}</div>
        <div><strong>Contacto:</strong> ${clientContact || "-"}</div>
        <div><strong>Email:</strong> ${clientEmail || "-"}</div>
        <div><strong>CUIT/CUIL:</strong> ${clientCuit || "-"}</div>
        <div><strong>Condición fiscal:</strong> ${clientFiscal || "-"}</div>
      </div>
    </div>

    <div style="flex:1; border:1px solid ${BORDER}; border-radius:8px; padding:12px;">
      <div style="font-size:12px; color:${GRAY}; margin-bottom:6px; font-weight:700;">Datos del Presupuesto</div>
      <div style="font-size:13px; line-height:1.35;">
        <div><strong>N°:</strong> ${quoteNumber || "-"}</div>
        <div><strong>Fecha:</strong> ${date || "-"}</div>
        <div><strong>Tipo:</strong> ${String(type).toUpperCase()}</div>
      </div>
    </div>
  `;
  inner.appendChild(info);

  // ===== Secciones por EQUIPO =====
  equipments.forEach((eq, idx) => {
    const box = document.createElement("div");
    box.style.cssText = `
      border:1px solid ${BORDER};
      border-radius:10px;
      padding:12px;
      margin: 10px 0;
    `;

    // Título equipo
    const title = document.createElement("div");
    title.style.cssText = `
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom: 8px;
    `;
    title.innerHTML = `
      <div style="font-weight:800; font-size:14px; color:${BLACK}">
        Equipo #${idx + 1}
      </div>
    `;
    box.appendChild(title);

    // Datos del equipo
    const eqInfo = document.createElement("div");
    eqInfo.style.cssText = `
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      font-size: 13px;
      margin-bottom: 8px;
    `;
    eqInfo.innerHTML = `
      <div><strong>Marca:</strong> ${eq.marca || "-"}</div>
      <div><strong>Modelo:</strong> ${eq.modelo || "-"}</div>
      <div><strong>N° Serie:</strong> ${eq.serie || "-"}</div>
      <div style="grid-column: 1 / -1;"><strong>Descripción / Falla:</strong> ${eq.descripcion || "-"}</div>
    `;
    box.appendChild(eqInfo);

    // Tabla de repuestos por equipo
    const rep = Array.isArray(eq.repuestos) ? eq.repuestos : [];
    if (rep.length > 0) {
      const table = document.createElement("table");
      table.style.cssText = `
        width:100%; border-collapse:collapse; margin-top:6px; font-size:13px;
      `;
      table.innerHTML = `
        <thead>
          <tr style="background:#f7f9ff;">
            <th style="text-align:left;border:1px solid ${BORDER};padding:8px;width:90px;color:${BLACK}">SKU</th>
            <th style="text-align:left;border:1px solid ${BORDER};padding:8px;color:${BLACK}">Repuesto</th>
            <th style="text-align:center;border:1px solid ${BORDER};padding:8px;width:70px;color:${BLACK}">Cant.</th>
            <th style="text-align:right;border:1px solid ${BORDER};padding:8px;width:110px;color:${BLACK}">P. Unit.</th>
            <th style="text-align:right;border:1px solid ${BORDER};padding:8px;width:110px;color:${BLACK}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${
            rep
              .map((r) => {
                const qty = Number(r.qty) || 0;
                const price = Number(r.price) || 0;
                return `
                  <tr>
                    <td style="border:1px solid ${BORDER}; padding:8px;">${r.sku || ""}</td>
                    <td style="border:1px solid ${BORDER}; padding:8px;">${r.name || ""}</td>
                    <td style="border:1px solid ${BORDER}; padding:8px; text-align:center;">${qty}</td>
                    <td style="border:1px solid ${BORDER}; padding:8px; text-align:right;">${currency.format(price)}</td>
                    <td style="border:1px solid ${BORDER}; padding:8px; text-align:right;">${currency.format(price * qty)}</td>
                  </tr>
                `;
              })
              .join("")
          }
        </tbody>
      `;
      box.appendChild(table);
    }

    // Mano de obra por equipo (si corresponde)
    if (Number(eq.manoObra) > 0) {
      const mo = document.createElement("div");
      mo.style.cssText = `
        margin-top: 8px;
        display:flex; justify-content:space-between; align-items:center;
        font-size: 13px;
        border-top: 1px dashed ${BORDER};
        padding-top: 6px;
      `;
      mo.innerHTML = `
        <div><strong>Mano de obra</strong></div>
        <div style="font-weight:700;">${currency.format(Number(eq.manoObra) || 0)}</div>
      `;
      box.appendChild(mo);
    }

    inner.appendChild(box);
  });

  // Totales globales
  const totals = document.createElement("div");
  totals.style.cssText = "display:flex; justify-content:flex-end; margin-top:10px;";
  totals.innerHTML = `
    <div style="min-width:320px; font-size:13px;">
      <div style="display:flex; justify-content:space-between; padding:4px 0;">
        <span>Subtotal:</span> <span>${currency.format(Number(subtotal) || 0)}</span>
      </div>
      <div style="
        display:flex; justify-content:space-between; padding:8px 0; margin-top:6px;
        border-top:1px dashed ${BORDER}; font-weight:800;">
        <span style="color:${BLACK}">TOTAL FINAL:</span>
        <span style="color:${PRIMARY}">${currency.format(Number(finalTotal) || 0)}</span>
      </div>
    </div>
  `;
  inner.appendChild(totals);

  // Observaciones
  if (notes && String(notes).trim()) {
    const obs = document.createElement("div");
    obs.style.cssText = "margin-top:10px; font-size:12px;";
    obs.innerHTML = `
      <strong style="color:${BLACK}">Observaciones:</strong>
      <div style="margin-top:4px; white-space:pre-wrap;">${String(notes).trim()}</div>
    `;
    inner.appendChild(obs);
  }

  // Footer fijo
  const footer = document.createElement("div");
  footer.style.cssText = `
    margin-top:16px; padding-top:8px; border-top:1px solid ${BORDER};
    text-align:center; color:${GRAY}; font-size:11px;
  `;
  footer.textContent = "Este presupuesto posee una validez de 7 días a partir de su emisión.";
  inner.appendChild(footer);

  document.body.appendChild(root);
  return root;
}

/** Genera y descarga PDF A4 (multipágina si hace falta) */
export default async function generateRepairPdf(data) {
  const { html2canvas, jsPDF } = await ensureLibs();

  const node = buildTemplate(data);

  // Esperar fuentes
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  const canvas = await html2canvas(node, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    windowWidth: 794,
  });

  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = 210; // mm
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
  heightLeft -= 297;

  while (heightLeft > 0) {
    position = heightLeft - imgH;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= 297;
  }

  const safeClient = (data.clientName || "cliente").replace(/[^a-z0-9_-]/gi, "");
  const safeNum = (data.quoteNumber || "reparacion").replace(/[^a-z0-9_-]/gi, "");
  pdf.save(`${safeNum}-${safeClient}.pdf`);

  node.remove();
}
