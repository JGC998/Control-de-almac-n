import Link from 'next/link';
import { Receipt, PlusCircle, FileDown, TrendingUp, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Facturas — CRM Taller' };

const ESTADO_BADGE = {
  BORRADOR: 'badge-ghost',
  EMITIDA:  'badge-info',
  PAGADA:   'badge-success',
  CANCELADA:'badge-error',
};

const AEAT_BADGE = {
  PENDIENTE:  'badge-warning',
  EXPORTADO:  'badge-info',
  CONFIRMADO: 'badge-success',
};

const AEAT_LABEL = {
  PENDIENTE:  'Pendiente',
  EXPORTADO:  'Exportado',
  CONFIRMADO: 'Confirmado',
};

export default async function FacturasPage({ searchParams: spPromise }) {
  const sp = await spPromise;
  const page = parseInt(sp?.page || '1');
  const limit = 20;
  const skip = (page - 1) * limit;
  const aeat = sp?.aeat; // 'CONFIRMADO' | 'EXPORTADO' | undefined

  const where = aeat ? { estadoEnvioAeat: aeat } : {};

  const baseWhereVf = { estado: { in: ['EMITIDA', 'PAGADA'] }, huella: { not: null } };

  const hoy = new Date();

  const [facturas, total, pendientesCount, exportadasCount, statsEmitidas, statsPagadas, vencidasCount] = await Promise.all([
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
    db.factura.count({ where: { ...baseWhereVf, estadoEnvioAeat: 'PENDIENTE' } }),
    db.factura.count({ where: { ...baseWhereVf, estadoEnvioAeat: 'EXPORTADO' } }),
    db.factura.aggregate({ where: { estado: 'EMITIDA' }, _sum: { total: true }, _count: true }),
    db.factura.aggregate({ where: { estado: 'PAGADA'  }, _sum: { total: true }, _count: true }),
    db.factura.count({ where: { estado: 'EMITIDA', fechaVencimiento: { lt: hoy } } }),
  ]);

  const totalPages       = Math.ceil(total / limit);
  const noConfirmadasCount = pendientesCount + exportadasCount;
  const pendienteCobro   = statsEmitidas._sum.total || 0;
  const totalFacturado   = (statsEmitidas._sum.total || 0) + (statsPagadas._sum.total || 0);

  return (
    <div className="max-w-6xl mx-auto">

      {/* Cards de resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card bg-base-200 border border-base-300">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/50 uppercase tracking-wider">Facturado total</span>
              <TrendingUp className="w-4 h-4 text-base-content/30" />
            </div>
            <p className="text-xl font-bold">{totalFacturado.toFixed(2)} €</p>
            <p className="text-xs text-base-content/40 mt-0.5">
              {(statsEmitidas._count || 0) + (statsPagadas._count || 0)} facturas emitidas/pagadas
            </p>
          </div>
        </div>

        <div className={`card border ${pendienteCobro > 0 ? 'bg-warning/10 border-warning/30' : 'bg-base-200 border-base-300'}`}>
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/50 uppercase tracking-wider">Pendiente de cobro</span>
              <Clock className={`w-4 h-4 ${pendienteCobro > 0 ? 'text-warning' : 'text-base-content/30'}`} />
            </div>
            <p className={`text-xl font-bold ${pendienteCobro > 0 ? 'text-warning-content' : ''}`}>
              {pendienteCobro.toFixed(2)} €
            </p>
            <p className="text-xs text-base-content/40 mt-0.5">{statsEmitidas._count || 0} facturas emitidas</p>
          </div>
        </div>

        <div className={`card border ${vencidasCount > 0 ? 'bg-error/10 border-error/30' : 'bg-base-200 border-base-300'}`}>
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/50 uppercase tracking-wider">Vencidas</span>
              <AlertCircle className={`w-4 h-4 ${vencidasCount > 0 ? 'text-error' : 'text-base-content/30'}`} />
            </div>
            <p className={`text-xl font-bold ${vencidasCount > 0 ? 'text-error' : ''}`}>{vencidasCount}</p>
            <p className="text-xs text-base-content/40 mt-0.5">
              {vencidasCount > 0 ? 'Requieren atención' : 'Todo al día'}
            </p>
          </div>
        </div>

        <div className={`card border ${noConfirmadasCount > 0 ? 'bg-info/10 border-info/30' : 'bg-base-200 border-base-300'}`}>
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/50 uppercase tracking-wider">AEAT pendiente</span>
              <ShieldCheck className={`w-4 h-4 ${noConfirmadasCount > 0 ? 'text-info' : 'text-base-content/30'}`} />
            </div>
            <p className={`text-xl font-bold ${noConfirmadasCount > 0 ? 'text-info-content' : ''}`}>
              {noConfirmadasCount}
            </p>
            <p className="text-xs text-base-content/40 mt-0.5">
              {pendientesCount > 0 ? `${pendientesCount} sin exportar` : noConfirmadasCount > 0 ? 'Esperando confirmación' : 'Todo confirmado'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6" /> Facturas
        </h1>
        <div className="flex gap-2 items-center">
          {noConfirmadasCount > 0 && (
            <a href="/api/facturas/exportar-aeat"
              className="btn btn-sm btn-outline gap-1"
              title={pendientesCount > 0
                ? `${pendientesCount} factura${pendientesCount > 1 ? 's' : ''} pendiente${pendientesCount > 1 ? 's' : ''} de exportar`
                : `Re-exportar ${exportadasCount} factura${exportadasCount > 1 ? 's' : ''} ya exportada${exportadasCount > 1 ? 's' : ''}`
              }>
              <FileDown className="w-4 h-4" />
              {pendientesCount > 0 ? 'Exportar XML AEAT' : 'Re-exportar XML'}
              {pendientesCount > 0 && (
                <span className="badge badge-sm badge-warning">{pendientesCount}</span>
              )}
            </a>
          )}
          <Link href="/facturas/nuevo" className="btn btn-primary btn-sm gap-1">
            <PlusCircle className="w-4 h-4" /> Nueva factura
          </Link>
        </div>
      </div>

      {/* Filtro por estado AEAT */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href="/facturas" className={`btn btn-xs ${!aeat ? 'btn-neutral' : 'btn-ghost'}`}>
          Todas ({total || ''})
        </Link>
        <Link href="/facturas?aeat=PENDIENTE"
          className={`btn btn-xs gap-1 ${aeat === 'PENDIENTE' ? 'btn-neutral' : 'btn-ghost'}`}>
          <span className="badge badge-xs badge-warning" />
          Pendientes
          {pendientesCount > 0 && <span className="badge badge-xs badge-warning">{pendientesCount}</span>}
        </Link>
        <Link href="/facturas?aeat=EXPORTADO"
          className={`btn btn-xs gap-1 ${aeat === 'EXPORTADO' ? 'btn-neutral' : 'btn-ghost'}`}>
          <span className="badge badge-xs badge-info" />
          Exportadas
          {exportadasCount > 0 && <span className="badge badge-xs badge-info">{exportadasCount}</span>}
        </Link>
        <Link href="/facturas?aeat=CONFIRMADO"
          className={`btn btn-xs gap-1 ${aeat === 'CONFIRMADO' ? 'btn-neutral' : 'btn-ghost'}`}>
          <span className="badge badge-xs badge-success" />
          Confirmadas
        </Link>
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
              <th>AEAT</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {facturas.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-base-content/40 py-10">
                  No hay facturas{aeat ? ` con estado AEAT "${aeat.toLowerCase()}"` : ''}
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
                  {['EMITIDA', 'PAGADA'].includes(fac.estado) && fac.huella ? (
                    <div className="flex items-center gap-1">
                      <span className={`badge badge-xs ${AEAT_BADGE[fac.estadoEnvioAeat] || 'badge-ghost'}`}>
                        {AEAT_LABEL[fac.estadoEnvioAeat] || fac.estadoEnvioAeat}
                      </span>
                      {fac.estadoEnvioAeat !== 'CONFIRMADO' && (
                        <a href={`/api/facturas/${fac.id}/xml`}
                          className="btn btn-ghost btn-xs px-1"
                          title="Descargar XML individual">
                          <FileDown className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : null}
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
            <Link href={`/facturas?page=${page - 1}${aeat ? `&aeat=${aeat}` : ''}`} className="btn btn-sm btn-ghost">
              ← Anterior
            </Link>
          )}
          <span className="btn btn-sm btn-disabled">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={`/facturas?page=${page + 1}${aeat ? `&aeat=${aeat}` : ''}`} className="btn btn-sm btn-ghost">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
