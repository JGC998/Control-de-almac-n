/**
 * Helpers para tracking de contenedores via Ship24 + notificación WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   SHIP24_API_KEY   — API key de ship24.com (plan gratuito)
 *   CALLMEBOT_PHONE  — Número de teléfono sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY — API key de CallMeBot (se obtiene al activar el servicio)
 */

const SHIP24_URL = 'https://api.ship24.com/public/v1/trackers/search';

/**
 * Consulta el estado de un contenedor o BL en Ship24.
 * Devuelve { eventos, ultimoEvento, eta } o null si no hay datos.
 */
export async function buscarTracking(trackingNumber) {
  const apiKey = process.env.SHIP24_API_KEY;
  if (!apiKey) {
    console.warn('[tracking] SHIP24_API_KEY no configurado — tracking desactivado');
    return null;
  }

  const res = await fetch(SHIP24_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackingNumber }),
    // 10 segundos de timeout
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ship24 ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const tracking = json?.data?.trackings?.[0];
  if (!tracking) return null;

  // Ship24 devuelve los eventos del más reciente al más antiguo
  const eventos = tracking.events || [];
  const ultimoEvento = eventos[0] ?? null;
  const eta = tracking.statistics?.timestamps?.estimatedDelivery ?? null;

  return { eventos, ultimoEvento, eta };
}

/**
 * Envía un mensaje de WhatsApp via CallMeBot.
 * Devuelve true si el envío fue exitoso.
 */
export async function enviarWhatsApp(mensaje) {
  const phone  = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;

  if (!phone || !apikey) {
    console.warn('[tracking] CALLMEBOT_PHONE o CALLMEBOT_APIKEY no configurados — WhatsApp desactivado');
    return false;
  }

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apikey)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Genera el texto del mensaje de WhatsApp para un nuevo evento de tracking.
 */
export function formatearMensajeTracking(imp, evento) {
  const num   = imp.numContenedor || imp.blNumber || 'Sin número';
  const desc  = evento.description || 'Nuevo estado';
  const lugar = evento.location ? `\n📍 ${evento.location}` : '';
  const fecha = evento.occurrenceDatetime
    ? new Date(evento.occurrenceDatetime).toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  return [
    `📦 *Contenedor ${num}*`,
    desc,
    lugar,
    fecha ? `📅 ${fecha}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * Genera una clave de deduplicación para detectar si un evento ya fue notificado.
 * Combina descripción + fecha para identificar unívocamente un evento.
 */
export function claveEvento(evento) {
  if (!evento) return null;
  return `${evento.description ?? ''}|${evento.occurrenceDatetime ?? ''}`;
}
