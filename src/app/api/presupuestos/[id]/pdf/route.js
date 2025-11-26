import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // Aseguramos que se use autoTable
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

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
    
    // 2. Obtener la configuración (IVA) y las reglas de Margen
    const [configIva, margenes] = await Promise.all([
        db.config.findUnique({ where: { key: 'iva_rate' } }),
        db.reglaMargen.findMany(),
    ]);

    const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
    const marginRule = margenes?.find(m => m.id === quote.marginId);
    const client = quote.cliente;

    // --- LÓGICA DE PRORRATEO Y CÁLCULO DE PRECIO DE VENTA UNITARIO ---
    const multiplicador = marginRule?.multiplicador || 1;
    const gastoFijoTotal = marginRule?.gastoFijo || 0;
    
    // Calcular la cantidad total de unidades para el prorrateo del gasto fijo
    const totalQuantity = (quote.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
    const gastoFijoUnitarioProrrateado = totalQuantity > 0 ? (gastoFijoTotal / totalQuantity) : 0;
    
    const calculatedItems = (quote.items || []).map(item => {
        // item.unitPrice contiene el COSTO BASE (materia prima por pieza)
        const costoUnitario = item.unitPrice || 0; 
        
        // Precio Venta Unitario = Costo Unitario * Multiplicador + Gasto Fijo Prorrateado
        const precioUnitarioVenta = (costoUnitario * multiplicador) + gastoFijoUnitarioProrrateado;
        
        return {
            ...item,
            unitPriceVenta: precioUnitarioVenta,
            totalVentaItem: precioUnitarioVenta * (item.quantity || 0),
        };
    });
    // -----------------------------------------------------------

    // --- Inicio de la Generación del PDF ---
    const doc = new jsPDF();

    // --- Añadir Logo ---
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
      // Leer el archivo como Buffer y convertirlo a base64 para jsPDF (más compatible)
      const logoBuffer = await fs.readFile(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 145, 15, 50, 15);
    } catch (error) {
      console.error("No se pudo cargar el logo, se continuará sin él:", error);
    }

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PRESUPUESTO", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // DETALLES DE LA EMPRESA 
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

    // Usamos las columnas de VENTA para el cliente (Precio Unit. Venta y Total Venta)
    const tableColumn = ["Descripción", "Cantidad", "P. Unit. (Venta)", "Total (Venta)"];
    const tableRows = [];
    
    calculatedItems.forEach(item => {
      const itemData = [
        item.descripcion,
        item.quantity,
        // USAMOS EL PRECIO DE VENTA PRORRATEADO
        `${(item.unitPriceVenta || 0).toFixed(2)} €`,
        `${(item.totalVentaItem || 0).toFixed(2)} €` // USAMOS EL TOTAL DE VENTA CALCULADO
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
    
    // Usamos los totales ya guardados que vienen del cliente y que son correctos
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

    // Convertir a Buffer
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
    // Devolver un error JSON
    return new NextResponse(JSON.stringify({ message: `Error interno al generar el PDF: ${error.message}` }), { status: 500 });
  }
}