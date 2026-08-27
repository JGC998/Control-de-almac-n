"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Package, ClipboardList, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

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

// ── Renderizadores de respuesta ────────────────────────────────────────────────

function ResultadoStock({ datos }) {
  if (!datos?.length) return null;
  return (
    <div className="flex flex-col gap-1.5 mt-2">
      {datos.map((s, i) => (
        <div key={i} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm ${s.alerta ? 'bg-warning/10 border border-warning/30' : 'bg-base-300/50'}`}>
          <div className="min-w-0">
            <p className="font-semibold truncate">{s.material}{s.espesor ? ` ${s.espesor}mm` : ''}</p>
            {s.minimo > 0 && (
              <p className="text-xs text-base-content/50">Mínimo: {s.minimo} m²</p>
            )}
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
          {datos.email && <p className="text-xs text-base-content/50">{datos.email}</p>}
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

function ResultadoPrecio({ datos }) {
  if (!datos) return null;
  return (
    <Link href={`/gestion/productos/${datos.id}`}
      className="flex items-center justify-between rounded-xl px-3 py-2.5 mt-2 bg-base-300/50 hover:bg-base-300 transition-colors active:scale-[0.99]"
    >
      <div>
        <p className="text-xs text-base-content/50 truncate max-w-[200px]">{datos.nombre}</p>
        <p className="font-bold text-xl text-primary mt-0.5">
          {datos.precio?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </p>
        {datos.peso > 0 && <p className="text-xs text-base-content/40">{datos.peso} kg/ud</p>}
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-base-content/30 shrink-0 ml-3" />
    </Link>
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

function BurbujaBot({ msg }) {
  return (
    <div className="flex flex-col max-w-[92%]">
      <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed">
        {msg.texto}
      </div>
      {msg.tipo === 'stock'          && <ResultadoStock datos={msg.datos} />}
      {msg.tipo === 'pedidos'        && <ResultadoPedidos datos={msg.datos} />}
      {msg.tipo === 'pedido_detalle' && <ResultadoPedidoDetalle datos={msg.datos} />}
      {msg.tipo === 'cliente'        && <ResultadoCliente datos={msg.datos} />}
      {msg.tipo === 'precio'         && <ResultadoPrecio datos={msg.datos} />}
      {msg.tipo === 'ayuda'          && <ResultadoAyuda datos={msg.datos} />}
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

function TypingDots() {
  return (
    <div className="flex gap-1.5 px-4 py-3 bg-base-200 rounded-2xl rounded-tl-sm w-fit">
      {[0, 150, 300].map(delay => (
        <span key={delay} className="w-2 h-2 bg-base-content/30 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function ChatConsulta() {
  const [mensajes, setMensajes] = useState([
    { role: 'bot', texto: '¡Hola! Pregúntame sobre pedidos, stock, clientes o precios de bandas.', tipo: 'bienvenida', datos: null },
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const enviar = async (queryOverride) => {
    const texto = (queryOverride ?? input).trim();
    if (!texto || cargando) return;
    setInput('');
    setMensajes(prev => [...prev, { role: 'user', texto }]);
    setCargando(true);
    try {
      const res  = await fetch('/api/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: texto }),
      });
      const data = await res.json();
      setMensajes(prev => [...prev, { role: 'bot', ...data }]);
    } catch {
      setMensajes(prev => [...prev, { role: 'bot', texto: 'Error de conexión. Inténtalo de nuevo.', tipo: 'error', datos: null }]);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  };

  const hayMensajesUsuario = mensajes.some(m => m.role === 'user');

  return (
    <div className="flex flex-col h-full">

      {/* Historial de mensajes */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {mensajes.map((m, i) =>
          m.role === 'user'
            ? <BurbujaUsuario key={i} texto={m.texto} />
            : <BurbujaBot     key={i} msg={m} />
        )}

        {/* Acciones rápidas — solo si no ha escrito nada */}
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

        {cargando && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="pt-3 pb-1 border-t border-base-200">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            className="input input-bordered flex-1 text-sm h-11"
            placeholder="Pedidos hoy, stock pvc, 400×3800 grapa…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            disabled={cargando}
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
