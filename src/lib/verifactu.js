import { createHash } from 'crypto';

// Timestamp con timezone de España (Europe/Madrid), maneja DST automáticamente.
// Formato requerido por Orden HAC/1177/2024: 2024-01-15T10:30:00+01:00
export function getFechaHoraHusoEspana(date = new Date()) {
  const fmt = (tz) => new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const madridParts = fmt('Europe/Madrid');
  const utcParts    = fmt('UTC');
  const get = (parts, t) => parts.find(p => p.type === t).value;

  // Offset calculado comparando horas Madrid vs UTC directamente (sin depender de TZ del servidor)
  let offsetHours = parseInt(get(madridParts, 'hour')) - parseInt(get(utcParts, 'hour'));
  if (offsetHours < -12) offsetHours += 24;
  if (offsetHours >  12) offsetHours -= 24;

  const sign = offsetHours >= 0 ? '+' : '-';
  const hh   = String(Math.abs(offsetHours)).padStart(2, '0');

  return `${get(madridParts, 'year')}-${get(madridParts, 'month')}-${get(madridParts, 'day')}` +
         `T${get(madridParts, 'hour')}:${get(madridParts, 'minute')}:${get(madridParts, 'second')}${sign}${hh}:00`;
}

// Fecha en formato DD-MM-YYYY (para la URL del QR y para el hash)
export function formatFechaQR(date = new Date()) {
  const parts = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t).value;
  return `${get('day')}-${get('month')}-${get('year')}`;
}

// Formatea un número según la Orden HAC/1177/2024: sin ceros decimales finales.
// 100.00 → "100"  |  123.10 → "123.1"  |  21.05 → "21.05"
const fmtNum = (n) => parseFloat(n).toString();

// Calcula la huella SHA-256 de un registro de factura.
// Todos los parámetros son strings o números; se aplica fmtNum a los numéricos.
export function calcularHuella({
  IDEmisorFactura,      // NIF del emisor, sin espacios
  NumSerieFactura,      // serie + número concatenados (ej: "2024F001")
  FechaExpedicionFactura, // "DD-MM-YYYY"
  TipoFactura,          // "F1" | "F2" | "R1" … "R5"
  CuotaTotal,           // número: suma de cuotas IVA
  ImporteTotal,         // número: importe total
  HuellaAnterior = '',  // SHA-256 del registro anterior (vacío = primera factura)
  FechaHoraHusoGenRegistro, // resultado de getFechaHoraHusoEspana()
}) {
  const cadena = [
    `IDEmisorFactura=${IDEmisorFactura.replace(/\s/g, '')}`,
    `NumSerieFactura=${NumSerieFactura.replace(/\s/g, '')}`,
    `FechaExpedicionFactura=${FechaExpedicionFactura}`,
    `TipoFactura=${TipoFactura}`,
    `CuotaTotal=${fmtNum(CuotaTotal)}`,
    `ImporteTotal=${fmtNum(ImporteTotal)}`,
    `Huella=${HuellaAnterior}`,
    `FechaHoraHusoGenRegistro=${FechaHoraHusoGenRegistro}`,
  ].join('&');

  return createHash('sha256').update(cadena, 'utf8').digest('hex').toUpperCase();
}

// Construye la URL de cotejo del QR de la factura.
// entorno: "pruebas" usa preportal.aeat.es; "produccion" usa el portal real.
export function construirURLQR({ nif, numserie, fecha, importe, entorno = 'pruebas' }) {
  const base = entorno === 'produccion'
    ? 'https://www2.agenciatributaria.es/wlpl/TIKE-CONT/ValidarQR'
    : 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR';

  const params = new URLSearchParams({
    nif:      nif.replace(/\s/g, ''),
    numserie: numserie,
    fecha:    fecha,
    importe:  fmtNum(importe),
  });

  return `${base}?${params.toString()}`;
}

