/**
 * Tracking de contenedores via Ship24 + notificaciones WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   SHIP24_API_KEY   — API key de ship24.com
 *   CALLMEBOT_PHONE  — Número de teléfono sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY — API key de CallMeBot
 *
 * Endpoint: POST /public/v1/trackers/track
 *   Idempotente — crea el tracker la primera vez y devuelve resultados.
 *   Llamadas posteriores con el mismo payload devuelven el estado actualizado.
 *   Primera llamada puede tardar hasta 60 s (fetch síncrono a la naviera).
 *
 * NOTA: Ship24 es fiable para paquetería. Para contenedores marítimos Yang Ming
 * la cobertura es limitada. La alternativa ideal es solicitar el API DCSA de
 * Yang Ming directamente en e-solution.yangming.com (gratuito para clientes).
 *
 * Formato de respuesta (según OpenAPI ship24-tracking-api.yaml):
 *   { data: { trackings: [{ tracker, shipment, events, statistics }] } }
 *
 * Campos del evento:
 *   evento.status            — texto crudo del evento (ej: "Departed from facility")
 *   evento.occurrenceDatetime — datetime ISO del evento
 *   evento.location          — string plano (ej: "BARCELONA, SPAIN")
 *
 * ETA:
 *   tracking.shipment.delivery.estimatedDeliveryDate
 */

const SHIP24_URL = 'https://api.ship24.com/public/v1/trackers/track';

/**
 * Consulta el estado de un contenedor o BL en Ship24.
 * Devuelve { eventos, ultimoEvento, eta } o null si no hay datos.
 */
export async function buscarTracking(trackingNumber, courierCode = null) {
  const apiKey = process.env.SHIP24_API_KEY;
  if (!apiKey) {
    console.warn('[tracking] SHIP24_API_KEY no configurado — tracking desactivado');
    return null;
  }

  const payload = { trackingNumber };
  if (courierCode) payload.courierCode = [courierCode];

  const res = await fetch(SHIP24_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    // Primera llamada puede tardar hasta 60 s según la documentación de Ship24
    signal: AbortSignal.timeout(65_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ship24 ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  // La respuesta es: { data: { trackings: [ { tracker, shipment, events, statistics } ] } }
  const tracking = json?.data?.trackings?.[0];
  if (!tracking) return null;

  // Los eventos vienen del más reciente al más antiguo
  const eventos = tracking.events || [];
  const ultimoEvento = eventos[0] ?? null;

  // La ETA está en shipment.delivery.estimatedDeliveryDate (no en statistics)
  const eta = tracking.shipment?.delivery?.estimatedDeliveryDate ?? null;

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
 * Genera el texto del mensaje de WhatsApp para un nuevo evento.
 * Campos del evento Ship24:
 *   evento.status            — texto crudo
 *   evento.occurrenceDatetime — datetime ISO
 *   evento.location          — string plano
 */
export function formatearMensajeTracking(imp, evento) {
  const num   = imp.numContenedor || imp.blNumber || 'Sin número';
  const desc  = evento.status || 'Nuevo estado';
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
 * Clave de deduplicación para detectar si un evento ya fue notificado.
 * Usa evento.status + evento.occurrenceDatetime.
 */
export function claveEvento(evento) {
  if (!evento) return null;
  return `${evento.status ?? ''}|${evento.occurrenceDatetime ?? ''}`;
}
