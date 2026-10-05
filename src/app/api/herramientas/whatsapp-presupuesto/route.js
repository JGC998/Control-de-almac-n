import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

// POST /api/herramientas/whatsapp-presupuesto
// Envía un mensaje de texto (presupuesto formateado) via CallMeBot
// al número configurado en Config (whatsapp_presupuesto_phone / apikey).
export async function POST(request) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`wa-presup:${ip}`, 10);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }

  try {
    const { mensaje } = await request.json();
    if (!mensaje || typeof mensaje !== 'string' || mensaje.trim().length === 0) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
    }
    if (mensaje.length > 4000) {
      return NextResponse.json({ error: 'Mensaje demasiado largo (máx. 4000 caracteres)' }, { status: 400 });
    }

    const configs = await db.config.findMany({
      where: { key: { in: ['whatsapp_presupuesto_phone', 'whatsapp_presupuesto_apikey'] } },
    });
    const phone  = configs.find(c => c.key === 'whatsapp_presupuesto_phone')?.value?.trim();
    const apikey = configs.find(c => c.key === 'whatsapp_presupuesto_apikey')?.value?.trim();

    if (!phone || !apikey) {
      return NextResponse.json(
        { error: 'WhatsApp no configurado. Ve a Configuración → WhatsApp presupuestos.' },
        { status: 503 },
      );
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apikey)}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(12000) });
    const text = await res.text();
    const ok   = res.ok && (text.toLowerCase().includes('queued') || text.toLowerCase().includes('message'));

    return NextResponse.json({ ok, response: text.slice(0, 300) });
  } catch (error) {
    logApiError(error, 'POST /api/herramientas/whatsapp-presupuesto');
    return NextResponse.json({ error: 'Error al enviar WhatsApp' }, { status: 500 });
  }
}
