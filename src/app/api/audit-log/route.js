import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function GET(request) {
    // API-04: Rate limiting — 30 req/min (datos sensibles de auditoría)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const rl = checkRateLimit(`audit-log:${ip}`, 30);
    if (!rl.allowed) {
        return NextResponse.json(
            { message: 'Demasiadas peticiones. Espera un momento.' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
        );
    }
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000);
        const entity = searchParams.get('entity');
        const action = searchParams.get('action');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        const where = {};
        if (entity) where.entity = entity;
        if (action) where.action = action;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt.gte = new Date(dateFrom);
            if (dateTo) {
                const end = new Date(dateTo);
                end.setHours(23, 59, 59, 999);
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