// Genera un bloque <RegistroFactura> para un XML de lote o individual.
// prevFactura: objeto de la factura anterior en la cadena (para <RegistroAnterior>)
function generarRegistroFactura(factura, nif, nombre, prevFactura = null) {
  const esPrimero = !factura.huellaAnterior;
  const fechaExp  = formatFechaQR(new Date(factura.fechaHoraGenRegistro || factura.fechaCreacion));
  const timestamp = getFechaHoraHusoEspana(new Date(factura.fechaHoraGenRegistro || factura.fechaCreacion));

  // <RegistroAnterior> debe identificar la factura PREVIA de la cadena, no la actual
  const prevNumSerie = prevFactura ? prevFactura.numero : '';
  const prevFecha    = prevFactura
    ? formatFechaQR(new Date(prevFactura.fechaHoraGenRegistro || prevFactura.fechaCreacion))
    : '';

  const encadenamiento = esPrimero
    ? `<PrimerRegistro>S</PrimerRegistro>`
    : `<RegistroAnterior>
          <IDEmisorFactura>${nif}</IDEmisorFactura>
          <NumSerieFactura>${escXml(prevNumSerie)}</NumSerieFactura>
          <FechaExpedicionFactura>${prevFecha}</FechaExpedicionFactura>
          <Huella>${factura.huellaAnterior}</Huella>
        </RegistroAnterior>`;

  const destinatario = factura.cliente
    ? `<Destinatarios>
        <IDDestinatario>
          <NombreRazon>${escXml(factura.cliente.nombre || '')}</NombreRazon>
          ${factura.cliente.nif ? `<NIF>${escXml(factura.cliente.nif)}</NIF>` : '<IDOtro><IDType>07</IDType><ID>NO-NIF</ID></IDOtro>'}
        </IDDestinatario>
      </Destinatarios>`
    : '';

  const tipoFactura = factura.tipoFactura || 'F1';
  const esRectificativa = tipoFactura.startsWith('R');
  const bloqueRectificativa = esRectificativa && factura.facturaOriginal
    ? `<TipoRectificativa>${factura.tipoRectificativa || 'I'}</TipoRectificativa>
      <FacturasRectificadas>
        <IDFacturaRectificada>
          <IDEmisorFactura>${nif}</IDEmisorFactura>
          <NumSerieFactura>${escXml(factura.facturaOriginal.numero)}</NumSerieFactura>
          <FechaExpedicionFactura>${formatFechaQR(new Date(factura.facturaOriginal.fechaHoraGenRegistro || factura.facturaOriginal.fechaCreacion))}</FechaExpedicionFactura>
        </IDFacturaRectificada>
      </FacturasRectificadas>`
    : '';

  return `  <RegistroFactura>
    <RegistroAlta>
      <IDVersion>1.0</IDVersion>
      <IDFactura>
        <IDEmisorFactura>${nif}</IDEmisorFactura>
        <NumSerieFactura>${escXml(factura.numero)}</NumSerieFactura>
        <FechaExpedicionFactura>${fechaExp}</FechaExpedicionFactura>
      </IDFactura>
      <NombreRazonEmisor>${escXml(nombre)}</NombreRazonEmisor>
      ${destinatario}
      <TipoFactura>${tipoFactura}</TipoFactura>
      ${bloqueRectificativa}
      <Desglose>
        <DetalleIVA>
          <ClaveRegimen>01</ClaveRegimen>
          <CalificacionOperacion>S1</CalificacionOperacion>
          <TipoImpositivo>21</TipoImpositivo>
          <BaseImponibleOimporteNoSujeto>${fmtNum(factura.subtotal)}</BaseImponibleOimporteNoSujeto>
          <CuotaRepercutida>${fmtNum(factura.tax)}</CuotaRepercutida>
        </DetalleIVA>
      </Desglose>
      <CuotaTotal>${fmtNum(factura.tax)}</CuotaTotal>
      <ImporteTotal>${fmtNum(factura.total)}</ImporteTotal>
      <Encadenamiento>
        ${encadenamiento}
      </Encadenamiento>
      <SistemaInformatico>
        <NombreRazon>${escXml(nombre)}</NombreRazon>
        <NIF>${nif}</NIF>
        <NombreSistemaInformatico>CRM Taller</NombreSistemaInformatico>
        <IdSistemaInformatico>CRM-TALLER-V1</IdSistemaInformatico>
        <Version>1.0</Version>
        <NumeroInstalacion>1</NumeroInstalacion>
        <TipoUsoPosibleSoloVerifactu>S</TipoUsoPosibleSoloVerifactu>
        <TipoUsoPosibleMultiOT>N</TipoUsoPosibleMultiOT>
        <IndicadorMultiplesOT>N</IndicadorMultiplesOT>
      </SistemaInformatico>
      <FechaHoraHusoGenRegistro>${timestamp}</FechaHoraHusoGenRegistro>
      <TipoHuella>01</TipoHuella>
      <Huella>${factura.huella || ''}</Huella>
    </RegistroAlta>
  </RegistroFactura>`;
}

function xmlCabecera(nif, nombre, ejercicio, periodo) {
  return `  <Cabecera>
    <IDVersion>1.0</IDVersion>
    <ObligadoEmision>
      <NombreRazon>${escXml(nombre)}</NombreRazon>
      <NIF>${nif}</NIF>
    </ObligadoEmision>
    <RemisionVoluntaria>
      <Periodo>
        <Ejercicio>${ejercicio}</Ejercicio>
        <Periodo>${periodo}</Periodo>
      </Periodo>
    </RemisionVoluntaria>
  </Cabecera>`;
}

const NS = 'https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.xsd';

// Genera el XML completo para una sola factura.
// prevFactura: factura anterior en la cadena (necesaria para <RegistroAnterior>)
export function generarXMLRegistroAlta(factura, emisor, prevFactura = null) {
  const nif = emisor.nif.replace(/\s/g, '');
  const nombre = emisor.nombre.toUpperCase();
  const ref = new Date(factura.fechaCreacion);
  const cabecera = xmlCabecera(nif, nombre, ref.getFullYear().toString(), String(ref.getMonth() + 1).padStart(2, '0'));
  const registro = generarRegistroFactura(factura, nif, nombre, prevFactura);

  return `<?xml version="1.0" encoding="UTF-8"?>
<RegFactuSistemaFacturacion xmlns="${NS}">
${cabecera}
${registro}
</RegFactuSistemaFacturacion>`;
}

// Genera el XML de un lote de facturas para subida manual a AEAT.
// facturas debe venir ordenado por fechaHoraGenRegistro ASC.
export function generarXMLLote(facturas, emisor) {
  if (!facturas.length) throw new Error('No hay facturas para exportar');
  const nif = emisor.nif.replace(/\s/g, '');
  const nombre = emisor.nombre.toUpperCase();
  const ref = new Date(facturas[0].fechaCreacion);
  const cabecera = xmlCabecera(nif, nombre, ref.getFullYear().toString(), String(ref.getMonth() + 1).padStart(2, '0'));
  const registros = facturas.map((f, idx) => generarRegistroFactura(f, nif, nombre, idx > 0 ? facturas[idx - 1] : null)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<RegFactuSistemaFacturacion xmlns="${NS}">
${cabecera}
${registros}
</RegFactuSistemaFacturacion>`;
}

function escXml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
