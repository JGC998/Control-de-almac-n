import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from 'fs/promises';
import path from 'path';

// --- DATOS DE LA EMPRESA (Hardcodeados según solicitud) ---
const COMPANY_ADDRESS = 'C. La Jarra, 41, 14540 La Rambla, Córdoba';
const COMPANY_PHONE = '957 68 28 19';
// --------------------------------------------------------

export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; 

    // 1. Obtener todos los datos de la BD en una sola consulta
    const quote = await db.presupuesto.findUnique({
      where: { id: id },
      include: {
        cliente: true, 
        items: true,
      },
    });

    if (!quote) {
      return new NextResponse('Presupuesto no encontrado', { status: 404 });
    }
    
    // 2. Obtener la configuración (IVA) de la BD
    const configIva = await db.config.findUnique({
      where: { key: 'iva_rate' },
    });
    const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
    const client = quote.cliente; 

    // --- Inicio de la Generación del PDF ---
    const doc = new jsPDF();

    // --- Añadir Logo ---
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
      const logoBuffer = await fs.readFile(logoPath);
      doc.addImage(logoBuffer, 'PNG', 145, 15, 50, 15);
    } catch (error) {
      console.error("No se pudo cargar el logo, se continuará sin él:", error);
    }

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PRESUPUESTO", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // DETALLES DE LA EMPRESA (Actualizado: REMOVIDO COMPANY_NAME)
    doc.text(COMPANY_ADDRESS, 200, 38, { align: 'right' });
    doc.text(`Teléfono: ${COMPANY_PHONE}`, 200, 44, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Número:`, 14, 36);
    doc.setFont("helvetica", "normal");
    doc.text(`${quote.numero}`, 38, 36);

    doc.setFont("helvetica", "bold");
    doc.text(`Fecha:`, 14, 42);
    doc.setFont("helvetica", "normal");
    const formattedDate = new Date(quote.fechaCreacion).toLocaleDateString('es-ES');
    doc.text(formattedDate, 38, 42);

    doc.rect(14, 55, 90, 28);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 20, 61);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (client) {
      doc.text(client.nombre, 20, 67);
      doc.text(client.direccion || 'Dirección no especificada', 20, 73);
      doc.text(client.email || 'Email no especificado', 20, 79);
    }

    const tableColumn = ["Descripción", "Cantidad", "Precio Unit.", "Total"];
    const tableRows = [];
    
    quote.items.forEach(item => {
      const itemData = [
        item.description,
        item.quantity,
        `${(item.unitPrice || 0).toFixed(2)} €`,
        `${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €`
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 90, 
      theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(`Subtotal:`, 145, finalY + 10);
    doc.text(`${(quote.subtotal || 0).toFixed(2)} €`, 198, finalY + 10, { align: 'right' });

    doc.text(`IVA (${(ivaRate * 100).toFixed(0)}%):`, 145, finalY + 16);
    doc.text(`${(quote.tax || 0).toFixed(2)} €`, 198, finalY + 16, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL:`, 145, finalY + 24);
    doc.text(`${(quote.total || 0).toFixed(2)} €`, 198, finalY + 24, { align: 'right' });
    
    // NOTAS ADICIONALES (Validez y notas del presupuesto)
    let notesY = finalY + 35;
    
    // Nota de validez de 15 días (Requerido)
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Nota Importante:", 14, notesY);
    doc.setFont("helvetica", "normal");
    doc.text("Este presupuesto tiene una validez de quince (15) días desde la fecha presupuestada.", 14, notesY + 4);

    // Notas del presupuesto
    if (quote.notes) {
      notesY += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Notas del Pedido:", 14, notesY);
      doc.setFont("helvetica", "normal");
      doc.text(quote.notes, 14, notesY + 4, { maxWidth: 180 });
    }

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presupuesto-${quote.numero}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    return new NextResponse('Error interno al generar el PDF', { status: 500 });
  }
}
