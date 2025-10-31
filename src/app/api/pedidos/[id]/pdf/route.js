import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const pedidosFilePath = path.join(process.cwd(), 'src', 'data', 'pedidos.json');

async function getPedido(id) {
    const data = await fs.readFile(pedidosFilePath, 'utf-8');
    const pedidos = JSON.parse(data);
    return pedidos.find(p => String(p.id) === String(id));
}

export async function GET(request, { params }) {
    const { id } = await params;
    const pedido = await getPedido(id);

    if (!pedido) {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    const black = rgb(0, 0, 0);

    // === HEADER ===
    page.drawText('PEDIDO', { x: width - margin - 150, y: height - margin, font: boldFont, size: 28, color: black });

    let y = height - margin - 70;

    // === ORDER & CLIENT DETAILS (2 columns) ===
    const detailsBoxY = y + 20;
    page.drawRectangle({
        x: margin,
        y: detailsBoxY - 80,
        width: width - margin * 2,
        height: 100,
        borderColor: black,
        borderWidth: 1,
    });

    // Client Info
    page.drawText('CLIENTE:', { x: margin + 10, y: y, font: boldFont, size: 10, color: black });
    y -= 15;
    page.drawText(pedido.cliente, { x: margin + 10, y: y, font: font, size: 12, color: black });
    // Add more client details here if available

    // Order Info
    let orderInfoX = width / 2 + 30;
    y += 15; // Reset Y for the second column
    page.drawText('Nº PEDIDO:', { x: orderInfoX, y: y, font: boldFont, size: 10, color: black });
    y -= 15;
    page.drawText(String(pedido.id), { x: orderInfoX, y: y, font: font, size: 12, color: black });
    y -= 20;
    page.drawText('FECHA:', { x: orderInfoX, y: y, font: boldFont, size: 10, color: black });
    y -= 15;
    page.drawText(new Date(pedido.fecha).toLocaleDateString('es-ES'), { x: orderInfoX, y: y, font: font, size: 12, color: black });

    y -= 80; // Move down past the details box

    // === PRODUCTS TABLE ===
    const tableTop = y;
    const tableX = margin;
    const tableWidth = width - margin * 2;
    const rowHeight = 20;
    const headerHeight = 30;

    // Draw table header
    page.drawRectangle({
        x: tableX,
        y: tableTop - headerHeight,
        width: tableWidth,
        height: headerHeight,
        borderColor: black,
        borderWidth: 1,
    });

    page.drawText('Producto', { x: tableX + (190 - boldFont.widthOfTextAtSize('Producto', 10)) / 2, y: tableTop - 20, font: boldFont, size: 10, color: black });
    page.drawText('Cantidad', { x: tableX + 190 + (50 - boldFont.widthOfTextAtSize('Cantidad', 10)) / 2, y: tableTop - 20, font: boldFont, size: 10, color: black });
    page.drawText('Peso Unit.', { x: tableX + 240 + (60 - boldFont.widthOfTextAtSize('Peso Unit.', 10)) / 2, y: tableTop - 20, font: boldFont, size: 10, color: black });
    page.drawText('Peso Total', { x: tableX + 300 + (60 - boldFont.widthOfTextAtSize('Peso Total', 10)) / 2, y: tableTop - 20, font: boldFont, size: 10, color: black });
    page.drawText('Precio Unit.', { x: tableX + 360 + (65 - boldFont.widthOfTextAtSize('Precio Unit.', 10)) / 2, y: tableTop - 20, font: boldFont, size: 10, color: black });
    page.drawText('Total', { x: tableX + 425 + (70 - boldFont.widthOfTextAtSize('Total', 10)) / 2, y: tableTop - 20, font: boldFont, size: 10, color: black });

    let totalPedido = 0;
    let totalPeso = 0;
    let tableY = tableTop - headerHeight;

    // Table Rows
    for (const producto of pedido.productos) {
        tableY -= rowHeight;
        const totalProducto = (producto.cantidad * producto.precioUnitario);
        const pesoProducto = (producto.cantidad * producto.pesoUnitario);
        totalPedido += totalProducto;
        totalPeso += pesoProducto;

        page.drawRectangle({
            x: tableX,
            y: tableY,
            width: tableWidth,
            height: rowHeight,
            borderColor: black,
            borderWidth: 1,
        });

        const nombre = producto.nombre;
        const cantidad = String(producto.cantidad);
        const pesoUnitario = `${producto.pesoUnitario.toFixed(2)} kg`;
        const pesoTotal = `${pesoProducto.toFixed(2)} kg`;
        const precioUnitario = `${producto.precioUnitario.toFixed(2)} €`;
        const total = `${totalProducto.toFixed(2)} €`;

        page.drawText(nombre, { x: tableX + (190 - font.widthOfTextAtSize(nombre, 10)) / 2, y: tableY + 5, font, size: 10, color: black });
        page.drawText(cantidad, { x: tableX + 190 + (50 - font.widthOfTextAtSize(cantidad, 10)) / 2, y: tableY + 5, font, size: 10, color: black });
        page.drawText(pesoUnitario, { x: tableX + 240 + (60 - font.widthOfTextAtSize(pesoUnitario, 10)) / 2, y: tableY + 5, font, size: 10, color: black });
        page.drawText(pesoTotal, { x: tableX + 300 + (60 - font.widthOfTextAtSize(pesoTotal, 10)) / 2, y: tableY + 5, font, size: 10, color: black });
        page.drawText(precioUnitario, { x: tableX + 360 + (65 - font.widthOfTextAtSize(precioUnitario, 10)) / 2, y: tableY + 5, font, size: 10, color: black });
        page.drawText(total, { x: tableX + 425 + (70 - font.widthOfTextAtSize(total, 10)) / 2, y: tableY + 5, font, size: 10, color: black });
    }

    // Draw vertical lines
    page.drawLine({ start: { x: tableX + 190, y: tableTop }, end: { x: tableX + 190, y: tableY }, color: black, thickness: 1 });
    page.drawLine({ start: { x: tableX + 240, y: tableTop }, end: { x: tableX + 240, y: tableY }, color: black, thickness: 1 });
    page.drawLine({ start: { x: tableX + 300, y: tableTop }, end: { x: tableX + 300, y: tableY }, color: black, thickness: 1 });
    page.drawLine({ start: { x: tableX + 360, y: tableTop }, end: { x: tableX + 360, y: tableY }, color: black, thickness: 1 });
    page.drawLine({ start: { x: tableX + 425, y: tableTop }, end: { x: tableX + 425, y: tableY }, color: black, thickness: 1 });

    // === NOTES ===
    let notesY = tableY - 20;
    if (pedido.notas) {
        page.drawText('Notas:', { x: tableX, y: notesY, font: boldFont, size: 12, color: black });
        notesY -= 20;
        page.drawText(pedido.notas, { x: tableX, y: notesY, font: font, size: 10, color: black });
        notesY -= 20;
    }

    // === TOTALS ===
    const totalY = notesY - 40;
    page.drawLine({ start: { x: tableX + 300, y: tableY - 5 }, end: { x: tableX + tableWidth, y: tableY - 5 }, color: black, thickness: 1 });
    page.drawText('TOTAL PESO', { x: tableX + 310, y: totalY, font: boldFont, size: 14, color: black });
    page.drawText(`${totalPeso.toFixed(2)} kg`, { x: tableX + 310, y: totalY - 20, font: boldFont, size: 14, color: black });
    page.drawText('TOTAL PEDIDO', { x: tableX + 435, y: totalY, font: boldFont, size: 14, color: black });
    page.drawText(`${totalPedido.toFixed(2)} €`, { x: tableX + 435, y: totalY - 20, font: boldFont, size: 14, color: black });

    // === FOOTER ===
    const footerY = margin / 2;
    page.drawText('Gracias por su confianza.', { x: margin, y: footerY, font, size: 10, color: black });
    page.drawText('email@tuempresa.com | +34 123 456 789', { x: width - margin - 150, y: footerY, font, size: 10, color: black });

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="pedido_${id}.pdf"`,
        },
    });
}