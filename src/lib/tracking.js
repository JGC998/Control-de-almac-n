/**
 * Tracking de contenedores via Terminal49 + notificaciones WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   T49_API_KEY      — API key de terminal49.com (Settings → API Keys)
 *   CALLMEBOT_PHONE  — Número sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY — API key de CallMeBot
 *
 * Plan gratuito Terminal49 (junio 2025):
 *   - 50 contenedores/mes sin tarjeta de crédito
 *   - Datos de Yang Ming, MSC, Maersk, Evergreen y 100+ navieras
 *   - Refresh automático cada ~4h desde la fuente de la naviera
 *   - Registro: terminal49.com/free-container-tracking
 *
 * Flujo de uso:
 *   1. POST /v2/tracking_requests → registra el contenedor (1 vez, consume cuota)
 *   2. Terminal49 lo procesa en ~minutos y asigna un container UUID
 *   3. GET /v2/containers?filter[number]=YMMU... → obtener el UUID
 *   4. GET /v2/containers/{uuid}/transport_events → eventos sin coste adicional
 *   El UUID se guarda en el campo `courierCode` de la DB para los siguientes syncs.
 *
 * SCAC codes usados (Standard Carrier Alpha Code):
 *   YMLU  → Yang Ming (prefijos YMLU / YMMU)
 *   MSCU  → MSC
 *   MAEU  → Maersk
 *   CMDU  → CMA CGM
 *   EGLV  → Evergreen
 *   HLCU  → Hapag-Lloyd
 *   OOLU  → OOCL
 *   COSU  → COSCO
 */

const T49_BASE = 'https://api.terminal49.com/v2';

// Mapa prefijo del contenedor → SCAC de la naviera
const SCAC_MAP = {
  YMLU: 'YMLU', YMMU: 'YMLU',  // Yang Ming
  MSCU: 'MSCU', MEDU: 'MSCU',  // MSC
  MAEU: 'MAEU', MSKU: 'MAEU',  // Maersk
  CMAU: 'CMDU', CGMU: 'CMDU',  // CMA CGM
  EVGU: 'EGLV', EISU: 'EGLV',  // Evergreen
  HLCU: 'HLCU', HLXU: 'HLCU',  // Hapag-Lloyd
  OOLU: 'OOLU', OOCU: 'OOLU',  // OOCL
  COSU: 'COSU', CCLU: 'COSU',  // COSCO
  ONEY: 'ONEY',                  // ONE
  ZIMU: 'ZIMU',                  // ZIM
};

// Mapa de tipos de evento Terminal49 → descripción en español
const EVENT_ES = {
  'container.transport.vessel_loaded':    'Cargado en buque',
  'container.transport.vessel_departed':  'Salida del buque del puerto',
  'container.transport.vessel_arrived':   'Llegada al puerto de destino',
  'container.transport.vessel_discharged':'Descargado del buque',
  'container.transport.gate_in':          'Entrada en terminal',
  'container.transport.gate_out':         'Salida de terminal',
  'container.transport.full_out':         'Contenedor lleno retirado',
  'container.transport.empty_in':         'Devolución de contenedor vacío',
  'container.transport.empty_out':        'Salida de contenedor vacío',
  'container.transport.loaded':           'Cargado',
  'container.transport.discharged':       'Descargado',
};

function scacDesdeNumero(trackingNumber) {
  const prefix = trackingNumber.trim().slice(0, 4).toUpperCase();
  return SCAC_MAP[prefix] ?? null;
}

function t49Headers(apiKey) {
  return {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
  };
}

/** Devuelve true si el valor parece un UUID de Terminal49 */
function esT49Id(val) {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val).trim());
}

/**
 * Busca el UUID de contenedor en Terminal49 por número de contenedor.
 * Devuelve el UUID o null si aún no ha sido procesado.
 */
