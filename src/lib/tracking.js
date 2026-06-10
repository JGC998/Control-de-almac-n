/**
 * Tracking de contenedores Yang Ming + notificaciones WhatsApp via CallMeBot.
 *
 * Variables de entorno requeridas:
 *   CALLMEBOT_PHONE  — Número sin + (ej: 34612345678)
 *   CALLMEBOT_APIKEY — API key de CallMeBot
 *
 * Fuente de datos: API pública de Yang Ming (sin autenticación).
 * Soporta contenedores con prefijo YMMU / YMLU.
 * Para otras navieras: añadir su endpoint correspondiente.
 */

const YM_API = 'https://www.yangming.com/api/CargoTracking/GetTracking';

const PREFIJOS_YM = new Set(['YMMU', 'YMLU']);

// Traducción de eventos Yang Ming → español
const YM_EVENT_ES = {
  'Received at Origin':                                    'Recibido en origen',
  'Empty to Shipper':                                      'Contenedor vacío entregado al cargador',
  'Gate In':                                               'Entrada en terminal',
  'Gate Out':                                              'Salida de terminal',
  'Loaded on Vessel':                                      'Cargado en buque',
  'Vessel Departure':                                      'Salida del buque',
  'Vessel Arrival':                                        'Llegada al puerto de destino',
  'Discharged from Vessel':                                'Descargado del buque',
  'Gate out of Full Equipment by Truck at Port terminal':  'Contenedor lleno retirado de terminal',
  'Gate in of Full Equipment by Truck at Port terminal':   'Contenedor lleno en terminal',
  'Gate in of Laden Equipment by Truck at Port terminal':  'Contenedor lleno entregado en terminal',
  'Gate out of Empty Equipment by Truck at Depot':         'Contenedor vacío recogido en depósito',
  'Gate in of Empty Equipment by Truck at Depot':          'Devolución de contenedor vacío',
  'Delivered':                                             'Entregado al receptor',
  'Rail Departure':                                        'Salida por ferrocarril',
  'Rail Arrival':                                          'Llegada por ferrocarril',
};

function prefijo(num) {
  return num?.trim().toUpperCase().slice(0, 4) ?? '';
}

function esYangMing(num) {
  return PREFIJOS_YM.has(prefijo(num));
}

function parseFechaYM(str) {
  if (!str) return null;
  // "2026/06/09 22:22" → ISO 8601
  const iso = str.replace(/\//g, '-').replace(' ', 'T') + ':00';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function buscarTrackingYangMing(trackingNumber) {
  const url = `${YM_API}?paramTrackNo=${encodeURIComponent(trackingNumber)}&paramTrackPosition=SEARCH&paramRefNo=`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':     'application/json, text/plain, */*',
      'Referer':    'https://www.yangming.com/en/esolution/cargo_tracking',
      'Origin':     'https://www.yangming.com',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    console.warn(`[tracking] Yang Ming API HTTP ${res.status} para ${trackingNumber}`);
    return null;
  }

  const json = await res.json();
  const container = json?.containerList?.[0];
  if (!container || !json.successCnt) return null;

  const rawEvents = container.ctStatusInfo ?? [];
  if (rawEvents.length === 0) {
    console.info(`[tracking] ${trackingNumber}: sin eventos aún en Yang Ming`);
    return null;
  }

  // seq 1 = evento más reciente (nowStatus "Y"), seq N = más antiguo
  const eventos = rawEvents.map(e => ({
    status:               YM_EVENT_ES[e.eventDesc] ?? e.eventDesc ?? 'Evento desconocido',
    occurrenceDatetime:   parseFechaYM(e.moveDate),
    location:             e.atFacility ?? null,
    vesselVoyage:         e.vesselVoyage ?? null,
  }));

  const ultimoEvento = eventos[0] ?? null;

  // ETA: puede venir en dportETA de cualquier evento
  const etaRaw = rawEvents.find(e => e.dportETA)?.dportETA ?? null;
  const eta = parseFechaYM(etaRaw);

  console.info(`[tracking] ${trackingNumber}: ${eventos.length} eventos — último: "${ultimoEvento?.status}" en ${ultimoEvento?.location}`);

  return { eventos, ultimoEvento, eta, shipmentId: null };
}

/**
 * Consulta el estado de un contenedor.
 * Actualmente soporta Yang Ming (YMMU/YMLU).
 * Para otras navieras, añadir su función correspondiente.
 */
export async function buscarTracking(trackingNumber, _uuid = null) {
  if (!trackingNumber?.trim()) return null;

  const num = trackingNumber.trim().toUpperCase();

  if (esYangMing(num)) {
    return buscarTrackingYangMing(num);
  }

  console.warn(`[tracking] Naviera no soportada para ${num} (prefijo: ${prefijo(num)})`);
  return null;
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
