/**
 * Helpers para tracking de contenedores via Ship24 + notificación WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   SHIP24_API_KEY   — API key de ship24.com (plan gratuito)
 *   CALLMEBOT_PHONE  — Número de teléfono sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY — API key de CallMeBot (se obtiene al activar el servicio)
 *
 * Endpoint usado: POST /public/v1/trackers/track
 *   — Idempotente: crea el tracker la primera vez y devuelve resultados.
 *     Las llamadas posteriores con el mismo payload devuelven el estado actual.
 *   — Timeout hasta 60 s en la primera llamada (consulta sync a la naviera).
 */

const SHIP24_URL = 'https://api.ship24.com/public/v1/trackers/track';

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
    // La primera llamada puede tardar hasta 60 s (consulta sincrónica a la naviera)
    signal: AbortSignal.timeout(65_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ship24 ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  // POST /trackers/track → { data: { tracker, events, statistics } }
  const data = json?.data;
  if (!data) return null;

  // Los eventos vienen del más reciente al más antiguo
  const eventos = data.events || [];
  const ultimoEvento = eventos[0] ?? null;
  const eta = data.statistics?.timestamps?.estimatedDelivery ?? null;

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
 * Ship24 /trackers/track devuelve:
 *   event.description      — descripción legible
 *   event.eventTime        — ISO datetime
 *   event.location         — objeto { country, state, city, zip }
 */
export function formatearMensajeTracking(imp, evento) {
  const num  = imp.numContenedor || imp.blNumber || 'Sin número';
  const desc = evento.description || evento.event || 'Nuevo estado';

  // location es un objeto en la API actual de Ship24
  const loc = evento.location;
  const lugarStr = typeof loc === 'string'
    ? loc
    : loc ? [loc.city, loc.state, loc.country].filter(Boolean).join(', ') : null;
  const lugar = lugarStr ? `\n📍 ${lugarStr}` : '';

  // eventTime es el campo actual; occurrenceDatetime era el campo anterior
  const fechaStr = evento.eventTime || evento.occurrenceDatetime;
  const fecha = fechaStr
    ? new Date(fechaStr).toLocaleString('es-ES', {
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
 * Compatible con el campo eventTime (nuevo) y occurrenceDatetime (antiguo).
 */
export function claveEvento(evento) {
  if (!evento) return null;
  const fecha = evento.eventTime || evento.occurrenceDatetime || '';
  return `${evento.description ?? evento.event ?? ''}|${fecha}`;
}
