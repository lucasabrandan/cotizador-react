// src/utils/share.js
// Helpers para compartir por WhatsApp / Web Share / Email.

function buildQuoteText({ title, header = "", lines = [], total = "", footer = "" }) {
  // Arma un texto plano prolijo para pegar en WhatsApp o Email
  const sep = "------------------------------";
  const body =
    [
      title && `*${title}*`,
      header && header,
      sep,
      ...lines.map((l) => `• ${l}`),
      sep,
      total && `*TOTAL:* ${total}`,
      footer && footer
    ]
      .filter(Boolean)
      .join("\n");

  return body;
}

/**
 * Abre WhatsApp con el texto prearmado.
 * Si hay teléfono, usa wa.me/<tel>, si no, api.whatsapp.com/send?text=...
 */
export function shareViaWhatsApp({ text, phone } = {}) {
  const encoded = encodeURIComponent(text || "");
  let url = `https://api.whatsapp.com/send?text=${encoded}`;
  const cleanPhone = (phone || "").replace(/[^\d]/g, "");
  if (cleanPhone) url = `https://wa.me/${cleanPhone}?text=${encoded}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Usa la Web Share API si está disponible (móvil), si no, cae a WhatsApp o Email.
 */
export async function smartShare({ title, text, url, fallbackEmail = false } = {}) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      // usuario canceló -> seguimos a fallback
    }
  }
  if (!fallbackEmail) {
    shareViaWhatsApp({ text });
    return false;
  }
  // Fallback email
  const mailto = `mailto:?subject=${encodeURIComponent(title || "")}&body=${encodeURIComponent(text || "")}`;
  window.location.href = mailto;
  return false;
}

export { buildQuoteText };
