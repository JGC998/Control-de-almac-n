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

    // 1. Obtener todos los datos del Pedido
    const order = await db.pedido.findUnique({
      where: { id: id },
      include: {
        cliente: true,
        items: true,
      },
    });

    if (!order) {
      return new NextResponse('Pedido no encontrado', { status: 404 });
    }
    
    const client = order.cliente;

    // --- Inicio de la Generación del PDF ---
    const doc = new jsPDF();

    try {
      // const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
      // const logoBuffer = await fs.readFile(logoPath);
      // doc.addImage(logoBuffer, 'PNG', 145, 15, 50, 15);
    } catch (error) {
      console.error("No se pudo cargar el logo:", error);
    }

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("NOTA DE TRABAJO", 14, 22); // TÍTULO CAMBIADO

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

    // --- CONSTRUCCIÓN DE LA TABLA PARA NOTA DE TRABAJO ---
    const tableColumn = ["Descripción", "Cantidad", "Peso Unitario (kg)", "Peso Subtotal (kg)"]; // COLUMNAS CAMBIADAS
    const tableRows = [];
    let pesoTotalGlobal = 0;
    
    (order.items || []).forEach(item => {
      const cantidad = item.quantity || 0;
      const pesoUnitario = item.pesoUnitario || 0;
      const pesoSubtotal = cantidad * pesoUnitario;
      pesoTotalGlobal += pesoSubtotal;

      const itemData = [
        item.descripcion,
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
      theme: 'grid'
    });

    let finalY = doc.lastAutoTable.finalY;

    // --- AJUSTE DE POSICIÓN Y SALTO DE PÁGINA ---
    if (finalY > 250) { // Si la tabla termina muy abajo
        doc.addPage();
        finalY = 15; // Posición inicial en la nueva página
    } else {
        finalY += 15; // Margen si hay espacio
    }
    
    // --- TOTALES DE PESO ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const pesoTotalFormateado = pesoTotalGlobal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    doc.text(`Peso Total Global:`, 125, finalY);
    doc.text(`${pesoTotalFormateado} kg`, 198, finalY, { align: 'right' });
    // -------------------------
    
    if (order.notes) {
      doc.setFontSize(8);
      doc.text("Notas:", 14, finalY + 15);
      doc.setFontSize(8);
      doc.text(order.notes, 14, finalY + 19, { maxWidth: 180 });
    }

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="notatrabajo-${order.numero}.pdf"`, // Nombre de archivo cambiado
      },
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    return new NextResponse('Error interno al generar el PDF', { status: 500 });
  }
}