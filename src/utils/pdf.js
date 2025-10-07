// /src/utils/pdf.js
// Generador único de PDFs para Venta y Reparación.
// type: "venta" o "reparacion"
// export default generateQuotePdf

const PRIMARY = "#e74c3c";  // rojo
const ACCENT = "#0067ff";   // azul
const BORDER = "#e5e7eb";
const TEXT = "#111827";
const GRAY = "#6b7280";

export const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

async function ensureLibs() {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  return { html2canvas, jsPDF };
}

// ----------- estructura base -------------
function createRootContainer() {
  const root = document.createElement("div");
  root.id = "pdf-template";
  root.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: #fff;
    font-family: 'Helvetica', sans-serif;
    color: ${TEXT};
    padding: 32px;
  `;
  return root;
}

// ----------- encabezado -----------------
function headerDOM(inner, titulo) {
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    border-bottom: 3px solid ${ACCENT};
    padding-bottom: 10px;
    margin-bottom: 16px;
    gap: 12px;
  `;
  header.innerHTML = `
    <img src="/logo.png" alt="Logo" style="height: 40px; object-fit: contain" />
    <h1 style="font-size: 22px; color: ${PRIMARY}; font-weight: 800; margin: 0;">
      ${titulo.toUpperCase()}
    </h1>
  `;
  inner.appendChild(header);
}

// ----------- datos de cliente/presupuesto -----------
function clientePresupuestoDOM(inner, data) {
  const {
    quoteNumber = "",
    date = "",
    clientName = "",
    clientContact = "",
    clientEmail = "",
    clientCuit = "",
    clientFiscal = "",
  } = data;

  const box = document.createElement("div");
  box.style.cssText = `
    display: flex;
    gap: 12px;
    margin-bottom: 14px;
  `;
  box.innerHTML = `
    <div style="flex:1; border:1px solid ${BORDER}; border-radius:8px; padding:10px;">
      <h3 style="margin:0 0 4px; color:${ACCENT}; font-size:13px;">Datos del Cliente</h3>
      <p style="margin:0; font-size:13px;"><strong>Nombre:</strong> ${clientName || "-"}</p>
      <p style="margin:0; font-size:13px;"><strong>Contacto:</strong> ${clientContact || "-"}</p>
      <p style="margin:0; font-size:13px;"><strong>Email:</strong> ${clientEmail || "-"}</p>
      <p style="margin:0; font-size:13px;"><strong>CUIT/CUIL:</strong> ${clientCuit || "-"}</p>
      <p style="margin:0; font-size:13px;"><strong>Cond. Fiscal:</strong> ${clientFiscal || "-"}</p>
    </div>
    <div style="flex:1; border:1px solid ${BORDER}; border-radius:8px; padding:10px;">
      <h3 style="margin:0 0 4px; color:${ACCENT}; font-size:13px;">Datos del Presupuesto</h3>
      <p style="margin:0; font-size:13px;"><strong>N°:</strong> ${quoteNumber}</p>
      <p style="margin:0; font-size:13px;"><strong>Fecha:</strong> ${date}</p>
    </div>
  `;
  inner.appendChild(box);
}

// ----------- seccion de venta -----------
function ventaDOM(inner, data) {
  const {
    items = [],
    subtotal = 0,
    applyDiscount,
    discount,
    hasShipping,
    shipping,
    finalTotal,
    notes,
  } = data;

  const table = document.createElement("table");
  table.style.cssText = `
    width:100%;
    border-collapse:collapse;
    margin-bottom:12px;
  `;
  table.innerHTML = `
    <thead style="background:#f9fafb;">
      <tr>
        <th style="border:1px solid ${BORDER}; padding:8px; text-align:left;">SKU</th>
        <th style="border:1px solid ${BORDER}; padding:8px; text-align:left;">Producto</th>
        <th style="border:1px solid ${BORDER}; padding:8px; text-align:center;">Cant.</th>
        <th style="border:1px solid ${BORDER}; padding:8px; text-align:right;">P. Unitario</th>
        <th style="border:1px solid ${BORDER}; padding:8px; text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map((it) => {
          const qty = Number(it.qty) || 0;
          const price = Number(it.price) || 0;
          return `
            <tr>
              <td style="border:1px solid ${BORDER}; padding:8px;">${it.sku || ""}</td>
              <td style="border:1px solid ${BORDER}; padding:8px;">${it.name || ""}</td>
              <td style="border:1px solid ${BORDER}; padding:8px; text-align:center;">${qty}</td>
              <td style="border:1px solid ${BORDER}; padding:8px; text-align:right;">${currency.format(price)}</td>
              <td style="border:1px solid ${BORDER}; padding:8px; text-align:right;">${currency.format(qty * price)}</td>
            </tr>`;
        })
        .join("")}
    </tbody>
  `;
  inner.appendChild(table);

  const totals = document.createElement("div");
  totals.style.cssText = `
    display:flex;
    justify-content:flex-end;
    font-size:13px;
  `;
  totals.innerHTML = `
    <div style="min-width:300px;">
      <div style="display:flex; justify-content:space-between; padding:4px 0;">
        <span>Subtotal:</span><span>${currency.format(subtotal)}</span>
      </div>
      ${
        applyDiscount
          ? `<div style="display:flex; justify-content:space-between; padding:4px 0;">
          <span>Descuento:</span><span>${discount}%</span></div>`
          : ""
      }
      ${
        hasShipping
          ? `<div style="display:flex; justify-content:space-between; padding:4px 0;">
          <span>Envío:</span><span>${currency.format(shipping)}</span></div>`
          : ""
      }
      <div style="display:flex; justify-content:space-between; border-top:1px dashed ${BORDER};
        margin-top:6px; padding-top:6px; font-weight:700;">
        <span>TOTAL:</span>
        <span style="color:${PRIMARY}">${currency.format(finalTotal)}</span>
      </div>
    </div>
  `;
  inner.appendChild(totals);

  if (notes) {
    const obs = document.createElement("p");
    obs.style.cssText = "font-size:12px; margin-top:8px;";
    obs.innerHTML = `<strong>Observaciones:</strong> ${notes}`;
    inner.appendChild(obs);
  }
}

