import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function GET(request) {
    // Rate limiting — 30 req/min (datos sensibles de auditoría)
    const ip = getClientIp(request);
    const rl = checkRateLimit(`audit-log:${ip}`, 30);
    if (!rl.allowed) {
        return NextResponse.json(
            { message: 'Demasiadas peticiones. Espera un momento.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
        );
    }
    try {
        const { searchParams } = new URL(request.url);
        const rawPage = parseInt(searchParams.get('page') || '1', 10);
        const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
        const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
        const limit = Math.min(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 50, 1000);
        const entity = searchParams.get('entity');
        const action = searchParams.get('action');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const where = {};
        if (entity) where.entity = entity;
        if (action) where.action = action;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const d = new Date(dateFrom);
                if (isNaN(d.getTime())) return NextResponse.json({ error: 'dateFrom inválido' }, { status: 400 });
                where.createdAt.gte = d;
            }
            if (dateTo) {
                const end = new Date(dateTo);
                if (isNaN(end.getTime())) return NextResponse.json({ error: 'dateTo inválido' }, { status: 400 });
                end.setUTCHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            db.auditLog.findMany({
                where,
                take: limit,
                skip,
                orderBy: { createdAt: 'desc' }
            }),
            db.auditLog.count({ where })
        ]);

        return NextResponse.json({
            data: logs,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logApiError(error, 'Error fetching audit logs:');
        return NextResponse.json({ error: 'Error fetching logs' }, { status: 500 });
    }
}
