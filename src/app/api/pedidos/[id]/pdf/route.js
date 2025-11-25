import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

    // 1. Obtener todos los datos del Pedido, incluyendo detalles del producto
    const order = await db.pedido.findUnique({
      where: { id: id },
      include: {
        cliente: true,
        items: {
          include: {
            producto: {
              include: {
                material: true, // Incluye el material del producto
              },
            },
          },
        },
      },
    });

    if (!order) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }
    
    const client = order.cliente;

    // --- Inicio de la Generación del PDF ---
    const doc = new jsPDF();

    // Logo (opcional, si existe)
    try {
      // const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
      // const logoBuffer = await fs.readFile(logoPath);
      // doc.addImage(logoBuffer, 'PNG', 145, 15, 50, 15);
    } catch (error) {
      console.error("No se pudo cargar el logo:", error);
    }

    // Título y datos del pedido
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("NOTA DE TRABAJO", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Número:`, 14, 36);
    doc.setFont("helvetica", "normal");
    doc.text(`${order.numero}`, 38, 36);

    doc.setFont("helvetica", "bold");
    doc.text(`Fecha:`, 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date(order.fechaCreacion).toLocaleDateString('es-ES')}`, 38, 42);

    // Datos del cliente
    doc.rect(14, 50, 90, 28);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", 20, 56);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (client) {
      doc.text(client.nombre, 20, 62);
      doc.text(client.direccion || 'Dirección no especificada', 20, 68);
      doc.text(client.email || 'Email no especificado', 20, 74);
    }

    // --- CONSTRUCCIÓN DE LA TABLA (CON DETALLES AMPLIADOS) ---
    const tableColumn = ["Descripción", "Detalles", "Cantidad", "Peso Unit. (kg)", "Peso Total (kg)"];
    const tableRows = [];
    let pesoTotalGlobal = 0;
    
    (order.items || []).forEach(item => {
      const cantidad = item.quantity || 0;
      const pesoUnitario = item.pesoUnitario || 0;
      const pesoSubtotal = cantidad * pesoUnitario;
      pesoTotalGlobal += pesoSubtotal;

      const producto = item.producto;
      let detalles = 'Item manual';
      if (producto) {
        const material = producto.material?.nombre || 'N/A';
        const espesor = producto.espesor || 'N/A';
        const largo = producto.largo || 'N/A';
        const ancho = producto.ancho || 'N/A';
        detalles = `${material} - ${espesor}mm - ${largo}x${ancho}mm`;
      }

      const itemData = [
        item.descripcion,
        detalles,
        cantidad,
        pesoUnitario.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 }),
        pesoSubtotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
      ];
      tableRows.push(itemData);
    });
    // ----------------------------------------------------

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 220, 220], textColor: 40, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50 }, // Descripción
        1: { cellWidth: 50 }, // Detalles
        2: { cellWidth: 'auto', halign: 'center' }, // Cantidad
        3: { cellWidth: 'auto', halign: 'right' }, // Peso Unit.
        4: { cellWidth: 'auto', halign: 'right' }  // Peso Total
      }
    });

    let finalY = doc.lastAutoTable.finalY;

    if (finalY > 250) {
        doc.addPage();
        finalY = 15;
    } else {
        finalY += 15;
    }
    
    // --- TOTALES DE PESO ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const pesoTotalFormateado = pesoTotalGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    doc.text(`Peso Total Global:`, 125, finalY);
    doc.text(`${pesoTotalFormateado} kg`, 198, finalY, { align: 'right' });
    
    // --- SECCIÓN DE NOTAS DEL PEDIDO (CORREGIDA Y MEJORADA) ---
    if (order.notas) { // CORREGIDO: order.notas en lugar de order.notes
      const notesY = finalY + 15;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Notas del Pedido:", 14, notesY);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const textLines = doc.splitTextToSize(order.notas, 180);
      const textHeight = textLines.length * (doc.getLineHeight() / doc.internal.scaleFactor);
      
      doc.setDrawColor(200, 200, 200); 
      doc.roundedRect(14, notesY + 3, 182, textHeight + 8, 3, 3, 'D'); 

      doc.text(order.notas, 18, notesY + 10, { maxWidth: 178 });
    }
    // ---------------------------------------------

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="notatrabajo-${order.numero}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    return new NextResponse('Error interno al generar el PDF', { status: 500 });
  }
}