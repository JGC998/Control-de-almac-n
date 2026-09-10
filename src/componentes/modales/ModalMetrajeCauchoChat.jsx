'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { X, Scissors, Send } from 'lucide-react';

const MATERIALES_CAUCHO = ['GOMA', 'FIELTRO', 'CARAMELO', 'PLANCHA DE GOMA'];

function fmtEur(v) {
  return (typeof v === 'number' ? v : 0).toLocaleString('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  });
}

function fmtMm(mm) {
  return Number(mm).toLocaleString('es-ES', { maximumFractionDigits: 0 });
}

function parseDims(text) {
  const s = text.trim()
    .replace(/,/g, '.')
    .replace(/por/gi, 'x')
    .replace(/[×*·]/g, 'x')
    .replace(/\s+/g, 'x');
  const m = s.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const ancho = parseFloat(m[1]);
  const largo = parseFloat(m[2]);
  return ancho > 0 && largo > 0 ? { ancho, largo } : null;
}

function parsePositiveInt(text) {
  const n = parseInt(String(text).replace(',', '.'), 10);
  return n > 0 ? n : null;
}

const PASOS_TEXTO = {
  DIMS:     'Ej: 500×1200',
  CANTIDAD: 'Nº de tiras, ej: 10',
};

export default function ModalMetrajeCauchoChat({ isOpen, onClose, onAddItem }) {
  const [mensajes, setMensajes] = useState([]);
  const [paso, setPaso]         = useState('MATERIAL');
  const [datos, setDatos]       = useState({});
  const [input, setInput]       = useState('');
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const { data: todasTarifas } = useSWR('/api/precios');
  const { data: margenesData } = useSWR('/api/pricing/margenes');

  const tarifasCaucho = useMemo(
    () => (todasTarifas ?? []).filter(t => MATERIALES_CAUCHO.includes(t.material)),
    [todasTarifas],
  );

  const margenesVenta = useMemo(() => (margenesData ?? []).filter(m => m.tipo !== 'gastoFijo' && m.multiplicador !== 1), [margenesData]);

  const materialesDisp = useMemo(() => {
    const set = new Set(tarifasCaucho.map(t => t.material));
    return MATERIALES_CAUCHO.filter(m => set.has(m));
  }, [tarifasCaucho]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const pushBot  = (texto, chips = null) =>
    setMensajes(prev => [...prev, { role: 'bot', texto, chips }]);
  const pushUser = (texto) =>
    setMensajes(prev => [...prev, { role: 'user', texto }]);

  const msgInicial = (chips) => [{
    role: 'bot',
    texto: '¡Hola! Vamos a añadir un metraje de caucho.\n¿Qué material necesitas?',
    chips,
  }];

  const reiniciar = () => {
    setMensajes(msgInicial(materialesDisp.map(m => ({ label: m, valor: m }))));
    setPaso('MATERIAL');
    setDatos({});
    setInput('');
  };

  // ── mount / reset ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    // Si las tarifas ya están en caché, poner los chips directamente; si no, llegan luego
    const chips = materialesDisp.length > 0 ? materialesDisp.map(m => ({ label: m, valor: m })) : null;
    setMensajes(msgInicial(chips));
    setPaso('MATERIAL');
    setDatos({});
    setInput('');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fallback: añade chips cuando las tarifas llegan tarde (primera carga sin caché)
  useEffect(() => {
    if (!isOpen || materialesDisp.length === 0) return;
    setMensajes(prev => {
      if (prev.length !== 1 || prev[0].chips) return prev; // ya tiene chips o hay conversación
      return msgInicial(materialesDisp.map(m => ({ label: m, valor: m })));
    });
  }, [todasTarifas, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ── step chain ─────────────────────────────────────────────────────────────

  const afterMaterial = (material) => {
    const tarsM = tarifasCaucho.filter(t => t.material === material);
    const espesores = [...new Set(tarsM.map(t => String(t.espesor)))]
      .sort((a, b) => parseFloat(a) - parseFloat(b));

    const chips = espesores.map(esp => {
      const vars   = tarsM.filter(t => Math.abs(Number(t.espesor) - parseFloat(esp)) < 0.001);
      const lonas  = [...new Set(vars.map(t => t.lonas).filter(Boolean))].sort();
      const nota   = lonas.length ? ` (${lonas.join('/')}L)` : '';
      return { label: `${parseFloat(esp)} mm${nota}`, valor: esp };
    });

    pushBot(`Material: ${material} ✓\n\n¿Qué espesor?`, chips);
    setDatos({ material });
    setPaso('ESPESOR');
  };

  const afterEspesor = (espesor, d0) => {
    const tarsEsp = tarifasCaucho.filter(t =>
      t.material === d0.material &&
      Math.abs(Number(t.espesor) - parseFloat(espesor)) < 0.001,
    );
    const lOpts = [...new Set(tarsEsp.map(t => t.lonas == null ? '__null' : String(t.lonas)))];

    if (lOpts.length > 1) {
      const chips = lOpts
        .sort((a, b) => (a === '__null' ? -1 : b === '__null' ? 1 : Number(a) - Number(b)))
        .map(l => ({ label: l === '__null' ? 'Estándar' : `${l} lonas`, valor: l }));
      pushBot('¿Cuántas lonas?', chips);
      setDatos({ ...d0, espesor });
      setPaso('LONAS');
      return;
    }
    afterLonas(lOpts[0] === '__null' ? null : lOpts[0], { ...d0, espesor }, tarsEsp);
  };

  const afterLonas = (lonas, d0, tarsEsp0) => {
    const tarsL = lonas == null
      ? tarsEsp0.filter(t => t.lonas == null)
      : tarsEsp0.filter(t => String(t.lonas) === lonas);
    const aOpts = [...new Set(tarsL.map(t => t.acabado == null ? '__null' : t.acabado))];

    if (aOpts.length > 1) {
      const chips = aOpts.map(a => ({ label: a === '__null' ? 'Sin acabado especial' : a, valor: a }));
      pushBot('¿Qué acabado?', chips);
      setDatos({ ...d0, lonas });
      setPaso('ACABADO');
      return;
    }
    afterAcabado(aOpts[0] === '__null' ? null : aOpts[0], { ...d0, lonas }, tarsL);
  };

  const afterAcabado = (acabado, d0, tarsL0) => {
    pushBot(
      `Espesor: ${parseFloat(d0.espesor)} mm ✓\n\n¿Cómo va la pieza?`,
      [
        { label: 'Pieza completa', valor: 'PIEZA' },
        { label: 'Tiras', valor: 'TIRAS' },
      ],
    );
    setDatos({ ...d0, acabado });
    setPaso('TIPO_PIEZA');
  };

  const afterTipoPieza = (tipo, d0) => {
    pushBot(
      tipo === 'TIRAS'
        ? 'Ancho × largo de cada tira, en mm.\nEj: 250×1200'
        : '¿Cuáles son las dimensiones?\nAncho × largo en mm.\nEj: 500×1200',
    );
    setDatos({ ...d0, tipoPieza: tipo });
    setPaso('DIMS');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const afterDims = (dims, d0) => {
    if (d0.tipoPieza === 'TIRAS') {
      pushBot(`Tiras de ${fmtMm(dims.ancho)} × ${fmtMm(dims.largo)} mm ✓\n\n¿Cuántas tiras?`);
      setDatos({ ...d0, ...dims });
      setPaso('CANTIDAD');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      calcular({ ...d0, ...dims, cantidad: 1 });
    }
  };

  // ── calculation ────────────────────────────────────────────────────────────

  const calcular = (d0) => {
    const { material, espesor, lonas, acabado, ancho, largo, cantidad, tipoPieza } = d0;

    let cands = tarifasCaucho.filter(t => t.material === material);
    cands = cands.filter(t => Math.abs(Number(t.espesor) - parseFloat(espesor)) < 0.001);
    if ('lonas' in d0) {
      cands = lonas == null
        ? cands.filter(t => t.lonas == null)
        : cands.filter(t => String(t.lonas) === String(lonas));
    }
    if ('acabado' in d0) {
      cands = acabado == null
        ? cands.filter(t => !t.acabado)
        : cands.filter(t => t.acabado === acabado);
    }
    const tarifa = cands[0];

    if (!tarifa) {
      pushBot('No encontré tarifa para esa combinación.', [
        { label: 'Empezar de nuevo', valor: '__reiniciar' },
      ]);
      return;
    }

    const ancM = ancho / 1000;
    const larM = largo / 1000;
    const area  = ancM * larM;
    const precioBase  = Math.round(tarifa.precio * area * 100) / 100;
    const pesoUnitario = Math.round((tarifa.peso ?? 0) * area * 1000) / 1000;

    const partes = [material];
    if (acabado) partes.push(acabado);
    partes.push(`${parseFloat(espesor)}mm`);
    if (lonas) partes.push(`${lonas}L`);
    const dimStr = `${fmtMm(ancho)}×${fmtMm(largo)}mm`;
    const descripcion = tipoPieza === 'TIRAS'
      ? [...partes, `— ${cantidad} tiras ${dimStr}`].join(' ')
      : [...partes, `— ${dimStr}`].join(' ');

    setDatos({
      ...d0,
      _precioBase:   precioBase,
      _pesoUnitario: pesoUnitario,
      _area:         area,
      _tarifaPrecio: tarifa.precio,
      _descripcion:  descripcion,
    });

    const margenChips = [
      { label: 'Coste interno', valor: '__tipo_coste', _mult: 1 },
      ...margenesVenta.map(m => ({ label: m.descripcion, valor: `__tipo_${m.base}`, _mult: m.multiplicador })),
    ];
    pushBot('¿El precio es para...?', margenChips);
    setPaso('TIPO_CLIENTE');
  };

  const mostrarResultadoCaucho = (d0, mult, labelMult) => {
    const { material, espesor, lonas, acabado, ancho, largo, cantidad, tipoPieza,
            _precioBase = 0, _pesoUnitario = 0, _area = 0, _tarifaPrecio = 0, _descripcion } = d0;

    const precioUnitario = Math.round(_precioBase * mult * 100) / 100;
    const precioTotal    = Math.round(precioUnitario * cantidad * 100) / 100;
    const pesoTotal      = Math.round(_pesoUnitario  * cantidad * 1000) / 1000;

    const lineas = [
      tipoPieza === 'TIRAS'
        ? `📐  ${cantidad} tiras de ${fmtMm(ancho)} × ${fmtMm(largo)} mm`
        : `📐  ${fmtMm(ancho)} × ${fmtMm(largo)} mm`,
      `🔧  ${material} ${parseFloat(espesor)} mm${lonas ? ` · ${lonas} lonas` : ''}${acabado ? ` · ${acabado}` : ''}`,
      ``,
      `Tarifa:     ${_tarifaPrecio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/m²`,
      `Superficie: ${_area.toLocaleString('es-ES', { minimumFractionDigits: 4 })} m²`,
      tipoPieza === 'TIRAS' ? `Precio/tira: ${fmtEur(_precioBase)}` : null,
      mult !== 1 ? `Coste:      ${fmtEur(tipoPieza === 'TIRAS' ? _precioBase * cantidad : _precioBase)}` : null,
      `──────────────────────────`,
      mult !== 1 ? `${labelMult} (×${mult}):` : null,
      `TOTAL:      ${fmtEur(precioTotal)}`,
      pesoTotal > 0 ? `Peso:       ${pesoTotal.toLocaleString('es-ES', { minimumFractionDigits: 3 })} kg` : null,
    ].filter(l => l !== null).join('\n');

    const item = {
      descripcion: _descripcion,
      unidades: cantidad,
      precioUnitario,
      pesoUnitario: _pesoUnitario,
      detallesTecnicos: JSON.stringify({
        material,
        dimensiones: { espesor: parseFloat(espesor), ancho, largo },
        lonas: lonas != null ? Number(lonas) : null,
        acabado: acabado || null,
        tipoPieza,
      }),
    };

    setDatos({ ...d0, _resultado: item });
    pushBot(lineas, [
      { label: '✓ Añadir al pedido', valor: '__añadir', _item: item },
      { label: 'Empezar de nuevo',   valor: '__reiniciar' },
    ]);
    setPaso('RESULTADO');
  };

  // ── input / chip handlers ──────────────────────────────────────────────────

  const procesarChip = (valor, chip, currentPaso, d) => {
    if (valor === '__reiniciar')             { reiniciar(); return; }
    if (valor === '__añadir' && chip?._item) { onAddItem(chip._item); onClose(); return; }

    switch (currentPaso) {
      case 'MATERIAL':   afterMaterial(valor); break;
      case 'ESPESOR':    afterEspesor(valor, d); break;
      case 'LONAS':      afterLonas(
                           valor === '__null' ? null : valor,
                           d,
                           tarifasCaucho.filter(t =>
                             t.material === d.material &&
                             Math.abs(Number(t.espesor) - parseFloat(d.espesor)) < 0.001,
                           ),
                         ); break;
      case 'ACABADO': {
                         const tarsL = tarifasCaucho.filter(t =>
                           t.material === d.material &&
                           Math.abs(Number(t.espesor) - parseFloat(d.espesor)) < 0.001 &&
                           (d.lonas == null ? t.lonas == null : String(t.lonas) === d.lonas),
                         );
                         afterAcabado(valor === '__null' ? null : valor, d, tarsL);
                       } break;
      case 'TIPO_PIEZA':    afterTipoPieza(valor, d); break;
      case 'TIPO_CLIENTE':  mostrarResultadoCaucho(d, chip._mult ?? 1, chip.label); break;
      default: break;
    }
  };

  const procesarTexto = (texto, currentPaso, d) => {
    switch (currentPaso) {
      case 'DIMS': {
        const dims = parseDims(texto);
        if (!dims) { pushBot('No entendí las medidas. Prueba: 500×1200'); return; }
        afterDims(dims, d);
        break;
      }
      case 'CANTIDAD': {
        const n = parsePositiveInt(texto);
        if (!n) { pushBot('Escribe el número de tiras, ej: 10'); return; }
        calcular({ ...d, cantidad: n });
        break;
      }
      default:
        pushBot('Usa los botones de arriba para elegir.');
    }
  };

  const handleEnviar = () => {
    const txt = input.trim();
    if (!txt) return;
    pushUser(txt);
    setInput('');
    procesarTexto(txt, paso, datos);
  };

  const handleChip = (chip, currentPaso, d) => {
    pushUser(chip.label);
    procesarChip(chip.valor, chip, currentPaso, d);
  };

  const inputActivo = ['DIMS', 'CANTIDAD'].includes(paso);

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-50">
      <div
        className="modal-box w-full max-w-md flex flex-col p-0 overflow-hidden bg-base-100 rounded-2xl shadow-2xl"
        style={{ height: '82vh' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-base-200 shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Metraje caucho
          </h3>
          <button onClick={onClose} className="btn btn-xs btn-circle btn-ghost">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          {mensajes.map((m, i) => {
            const isBot      = m.role === 'bot';
            const esUltimoBot = isBot && i === mensajes.map(x => x.role).lastIndexOf('bot');
            return (
              <div key={i} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[88%]">
                  <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    isBot
                      ? 'bg-base-200 text-base-content rounded-bl-none'
                      : 'bg-primary text-primary-content rounded-br-none'
                  }`}>
                    {m.texto}
                  </div>
                  {isBot && m.chips && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {m.chips.map((chip, j) => (
                        <button
                          key={j}
                          onClick={() => esUltimoBot && handleChip(chip, paso, datos)}
                          disabled={!esUltimoBot}
                          className="btn btn-xs btn-ghost border border-base-300 hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t px-3 py-2 flex gap-2 bg-base-100">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && inputActivo && handleEnviar()}
            placeholder={PASOS_TEXTO[paso] ?? 'Usa los botones de arriba'}
            disabled={!inputActivo}
            className="input input-bordered input-sm flex-1 text-sm"
          />
          <button
            onClick={handleEnviar}
            disabled={!inputActivo || !input.trim()}
            className="btn btn-sm btn-primary"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}
