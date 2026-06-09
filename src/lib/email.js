import { Resend } from 'resend';
import { logApiError } from '@/lib/logger';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Enviar un email genérico
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Contenido HTML
 * @param {Array} attachments - Lista de adjuntos [{ filename, content }]
 */
export async function sendEmail({ to, subject, html, attachments = [] }) {
    if (!resend) {
        return { success: true, simulated: true };
    }

    try {
        const data = await resend.emails.send({
            from: process.env.RESEND_FROM || 'CRM Taller <onboarding@resend.dev>',
            to,
            subject,
            html,
            attachments
        });

        return { success: true, data };
    } catch (error) {
        logApiError(error, 'Error enviando email');
        return { success: false, error };
    }
}

/**
 * Plantilla HTML básica para presupuestos
 */
export const getPresupuestoTemplate = ({ clienteNombre, numero, total }) => `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
    <h1>Hola ${escapeHtml(clienteNombre)},</h1>
    <p>Adjuntamos el presupuesto <strong>${escapeHtml(numero)}</strong> que nos has solicitado.</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 18px;">Total Presupuesto:</p>
      <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #2563eb;">${escapeHtml(String(total))} €</p>
    </div>

    <p>Si tienes alguna duda, por favor contáctanos.</p>
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="color: #6b7280; font-size: 14px;">Este es un email automático desde tu CRM.</p>
  </div>
`;
