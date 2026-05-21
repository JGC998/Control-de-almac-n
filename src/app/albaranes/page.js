import Link from 'next/link';
import { Clipboard, PlusCircle } from 'lucide-react';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Albaranes — CRM Taller' };

const ESTADO_BADGE = {
  BORRADOR:  'badge-ghost',
  EMITIDO:   'badge-info',
  ENTREGADO: 'badge-success',
  CANCELADO: 'badge-error',
};

export default async function AlbaranesPage({ searchParams: spPromise }) {
  const sp = await spPromise;
  const page = parseInt(sp?.page || '1');
  const limit = 20;
  const skip = (page - 1) * limit;
  const estado = sp?.estado;

  const where = estado ? { estado } : {};

  const [albaranes, total] = await Promise.all([
    db.albaran.findMany({
      where,
      skip,
      take: limit,
      include: {
        cliente: { select: { nombre: true } },
        pedido: { select: { numero: true } },
        _count: { select: { items: true } },
      },
      orderBy: { fechaCreacion: 'desc' },
    }),
    db.albaran.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const estados = ['BORRADOR', 'EMITIDO', 'ENTREGADO', 'CANCELADO'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clipboard className="w-6 h-6" /> Albaranes
        </h1>
        <Link href="/albaranes/nuevo" className="btn btn-primary btn-sm gap-1">
          <PlusCircle className="w-4 h-4" /> Nuevo albarán
        </Link>
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href="/albaranes"
          className={`btn btn-xs ${!estado ? 'btn-neutral' : 'btn-ghost'}`}
        >
          Todos ({total})
        </Link>
        {estados.map(e => (
          <Link
            key={e}
            href={`/albaranes?estado=${e}`}
            className={`btn btn-xs ${estado === e ? 'btn-neutral' : 'btn-ghost'}`}
          >
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
              <th>Pedido origen</th>
              <th>Fecha</th>
              <th className="text-right">Total</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {albaranes.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-base-content/40 py-10">
                  No hay albaranes{estado ? ` en estado ${estado}` : ''}
                </td>
              </tr>
            )}
            {albaranes.map(alb => (
              <tr key={alb.id} className="hover">
                <td className="font-mono text-sm font-semibold">{alb.numero}</td>
                <td>{alb.cliente?.nombre ?? <span className="opacity-40">—</span>}</td>
                <td>
                  {alb.pedido
                    ? <Link href={`/pedidos/${alb.pedidoId}`} className="link link-hover text-xs font-mono">{alb.pedido.numero}</Link>
                    : <span className="opacity-40 text-xs">—</span>
                  }
                </td>
                <td className="text-sm">{new Date(alb.fechaCreacion).toLocaleDateString('es-ES')}</td>
                <td className="text-right font-semibold">{alb.total.toFixed(2)} €</td>
                <td>
                  <span className={`badge badge-sm ${ESTADO_BADGE[alb.estado] || 'badge-ghost'}`}>
                    {alb.estado.charAt(0) + alb.estado.slice(1).toLowerCase()}
                  </span>
                </td>
                <td>
                  <Link href={`/albaranes/${alb.id}`} className="btn btn-ghost btn-xs">Ver</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link href={`/albaranes?page=${page - 1}${estado ? `&estado=${estado}` : ''}`} className="btn btn-sm btn-ghost">
              ← Anterior
            </Link>
          )}
          <span className="btn btn-sm btn-disabled">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/albaranes?page=${page + 1}${estado ? `&estado=${estado}` : ''}`} className="btn btn-sm btn-ghost">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
