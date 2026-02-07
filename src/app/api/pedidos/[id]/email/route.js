import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOrderPDF } from '@/lib/pdfGenerator';
import { sendEmail } from '@/lib/email';

export async function POST(request, { params }) {
    try {
        const { id } = params;
        const { to } = await request.json();

        const order = await db.pedido.findUnique({
            where: { id },
            include: {
                cliente: true,
                items: { include: { producto: true } }
            },
        });

        if (!order) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });

        const clientEmail = to || order.cliente?.email;
        if (!clientEmail) {
            return NextResponse.json({ message: 'Cliente sin email' }, { status: 400 });
        }

        const pdfBuffer = await generateOrderPDF(order);
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

        const result = await sendEmail({
            to: clientEmail,
            subject: `Nuevo Pedido ${order.numero} - CRM`,
            html: `
        <div>
          <h1>Nuevo Pedido ${order.numero}</h1>
          <p>Hola ${order.cliente?.nombre || 'Cliente'},</p>
          <p>Adjuntamos la nota de trabajo para su pedido.</p>
          <hr />
          <p>Gracias por su confianza.</p>
        </div>
      `,
            attachments: [
                {
                    filename: `Pedido-${order.numero}.pdf`,
                    content: pdfBase64
                }
            ]
        });

        if (!result.success) {
            return NextResponse.json({ message: 'Error envío', error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: result.simulated ? 'Envío simulado' : 'Enviado correctamente'
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error interno' }, { status: 500 });
    }
}
