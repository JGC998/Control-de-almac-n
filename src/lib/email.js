import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789'); // Fallback para evitar crash si no hay key

/**
 * Enviar un email genérico
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Contenido HTML
 * @param {Array} attachments - Lista de adjuntos [{ filename, content }]
 */
export async function sendEmail({ to, subject, html, attachments = [] }) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY no configurada. Simulando envío de email.');
        console.log(`📧 Simulando envío a: ${to} | Asunto: ${subject}`);
        return { success: true, simulated: true };
    }

    try {
        const data = await resend.emails.send({
            from: 'CRM Taller <onboarding@resend.dev>', // Usar dominio de prueba de Resend por defecto
            to,
            subject,
            html,
            attachments
        });

        return { success: true, data };
    } catch (error) {
        console.error('❌ Error enviando email:', error);
        return { success: false, error };
    }
}

/**
 * Plantilla HTML básica para presupuestos
 */
export const getPresupuestoTemplate = ({ clienteNombre, numero, linkPdf, total }) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h1>Hola ${clienteNombre},</h1>
    <p>Adjuntamos el presupuesto <strong>${numero}</strong> que nos has solicitado.</p>
    
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px;">Total Presupuesto:</p>
      <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #2563eb;">${total} €</p>
    </div>

    <p>Si tienes alguna duda, por favor contáctanos.</p>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="color: #6b7280; font-size: 14px;">Este es un email automático desde tu CRM.</p>
  </div>
`;
