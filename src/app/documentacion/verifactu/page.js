"use client";
import { Printer } from 'lucide-react';

export default function DocumentacionVerifactu() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header, nav, footer { display: none !important; }
          body { background: white !important; }
          .doc-container { max-width: 100% !important; padding: 0 !important; }
          pre { white-space: pre-wrap; word-break: break-all; font-size: 10px; }
          table { font-size: 11px; }
          h2 { page-break-before: always; }
          h2:first-of-type { page-break-before: avoid; }
          .page-break-before { page-break-before: always; }
          a { color: inherit; text-decoration: underline; }
          code { background: #f3f4f6 !important; }
          pre { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; }
        }
        pre { overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
      `}</style>

      <div className="doc-container max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0">

        {/* Cabecera */}
        <div className="flex items-start justify-between mb-8 no-print">
          <div />
          <button
            onClick={() => window.print()}
            className="btn btn-primary btn-sm gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF
          </button>
        </div>

        {/* Portada */}
        <div className="mb-10 pb-6 border-b border-base-300">
          <p className="text-sm text-base-content/50 mb-1">CRM Taller — Documentación técnica</p>
          <h1 className="text-4xl font-bold mb-2">Veri<span className="italic">*</span>Factu</h1>
          <p className="text-base-content/60 text-sm">Elaborado: mayo 2026 · Aplica a: CRM Taller (Next.js + Node.js + Prisma)</p>
        </div>

        {/* Índice */}
        <section className="mb-10">
          <h2 className="text-lg font-bold mb-3">Índice</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-base-content/80">
            {[
              'Marco legal',
              'Plazos de obligatoriedad',
              'Cómo funciona técnicamente',
              'El hash SHA-256 — cálculo exacto',
              'Estructura XML enviada a la AEAT',
              'El código QR en la factura',
              'Modo Veri*Factu vs. Modo No-Veri*Factu',
              'Facturas rectificativas y anulaciones',
              'Implementaciones open source',
              'Cómo lo implementan otras empresas',
              'Plan de implementación para CRM Taller',
              'Decisiones de diseño pendientes',
              'Referencias y enlaces',
            ].map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </section>

        {/* 1. Marco legal */}
        <Section n="1" title="Marco legal">
          <H3>Jerarquía normativa completa</H3>
          <table className="text-sm">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Norma</Th>
                <Th>Fecha</Th>
                <Th>Qué establece</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><strong>Ley 58/2003 General Tributaria, art. 29.2.j</strong></Td>
                <Td>Modificada por Ley 11/2021 (Ley Antifraude)</Td>
                <Td>Base legal de rango de Ley. Obliga a los SIF (Sistemas Informáticos de Facturación) a garantizar integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros. Prohíbe interpolaciones, omisiones o alteraciones no anotadas.</Td>
              </Tr>
              <Tr>
                <Td><strong>Real Decreto 1007/2023, de 5 de diciembre</strong> (BOE-A-2023-24840)</Td>
                <Td>06/12/2023</Td>
                <Td>"Reglamento RRSIF". Aprueba los requisitos técnicos de los SIF: encadenamiento de registros, QR, modalidad voluntaria Veri*Factu.</Td>
              </Tr>
              <Tr>
                <Td><strong>Orden HAC/1177/2024, de 17 de octubre</strong> (BOE-A-2024-22138)</Td>
                <Td>Publicada 28/10/2024, vigente 29/10/2024</Td>
                <Td>Desarrolla las especificaciones técnicas exactas: formato XML/XSD, algoritmo SHA-256 campo a campo, formato QR, protocolo SOAP, esquemas de intercambio. <strong>Este es el documento técnico de referencia.</strong></Td>
              </Tr>
              <Tr>
                <Td><strong>Resolución DGAEAT, 18 dic. 2024</strong></Td>
                <Td>18/12/2024</Td>
                <Td>Aprueba modelos de representación de terceros (poder notarial para que un gestor envíe en nombre del obligado).</Td>
              </Tr>
              <Tr>
                <Td><strong>Real Decreto 254/2025, de 1 de abril</strong></Td>
                <Td>01/04/2025</Td>
                <Td>Primera ampliación de plazos respecto al RD 1007/2023 original.</Td>
              </Tr>
              <Tr>
                <Td><strong>Real Decreto-ley 15/2025, de 2 de diciembre</strong></Td>
                <Td>03/12/2025</Td>
                <Td>Segunda ampliación de plazos. <strong>Establece los calendarios definitivos actualmente vigentes.</strong></Td>
              </Tr>
            </tbody>
          </table>

          <H3>¿Qué obliga exactamente?</H3>
          <P>La obligación recae sobre <strong>productores, comercializadores y usuarios</strong> de software que soporte procesos de facturación de empresarios y profesionales. Tiene dos dimensiones:</P>
          <ol className="list-decimal list-inside space-y-2 text-sm text-base-content/80 mb-4 pl-2">
            <li><strong>Requisitos del SIF</strong> (obligatorio para todos): el software debe implementar registros de facturación con encadenamiento de hashes, trazabilidad e inalterabilidad.</li>
            <li><strong>Envío a la AEAT</strong> (la modalidad "Veri*Factu" propiamente dicha): es <strong>voluntaria</strong>, pero muy recomendable porque elimina la obligación de firma XAdES avanzada sobre cada registro.</li>
          </ol>
          <div className="bg-base-200 rounded-lg p-3 text-sm">
            <strong>Exentos:</strong> quienes usen herramientas como Excel o Word exclusivamente para introducir datos, imprimir y conservar, sin automatización mediante macros que generen libros fiscales.
          </div>
        </Section>

        {/* 2. Plazos */}
        <Section n="2" title="Plazos de obligatoriedad">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm mb-4 text-amber-900">
            Establecidos por el RDL 15/2025. Si el Congreso rechazara su convalidación, revertirían a los plazos del RD 254/2025 (2026). A mayo de 2026 están en vigor los plazos de 2027.
          </div>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Sujeto</Th>
                <Th>Fecha límite</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><strong>Fabricantes / comercializadores de SIF</strong> (para poder vender software adaptado)</Td>
                <Td><strong>29 de julio de 2025</strong> ✅ (ya en vigor)</Td>
              </Tr>
              <Tr>
                <Td><strong>Contribuyentes del Impuesto sobre Sociedades</strong> (sociedades mercantiles, SA, SL, etc.)</Td>
                <Td><strong>1 de enero de 2027</strong></Td>
              </Tr>
              <Tr>
                <Td><strong>Resto de obligados:</strong> autónomos, profesionales, personas físicas con actividad económica en IRPF</Td>
                <Td><strong>1 de julio de 2027</strong></Td>
              </Tr>
            </tbody>
          </table>
          <H3>Implicación para CRM Taller</H3>
          <P>CRM Taller es software de facturación. Como <strong>fabricante/desarrollador de un SIF</strong> que se va a distribuir o usar para emitir facturas a clientes de terceros, la fecha relevante es <strong>1 de enero de 2027</strong> (fecha en la que los primeros usuarios obligados —sociedades— deben operar con un SIF conforme).</P>
        </Section>

        {/* 3. Cómo funciona */}
        <Section n="3" title="Cómo funciona técnicamente">
          <H3>El ciclo de una factura en Veri*Factu</H3>
          <Code>{`1. Se decide emitir una factura
       ↓
2. El SIF recopila los campos de la factura
       ↓
3. El SIF calcula el hash SHA-256 del registro actual
   (encadenando el hash del registro anterior)
       ↓
4. El SIF genera el XML del RegistroAlta
       ↓
5. El SIF almacena el registro de forma inmutable en BD
       ↓
6. El SIF envía el XML al webservice SOAP de la AEAT
   (en modo Veri*Factu, en tiempo real o por lotes)
       ↓
7. El SIF genera el PDF de la factura con:
   - El código QR (URL de verificación AEAT)
   - El texto "Factura verificable en la AEAT"
       ↓
8. La AEAT devuelve confirmación (CSV de respuesta)`}</Code>

          <H3>El Registro de Facturación de Alta (LRFE)</H3>
          <P>Cada factura genera un <strong>Registro de Facturación de Alta</strong> que es <strong>inmutable</strong>: una vez creado, no puede modificarse nunca. Si hay un error:</P>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><strong>Error menor</strong> (datos del cliente, descripción): se emite una <strong>factura rectificativa</strong> (tipo R1–R5) que referencia a la original.</li>
            <li><strong>Registro indebido</strong>: se emite un <strong>Registro de Anulación</strong> (<code className="text-xs bg-base-200 px-1 rounded">RegistroAnulacion</code>) que cancela el registro previo en la cadena de la AEAT.</li>
          </ul>
          <P>El conjunto de todos los registros de un emisor forma su <strong>Libro Registro de Facturación Electrónica (LRFE)</strong>, que es la cadena de hashes encadenados.</P>
        </Section>

        {/* 4. Hash SHA-256 */}
        <Section n="4" title="El hash SHA-256 — cálculo exacto">
          <H3>Campos que entran en el hash</H3>
          <P>Los campos se concatenan en formato <code className="text-xs bg-base-200 px-1 rounded">nombre=valor&nombre=valor...</code> en este orden <strong>exacto</strong>:</P>
          <Code>{`IDEmisorFactura=<NIF del emisor>
&NumSerieFactura=<serie y número concatenados>
&FechaExpedicionFactura=<DD-MM-YYYY>
&TipoFactura=<F1|F2|F3|R1|R2|R3|R4|R5>
&CuotaTotal=<suma de cuotas IVA>
&ImporteTotal=<importe total de la factura>
&Huella=<hash SHA-256 del registro ANTERIOR, vacío si es el primero>
&FechaHoraHusoGenRegistro=<timestamp ISO 8601 con timezone>`}</Code>

          <H3>Reglas de tratamiento de los valores</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Eliminar <strong>todos los espacios</strong> de los valores (no solo los extremos)</li>
            <li>Los valores numéricos: sin ceros decimales finales (<code className="text-xs bg-base-200 px-1 rounded">123.10 → 123.1</code>, <code className="text-xs bg-base-200 px-1 rounded">100.00 → 100</code>)</li>
            <li>Campos vacíos: se incluyen como <code className="text-xs bg-base-200 px-1 rounded">nombreCampo=</code> (con signo = pero sin valor)</li>
            <li>La cadena resultante se convierte a bytes <strong>UTF-8</strong> y se aplica SHA-256</li>
            <li>El resultado se expresa en <strong>hexadecimal en mayúsculas</strong> (exactamente 64 caracteres)</li>
          </ul>

          <H3>Ejemplo completo</H3>
          <P><strong>Cadena de entrada (primera factura de la serie — Huella vacía):</strong></P>
          <Code>{`IDEmisorFactura=89890001K&NumSerieFactura=12345678/G33&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=&FechaHoraHusoGenRegistro=2024-01-01T19:20:30+01:00`}</Code>
          <P><strong>Hash SHA-256 resultante:</strong></P>
          <Code>{`3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60`}</Code>

          <H3>Implementación en Node.js</H3>
          <Code>{`import { createHash } from 'crypto';

export function calcularHuellaVeriFactu({
  IDEmisorFactura,
  NumSerieFactura,
  FechaExpedicionFactura,  // 'DD-MM-YYYY'
  TipoFactura,
  CuotaTotal,              // número, ej: 21.0
  ImporteTotal,            // número, ej: 121.0
  HuellaAnterior = '',     // vacío para la primera factura
  FechaHoraHusoGenRegistro // '2024-01-01T19:20:30+01:00'
}) {
  const fmt = (n) => parseFloat(n).toString();

  const cadena = [
    \`IDEmisorFactura=\${IDEmisorFactura.replace(/\\s/g, '')}\`,
    \`NumSerieFactura=\${NumSerieFactura.replace(/\\s/g, '')}\`,
    \`FechaExpedicionFactura=\${FechaExpedicionFactura}\`,
    \`TipoFactura=\${TipoFactura}\`,
    \`CuotaTotal=\${fmt(CuotaTotal)}\`,
    \`ImporteTotal=\${fmt(ImporteTotal)}\`,
    \`Huella=\${HuellaAnterior}\`,
    \`FechaHoraHusoGenRegistro=\${FechaHoraHusoGenRegistro}\`,
  ].join('&');

  return createHash('sha256')
    .update(cadena, 'utf8')
    .digest('hex')
    .toUpperCase();
}`}</Code>

          <H3>Nota sobre HASH1 / HASH2 (Orden HAC/1177/2024)</H3>
          <P>La Orden introduce una distinción técnica:</P>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><strong>HASH1:</strong> calculado sobre los campos invariables del RegistroAlta (excluye la referencia a RegistroAnulacion)</li>
            <li><strong>HASH2:</strong> calculado a partir de HASH1 del registro actual + HASH2 del registro anterior</li>
          </ul>
          <P>En la práctica, lo que se incluye en el campo <code className="text-xs bg-base-200 px-1 rounded">&lt;Huella&gt;</code> del XML y en la URL del QR es el <strong>HASH2</strong> de la cadena. Para una implementación en modo Veri*Factu sin anulaciones complejas, HASH1 = HASH2 en la mayoría de los casos.</P>
        </Section>

        {/* 5. XML */}
        <Section n="5" title="Estructura XML enviada a la AEAT">
          <H3>Protocolo de comunicación</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><strong>SOAP 1.1</strong> en modo "document" sin codificación</li>
            <li><strong>HTTPS</strong> autenticado con <strong>certificado digital PKCS#12</strong> (.pfx emitido por la FNMT)</li>
            <li>Máximo <strong>1.000 registros</strong> por mensaje SOAP</li>
            <li>Intervalo mínimo de <strong>120 segundos</strong> entre envíos si hay cola pendiente</li>
          </ul>

          <H3>Endpoints del webservice</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Entorno</Th>
                <Th>URL</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><strong>Pruebas (preproducción)</strong></Td>
                <Td><code className="text-xs">https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SistemaFacturacion.wsdl</code></Td>
              </Tr>
              <Tr>
                <Td><strong>Producción</strong></Td>
                <Td><code className="text-xs">https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl</code></Td>
              </Tr>
            </tbody>
          </table>
          <P><strong>Operación principal:</strong> <code className="text-xs bg-base-200 px-1 rounded">AltaFactuSistemaFacturacion</code></P>

          <H3>Archivos XSD/WSDL oficiales</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Archivo</Th>
                <Th>Propósito</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ['SistemaFacturacion.wsdl', 'Definición del servicio web'],
                ['SuministroLR.xsd', 'Elemento raíz del mensaje (RegFactuSistemaFacturacion)'],
                ['SuministroInformacion.xsd', 'Tipos comunes: CabeceraType, RegistroFacturacionAltaType, EncadenamientoType'],
                ['RespuestaSuministro.xsd', 'Estructura de respuesta de la AEAT'],
                ['ConsultaLR.xsd', 'Consulta de registros enviados'],
                ['RespuestaConsultaLR.xsd', 'Respuesta a consultas'],
                ['EventosSIF.xsd', 'Registro de eventos (solo modo No-Veri*Factu)'],
                ['xmldsig-core-schema.xsd', 'Firma XAdES (solo modo No-Veri*Factu)'],
              ].map(([archivo, desc]) => (
                <Tr key={archivo}>
                  <Td><code className="text-xs">{archivo}</code></Td>
                  <Td>{desc}</Td>
                </Tr>
              ))}
            </tbody>
          </table>
          <P>Todos disponibles en: <code className="text-xs bg-base-200 px-1 rounded">https://github.com/hectorsipe/aeat-verifactu</code></P>

          <H3>Estructura del mensaje XML</H3>
          <Code>{`<RegFactuSistemaFacturacion xmlns="https://www2.agenciatributaria.gob.es/...">

  <Cabecera>
    <IDVersion>1.0</IDVersion>
    <ObligadoEmision>
      <NombreRazon>EMPRESA EJEMPLO SL</NombreRazon>
      <NIF>B12345678</NIF>
    </ObligadoEmision>
    <RemisionVoluntaria>   <!-- MODO VERI*FACTU: incluir este elemento -->
      <Periodo>
        <Ejercicio>2024</Ejercicio>
        <Periodo>01</Periodo>
      </Periodo>
    </RemisionVoluntaria>
  </Cabecera>

  <RegistroFactura>
    <RegistroAlta>
      <IDVersion>1.0</IDVersion>
      <IDFactura>
        <IDEmisorFactura>B12345678</IDEmisorFactura>
        <NumSerieFactura>2024F001</NumSerieFactura>
        <FechaExpedicionFactura>15-01-2024</FechaExpedicionFactura>
      </IDFactura>
      <NombreRazonEmisor>EMPRESA EJEMPLO SL</NombreRazonEmisor>

      <Destinatarios>
        <IDDestinatario>
          <NombreRazon>CLIENTE SA</NombreRazon>
          <NIF>A87654321</NIF>
        </IDDestinatario>
      </Destinatarios>

      <TipoFactura>F1</TipoFactura>  <!-- F1|F2|F3|R1|R2|R3|R4|R5 -->

      <Desglose>
        <DetalleIVA>
          <ClaveRegimen>01</ClaveRegimen>
          <CalificacionOperacion>S1</CalificacionOperacion>
          <TipoImpositivo>21</TipoImpositivo>
          <BaseImponibleOimporteNoSujeto>100.00</BaseImponibleOimporteNoSujeto>
          <CuotaRepercutida>21.00</CuotaRepercutida>
        </DetalleIVA>
      </Desglose>

      <CuotaTotal>21.00</CuotaTotal>
      <ImporteTotal>121.00</ImporteTotal>

      <Encadenamiento>
        <!-- Primera factura: -->
        <PrimerRegistro>S</PrimerRegistro>
        <!-- Si NO es la primera, reemplazar por: -->
        <!--
        <RegistroAnterior>
          <IDEmisorFactura>B12345678</IDEmisorFactura>
          <NumSerieFactura>2023F999</NumSerieFactura>
          <FechaExpedicionFactura>31-12-2023</FechaExpedicionFactura>
          <Huella>HASH_DEL_REGISTRO_ANTERIOR_EN_MAYUSCULAS</Huella>
        </RegistroAnterior>
        -->
      </Encadenamiento>

      <SistemaInformatico>
        <NombreRazon>CRM TALLER SL</NombreRazon>
        <NIF>B00000000</NIF>
        <NombreSistemaInformatico>CRM Taller</NombreSistemaInformatico>
        <IdSistemaInformatico>CRM-TALLER-V1</IdSistemaInformatico>
        <Version>1.0</Version>
        <NumeroInstalacion>1</NumeroInstalacion>
        <TipoUsoPosibleSoloVerifactu>S</TipoUsoPosibleSoloVerifactu>
        <TipoUsoPosibleMultiOT>N</TipoUsoPosibleMultiOT>
        <IndicadorMultiplesOT>N</IndicadorMultiplesOT>
      </SistemaInformatico>

      <FechaHoraHusoGenRegistro>2024-01-15T10:30:00+01:00</FechaHoraHusoGenRegistro>
      <TipoHuella>01</TipoHuella>
      <Huella>HASH_SHA256_DE_ESTE_REGISTRO_64_CHARS_MAYUSCULAS</Huella>
    </RegistroAlta>
  </RegistroFactura>

</RegFactuSistemaFacturacion>`}</Code>
        </Section>

        {/* 6. QR */}
        <Section n="6" title="El código QR en la factura">
          <H3>URL de verificación</H3>
          <Code>{`https://www2.agenciatributaria.es/wlpl/TIKE-CONT/ValidarQR?nif=NIF&numserie=SERIE&fecha=DD-MM-YYYY&importe=TOTAL`}</Code>

          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Parámetro</Th>
                <Th>Descripción</Th>
                <Th>Reglas</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><code className="text-xs">nif</code></Td>
                <Td>NIF del emisor</Td>
                <Td>Sin espacios ni guiones, 9 chars</Td>
              </Tr>
              <Tr>
                <Td><code className="text-xs">numserie</code></Td>
                <Td>Serie + número de factura</Td>
                <Td>Max 60 chars; <code className="text-xs">&amp;</code> → <code className="text-xs">%26</code></Td>
              </Tr>
              <Tr>
                <Td><code className="text-xs">fecha</code></Td>
                <Td>Fecha de expedición</Td>
                <Td>Formato DD-MM-AAAA con guiones</Td>
              </Tr>
              <Tr>
                <Td><code className="text-xs">importe</code></Td>
                <Td>Importe total</Td>
                <Td>Punto como separador decimal; max 12+2 dígitos</Td>
              </Tr>
            </tbody>
          </table>

          <P><strong>Entorno de pruebas:</strong> <code className="text-xs bg-base-200 px-1 rounded">https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?...</code></P>
          <P><strong>Ejemplo:</strong></P>
          <Code>{`https://www2.agenciatributaria.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=2024F001&fecha=15-01-2024&importe=121.0`}</Code>

          <H3>Especificaciones físicas del QR</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Estándar: <strong>ISO/IEC 18004</strong></li>
            <li>Nivel de corrección de errores: <strong>Medio (M)</strong></li>
            <li>Tamaño mínimo: <strong>30 mm × 30 mm</strong> (recomendado 40 × 40 mm)</li>
            <li>Ubicación: inicio de la factura, preferiblemente esquina superior izquierda o centrado en la parte superior</li>
            <li>Para facturas electrónicas estructuradas (PDF/XML): la URL se incluye como campo independiente, sin imagen QR</li>
          </ul>

          <H3>Texto obligatorio en la factura</H3>
          <div className="bg-base-200 rounded-lg p-3 text-sm mb-4">
            La factura impresa debe incluir la leyenda: <strong>"Factura verificable en la AEAT"</strong> (o equivalente)
          </div>

          <H3>Implementación en Node.js</H3>
          <Code>{`import QRCode from 'qrcode'; // npm install qrcode

export function construirURLCotejo(nif, numserie, fecha, importe, entorno = 'produccion') {
  const base = entorno === 'pruebas'
    ? 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR'
    : 'https://www2.agenciatributaria.es/wlpl/TIKE-CONT/ValidarQR';

  const numserieEncoded = numserie.replace(/&/g, '%26');
  const importeStr = parseFloat(importe).toString();

  return \`\${base}?nif=\${nif}&numserie=\${numserieEncoded}&fecha=\${fecha}&importe=\${importeStr}\`;
}

export async function generarQRBase64(url) {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    width: 150,
    margin: 1,
  });
}`}</Code>
        </Section>

        {/* 7. Modos */}
        <Section n="7" title="Modo Veri*Factu vs. Modo No-Veri*Factu">
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Característica</Th>
                <Th>Modo Veri*Factu ✅ (recomendado)</Th>
                <Th>Modo No-Veri*Factu</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Envío a la AEAT', 'Automático en tiempo real (o lotes rápidos)', 'No se envía; la AEAT puede solicitarlo después'],
                ['Firma electrónica de registros', 'No requerida (el hash SHA-256 es suficiente)', 'Requerida: firma XAdES avanzada sobre cada registro'],
                ['Registro de eventos del SIF', 'No requerido', 'Requerido: log de todos los eventos del sistema'],
                ['Custodia de registros', 'Reducida (los registros están en la AEAT)', 'El SIF debe custodiar y demostrar integridad de la cadena'],
                ['Elemento en XML', '<RemisionVoluntaria> en Cabecera', 'Sin ese elemento; <Signature> XAdES en cada registro'],
                ['Riesgo en auditoría', 'Bajo', 'Alto'],
                ['Complejidad de implementación', 'Media', 'Alta (firma XAdES es compleja)'],
              ].map(([car, veri, noveri]) => (
                <Tr key={car}>
                  <Td><strong>{car}</strong></Td>
                  <Td className="text-success">{veri}</Td>
                  <Td>{noveri}</Td>
                </Tr>
              ))}
            </tbody>
          </table>
          <div className="bg-success/10 border border-success/30 rounded-lg p-3 text-sm">
            <strong>Decisión para CRM Taller: implementar solo el modo Veri*Factu.</strong> Elimina la necesidad de firma XAdES y reduce drásticamente la complejidad.
          </div>
        </Section>

        {/* 8. Rectificativas */}
        <Section n="8" title="Facturas rectificativas y anulaciones">
          <H3>Tipos de factura</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Código</Th>
                <Th>Tipo</Th>
                <Th>Cuándo usar</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ['F1', 'Factura ordinaria completa', 'Caso general (empresas, autónomos con NIF)'],
                ['F2', 'Factura simplificada (ticket)', 'Importe < 400 € o cuando no se conoce el destinatario'],
                ['F3', 'Sustituye a facturas simplificadas', 'Agrupación de tickets en factura completa'],
                ['R1', 'Rectificativa (art. 80.Uno, Dos, Seis LIVA)', 'Errores en datos de la factura'],
                ['R2', 'Rectificativa por concurso de acreedores', 'Art. 80.Tres LIVA'],
                ['R3', 'Rectificativa por créditos incobrables', 'Art. 80.Cuatro LIVA'],
                ['R4', 'Rectificativa por otras causas art. 80', 'Resto de supuestos'],
                ['R5', 'Rectificativa de factura simplificada', 'Rectifica una F2'],
              ].map(([cod, tipo, cuando]) => (
                <Tr key={cod}>
                  <Td><code className="text-xs font-bold">{cod}</code></Td>
                  <Td>{tipo}</Td>
                  <Td>{cuando}</Td>
                </Tr>
              ))}
            </tbody>
          </table>

          <H3>Modalidades de rectificación (TipoRectificativa)</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><strong>S (Sustitución):</strong> reemplaza completamente la factura original. Los importes son los de la nueva factura completa.</li>
            <li><strong>I (Diferencias):</strong> solo se informa la diferencia. El importe puede ser negativo.</li>
          </ul>

          <H3>Estructura XML de una rectificativa (R1 por sustitución)</H3>
          <Code>{`<TipoFactura>R1</TipoFactura>
<TipoRectificativa>S</TipoRectificativa>
<FacturasRectificadas>
  <IDFacturaRectificada>
    <IDEmisorFactura>B12345678</IDEmisorFactura>
    <NumSerieFactura>2024F001</NumSerieFactura>
    <FechaExpedicionFactura>15-01-2024</FechaExpedicionFactura>
  </IDFacturaRectificada>
</FacturasRectificadas>`}</Code>

          <H3>Registro de Anulación</H3>
          <P>Distinto de la rectificativa. Se usa para cancelar un registro ya enviado a la AEAT que no debía haberse creado. Usa <code className="text-xs bg-base-200 px-1 rounded">&lt;RegistroAnulacion&gt;</code> en lugar de <code className="text-xs bg-base-200 px-1 rounded">&lt;RegistroAlta&gt;</code>. También encadena (el hash anterior de la anulación es el hash del último registro de la cadena).</P>

          <H3>Implicaciones para CRM Taller</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Las facturas en estado EMITIDA y PAGADA deben ser <strong>inmutables</strong> en la base de datos (ya implementado en Fase C)</li>
            <li>Fase D debe añadir: tipo de factura, soporte para R1–R5, generación de RegistroAnulacion</li>
            <li>Cada <code className="text-xs bg-base-200 px-1 rounded">Factura</code> almacenará su <code className="text-xs bg-base-200 px-1 rounded">huella</code> y referencia al registro anterior (<code className="text-xs bg-base-200 px-1 rounded">huellaAnterior</code>)</li>
          </ul>
        </Section>

        {/* 9. Open source */}
        <Section n="9" title="Implementaciones open source">
          <H3>JavaScript / TypeScript / Node.js</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Proyecto</Th>
                <Th>Stars</Th>
                <Th>Licencia</Th>
                <Th>Envía a AEAT</Th>
                <Th>Notas</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><code className="text-xs">verifactu-node-lib</code></Td>
                <Td>5</Td>
                <Td>MIT</Td>
                <Td>❌ No</Td>
                <Td>Genera XML y hash. Sin SOAP ni firma. <code className="text-xs">npm install verifactu-node-lib</code></Td>
              </Tr>
              <Tr>
                <Td><code className="text-xs">verifactu-api-nodejs</code></Td>
                <Td>14</Td>
                <Td>MIT</Td>
                <Td>✅ Sí</Td>
                <Td>API REST completa. Docker incluido. MySQL. Envía con cert. PKCS#12</Td>
              </Tr>
            </tbody>
          </table>

          <H3>PHP</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Proyecto</Th>
                <Th>Stars</Th>
                <Th>Licencia</Th>
                <Th>Envía a AEAT</Th>
                <Th>Notas</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><code className="text-xs">josemmo/Verifactu-PHP</code></Td>
                <Td>~100</Td>
                <Td>MIT</Td>
                <Td>✅ Sí</Td>
                <Td>La más completa en PHP. <code className="text-xs">composer require</code>. CI/CD y tests. PHP 8.2+</Td>
              </Tr>
            </tbody>
          </table>

          <H3>Python</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Proyecto</Th>
                <Th>Stars</Th>
                <Th>Licencia</Th>
                <Th>Envía a AEAT</Th>
                <Th>Notas</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><code className="text-xs">verifactu-api-python</code></Td>
                <Td>16</Td>
                <Td>MIT</Td>
                <Td>✅ Sí</Td>
                <Td>Flask + SQLAlchemy. Docker. MySQL.</Td>
              </Tr>
            </tbody>
          </table>

          <H3>C# / .NET</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Proyecto</Th>
                <Th>Stars</Th>
                <Th>Licencia</Th>
                <Th>Envía a AEAT</Th>
                <Th>Notas</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><code className="text-xs">mdiago/VeriFactu</code></Td>
                <Td>323</Td>
                <Td>AGPL-3.0</Td>
                <Td>✅ Sí</Td>
                <Td>La más madura. NuGet. Blockchain local CSV. Soporta VB6/VBA/Excel</Td>
              </Tr>
            </tbody>
          </table>

          <H3>Recursos de esquemas XSD/WSDL</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Proyecto</Th>
                <Th>Descripción</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><code className="text-xs">hectorsipe/aeat-verifactu</code></Td>
                <Td>Los ficheros WSDL y XSD oficiales de la AEAT exactos</Td>
              </Tr>
              <Tr>
                <Td><code className="text-xs">Eseperio/verifactu</code></Td>
                <Td>Lista curada de librerías open source por lenguaje</Td>
              </Tr>
              <Tr>
                <Td>github.com/topics/verifactu</Td>
                <Td>Todos los repositorios etiquetados con el topic "verifactu"</Td>
              </Tr>
            </tbody>
          </table>
        </Section>

        {/* 10. Cómo lo implementan */}
        <Section n="10" title="Cómo lo implementan otras empresas">
          <H3>ERP y software de facturación español</H3>
          <P>La mayoría de los grandes proveedores (Sage, Holded, Factusol, a3, Anfix, Billin, ContaSimple, Quipu, Stelorder, SimplyGest, Zucchetti) tienen o están desarrollando implementaciones internas. Patrón común:</P>
          <ol className="list-decimal list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Generan el XML conforme a los XSD de la AEAT internamente</li>
            <li>Calculan el hash SHA-256 internamente</li>
            <li>Usan el certificado digital FNMT del cliente para el SOAP</li>
            <li>Todos optan por modo <strong>Veri*Factu</strong> (envío automático) para evitar firma XAdES</li>
            <li>Almacenan la cadena de hashes en su propia base de datos</li>
          </ol>
          <P><strong>Odoo</strong> tiene módulo open source <code className="text-xs bg-base-200 px-1 rounded">l10n_es_verifactu_oca</code> de la Odoo Community Association (Python).</P>

          <H3>Servicios SaaS intermediarios</H3>
          <P>Para proyectos que no quieran implementar el SOAP + certificados directamente:</P>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Servicio</Th>
                <Th>URL</Th>
                <Th>Descripción</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><strong>VeriFactuAPI</strong></Td>
                <Td><code className="text-xs">app.verifactuapi.es</code></Td>
                <Td>SaaS REST. Bearer token. Gestiona emisores (NIFs), registros, QR, webhooks, PDF. Multi-NIF.</Td>
              </Tr>
              <Tr>
                <Td><strong>Nemon Invocash</strong></Td>
                <Td><code className="text-xs">nemon.io</code></Td>
                <Td>API intermediaria. Librerías en PHP disponibles en GitHub.</Td>
              </Tr>
              <Tr>
                <Td><strong>Binovo/ApiVerifactu</strong></Td>
                <Td><code className="text-xs">apiverifactu.es</code></Td>
                <Td>SaaS español, integración con ERPs.</Td>
              </Tr>
              <Tr>
                <Td><strong>iReneSolutions</strong></Td>
                <Td><code className="text-xs">facturae.irenesolutions.com:8050</code></Td>
                <Td>API REST gratuita asociada a la librería C# mdiago/VeriFactu.</Td>
              </Tr>
            </tbody>
          </table>

          <H3>Patrón de arquitectura con intermediario SaaS</H3>
          <Code>{`CRM Taller (Next.js)
      ↓ POST /api/registros (Bearer token)
 VeriFactuAPI  ←→  AEAT SOAP (con cert. FNMT)
      ↓ webhook confirmación
CRM Taller (actualiza estado)`}</Code>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div className="bg-success/10 rounded-lg p-3">
              <strong className="block mb-1 text-success">Ventajas</strong>
              Sin gestión de certificados, sin SOAP, sin colas de envío propias.
            </div>
            <div className="bg-error/10 rounded-lg p-3">
              <strong className="block mb-1 text-error">Desventajas</strong>
              Dependencia externa, coste mensual, datos de facturación en terceros.
            </div>
          </div>
        </Section>

        {/* 11. Plan */}
        <Section n="11" title="Plan de implementación para CRM Taller">
          <H3>Fase D1 — Hash + QR + Inmutabilidad (sin envío a AEAT)</H3>
          <P>Prerrequisito mínimo para ser un SIF conforme. El usuario puede emitir facturas con QR aunque no envíe a la AEAT todavía.</P>

          <P><strong>Cambios en base de datos (modelo Factura):</strong></P>
          <Code>{`model Factura {
  // ... campos existentes ...
  tipoFactura           String    @default("F1")      // F1|F2|R1|R2|R3|R4|R5
  tipoRectificativa     String?                        // S|I (solo en Rx)
  facturaRectificadaId  String?                        // referencia a la factura original
  huella                String?                        // hash SHA-256 de este registro
  huellaAnterior        String?                        // hash del registro anterior
  fechaHoraGenRegistro  DateTime?                      // timestamp de generación
  estadoEnvioAeat       String    @default("PENDIENTE") // PENDIENTE|ENVIADO|ERROR
  csvAeat               String?                        // CSV de confirmación AEAT
}`}</Code>

          <P><strong>Nuevo servicio src/lib/verifactu.js:</strong></P>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><code className="text-xs bg-base-200 px-1 rounded">calcularHuella(factura, huellaAnterior)</code> → string SHA-256</li>
            <li><code className="text-xs bg-base-200 px-1 rounded">construirURLQR(nif, numserie, fecha, importe)</code> → string URL</li>
            <li><code className="text-xs bg-base-200 px-1 rounded">generarXMLRegistroAlta(factura, sistemainformatico)</code> → string XML</li>
          </ul>

          <P><strong>Cambios en generateFacturaPDF:</strong></P>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Añadir el QR (imagen base64 desde <code className="text-xs bg-base-200 px-1 rounded">qrcode</code>)</li>
            <li>Añadir el texto "Factura verificable en la AEAT"</li>
            <li>Añadir número de huella en pie de página</li>
          </ul>

          <P><strong>Configuración necesaria en /configuracion:</strong></P>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>NIF de la empresa emisora</li>
            <li>Nombre/Razón social</li>
            <li>Nombre del SIF (CRM Taller) y versión</li>
          </ul>

          <H3>Fase D2 — Envío a AEAT (modalidad Veri*Factu)</H3>
          <P><strong>Nuevos modelos:</strong></P>
          <Code>{`model RegistroVeriFactu {
  id            String   @id @default(uuid())
  facturaId     String   @unique
  xmlEnviado    String
  fechaEnvio    DateTime
  respuestaAeat String?
  csvAeat       String?
  estado        String   // OK|ERROR|PENDIENTE
}`}</Code>
          <P><strong>Nuevo servicio src/lib/verifactuClient.js:</strong></P>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><code className="text-xs bg-base-200 px-1 rounded">enviarRegistroAeat(xmlPayload, certificado)</code> → usa <code className="text-xs bg-base-200 px-1 rounded">soap</code> (npm) con cert. PKCS#12</li>
            <li>Cola de envío con reintentos (respetando el intervalo de 120 segundos)</li>
          </ul>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm mb-4">
            <strong>Certificado digital:</strong> El cliente (empresa usuaria) debe tener un certificado FNMT (.pfx). Se almacena cifrado en la configuración del sistema. <strong>NO se sube a GitHub ni se incluye en el repositorio.</strong>
          </div>

          <H3>Fase D3 — Facturas rectificativas R1–R5</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>UI para crear facturas rectificativas desde una factura emitida</li>
            <li>Selección del tipo (R1–R5) y modalidad (S/I)</li>
            <li>El XML incluye <code className="text-xs bg-base-200 px-1 rounded">&lt;FacturasRectificadas&gt;</code> con referencia a la original</li>
            <li>La factura original permanece inmutable, se referencia desde la rectificativa</li>
          </ul>
        </Section>

        {/* 12. Decisiones */}
        <Section n="12" title="Decisiones de diseño pendientes">
          <P>Antes de empezar a escribir código de la Fase D, hay que decidir:</P>

          <H3>D1: ¿Implementación directa o SaaS intermediario?</H3>
          <table className="text-sm mb-4">
            <thead>
              <tr className="bg-base-200 font-semibold">
                <Th>Opción</Th>
                <Th>Pros</Th>
                <Th>Contras</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td><strong>Implementación directa</strong> (SOAP + cert. FNMT)</Td>
                <Td>Control total, sin dependencia externa, sin coste mensual</Td>
                <Td>Complejo, requiere gestión de certificados, cola de envíos</Td>
              </Tr>
              <Tr>
                <Td><strong>SaaS intermediario</strong> (VeriFactuAPI, Nemon, etc.)</Td>
                <Td>Simple, rápido, ellos gestionan la AEAT</Td>
                <Td>Dependencia externa, coste mensual, datos de facturas en terceros</Td>
              </Tr>
            </tbody>
          </table>

          <H3>D2: ¿Soporte multi-empresa o mono-empresa?</H3>
          <P>CRM Taller actualmente es <strong>mono-empresa</strong> (una sola empresa emisora). Si se quiere usar para gestionar múltiples NIFs emisores, la arquitectura cambia (Cabecera SOAP diferente, múltiples cadenas de hash independientes por NIF).</P>

          <H3>D3: ¿Dónde almacenar el certificado FNMT?</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>En un archivo <code className="text-xs bg-base-200 px-1 rounded">.pfx</code> en el servidor (fuera del repositorio)</li>
            <li>En variables de entorno (como base64)</li>
            <li>En un servicio de gestión de secretos (AWS Secrets Manager, Vault)</li>
          </ul>

          <H3>D4: ¿Cuándo calcular el hash?</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><strong>Al emitir la factura</strong> (cambio de estado BORRADOR → EMITIDA): el hash se calcula y ya no puede cambiar nada</li>
            <li>Esto refuerza la inmutabilidad ya implementada</li>
          </ul>
        </Section>

        {/* 13. Referencias */}
        <Section n="13" title="Referencias y enlaces">
          <H3>Legislación oficial (BOE)</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Real Decreto 1007/2023 (Reglamento RRSIF) — <code className="text-xs">boe.es/diario_boe/txt.php?id=BOE-A-2023-24840</code></li>
            <li>Orden HAC/1177/2024 (especificaciones técnicas) — <code className="text-xs">boe.es/diario_boe/txt.php?id=BOE-A-2024-22138</code></li>
            <li>Orden HAC/1177/2024 — PDF consolidado — <code className="text-xs">boe.es/buscar/pdf/2024/BOE-A-2024-22138-consolidado.pdf</code></li>
          </ul>

          <H3>AEAT — Portal oficial</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Portal principal VeriFactu — <code className="text-xs">sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html</code></li>
            <li>Información técnica (índice) — <code className="text-xs">.../informacion-tecnica.html</code></li>
            <li>Esquemas XSD (descarga) — <code className="text-xs">.../informacion-tecnica/esquemas.html</code></li>
            <li>WSDL servicios web — <code className="text-xs">.../informacion-tecnica/wsdl-servicios-web.html</code></li>
            <li>Algoritmo hash SHA-256 — <code className="text-xs">.../informacion-tecnica/algoritmo-calculo-codificacion-huella-hash.html</code></li>
            <li>Características QR y servicio de cotejo — <code className="text-xs">.../informacion-tecnica/caracteristicas-qr-especificaciones-servicio-cotejo-factura.html</code></li>
            <li>FAQ — Registros de facturación de alta — <code className="text-xs">.../preguntas-frecuentes/registros-facturacion-alta.html</code></li>
            <li>FAQ — Sistemas Veri*Factu — <code className="text-xs">.../preguntas-frecuentes/sistemas-verifactu.html</code></li>
            <li>FAQ — Huella/hash — <code className="text-xs">.../preguntas-frecuentes/huella-hash.html</code></li>
            <li>Portal de pruebas externas — <code className="text-xs">preportal.aeat.es</code></li>
            <li>Informador VeriFactu — <code className="text-xs">www2.agenciatributaria.gob.es/wlpl/AVAC-CALC/InformadorVerifactu</code></li>
          </ul>

          <H3>AEAT — Documentos técnicos PDF</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>Descripción del servicio web — <code className="text-xs">Veri-Factu_Descripcion_SWeb.pdf</code></li>
            <li>Especificaciones hash SHA-256 — <code className="text-xs">Veri-Factu_especificaciones_huella_hash_registros.pdf</code></li>
            <li>Validaciones y errores — <code className="text-xs">Validaciones_Errores_Veri-Factu.pdf</code></li>
            <li>Especificaciones técnicas QR — <code className="text-xs">DetalleEspecificacTecnCodigoQRfactura.pdf</code></li>
          </ul>

          <H3>GitHub — Implementaciones open source</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li><code className="text-xs">github.com/hectorsipe/aeat-verifactu</code> — XSD/WSDL oficiales</li>
            <li><code className="text-xs">github.com/zarpilla/verifactu-node-lib</code> — TypeScript/npm</li>
            <li><code className="text-xs">github.com/EduardoRuizM/verifactu-api-nodejs</code> — Node.js + envío AEAT</li>
            <li><code className="text-xs">github.com/josemmo/Verifactu-PHP</code> — PHP, la más completa</li>
            <li><code className="text-xs">github.com/EduardoRuizM/verifactu-api-python</code> — Python + Flask</li>
            <li><code className="text-xs">github.com/mdiago/VeriFactu</code> — C#, 323 stars</li>
            <li><code className="text-xs">github.com/Eseperio/verifactu</code> — lista de librerías</li>
            <li><code className="text-xs">github.com/topics/verifactu</code> — todos los repos etiquetados</li>
          </ul>

          <H3>SaaS intermediarios</H3>
          <ul className="list-disc list-inside space-y-1 text-sm text-base-content/80 mb-4 pl-2">
            <li>VeriFactuAPI — <code className="text-xs">app.verifactuapi.es/docs/</code></li>
            <li>Nemon Invocash — <code className="text-xs">nemon.io</code></li>
            <li>Binovo/ApiVerifactu — <code className="text-xs">apiverifactu.es</code></li>
          </ul>
        </Section>

        {/* Pie */}
        <div className="mt-12 pt-6 border-t border-base-300 text-xs text-base-content/40 text-center">
          Documento generado en mayo de 2026 · CRM Taller · Revisar ante cambios normativos de la AEAT
        </div>

      </div>
    </>
  );
}

// Componentes de ayuda
function Section({ n, title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-4 pb-2 border-b border-base-300 flex items-baseline gap-2">
        <span className="text-base-content/30 text-lg font-normal">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function H3({ children }) {
  return <h3 className="text-base font-bold mt-5 mb-2 text-base-content">{children}</h3>;
}

function P({ children }) {
  return <p className="text-sm text-base-content/80 mb-3 leading-relaxed">{children}</p>;
}

function Code({ children }) {
  return (
    <pre className="bg-base-200 rounded-lg p-4 text-xs font-mono mb-4 leading-relaxed overflow-x-auto">
      {children}
    </pre>
  );
}

function Th({ children }) {
  return <th className="border border-base-300 bg-base-200 px-3 py-2 text-left font-semibold text-xs">{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`border border-base-300 px-3 py-2 text-sm ${className}`}>{children}</td>;
}

function Tr({ children }) {
  return <tr className="even:bg-base-100 odd:bg-base-50 hover:bg-base-200/50">{children}</tr>;
}