// ----------- seccion de reparación -----------
function reparacionDOM(inner, data) {
  const { equipos = [], totalGeneral = 0 } = data;

  equipos.forEach((eq, idx) => {
    const box = document.createElement("div");
    box.style.cssText = `
      border:1px solid ${BORDER};
      border-radius:10px;
      padding:10px;
      margin-bottom:10px;
    `;
    const {
      modelo,
      serie,
      falla,
      diagnostico,
      repuestos = [],
      subtotalRepuestos = 0,
      manoObra = 0,
      totalEquipo = 0,
    } = eq;
    box.innerHTML = `
      <h4 style="margin:0 0 4px;">Equipo #${idx + 1}</h4>
      <p style="font-size:13px; margin:0 0 6px;"><strong>Modelo/Equipo:</strong> ${
        modelo || "-"
      } — <strong>Serie:</strong> ${serie || "-"}</p>
      <p style="font-size:13px; margin:0;"><strong>Falla:</strong> ${
        falla || "-"
      }</p>
      <p style="font-size:13px; margin:0 0 8px;"><strong>Diagnóstico:</strong> ${
        diagnostico || "-"
      }</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead style="background:#f9fafb;">
          <tr>
            <th style="border:1px solid ${BORDER}; padding:6px; text-align:left;">SKU</th>
            <th style="border:1px solid ${BORDER}; padding:6px; text-align:left;">Repuesto</th>
            <th style="border:1px solid ${BORDER}; padding:6px; text-align:center;">Cant.</th>
            <th style="border:1px solid ${BORDER}; padding:6px; text-align:right;">P. Unit.</th>
            <th style="border:1px solid ${BORDER}; padding:6px; text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${repuestos
            .map((r) => {
              const qty = Number(r.qty) || 0;
              const price = Number(r.price) || 0;
              return `<tr>
                <td style="border:1px solid ${BORDER}; padding:6px;">${r.sku}</td>
                <td style="border:1px solid ${BORDER}; padding:6px;">${r.name}</td>
                <td style="border:1px solid ${BORDER}; padding:6px; text-align:center;">${qty}</td>
                <td style="border:1px solid ${BORDER}; padding:6px; text-align:right;">${currency.format(price)}</td>
                <td style="border:1px solid ${BORDER}; padding:6px; text-align:right;">${currency.format(qty * price)}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
      <div style="text-align:right; font-size:13px; margin-top:6px;">
        <em>Subtotal repuestos:</em> ${currency.format(subtotalRepuestos)} —
        <em>Mano de obra:</em> ${currency.format(manoObra)} —
        <strong>Total equipo:</strong> <span style="color:${PRIMARY};">${currency.format(
      totalEquipo
    )}</span>
      </div>
    `;
    inner.appendChild(box);
  });

  const total = document.createElement("div");
  total.style.cssText =
    "text-align:right; font-weight:800; font-size:14px; margin-top:8px;";
  total.innerHTML = `TOTAL GENERAL: <span style="color:${PRIMARY};">${currency.format(
    totalGeneral
  )}</span>`;
  inner.appendChild(total);
}

// ----------- pie -----------
function footerDOM(inner) {
  const f = document.createElement("div");
  f.style.cssText = `
    text-align:center;
    margin-top:20px;
    padding-top:8px;
    border-top:1px solid ${BORDER};
    font-size:11px;
    color:${GRAY};
  `;
  f.textContent =
    "Este presupuesto posee una validez de 7 días a partir de su emisión.";
  inner.appendChild(f);
}

// ----------- generador principal -----------
export default async function generateQuotePdf(data) {
  const { type = "venta" } = data;
  const { html2canvas, jsPDF } = await ensureLibs();

  const root = createRootContainer();
  document.body.appendChild(root);

  const inner = document.createElement("div");
  root.appendChild(inner);

  const title =
    type === "venta" ? "Presupuesto de Venta" : "Presupuesto de Reparación";
  headerDOM(inner, title);
  clientePresupuestoDOM(inner, data);

  if (type === "venta") ventaDOM(inner, data);
  else reparacionDOM(inner, data);

  footerDOM(inner);

  const canvas = await html2canvas(root, {
    scale: 2,
    backgroundColor: "#ffffff",
  });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "pt", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${title.replace(/\s+/g, "_")}.pdf`);

  document.body.removeChild(root);
}


// NUEVO: crear Blob del PDF sin forzar descarga
export async function createQuotePdfBlob(data) {
  // Reutilizá tu misma lógica de armado, pero devolvé el Blob al final.
  // Si ya usás jsPDF, sería algo como:
  // const doc = new jsPDF(); ...; return doc.output("blob");

  // Ejemplo genérico (ajustá a tu lib real):
  const { jsPDF } = await import("jspdf"); // si ya lo importás arriba, no repitas
  const doc = new jsPDF();

  // ——— aquí va el mismo render que usás en generateQuotePdf(data) ———
  // título, tabla, totales, etc.
  // ------------------------------------------------------------------

  const filename =
    (data?.type === "mantenimiento" ? "REP-" : "VEN-") +
    (data?.quoteNumber || "0000") + ".pdf";

  const blob = doc.output("blob");
  return { blob, filename };
}