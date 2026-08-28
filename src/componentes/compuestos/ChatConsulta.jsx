"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Send, Package, ClipboardList, AlertTriangle, ArrowRight,
  ExternalLink, Ruler, Ship, HelpCircle, Mic, MicOff,
  FileText, Trash2, Copy, Check,
} from 'lucide-react';

const STORAGE_KEY   = 'chat-consulta-v1';
const MAX_HISTORIAL = 40;

const ACCIONES_RAPIDAS = [
  { label: 'Pedidos de hoy',     query: 'pedidos hoy',        icon: ClipboardList  },
  { label: 'Stock bajo mínimo',  query: 'stock bajo mínimo',  icon: AlertTriangle  },
  { label: 'Pedidos pendientes', query: 'pedidos pendientes',  icon: ClipboardList  },
  { label: 'Todo el stock',      query: 'stock',               icon: Package        },
];

const ESTADO_BADGE = {
  Pendiente:  'badge-warning',
  Facturado:  'badge-success',
  Cancelado:  'badge-error',
};

const FRASES_CARGA = [
  'Interpretando consulta…',
  'Consultando base de datos…',
  'Calculando…',
];

// ── Renderizadores de respuesta ────────────────────────────────────────────────

function ResultadoStock({ datos }) {
  if (!datos?.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {datos.map((s, i) => (
        <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${s.alerta ? 'bg-warning/10 border border-warning/30' : 'bg-base-300/50'}`}>
          <div className="min-w-0">
            <p className="font-semibold truncate">{s.material}{s.espesor ? ` ${s.espesor}mm` : ''}</p>
            {s.minimo > 0 && <p className="text-xs text-base-content/50">Mínimo: {s.minimo} m²</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {s.alerta && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
            <span className={`font-mono font-bold text-sm ${s.alerta ? 'text-warning' : 'text-base-content'}`}>
              {s.metros?.toLocaleString('es-ES', { maximumFractionDigits: 1 })} m²
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultadoPedidos({ datos }) {
  if (!datos?.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {datos.map((p, i) => (
        <Link key={i} href={`/pedidos/${p.id}`}
          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm bg-base-300/50 hover:bg-base-300 transition-colors active:scale-[0.99]"
        >
          <div className="min-w-0">
            <p className="font-semibold">{p.numero}</p>
            {p.cliente && <p className="text-xs text-base-content/50 truncate">{p.cliente}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className={`badge badge-xs ${ESTADO_BADGE[p.estado] ?? 'badge-ghost'}`}>{p.estado}</span>
            <ArrowRight className="w-3.5 h-3.5 text-base-content/30" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function ResultadoPedidoDetalle({ datos }) {
  if (!datos) return null;
  return (
    <Link href={`/pedidos/${datos.id}`}
      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm bg-base-300/50 hover:bg-base-300 transition-colors mt-2 active:scale-[0.99]"
    >
      <div>
        <p className="font-semibold">{datos.numero}</p>
        {datos.cliente && <p className="text-xs text-base-content/50">{datos.cliente}</p>}
        <p className="text-xs text-base-content/40 mt-0.5">
          {datos.items} línea{datos.items !== 1 ? 's' : ''} · {new Date(datos.fecha).toLocaleDateString('es-ES')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className={`badge badge-xs ${ESTADO_BADGE[datos.estado] ?? 'badge-ghost'}`}>{datos.estado}</span>
        <ExternalLink className="w-3.5 h-3.5 text-base-content/30" />
      </div>
    </Link>
  );
}

function ResultadoCliente({ datos }) {
  if (!datos) return null;
  return (
    <div className="mt-2">
      <Link href={`/gestion/clientes/${datos.id}`}
        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm bg-base-300/50 hover:bg-base-300 transition-colors active:scale-[0.99]"
      >
        <div>
          <p className="font-semibold">{datos.nombre}</p>
          {datos.email    && <p className="text-xs text-base-content/50">{datos.email}</p>}
          {datos.telefono && <p className="text-xs text-base-content/50">{datos.telefono}</p>}
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-base-content/30 shrink-0 ml-3" />
      </Link>
      {datos.pedidosRecientes?.length > 0 && (
        <div className="flex flex-col gap-1 mt-1.5">
          {datos.pedidosRecientes.map((p, i) => (
            <Link key={i} href={`/pedidos/${p.id}`}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs bg-base-300/30 hover:bg-base-300/60 transition-colors"
            >
              <span className="font-medium">{p.numero}</span>
              <span className={`badge badge-xs ${ESTADO_BADGE[p.estado] ?? 'badge-ghost'}`}>{p.estado}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function fmt(n, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtEur(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function generarTexto(datos, tipo) {
  if (!datos?.precio_total) return null;
  const lines = [];
  const pct   = n => n != null ? n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—';
  const pct2  = n => n != null ? n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const ivaPct = datos.iva != null ? Math.round(datos.iva * 100) : 21;

  if (tipo === 'calculo') {
    const { dims, conf, material, espesor, color, precio_material, coste_conf, desc_conf, precio_total, precio_con_iva, unidades, precio_unitario } = datos;
    const confLabel = conf === 'SF' ? 'Sin Fin' : conf === 'GR' ? 'Con Grapa' : conf === 'AB' ? 'Abierta' : '';
    lines.push(`Banda ${dims?.ancho}×${dims?.largo} mm${confLabel ? ' · ' + confLabel : ''}`);
    if (material) lines.push(`${material}${espesor ? ' ' + espesor + 'mm' : ''}${color ? ' ' + color : ''}`);
    lines.push('─────────────────');
    if (coste_conf > 0) {
      lines.push(`Material:        ${pct(precio_material)}`);
      lines.push(`${(desc_conf || 'Confección').padEnd(17)}: ${pct(coste_conf)}`);
    }
    if (unidades > 1) {
      lines.push(`Precio unitario: ${pct(precio_unitario)}`);
      lines.push(`× ${unidades} uds.`);
    }
    lines.push(`Sin IVA:         ${pct(precio_total)}`);
    if (precio_con_iva) lines.push(`Con IVA (${ivaPct}%):   ${pct(precio_con_iva)}`);
  } else if (tipo === 'metraje') {
    const { anchoTira, metros, material, espesor, precio_total, precio_con_iva } = datos;
    lines.push(`Metraje ${anchoTira}mm × ${metros}m lin.`);
    if (material) lines.push(`${material}${espesor ? ' ' + espesor + 'mm' : ''}`);
    lines.push('─────────────────');
    lines.push(`Sin IVA:       ${pct(precio_total)}`);
    if (precio_con_iva) lines.push(`Con IVA (${ivaPct}%): ${pct(precio_con_iva)}`);
  }
  return lines.join('\n');
}

function ChipsAccion({ datos, tipo, onAccion }) {
  if ((tipo !== 'calculo' && tipo !== 'metraje') || !datos?.precio_total) return null;
  const [copiado, setCopiado] = React.useState(false);

  const copiar = async () => {
    const texto = generarTexto(datos, tipo);
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard no disponible */ }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {[2, 3, 4, 5].map(n => (
        <button key={n}
          onClick={() => onAccion(`multiplicalo por ${n}`)}
          className="btn btn-xs btn-ghost border border-base-300 font-mono hover:border-primary hover:text-primary"
        >
          ×{n}
        </button>
      ))}
      <button onClick={copiar}
        className={`btn btn-xs gap-1 ${copiado ? 'btn-success text-success-content' : 'btn-ghost border border-base-300'}`}
      >
        {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        {copiado ? '¡Copiado!' : 'Copiar'}
      </button>
      <Link href="/presupuestos/nuevo"
        className="btn btn-xs btn-ghost border border-primary/40 text-primary gap-1"
      >
        <FileText className="w-3 h-3" />
        Presupuesto
      </Link>
    </div>
  );
}

function ResultadoMetraje({ datos }) {
  if (!datos) return null;
  const { anchoTira, metros, area_m2, precio_m2, precio_total, peso_total, material, espesor, color } = datos;

  if (!precio_m2) {
    return (
      <div className="mt-2 rounded-xl px-3 py-3 bg-warning/10 border border-warning/30 text-sm">
        <p className="flex items-center gap-2 text-warning font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Sin tarifa para ese material/espesor
        </p>
        {area_m2 && <p className="text-xs mt-1 text-base-content/60">Área: {fmt(area_m2, 3)} m²</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-base-300 text-sm">
      <div className="bg-base-200 px-3 py-2 flex items-center gap-2">
        <Ruler className="w-3.5 h-3.5 text-secondary shrink-0" />
        <span className="text-xs text-base-content/60 font-mono">
          {anchoTira}mm × {metros}m lin.
        </span>
      </div>
      <div className="px-3 py-3 bg-base-100 space-y-1.5">
        <div className="flex justify-between text-xs text-base-content/50">
          <span>Área total</span>
          <span className="font-mono">{fmt(area_m2, 3)} m²</span>
        </div>
        <div className="flex justify-between text-xs text-base-content/50">
          <span>Precio/m²{material ? ` (${material}${espesor ? ' ' + espesor + 'mm' : ''}${color ? ' ' + color : ''})` : ''}</span>
          <span className="font-mono">{fmtEur(precio_m2)}</span>
        </div>
        <div className="flex justify-between text-xs text-base-content/50">
          <span>Precio/metro lineal</span>
          <span className="font-mono">{fmtEur(precio_total / metros)}</span>
        </div>
        {peso_total > 0 && (
          <div className="flex justify-between text-xs text-base-content/50">
            <span>Peso total</span>
            <span className="font-mono">{fmt(peso_total, 2)} kg</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t border-base-200">
          <span className="font-semibold">Total sin IVA</span>
          <span className="font-bold text-lg text-secondary font-mono">{fmtEur(precio_total)}</span>
        </div>
        {datos.precio_con_iva && (
          <div className="flex justify-between text-xs text-base-content/40 pt-0.5">
            <span>Con IVA ({Math.round((datos.iva ?? 0.21) * 100)}%)</span>
            <span className="font-mono">{fmtEur(datos.precio_con_iva)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultadoCalculo({ datos }) {
  if (!datos) return null;
  const {
    dims, area_m2, precio_m2, precio_total, precio_unitario,
    precio_material, coste_conf, desc_conf, peso_m2, peso_total,
    material, espesor, color, conf, preciosVenta, bandaCatalogo, unidades,
  } = datos;

  if (!precio_m2) {
    return (
      <div className="mt-2 rounded-xl px-3 py-3 bg-warning/10 border border-warning/30 text-sm">
        <p className="flex items-center gap-2 text-warning font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          No hay tarifa para ese material/espesor
        </p>
        {area_m2 && <p className="text-xs mt-1 text-base-content/60">Superficie calculada: {fmt(area_m2, 3)} m²</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-base-300 text-sm">
      <div className="bg-base-200 px-3 py-2 flex items-center gap-2">
        <Ruler className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs text-base-content/60 font-mono">
          {dims?.ancho}×{dims?.largo} mm
          {conf ? ` · ${conf === 'SF' ? 'Sin Fin' : conf === 'GR' ? 'Con Grapa' : 'Abierta'}` : ''}
        </span>
      </div>
      <div className="px-3 py-3 bg-base-100 space-y-1.5">
        <div className="flex justify-between text-xs text-base-content/50">
          <span>Superficie</span>
          <span className="font-mono">{fmt(area_m2, 3)} m²</span>
        </div>
        <div className="flex justify-between text-xs text-base-content/50">
          <span>Precio/m²{material ? ` (${material}${espesor ? ' ' + espesor + 'mm' : ''}${color ? ' ' + color : ''})` : ''}</span>
          <span className="font-mono">{fmtEur(precio_m2)}</span>
        </div>
        {coste_conf > 0 && (
          <div className="flex justify-between text-xs text-base-content/50">
            <span>Material</span>
            <span className="font-mono">{fmtEur(precio_material)}</span>
          </div>
        )}
        {coste_conf > 0 && (
          <div className="flex justify-between text-xs text-base-content/50">
            <span>{desc_conf || 'Confección'}</span>
            <span className="font-mono">{fmtEur(coste_conf)}</span>
          </div>
        )}
        {peso_m2 > 0 && (
          <div className="flex justify-between text-xs text-base-content/50">
            <span>Peso aprox.</span>
            <span className="font-mono">{fmt(peso_total, 2)} kg</span>
          </div>
        )}
        {unidades > 1 && (
          <div className="flex justify-between text-xs text-base-content/50">
            <span>Precio unitario</span>
            <span className="font-mono">{fmtEur(precio_unitario)}</span>
          </div>
        )}
        {unidades > 1 && (
          <div className="flex justify-between text-xs text-base-content/50">
            <span>× {unidades} unidades</span>
            <span className="font-mono">= {fmtEur(precio_total)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t border-base-200">
          <span className="font-semibold">{unidades > 1 ? `Total sin IVA (${unidades} uds.)` : 'Total sin IVA'}</span>
          <span className="font-bold text-lg text-primary font-mono">{fmtEur(precio_total)}</span>
        </div>
        {datos.precio_con_iva && (
          <div className="flex justify-between text-xs text-base-content/40 pt-0.5">
            <span>Con IVA ({Math.round((datos.iva ?? 0.21) * 100)}%)</span>
            <span className="font-mono">{fmtEur(datos.precio_con_iva)}</span>
          </div>
        )}
      </div>
      {preciosVenta && Object.keys(preciosVenta).length > 1 && (
        <div className="px-3 py-2 bg-base-200/50 border-t border-base-300">
          <p className="text-[10px] text-base-content/40 mb-1 uppercase tracking-wide">Precios por margen</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(preciosVenta).map(([tier, p]) => (
              <div key={tier} className="text-xs">
                <span className="text-base-content/50">{tier}: </span>
                <span className="font-mono font-medium">{fmtEur(area_m2 * p)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {bandaCatalogo && (
        <Link href={`/gestion/productos/${bandaCatalogo.id}`}
          className="flex items-center justify-between px-3 py-2 bg-success/10 border-t border-success/20 hover:bg-success/20 transition-colors"
        >
          <span className="text-xs text-success font-medium truncate">✓ En catálogo: {bandaCatalogo.nombre}</span>
          <span className="text-xs font-mono text-success shrink-0 ml-2">{fmtEur(bandaCatalogo.precio)}</span>
        </Link>
      )}
    </div>
  );
}

function ResultadoTarifa({ datos }) {
  if (!datos?.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {datos.map((t, i) => (
        <div key={i} className="rounded-xl px-3 py-2.5 bg-base-300/50 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{t.material} {t.espesor}mm{t.color ? ` · ${t.color}` : ''}{t.acabado ? ` · ${t.acabado}` : ''}</p>
              <p className="text-xs text-base-content/50 mt-0.5">{fmt(t.peso, 3)} kg/m²</p>
            </div>
            <p className="font-bold text-primary font-mono shrink-0 ml-3">
              {fmtEur(t.precio)}<span className="text-xs font-normal text-base-content/40">/m²</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

const ESTADO_IMPORT_LABEL = {
  BORRADOR: 'Borrador', PEDIDO: 'Pedido', TRANSITO: 'En tránsito',
  ADUANA: 'En aduana', RECIBIDO: 'Recibido',
};
const ESTADO_IMPORT_BADGE = {
  BORRADOR: 'badge-ghost', PEDIDO: 'badge-info', TRANSITO: 'badge-warning',
  ADUANA: 'badge-error', RECIBIDO: 'badge-success',
};

function ResultadoImportaciones({ datos }) {
  if (!datos?.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {datos.map((imp, i) => (
        <Link key={i} href={`/compras/contenedores/${imp.id}`}
          className="rounded-xl px-3 py-2.5 bg-base-300/50 hover:bg-base-300 transition-colors text-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Ship className="w-3 h-3 text-base-content/40 shrink-0" />
                <p className="font-medium truncate">{imp.descripcion || imp.numContenedor || 'Contenedor'}</p>
              </div>
              {imp.proveedor    && <p className="text-xs text-base-content/50 mt-0.5">{imp.proveedor}</p>}
              {imp.nombreBarco  && <p className="text-xs text-base-content/40">{imp.nombreBarco}</p>}
              {imp.etaEstimada  && (
                <p className="text-xs text-base-content/40">
                  ETA: {new Date(imp.etaEstimada).toLocaleDateString('es-ES')}
                </p>
              )}
            </div>
            <span className={`badge badge-xs shrink-0 ${ESTADO_IMPORT_BADGE[imp.estado] ?? 'badge-ghost'}`}>
              {ESTADO_IMPORT_LABEL[imp.estado] ?? imp.estado}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ResultadoAyuda({ datos }) {
  if (!datos?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {datos.map((e, i) => (
        <span key={i} className="badge badge-ghost badge-sm font-mono">{e}</span>
      ))}
    </div>
  );
}

// ── Burbujas ───────────────────────────────────────────────────────────────────

function BurbujaBot({ msg, onAccion }) {
  const esFaltaDatos = msg.tipo === 'falta_datos';
  return (
    <div className="flex flex-col max-w-[92%]">
      <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed ${esFaltaDatos ? 'bg-info/10 border border-info/30' : 'bg-base-200'}`}>
        {esFaltaDatos && (
          <span className="flex items-center gap-1.5 text-info text-xs font-semibold mb-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" /> Necesito un dato más
          </span>
        )}
        {msg.texto}
      </div>
      {msg.tipo === 'stock'          && <ResultadoStock         datos={msg.datos} />}
      {msg.tipo === 'pedidos'        && <ResultadoPedidos        datos={msg.datos} />}
      {msg.tipo === 'pedido_detalle' && <ResultadoPedidoDetalle  datos={msg.datos} />}
      {msg.tipo === 'cliente'        && <ResultadoCliente        datos={msg.datos} />}
      {msg.tipo === 'calculo'        && <ResultadoCalculo        datos={msg.datos} />}
      {msg.tipo === 'metraje'        && <ResultadoMetraje        datos={msg.datos} />}
      {msg.tipo === 'tarifa'         && <ResultadoTarifa         datos={msg.datos} />}
      {msg.tipo === 'importaciones'  && <ResultadoImportaciones  datos={msg.datos} />}
      {msg.tipo === 'ayuda'          && <ResultadoAyuda          datos={msg.datos} />}

      {/* Chips de sugerencia cuando falta un dato — materiales, conf, etc. */}
      {msg.tipo === 'falta_datos' && msg.datos?.sugerencias?.length > 0 && onAccion && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {msg.datos.sugerencias.map(s => (
            <button key={s.valor} onClick={() => onAccion(s.valor)}
              className="btn btn-xs btn-ghost border border-info/30 text-info hover:border-info hover:bg-info/10">
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Chips de espesores alternativos cuando no hay tarifa */}
      {msg.tipo === 'calculo' && msg.datos?.alternativas?.length > 0 && onAccion && (
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          <span className="text-xs text-base-content/40">Prueba con:</span>
          {msg.datos.alternativas.map(esp => (
            <button key={esp} onClick={() => onAccion(esp)}
              className="btn btn-xs btn-ghost border border-base-300 font-mono hover:border-primary hover:text-primary">
              {esp}
            </button>
          ))}
        </div>
      )}

      {/* Chips de acción rápida tras cálculo */}
      {onAccion && <ChipsAccion datos={msg.datos} tipo={msg.tipo} onAccion={onAccion} />}
    </div>
  );
}

function BurbujaUsuario({ texto }) {
  return (
    <div className="flex justify-end">
      <div className="bg-primary text-primary-content rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
        {texto}
      </div>
    </div>
  );
}

function TypingDots({ fase }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-base-200 rounded-2xl rounded-tl-sm w-fit max-w-[80%]">
      <div className="flex gap-1">
        {[0, 150, 300].map(delay => (
          <span key={delay} className="w-2 h-2 bg-base-content/30 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
      <span className="text-xs text-base-content/40">{FRASES_CARGA[fase] ?? FRASES_CARGA.at(-1)}</span>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

const MSG_BIENVENIDA = { role: 'bot', texto: '¡Hola! Pregúntame sobre pedidos, stock, clientes o precios de bandas.', tipo: 'bienvenida', datos: null };

export default function ChatConsulta() {
  const [mensajes, setMensajes] = useState([MSG_BIENVENIDA]);
  const [input,    setInput]    = useState('');
  const [cargando, setCargando] = useState(false);
  const [faseCarga, setFaseCarga] = useState(0);
  const [grabando,  setGrabando]  = useState(false);

  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const recognitionRef = useRef(null);

  // ── Pre-calentar Ollama al abrir el chat ─────────────────────────────────────
  useEffect(() => {
    fetch('/api/consulta').catch(() => {});
  }, []);

  // ── Persistencia ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMensajes(parsed);
      }
    } catch { /* localStorage no disponible */ }
  }, []);

  useEffect(() => {
    if (mensajes.length > 1) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes.slice(-MAX_HISTORIAL))); } catch {}
    }
  }, [mensajes]);

  // ── Scroll automático ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  // ── Fases de carga ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cargando) { setFaseCarga(0); return; }
    const interval = setInterval(() => {
      setFaseCarga(f => Math.min(f + 1, FRASES_CARGA.length - 1));
    }, 6000);
    return () => clearInterval(interval);
  }, [cargando]);

  // ── Envío de consulta ─────────────────────────────────────────────────────────
  const enviar = useCallback(async (queryOverride) => {
    const texto = (queryOverride ?? input).trim();
    if (!texto || cargando) return;
    setInput('');
    setMensajes(prev => [...prev, { role: 'user', texto }]);
    setCargando(true);
    try {
      const msgs      = mensajes; // captura en closure antes del setState
      const ultimoBot = [...msgs].reverse().find(m => m.role === 'bot');
      const contexto  = ultimoBot?.datos ?? null;

      // Últimas 3 preguntas+respuestas como texto para que Ollama entienda referencias
      const historial = msgs
        .slice(-8)
        .filter(m => m.texto && m.tipo !== 'bienvenida')
        .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.texto}`)
        .join('\n') || null;

      const res  = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: texto, contexto, historial }),
      });
      const data = await res.json();
      setMensajes(prev => [...prev, { role: 'bot', ...data }]);
    } catch {
      setMensajes(prev => [...prev, { role: 'bot', texto: 'Error de conexión. Inténtalo de nuevo.', tipo: 'error', datos: null }]);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  }, [input, cargando, mensajes]);

  // ── Micrófono ─────────────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const SR = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) return; // el botón no aparece si no hay soporte

    if (grabando) {
      recognitionRef.current?.stop();
      setGrabando(false);
      return;
    }

    const rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => (prev + ' ' + transcript).trim());
      setGrabando(false);
    };
    rec.onerror = () => setGrabando(false);
    rec.onend   = () => setGrabando(false);

    rec.start();
    recognitionRef.current = rec;
    setGrabando(true);
  }, [grabando]);

  const tieneSoporteMic = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // ── Limpiar historial ─────────────────────────────────────────────────────────
  const limpiarHistorial = useCallback(() => {
    setMensajes([MSG_BIENVENIDA]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const hayMensajesUsuario = mensajes.some(m => m.role === 'user');

  return (
    <div className="flex flex-col h-full">

      {/* Cabecera de herramientas */}
      {hayMensajesUsuario && (
        <div className="flex justify-end pb-1">
          <button
            onClick={limpiarHistorial}
            className="btn btn-ghost btn-xs text-base-content/30 gap-1"
            title="Limpiar conversación"
          >
            <Trash2 className="w-3 h-3" />
            Limpiar
          </button>
        </div>
      )}

      {/* Historial de mensajes */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {mensajes.map((m, i) =>
          m.role === 'user'
            ? <BurbujaUsuario key={i} texto={m.texto} />
            : <BurbujaBot     key={i} msg={m} onAccion={enviar} />
        )}

        {/* Acciones rápidas — solo antes del primer mensaje del usuario */}
        {!hayMensajesUsuario && !cargando && (
          <div className="flex flex-col gap-2 pt-2">
            {ACCIONES_RAPIDAS.map(a => (
              <button key={a.query}
                onClick={() => enviar(a.query)}
                className="flex items-center gap-3 bg-base-200 hover:bg-base-300 active:scale-[0.99] rounded-xl px-4 py-3 text-sm font-medium text-left transition-colors"
              >
                <a.icon className="w-4 h-4 text-primary shrink-0" />
                {a.label}
              </button>
            ))}
          </div>
        )}

        {cargando && <TypingDots fase={faseCarga} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 pb-1 border-t border-base-200">
        <div className="flex gap-2 items-center">
          {/* Botón micrófono — solo si el navegador lo soporta */}
          {tieneSoporteMic && (
            <button
              onClick={toggleMic}
              className={`btn btn-square h-11 w-11 shrink-0 ${grabando ? 'btn-error animate-pulse' : 'btn-ghost border border-base-300'}`}
              title={grabando ? 'Detener grabación' : 'Dictar por voz'}
            >
              {grabando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            className="input input-bordered flex-1 text-sm h-11"
            placeholder={grabando ? 'Escuchando…' : 'Pedidos hoy, stock pvc, 400×3800 grapa…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            disabled={cargando || grabando}
            autoComplete="off"
          />

          <button
            className="btn btn-primary btn-square h-11 w-11 shrink-0"
            onClick={() => enviar()}
            disabled={!input.trim() || cargando}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
