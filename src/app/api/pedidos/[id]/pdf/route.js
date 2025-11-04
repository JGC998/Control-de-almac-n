import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params: paramsPromise }) {
  try {
    const { id } = await paramsPromise; // <-- CORREGIDO

    // 1. Obtener todos los datos de la BD
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
    
    // 2. Obtener la configuración (IVA)
    const configIva = await db.config.findUnique({
      where: { key: 'iva_rate' },
    });
    const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
    const client = order.cliente;

    // --- Inicio de la Generación del PDF ---
    const doc = new jsPDF();

    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
      const logoBuffer = await fs.readFile(logoPath);
      doc.addImage(logoBuffer, 'PNG', 145, 15, 50, 15);
    } catch (error) {
      console.error("No se pudo cargar el logo:", error);
    }

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("PEDIDO", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(process.env.COMPANY_NAME || 'Tu Empresa', 200, 38, { align: 'right' });
    doc.text(process.env.COMPANY_ADDRESS || 'Tu Dirección', 200, 44, { align: 'right' });

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

    const tableColumn = ["Descripción", "Cantidad", "Precio Unit.", "Total"];
    const tableRows = [];
    
    order.items.forEach(item => {
      const itemData = [
        item.descripcion,
        item.quantity,
        `${(item.unitPrice || 0).toFixed(2)} €`,
        `${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €`
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.text(`Subtotal:`, 145, finalY + 10);
    doc.text(`${(order.subtotal || 0).toFixed(2)} €`, 198, finalY + 10, { align: 'right' });

    doc.text(`IVA (${(ivaRate * 100).toFixed(0)}%):`, 145, finalY + 16);
    doc.text(`${(order.tax || 0).toFixed(2)} €`, 198, finalY + 16, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL:`, 145, finalY + 24);
    doc.text(`${(order.total || 0).toFixed(2)} €`, 198, finalY + 24, { align: 'right' });
    
    if (order.notes) {
      doc.setFontSize(8);
      doc.text("Notas:", 14, finalY + 40);
      doc.setFontSize(8);
      doc.text(order.notes, 14, finalY + 44, { maxWidth: 180 });
    }

    const pdfBuffer = doc.output('arraybuffer');

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pedido-${order.numero}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    return new NextResponse('Error interno al generar el PDF', { status: 500 });
  }
}
