import { NextResponse } from 'next/server';
import { readData } from '@/utils/dataManager';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    try {
        const quotes = await readData('presupuestos.json');
        const clients = await readData('clientes.json');
        const config = await readData('config.json');
        const ivaRate = config.iva_rate || 0.21;

        const quote = quotes.find(q => q.id === id);
        if (!quote) {
            return new NextResponse('Presupuesto no encontrado', { status: 404 });
        }
        const client = clients.find(c => c.id === quote.clienteId);

        // --- Inicio de la Generación del PDF ---
        const doc = new jsPDF();

        // --- Añadir Logo ---
        try {
            const logoPath = path.join(process.cwd(), 'public', 'logo-crm.png');
            const logoBuffer = await fs.readFile(logoPath);
            // Ajusta x, y, width, height según el aspect ratio de tu logo
            doc.addImage(logoBuffer, 'PNG', 145, 15, 50, 15); 
        } catch (error) {
            console.error("No se pudo cargar el logo, se continuará sin él:", error);
            // Continuar sin el logo si falla la carga
        }

        // Cabecera del documento
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text("PRESUPUESTO", 14, 22);

        // Mover el texto de la empresa hacia abajo para dejar espacio al logo
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(process.env.COMPANY_NAME || 'Tu Empresa', 200, 38, { align: 'right' });
        doc.text(process.env.COMPANY_ADDRESS || 'Tu Dirección', 200, 44, { align: 'right' });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Número:`, 14, 36);
        doc.setFont("helvetica", "normal");
        doc.text(`${quote.numero}`, 38, 36);

        doc.setFont("helvetica", "bold");
        doc.text(`Fecha:`, 14, 42);
        doc.setFont("helvetica", "normal");
        doc.text(`${new Date(quote.fechaCreacion).toLocaleDateString('es-ES')}`, 38, 42);

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

        // Tabla con los productos/servicios
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
            startY: 85,
            theme: 'grid'
        });

        // Cálculo de totales
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
        
        // Notas
        if(quote.notes) {
            doc.setFontSize(8);
            doc.text("Notas:", 14, finalY + 40);
            doc.setFontSize(8);
            doc.text(quote.notes, 14, finalY + 44, { maxWidth: 180 });
        }

        // --- Fin de la Generación del PDF ---

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
