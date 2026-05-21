import Link from 'next/link';
import { Receipt, PlusCircle } from 'lucide-react';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Facturas — CRM Taller' };

const ESTADO_BADGE = {
  BORRADOR: 'badge-ghost',
  EMITIDA:  'badge-info',
  PAGADA:   'badge-success',
  CANCELADA:'badge-error',
};

export default async function FacturasPage({ searchParams: spPromise }) {
  const sp = await spPromise;
  const page = parseInt(sp?.page || '1');
  const limit = 20;
  const skip = (page - 1) * limit;
  const estado = sp?.estado;

  const where = estado ? { estado } : {};

  const [facturas, total] = await Promise.all([
    db.factura.findMany({
      where,
      skip,
      take: limit,
      include: {
        cliente: { select: { nombre: true } },
        albaran: { select: { numero: true } },
        pedido:  { select: { numero: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    }),
    db.factura.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const estados = ['BORRADOR', 'EMITIDA', 'PAGADA', 'CANCELADA'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Facturas
        </h1>
        <Link href="/facturas/nuevo" className="btn btn-primary btn-sm gap-1">
          <PlusCircle className="w-4 h-4" /> Nueva factura
        </Link>
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href="/facturas" className={`btn btn-xs ${!estado ? 'btn-neutral' : 'btn-ghost'}`}>
          Todas ({total})
        </Link>
        {estados.map(e => (
          <Link key={e} href={`/facturas?estado=${e}`}
            className={`btn btn-xs ${estado === e ? 'btn-neutral' : 'btn-ghost'}`}>
            {e.charAt(0) + e.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Origen</th>
              <th>Fecha</th>
              <th>Vencimiento</th>
              <th className="text-right">Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-base-content/40 py-10">
                  No hay facturas{estado ? ` en estado ${estado}` : ''}
                </td>
              </tr>
            )}
            {facturas.map(fac => (
              <tr key={fac.id} className="hover">
                <td className="font-mono text-sm font-semibold">{fac.numero}</td>
                <td>{fac.cliente?.nombre ?? <span className="opacity-40">—</span>}</td>
                <td className="text-xs font-mono">
                  {fac.albaran?.numero
                    ? <span className="badge badge-xs badge-ghost">ALB · {fac.albaran.numero}</span>
                    : fac.pedido?.numero
                    ? <span className="badge badge-xs badge-ghost">PED · {fac.pedido.numero}</span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="text-sm">{new Date(fac.fechaCreacion).toLocaleDateString('es-ES')}</td>
                <td className="text-sm">
                  {fac.fechaVencimiento
                    ? <span className={new Date(fac.fechaVencimiento) < new Date() && fac.estado === 'EMITIDA' ? 'text-error font-semibold' : ''}>
                        {new Date(fac.fechaVencimiento).toLocaleDateString('es-ES')}
                      </span>
                    : <span className="opacity-40">—</span>
                  }
                </td>
                <td className="text-right font-semibold">{fac.total.toFixed(2)} €</td>
                <td>
                  <span className={`badge badge-sm ${ESTADO_BADGE[fac.estado] || 'badge-ghost'}`}>
                    {fac.estado.charAt(0) + fac.estado.slice(1).toLowerCase()}
                  </span>
                </td>
                <td>
                  <Link href={`/facturas/${fac.id}`} className="btn btn-ghost btn-xs">Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={`/facturas?page=${page - 1}${estado ? `&estado=${estado}` : ''}`} className="btn btn-sm btn-ghost">
              ← Anterior
            </Link>
          )}
          <span className="btn btn-sm btn-disabled">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/facturas?page=${page + 1}${estado ? `&estado=${estado}` : ''}`} className="btn btn-sm btn-ghost">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
