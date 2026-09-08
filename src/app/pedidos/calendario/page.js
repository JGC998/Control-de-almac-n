"use client";
import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';

const ESTADO_BADGE = {
  Completado: 'badge-success',
  Aceptado:   'badge-success',
  Pendiente:  'badge-warning',
  Enviado:    'badge-info',
  Cancelado:  'badge-error',
  Borrador:   'badge-ghost',
};

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function getCeldas(año, mes) {
  // mes: 0-indexed (0=enero)
  const primerDia = new Date(año, mes, 1);
  const diasMes   = new Date(año, mes + 1, 0).getDate();
  // lunes=0 … domingo=6
  let inicio = primerDia.getDay() - 1;
  if (inicio < 0) inicio = 6;
  const celdas = [];
  for (let i = 0; i < inicio; i++)       celdas.push(null);
  for (let d = 1; d <= diasMes; d++)     celdas.push(new Date(año, mes, d));
  while (celdas.length % 7 !== 0)        celdas.push(null);
  return celdas;
}

export default function CalendarioEntregasPage() {
  const hoy = new Date();
  const [año, setAño]   = useState(hoy.getFullYear());
  const [mes, setMes]   = useState(hoy.getMonth());
  const [vista, setVista] = useState('mes'); // 'mes' | 'semana'
  const [semanaIdx, setSemanaIdx] = useState(0); // semana relativa a hoy

  const { data, isLoading } = useSWR('/api/pedidos?page=1&limit=500');
  const pedidos = (data?.data ?? []).filter(p => p.fechaEntrega);

  const pedidosPorFecha = useMemo(() => {
    const mapa = {};
    pedidos.forEach(p => {
      const clave = isoDate(new Date(p.fechaEntrega));
      if (!mapa[clave]) mapa[clave] = [];
      mapa[clave].push(p);
    });
    return mapa;
  }, [pedidos]);

  function cambiarMes(delta) {
    const d = new Date(año, mes + delta, 1);
    setAño(d.getFullYear());
    setMes(d.getMonth());
  }

  const celdas = getCeldas(año, mes);
  const semanas = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));

  // Semana actual para vista semanal
  const inicioSemana = useMemo(() => {
    const d = new Date(hoy);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dow + semanaIdx * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [semanaIdx]);

  const diasSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [inicioSemana]);

  const mesNombre = new Date(año, mes).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const pedidosPendientes = pedidos.filter(p =>
    new Date(p.fechaEntrega) >= hoy && !['Completado','Cancelado'].includes(p.estado)
  ).sort((a, b) => new Date(a.fechaEntrega) - new Date(b.fechaEntrega)).slice(0, 5);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" /> Calendario de Entregas
        </h1>
        <div className="flex gap-2">
          <div className="tabs tabs-boxed tabs-sm">
            <button className={`tab ${vista === 'mes' ? 'tab-active' : ''}`} onClick={() => setVista('mes')}>Mes</button>
            <button className={`tab ${vista === 'semana' ? 'tab-active' : ''}`} onClick={() => setVista('semana')}>Semana</button>
          </div>
          <Link href="/pedidos" className="btn btn-ghost btn-sm">Volver a Pedidos</Link>
        </div>
      </div>

      {/* Próximas entregas */}
      {pedidosPendientes.length > 0 && (
        <div className="alert alert-info mb-4 flex-col items-start gap-2">
          <div className="flex items-center gap-2 font-semibold"><Clock className="w-4 h-4" /> Próximas entregas pendientes</div>
          <div className="flex flex-wrap gap-2">
            {pedidosPendientes.map(p => (
              <Link key={p.id} href={`/pedidos/${p.id}`} className="badge badge-outline gap-1 cursor-pointer hover:badge-primary">
                <span className="font-mono text-xs">{p.numero}</span>
                <span className="text-xs">{new Date(p.fechaEntrega).toLocaleDateString('es-ES')}</span>
                {p.cliente?.nombre && <span className="text-xs opacity-70">— {p.cliente.nombre}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Vista mensual */}
      {vista === 'mes' && (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => cambiarMes(-1)}><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="font-bold capitalize text-lg">{mesNombre}</h2>
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => cambiarMes(1)}><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-base-300 rounded-lg overflow-hidden">
              {DIAS.map(d => (
                <div key={d} className="bg-base-200 text-center py-2 text-xs font-semibold text-base-content/50">{d}</div>
              ))}
              {celdas.map((dia, i) => {
                if (!dia) return <div key={`empty-${i}`} className="bg-base-100 min-h-20" />;
                const clave  = isoDate(dia);
                const peds   = pedidosPorFecha[clave] ?? [];
                const esHoy  = isoDate(dia) === isoDate(hoy);
                return (
                  <div key={clave} className={`bg-base-100 min-h-20 p-1.5 ${esHoy ? 'ring-2 ring-primary ring-inset' : ''}`}>
                    <div className={`text-xs font-mono mb-1 ${esHoy ? 'font-bold text-primary' : 'text-base-content/50'}`}>{dia.getDate()}</div>
                    <div className="space-y-0.5">
                      {peds.slice(0, 3).map(p => (
                        <Link key={p.id} href={`/pedidos/${p.id}`} className="block truncate text-xs bg-primary/10 text-primary rounded px-1 hover:bg-primary/20">
                          {p.numero}
                          {p.cliente?.nombre && <span className="opacity-60"> {p.cliente.nombre}</span>}
                        </Link>
                      ))}
                      {peds.length > 3 && <span className="text-xs text-base-content/40">+{peds.length - 3} más</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vista semanal */}
      {vista === 'semana' && (
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-4">
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => setSemanaIdx(i => i - 1)}><ChevronLeft className="w-4 h-4" /></button>
              <div>
                <h2 className="font-bold text-center">
                  {diasSemana[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {diasSemana[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
                {semanaIdx !== 0 && (
                  <button className="btn btn-ghost btn-xs mx-auto block mt-1" onClick={() => setSemanaIdx(0)}>Hoy</button>
                )}
              </div>
              <button className="btn btn-ghost btn-sm btn-square" onClick={() => setSemanaIdx(i => i + 1)}><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {diasSemana.map(dia => {
                const clave = isoDate(dia);
                const peds  = pedidosPorFecha[clave] ?? [];
                const esHoy = clave === isoDate(hoy);
                return (
                  <div key={clave} className={`rounded-lg p-2 min-h-32 border ${esHoy ? 'border-primary bg-primary/5' : 'border-base-200 bg-base-100'}`}>
                    <div className="text-center mb-2">
                      <div className="text-xs text-base-content/50">{DIAS[(dia.getDay() + 6) % 7]}</div>
                      <div className={`text-sm font-bold ${esHoy ? 'text-primary' : ''}`}>{dia.getDate()}</div>
                    </div>
                    <div className="space-y-1">
                      {peds.map(p => (
                        <Link key={p.id} href={`/pedidos/${p.id}`} className="block text-xs p-1 rounded bg-base-200 hover:bg-primary/10 hover:text-primary transition-colors">
                          <div className="font-mono font-semibold">{p.numero}</div>
                          {p.cliente?.nombre && <div className="truncate text-base-content/60">{p.cliente.nombre}</div>}
                          <span className={`badge badge-xs ${ESTADO_BADGE[p.estado] ?? 'badge-neutral'}`}>{p.estado}</span>
                        </Link>
                      ))}
                      {peds.length === 0 && <div className="text-xs text-base-content/20 text-center mt-4">—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center mt-8"><span className="loading loading-spinner loading-lg" /></div>
      )}
    </div>
  );
}
