"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Ruler } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';
import { formatCurrency } from '@/utils/utilidades';

function ChatBubble({ pregunta, respuesta }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-start">
        <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-xs text-sm">
          {pregunta}
        </div>
      </div>
      {respuesta != null && (
        <div className="flex justify-end">
          <div className="bg-secondary text-secondary-content rounded-2xl rounded-tr-sm px-4 py-2 max-w-xs text-sm font-medium">
            {respuesta}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculadoraMetrajesVentasPage() {
  const { data: tarifas } = useSWR('/api/precios', fetcher);
  const { data: margenes } = useSWR('/api/pricing/margenes', fetcher);

  const [historial, setHistorial] = useState([]);
  const [vals, setVals] = useState({});
  const [inputVal, setInputVal] = useState('');
  const [done, setDone] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historial, done]);

  const materiales = useMemo(() => {
    if (!tarifas) return [];
    return [...new Set(tarifas.map(t => t.material))].sort();
  }, [tarifas]);

  const espesores = useMemo(() => {
    if (!tarifas || !vals.material) return [];
    return [...new Set(
      tarifas.filter(t => t.material === vals.material).map(t => String(t.espesor))
    )].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [tarifas, vals.material]);

  const PVC_COLORS = ['AZUL', 'BLANCO', 'NEGRO', 'VERDE'];
  const isPVC = vals.material === 'PVC';

  const margenesOpciones = useMemo(() => {
    const base = [{ value: '__ninguno', label: 'Sin margen' }];
    if (!margenes) return base;
    return [...base, ...margenes.map(m => ({ value: m.id, label: m.nombre }))];
  }, [margenes]);

  const currentStep = useMemo(() => {
    if (!tarifas) return null;
    if (!vals.material) return 'material';
    if (!vals.espesor) return 'espesor';
    if (isPVC && !vals.color) return 'color';
    if (!vals.ancho) return 'ancho';
    if (!vals.metros) return 'metros';
    if (!vals.margen) return 'margen';
    return 'done';
  }, [tarifas, vals, isPVC]);

  const stepConfig = useMemo(() => ({
    material: {
      pregunta: '¿De qué material?',
      tipo: 'select',
      opciones: materiales.map(m => ({ value: m, label: m })),
    },
    espesor: {
      pregunta: '¿Qué espesor?',
      tipo: 'select',
      opciones: espesores.map(e => ({ value: e, label: `${e} mm` })),
    },
    color: {
      pregunta: '¿Qué color?',
      tipo: 'select',
      opciones: PVC_COLORS.map(c => ({ value: c, label: c })),
    },
    ancho: {
      pregunta: '¿Qué ancho? (mm)',
      tipo: 'number',
      placeholder: 'Ej: 500',
      min: 1,
    },
    metros: {
      pregunta: '¿Cuántos metros?',
      tipo: 'number',
      placeholder: 'Ej: 10',
      min: 0.1,
      step: '0.1',
    },
    margen: {
      pregunta: '¿Aplicar margen de cliente?',
      tipo: 'select',
      opciones: margenesOpciones,
    },
  }), [materiales, espesores, margenesOpciones]);

  const tarifa = useMemo(() => {
    if (!tarifas || !vals.material || !vals.espesor) return null;
    return tarifas.find(t =>
      t.material === vals.material && Math.abs(Number(t.espesor) - Number(vals.espesor)) < 0.001
    ) ?? null;
  }, [tarifas, vals.material, vals.espesor]);

  const margenSel = useMemo(() => {
    if (!margenes || !vals.margen || vals.margen === '__ninguno') return null;
    return margenes.find(m => m.id === vals.margen) ?? null;
  }, [margenes, vals.margen]);

  const resultado = useMemo(() => {
    if (currentStep !== 'done' || !tarifa) return null;
    const anchoMm = parseFloat(vals.ancho);
    const metrosNum = parseFloat(vals.metros);
    const anchoM = anchoMm / 1000;
    const area = anchoM * metrosNum;
    const precioBase = tarifa.precio * area;
    const multiplicador = margenSel?.multiplicador ?? 1;
    const gastoFijo = margenSel?.gastoFijo ?? 0;
    const precioConMargen = precioBase * multiplicador + gastoFijo;
    const peso = (tarifa.peso ?? 0) * area;

    return {
      precioBase: Math.round(precioBase * 100) / 100,
      precioFinal: Math.round(precioConMargen * 100) / 100,
      area: Math.round(area * 1000) / 1000,
      peso: Math.round(peso * 1000) / 1000,
      precioM2: tarifa.precio,
      conMargen: multiplicador !== 1 || gastoFijo > 0,
    };
  }, [currentStep, tarifa, vals, margenSel]);

  const labelFor = (step, value) => {
    const cfg = stepConfig[step];
    if (!cfg) return value;
    if (cfg.tipo === 'select') {
      const opt = cfg.opciones.find(o => o.value === value);
      return opt?.label ?? value;
    }
    return value;
  };

  const handleConfirm = () => {
    if (!inputVal || !currentStep || currentStep === 'done') return;
    const pregunta = stepConfig[currentStep]?.pregunta ?? '';
    const respLabel = labelFor(currentStep, inputVal);
    setHistorial(prev => [...prev, { pregunta, respuesta: respLabel }]);
    setVals(prev => ({ ...prev, [currentStep]: inputVal }));
    setInputVal('');
  };

  const handleReset = () => {
    setHistorial([]);
    setVals({});
    setInputVal('');
    setDone(false);
  };

  useEffect(() => {
    if (currentStep === 'done') setDone(true);
  }, [currentStep]);

  const cfg = currentStep ? stepConfig[currentStep] : null;

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-4rem)]">

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-base-200 bg-base-100 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/ventas" className="btn btn-ghost btn-sm btn-circle">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-secondary/10 rounded-lg">
              <Ruler className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">Calculadora Metrajes</p>
              <p className="text-xs text-base-content/50">Precio por metros lineales</p>
            </div>
          </div>
        </div>
        {historial.length > 0 && (
          <button onClick={handleReset} className="btn btn-ghost btn-sm gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!tarifas && (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner" />
          </div>
        )}

        {tarifas && historial.length === 0 && !done && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-2xl rounded-tl-sm px-4 py-2 max-w-xs text-sm">
              ¡Hola! Cuéntame qué material necesitas calcular.
            </div>
          </div>
        )}

        {historial.map((h, i) => (
          <ChatBubble key={i} pregunta={h.pregunta} respuesta={h.respuesta} />
        ))}

        {done && resultado && (
          <div className="flex justify-start">
            <div className="card bg-secondary/5 border border-secondary/20 w-full max-w-sm">
              <div className="card-body py-3 px-4 gap-1">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">Precio calculado</p>
                <p className="text-3xl font-bold">{formatCurrency(resultado.precioFinal)}</p>
                {resultado.conMargen && (
                  <p className="text-xs text-base-content/50">
                    Base: {formatCurrency(resultado.precioBase)} · con margen aplicado
                  </p>
                )}
                <div className="divider my-1" />
                <div className="text-xs space-y-0.5 text-base-content/70">
                  <div className="flex justify-between">
                    <span>Superficie</span>
                    <span className="font-mono">{resultado.area} m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Precio tarifa</span>
                    <span className="font-mono">{formatCurrency(resultado.precioM2)}/m²</span>
                  </div>
                  <div className="flex justify-between text-base-content/40">
                    <span>Peso aprox.</span>
                    <span className="font-mono">{resultado.peso} kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {done && !resultado && (
          <div role="alert" className="alert alert-warning text-sm">
            <span>No se encontró tarifa para esa combinación.</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!done && cfg && (
        <div className="shrink-0 px-4 py-3 border-t border-base-200 bg-base-100">
          <p className="text-sm font-medium mb-2">{cfg.pregunta}</p>
          {cfg.tipo === 'select' ? (
            <div className="flex flex-wrap gap-2">
              {cfg.opciones.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setInputVal(opt.value)}
                  className={`btn btn-sm ${inputVal === opt.value ? 'btn-secondary' : 'btn-ghost border border-base-300'}`}
                >
                  {opt.label}
                </button>
              ))}
              {inputVal && (
                <button onClick={handleConfirm} className="btn btn-sm btn-secondary ml-auto">
                  Confirmar →
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered flex-1 input-sm"
                placeholder={cfg.placeholder}
                min={cfg.min}
                step={cfg.step ?? 'any'}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                autoFocus
              />
              <button
                onClick={handleConfirm}
                disabled={!inputVal || parseFloat(inputVal) <= 0}
                className="btn btn-sm btn-secondary"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="shrink-0 px-4 py-3 border-t border-base-200">
          <button onClick={handleReset} className="btn btn-outline btn-sm w-full gap-2">
            <RotateCcw className="w-3.5 h-3.5" /> Nueva consulta
          </button>
        </div>
      )}
    </div>
  );
}
