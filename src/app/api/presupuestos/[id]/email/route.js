import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateBudgetPDF } from '@/lib/pdfGenerator';
import { sendEmail, getPresupuestoTemplate } from '@/lib/email';

export async function POST(request, { params }) {
    try {
        const { id } = params;
        const { to } = await request.json(); // Destinatario opcional (fallback al del cliente)

        // 1. Obtener Datos
        const quote = await db.presupuesto.findUnique({
            where: { id },
            include: { cliente: true, items: true },
        });

        if (!quote) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });

        const clientEmail = to || quote.cliente?.email;
        if (!clientEmail) {
            return NextResponse.json({ message: 'El cliente no tiene email y no se proporcionó uno alternativo.' }, { status: 400 });
        }

        // 2. Generar PDF (Reutilizando lógica)
        const [configIva, margenes] = await Promise.all([
            db.config.findUnique({ where: { key: 'iva_rate' } }),
            db.reglaMargen.findMany(),
        ]);
        const ivaRate = configIva ? parseFloat(configIva.value) : 0.21;
        const marginRule = margenes?.find(m => m.id === quote.marginId);

        const multiplicador = marginRule?.multiplicador || 1;
        const gastoFijoTotal = marginRule?.gastoFijo || 0;
        const totalQuantity = (quote.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
        const gastoFijoUnitarioProrrateado = totalQuantity > 0 ? (gastoFijoTotal / totalQuantity) : 0;

        const itemsCalculados = quote.items.map(item => ({
            ...item,
            unitPriceVenta: ((item.unitPrice || 0) * multiplicador) + gastoFijoUnitarioProrrateado,
            totalVentaItem: (((item.unitPrice || 0) * multiplicador) + gastoFijoUnitarioProrrateado) * (item.quantity || 0)
        }));

        const pdfBuffer = await generateBudgetPDF({ ...quote, items: itemsCalculados }, ivaRate);
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

        // 3. Enviar Email
        const result = await sendEmail({
            to: clientEmail,
            subject: `Presupuesto ${quote.numero} - CRM`,
            html: getPresupuestoTemplate({
                clienteNombre: quote.cliente?.nombre || 'Cliente',
                numero: quote.numero,
                total: (quote.total || 0).toFixed(2)
            }),
            attachments: [
                {
                    filename: `Presupuesto-${quote.numero}.pdf`,
                    content: pdfBase64
                }
            ]
        });

        if (!result.success) {
            return NextResponse.json({ message: 'Error al enviar email', error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            minified: result.simulated,
            message: result.simulated ? 'Envío simulado (Ver consola)' : 'Email enviado correctamente'
        });

    } catch (error) {
        console.error('Email API Error:', error);
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}
