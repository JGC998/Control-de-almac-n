import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const entity = searchParams.get('entity');
        const action = searchParams.get('action');

        // Filtros dinámicos
        const where = {};
        if (entity) where.entity = entity;
        if (action) where.action = action;

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
        console.error('Error fetching audit logs:', error);
        return NextResponse.json({ error: 'Error fetching logs' }, { status: 500 });
    }
}