async function buscarContainerUuid(trackingNumber, headers) {
  const res = await fetch(
    `${T49_BASE}/containers?filter[number]=${encodeURIComponent(trackingNumber.trim().toUpperCase())}`,
    { headers, signal: AbortSignal.timeout(20_000) }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data?.[0]?.id ?? null;
}

/**
 * Registra un contenedor en Terminal49. Consume 1 unidad de la cuota mensual.
 * Terminal49 procesa la solicitud de forma asíncrona (~minutos).
 */
async function registrarTracking(trackingNumber, headers) {
  const scac = scacDesdeNumero(trackingNumber);
  const body = {
    data: {
      type: 'tracking_request',
      attributes: {
        request_type: 'container',
        request_number: trackingNumber.trim().toUpperCase(),
        ...(scac && { scac }),
      },
    },
  };

  const res = await fetch(`${T49_BASE}/tracking_requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // 422 = ya existe (registrado previamente) — no es un error real
    if (res.status !== 422) {
      throw new Error(`T49 create ${res.status}: ${text.slice(0, 200)}`);
    }
  }
}

/**
 * Consulta el estado de un contenedor en Terminal49.
 *
 * - Si ya tenemos el UUID (guardado en courierCode) → GET directo a los eventos.
 * - Si no → busca por número de contenedor. Si no existe, lo registra.
 *
 * Devuelve { eventos, ultimoEvento, eta, shipmentId } o null si aún no hay datos.
 * El campo `shipmentId` contiene el UUID de Terminal49 para guardarlo en DB.
 */
export async function buscarTracking(trackingNumber, t49Uuid = null) {
  const apiKey = process.env.T49_API_KEY;
  if (!apiKey) {
    console.warn('[tracking] T49_API_KEY no configurado — tracking desactivado');
    return null;
  }

  const headers = t49Headers(apiKey);

  // Obtener UUID del contenedor en Terminal49
  let containerId = esT49Id(t49Uuid) ? t49Uuid : null;

  if (!containerId) {
    // Buscar si ya está registrado en Terminal49
    containerId = await buscarContainerUuid(trackingNumber, headers);

    if (!containerId) {
      // Primera vez: registrar (consume 1 crédito del plan gratuito)
      await registrarTracking(trackingNumber, headers);
      console.info(`[tracking] ${trackingNumber} registrado en Terminal49 — datos disponibles en ~minutos`);
      return null; // El siguiente sync (4h) ya tendrá datos
    }
  }

  // Obtener eventos del contenedor
  const evRes = await fetch(
    `${T49_BASE}/containers/${containerId}/transport_events?include=location,vessel`,
    { headers, signal: AbortSignal.timeout(30_000) }
  );

  if (!evRes.ok) {
    if (evRes.status === 404) {
      // UUID obsoleto — reintentar sin UUID
      if (t49Uuid) return buscarTracking(trackingNumber, null);
      return null;
    }
    const text = await evRes.text().catch(() => '');
    throw new Error(`T49 events ${evRes.status}: ${text.slice(0, 200)}`);
  }

  const evJson = await evRes.json();
  const rawEvents = evJson?.data ?? [];

  // Índice de locations incluidas (para resolver nombres de puertos)
  const locations = {};
  (evJson?.included ?? []).forEach(inc => {
    if (inc.type === 'location') locations[inc.id] = inc;
  });

  // Normalizar eventos al formato interno { status, occurrenceDatetime, location }
  const eventos = rawEvents
    .filter(e => e.attributes?.timestamp)
    .sort((a, b) => new Date(b.attributes.timestamp) - new Date(a.attributes.timestamp))
    .map(e => {
      const attr = e.attributes;
      const locId = e.relationships?.location?.data?.id;
      const loc   = locId ? locations[locId] : null;
      const locName = loc?.attributes?.name ?? attr.location_locode ?? null;

      return {
        status: EVENT_ES[attr.event] ?? attr.event ?? 'Evento desconocido',
        occurrenceDatetime: attr.timestamp,
        location: locName,
      };
    });

  const ultimoEvento = eventos[0] ?? null;

  // Obtener ETA desde el contenedor (incluye shipment con pod_eta)
  let eta = null;
  try {
    const cRes = await fetch(
      `${T49_BASE}/containers/${containerId}?include=shipment`,
      { headers, signal: AbortSignal.timeout(15_000) }
    );
    if (cRes.ok) {
      const cJson = await cRes.json();
      const shipment = (cJson?.included ?? []).find(i => i.type === 'shipment');
      eta = shipment?.attributes?.pod_eta
        ?? shipment?.attributes?.destination_eta_at
        ?? null;
    }
  } catch {
    // ETA no crítica — continuar sin ella
  }

  return { eventos, ultimoEvento, eta, shipmentId: containerId };
}

/**
 * Envía un mensaje de WhatsApp via CallMeBot.
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
 */
export function claveEvento(evento) {
  if (!evento) return null;
  return `${evento.status ?? ''}|${evento.occurrenceDatetime ?? ''}`;
}
