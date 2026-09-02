'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, History, Search, ArrowRight } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDims(text) {
  const clean = text.trim().replace(/\s+/g, '').replace(/[×xXpP]/gi, 'x');
  const m = clean.match(/^(\d{2,5})x(\d{2,5})$/);
  if (!m) return null;
  return { ancho: parseInt(m[1], 10), largo: parseInt(m[2], 10) };
}

function formatFecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const CONF_MAP = { SF: 'Sin Fin', GR: 'Con Grapa', AB: 'Abierta' };
function confFromNombre(nombre) {
  if (!nombre) return null;
  if (/-SF-/.test(nombre)) return CONF_MAP.SF;
  if (/-GR-/.test(nombre)) return CONF_MAP.GR;
  if (/-AB-/.test(nombre)) return CONF_MAP.AB;
  return null;
}

// ─── Tarjeta de banda ─────────────────────────────────────────────────────────

function BandaCard({ banda, onSeleccionar }) {
  const dim   = banda.det?.dimensiones;
  const conf  = confFromNombre(banda.descripcion);
  const color = banda.det?.color;
  const esp   = dim?.espesor;

  return (
    <div className="bg-base-100 border border-base-300 rounded-xl p-3 flex flex-col gap-2 hover:border-secondary/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-bold leading-snug">{banda.descripcion}</span>
          <div className="flex flex-wrap items-center gap-1">
            {esp    != null && <span className="badge badge-ghost badge-xs">{esp} mm</span>}
            {color           && <span className="badge badge-ghost badge-xs">{color}</span>}
            {conf            && <span className="badge badge-ghost badge-xs">{conf}</span>}
            {dim             && <span className="text-xs text-base-content/40">{dim.ancho}×{dim.largo} mm</span>}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="font-mono text-sm font-bold whitespace-nowrap">
            {(banda.unitPrice ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          {banda.pesoUnitario > 0 && (
            <div className="text-xs text-base-content/40">{Number(banda.pesoUnitario).toFixed(3)} kg</div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-base-content/40 truncate">
          {banda.pedido?.numero}
          {banda.pedido?.cliente?.nombre && ` · ${banda.pedido.cliente.nombre}`}
          {banda.pedido?.fechaCreacion && ` · ${formatFecha(banda.pedido.fechaCreacion)}`}
        </span>
        <button
          onClick={() => onSeleccionar(banda)}
          className="btn btn-xs btn-secondary gap-1 shrink-0 ml-2"
        >
          Usar <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

export default function ModalBusquedaBandasChat({ isOpen, onClose, onSelect, clienteId, clienteNombre }) {
  const [mensajes, setMensajes] = useState([]);
  const [paso, setPaso]         = useState('INICIO');
  const [inputVal, setInputVal] = useState('');
  const [cargando, setCargando] = useState(false);
  const [inputError, setInputError] = useState('');

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  // ─── Mensajería ──────────────────────────────────────────────────────────

  const addBot = useCallback((content, chips = [], extra = {}) => {
    setMensajes(prev => [...prev, { role: 'bot', content, chips, ...extra }]);
  }, []);

  const addUser = useCallback((text) => {
    setMensajes(prev => [...prev, { role: 'user', content: text }]);
  }, []);

  // ─── Mostrar resultados de bandas ────────────────────────────────────────

  function mostrarBandas(bandas, contexto) {
    if (!Array.isArray(bandas) || bandas.length === 0) {
      addBot(`No encontré bandas para ${contexto}.`, [{ label: '🔄 Nueva búsqueda', action: 'RESET' }]);
    } else {
      addBot(
        `${bandas.length} banda${bandas.length !== 1 ? 's' : ''} de ${contexto}:`,
        [],
        { bandas },
      );
    }
    setPaso('RESULTADOS');
  }

  // ─── Fetch: bandas de un cliente por ID ──────────────────────────────────

  const cargarBandasCliente = useCallback(async (cId, cNombre) => {
    setCargando(true);
    try {
      const res  = await fetch(`/api/bandas-historial?clienteId=${cId}`);
      const data = await res.json();
      mostrarBandas(data, cNombre);
    } catch {
      addBot('Error al cargar bandas.', [{ label: '🔄 Nueva búsqueda', action: 'RESET' }]);
      setPaso('RESULTADOS');
    } finally {
      setCargando(false);
    }
  }, [addBot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch: clientes coincidentes por nombre ─────────────────────────────

  const buscarClientes = useCallback(async (nombre) => {
    setCargando(true);
    try {
      const res     = await fetch(`/api/bandas-historial?modo=clientes&clienteNombre=${encodeURIComponent(nombre)}`);
      const clientes = await res.json();

      if (!Array.isArray(clientes) || clientes.length === 0) {
        addBot(`No encontré ningún cliente con bandas que coincida con "${nombre}".`, [
          { label: '🔄 Nueva búsqueda', action: 'RESET' },
        ]);
        setPaso('RESULTADOS');
      } else if (clientes.length === 1) {
        // Un único cliente → cargar directamente sus bandas
        addBot(`Cargando bandas de ${clientes[0].nombre}…`);
        await cargarBandasCliente(clientes[0].id, clientes[0].nombre);
      } else {
        // Varios clientes → mostrar lista para elegir
        addBot(
          `${clientes.length} clientes encontrados. ¿De cuál?`,
          [],
          { clientes },
        );
        setPaso('SELECCIONAR_CLIENTE');
      }
    } catch {
      addBot('Error al buscar clientes.', [{ label: '🔄 Nueva búsqueda', action: 'RESET' }]);
      setPaso('RESULTADOS');
    } finally {
      setCargando(false);
    }
  }, [addBot, cargarBandasCliente]);

  // ─── Fetch: bandas por dimensiones ───────────────────────────────────────

  const buscarPorDims = useCallback(async (ancho, largo) => {
    setCargando(true);
    try {
      const res  = await fetch(`/api/bandas-historial?ancho=${ancho}&largo=${largo}`);
      const data = await res.json();
      mostrarBandas(data, `medidas ${ancho}×${largo} mm`);
    } catch {
      addBot('Error al buscar.', [{ label: '🔄 Nueva búsqueda', action: 'RESET' }]);
      setPaso('RESULTADOS');
    } finally {
      setCargando(false);
    }
  }, [addBot]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reset / init ──────────────────────────────────────────────────────

  const resetChat = useCallback(() => {
    setMensajes([]);
    setInputVal('');
    setInputError('');
    setCargando(false);
    if (clienteId) {
      setPaso('CARGANDO');
      setMensajes([{ role: 'bot', content: `Cargando bandas de ${clienteNombre || 'este cliente'}…`, chips: [] }]);
      cargarBandasCliente(clienteId, clienteNombre || 'este cliente');
    } else {
      setPaso('INICIO');
      setMensajes([{
        role: 'bot',
        content: '¿Qué bandas buscas?',
        chips: [
          { label: '👤 Por cliente', action: 'POR_CLIENTE' },
          { label: '📐 Por medidas', action: 'POR_DIMS' },
        ],
      }]);
    }
  }, [clienteId, clienteNombre, cargarBandasCliente]);

  useEffect(() => {
    if (isOpen) resetChat();
  }, [isOpen, clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  useEffect(() => {
    if (paso === 'BUSCANDO_CLIENTE' || paso === 'BUSCANDO_DIMS') {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [paso]);

  // ─── Chip handler ────────────────────────────────────────────────────────

  function handleChip(action) {
    if (paso === 'CARGANDO') return;
    switch (action) {
      case 'POR_CLIENTE':
        addUser('Por cliente');
        addBot('¿Qué cliente buscas? Escribe el nombre o parte de él.');
        setPaso('BUSCANDO_CLIENTE');
        setInputVal('');
        break;
      case 'POR_DIMS':
        addUser('Por medidas');
        addBot('¿Qué medidas? Escríbelas como ancho×largo en mm (ej: 750×6850)');
        setPaso('BUSCANDO_DIMS');
        setInputVal('');
        break;
      case 'RESET':
        resetChat();
        break;
    }
  }

  function handleSeleccionarCliente(cliente) {
    addUser(cliente.nombre);
    addBot(`Cargando ${cliente.count} banda${cliente.count !== 1 ? 's' : ''} de ${cliente.nombre}…`);
    setPaso('CARGANDO');
    cargarBandasCliente(cliente.id, cliente.nombre);
  }

  // ─── Submit input ────────────────────────────────────────────────────────

  function handleSubmit(e) {
    e?.preventDefault();
    const val = inputVal.trim();
    if (!val) return;

    if (paso === 'BUSCANDO_CLIENTE') {
      addUser(val);
      addBot(`Buscando clientes que coincidan con "${val}"…`);
      setPaso('CARGANDO');
      setInputVal('');
      buscarClientes(val);
    } else if (paso === 'BUSCANDO_DIMS') {
      const dims = parseDims(val);
      if (!dims) {
        setInputError('Formato no reconocido. Prueba: 750×6850 o 750x6850');
        return;
      }
      setInputError('');
      addUser(`${dims.ancho}×${dims.largo} mm`);
      addBot(`Buscando bandas similares a ${dims.ancho}×${dims.largo} mm…`);
      setPaso('CARGANDO');
      setInputVal('');
      buscarPorDims(dims.ancho, dims.largo);
    }
  }

  // ─── Seleccionar banda ────────────────────────────────────────────────────

  function handleSeleccionar(banda) {
    onSelect({ _fromHistorial: true, ...banda });
    onClose();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const showInput = paso === 'BUSCANDO_CLIENTE' || paso === 'BUSCANDO_DIMS';
  const inputPlaceholder = paso === 'BUSCANDO_CLIENTE' ? 'Nombre del cliente…' : 'Ej: 750×6850';

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-40">
      <div className="modal-box w-11/12 max-w-2xl h-[85vh] flex flex-col p-0 overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-base-300 bg-base-100 shrink-0">
          <h3 className="font-bold text-base flex items-center gap-2">
            <History className="w-4 h-4 text-secondary" />
            Historial de bandas PVC
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {mensajes.map((msg, i) => (
            <div key={i}>
              {msg.role === 'bot' ? (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Search className="w-3.5 h-3.5 text-secondary" />
                  </div>
                  <div className="flex flex-col gap-2 max-w-full min-w-0">
                    <div className="bg-base-200 rounded-2xl rounded-tl-sm px-3 py-2 text-sm">
                      {msg.content}
                    </div>

                    {/* Chips genéricos */}
                    {msg.chips?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.chips.map(chip => (
                          <button
                            key={chip.action}
                            onClick={() => handleChip(chip.action)}
                            className="btn btn-xs btn-outline gap-1"
                            disabled={paso === 'CARGANDO'}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Lista de clientes coincidentes */}
                    {msg.clientes?.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {msg.clientes.map(cli => (
                          <button
                            key={cli.id}
                            onClick={() => handleSeleccionarCliente(cli)}
                            className="btn btn-sm btn-ghost justify-between border border-base-300 hover:border-secondary hover:text-secondary"
                            disabled={paso !== 'SELECCIONAR_CLIENTE'}
                          >
                            <span>{cli.nombre}</span>
                            <span className="badge badge-ghost badge-sm">{cli.count} banda{cli.count !== 1 ? 's' : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tarjetas de bandas */}
                    {msg.bandas?.length > 0 && (
                      <div className="flex flex-col gap-2 w-full">
                        {msg.bandas.map(banda => (
                          <BandaCard key={banda.id} banda={banda} onSeleccionar={handleSeleccionar} />
                        ))}
                        <button
                          onClick={() => resetChat()}
                          className="btn btn-xs btn-ghost self-start mt-0.5"
                        >
                          🔄 Nueva búsqueda
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-content rounded-2xl rounded-tr-sm px-3 py-2 text-sm max-w-[80%]">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {cargando && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Search className="w-3.5 h-3.5 text-secondary" />
              </div>
              <div className="bg-base-200 rounded-2xl rounded-tl-sm px-3 py-2">
                <span className="loading loading-dots loading-xs" />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {showInput && (
          <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-base-300 bg-base-100 shrink-0">
            {inputError && (
              <p className="text-xs text-error mb-1.5 pl-1">{inputError}</p>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={e => { setInputVal(e.target.value); setInputError(''); }}
                placeholder={inputPlaceholder}
                className="input input-bordered input-sm flex-1"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
              />
              <button type="submit" className="btn btn-sm btn-secondary">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
