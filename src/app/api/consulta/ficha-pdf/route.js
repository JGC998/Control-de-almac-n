import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

const CONF_LABEL = { SF: 'Sin Fin', GR: 'Con Grapa', AB: 'Abierta' };

const fmtN = (v, dec = 2) => {
  const n = typeof v === 'number' ? v : parseFloat(v) || 0;
  return isFinite(n)
    ? n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : '0,00';
};

const fmtEur = v => `${fmtN(v)} €`;

let _logoBase64 = null;
async function getLogoBase64() {
  if (_logoBase64) return _logoBase64;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
    const buffer = await fs.readFile(logoPath);
    _logoBase64 = buffer.toString('base64');
    return _logoBase64;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { datos, tipo } = body;

    if (!datos?.precio_total) {
      return NextResponse.json({ error: 'Sin datos de cálculo' }, { status: 400 });
    }

    const [emisor, logoBase64] = await Promise.all([
      db.configuracionEmisor.findUnique({ where: { id: 1 } }).catch(() => null),
      getLogoBase64(),
    ]);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Logo
    if (logoBase64) {
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 12, 50, 15);
    }

    // Header empresa
    const nombreEmpresa = emisor?.nombre || 'Taller';
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FICHA DE CÁLCULO', 14, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    if (emisor?.nombre) doc.text(emisor.nombre, 14, 27);
    if (emisor?.nif) doc.text(`NIF: ${emisor.nif}`, 14, 32);
    doc.setTextColor(0, 0, 0);

    // Fecha
    const fecha = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Fecha: ${fecha}`, 14, 40);
    doc.setTextColor(0, 0, 0);

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 44, 196, 44);

    let yPos = 52;

    // ── Sección: Especificaciones ────────────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Especificaciones', 14, yPos);
    yPos += 6;

    const confLabel = CONF_LABEL[datos.conf] ?? datos.conf ?? '—';
    const filas = [];

    if (tipo === 'calculo' || tipo === 'calculo_banda') {
      const { dims, ancho, largo, area_m2, material, espesor, conf } = datos;
      const ancho_mm = ancho ?? (dims ? String(dims).split(/[x×]/i)[0] : null);
      const largo_mm = largo ?? (dims ? String(dims).split(/[x×]/i)[1] : null);

      if (ancho_mm) filas.push(['Ancho', `${fmtN(ancho_mm, 0)} mm`]);
      if (largo_mm) filas.push(['Largo', `${fmtN(largo_mm, 0)} mm`]);
      if (area_m2)  filas.push(['Superficie', `${fmtN(area_m2)} m²`]);
      if (material) filas.push(['Material', material]);
      if (espesor != null) filas.push(['Espesor', `${espesor} mm`]);
      filas.push(['Configuración', confLabel]);
    } else if (tipo === 'metraje') {
      const { metros, anchoTira, area_m2, material, espesor, peso_total } = datos;
      if (metros)    filas.push(['Metros lineales', `${fmtN(metros, 0)} m`]);
      if (anchoTira) filas.push(['Ancho de tira', `${fmtN(anchoTira, 0)} mm`]);
      if (area_m2)   filas.push(['Superficie total', `${fmtN(area_m2)} m²`]);
      if (material)  filas.push(['Material', material]);
      if (espesor != null) filas.push(['Espesor', `${espesor} mm`]);
      if (peso_total) filas.push(['Peso estimado', `${fmtN(peso_total)} kg`]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: filas,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: [80, 80, 80] },
        1: { cellWidth: 80 },
      },
      margin: { left: 14, right: 14 },
    });

    yPos = doc.lastAutoTable.finalY + 10;

    // ── Sección: Precio ──────────────────────────────────────────────────────
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Precio', 14, yPos);
    yPos += 6;

    const ivaRate = datos.iva ?? 0.21;
    const ivaPct  = Math.round(ivaRate * 100);
    const filasPrecios = [
      ['Precio sin IVA', fmtEur(datos.precio_total)],
      [`IVA (${ivaPct}%)`, fmtEur(datos.precio_total * ivaRate)],
    ];
    if (datos.precio_con_iva) {
      filasPrecios.push(['TOTAL con IVA', fmtEur(datos.precio_con_iva)]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: filasPrecios,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 } },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: [80, 80, 80] },
        1: { cellWidth: 80, fontStyle: 'bold' },
      },
      bodyStyles: { fillColor: false },
      didParseCell(data) {
        if (data.row.index === filasPrecios.length - 1 && datos.precio_con_iva) {
          data.cell.styles.fontSize = 12;
          data.cell.styles.textColor = [30, 80, 180];
        }
      },
      margin: { left: 14, right: 14 },
    });

    // Desglose por unidades si lo hay
    if (datos.cantidad && datos.cantidad > 1) {
      yPos = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Total para ${datos.cantidad} unidades: ${fmtEur(datos.precio_total)} sin IVA / ${datos.precio_con_iva ? fmtEur(datos.precio_con_iva) : '—'} con IVA`,
        14, yPos,
      );
      doc.setTextColor(0, 0, 0);
    }

    // Pie de página
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text('Documento generado automáticamente. Precios orientativos sujetos a confirmación.', 14, 285);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ficha-calculo-${Date.now()}.pdf"`,
      },
    });
  } catch (error) {
    logApiError(error, 'ficha-pdf');
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 });
  }
}
