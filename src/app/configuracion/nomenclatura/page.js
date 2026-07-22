"use client";
import { useState, useEffect, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Hash, ChevronLeft, Save, RotateCcw, Info } from 'lucide-react';
import Link from 'next/link';
import { generarCodigo } from '@/lib/producto-utils';

const DEFAULT = {
  familiaChars:    3,
  subfamiliaChars: 4,
  fabricanteMode:  'iniciales',
  fabricanteChars: 3,
  acabadoChars:    3,
  familiaAliases:  {},
};

// Producto de ejemplo para la vista previa
const PRODUCTO_EJEMPLO = {
  subfamilia: { nombre: 'Faldeta', familia: { nombre: 'GOMA' } },
  fabricante: { nombre: 'MARTIN BOHORQUEZ' },
  espesor: 8,
  ancho: 400,
  largo: 710,
  acabado: '',
};

export default function NomenclaturaPage() {
  const { data: savedConfig, isLoading } = useSWR('/api/configuracion/nomenclatura');
  const { data: familias }               = useSWR('/api/familias');

  const [form, setForm]   = useState(DEFAULT);
  const [msg, setMsg]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sincronizar form con la config guardada
  useEffect(() => {
    if (savedConfig) {
      setForm({ ...DEFAULT, ...savedConfig });
      setDirty(false);
    }
  }, [savedConfig]);

  const codigoPreview = useMemo(() => generarCodigo(PRODUCTO_EJEMPLO, form), [form]);

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function updateAlias(famNombre, alias) {
    setForm(prev => ({
      ...prev,
      familiaAliases: { ...prev.familiaAliases, [famNombre]: alias },
    }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/configuracion/nomenclatura', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg({ type: 'success', text: 'Guardado correctamente' });
      setDirty(false);
      mutate('/api/configuracion/nomenclatura');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(savedConfig ? { ...DEFAULT, ...savedConfig } : DEFAULT);
    setDirty(false);
    setMsg(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const familiasOrdenadas = familias
    ? [...familias].sort((a, b) => a.nombre.localeCompare(b.nombre))
    : [];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <Link href="/configuracion" className="btn btn-ghost btn-sm">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <Hash className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Nomenclatura</h1>
          <p className="text-base-content/60 text-sm">
            Personaliza cómo se generan los códigos automáticos de los productos.
          </p>
        </div>
      </div>

      {/* Vista previa */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body py-4">
          <div className="flex items-center gap-2 text-sm text-base-content/60 mb-1">
            <Info className="w-3.5 h-3.5" />
            Vista previa con producto de ejemplo (GOMA · Faldeta · MARTIN BOHORQUEZ · 8mm · 400×710)
          </div>
          <div className="font-mono text-2xl font-bold tracking-wider text-primary">
            {codigoPreview || '—'}
          </div>
          <div className="flex gap-6 text-xs text-base-content/50 mt-1 flex-wrap">
            {form.familiaAliases['GOMA']
              ? <span><b>FAM:</b> {form.familiaAliases['GOMA'].toUpperCase()} (alias)</span>
              : <span><b>FAM:</b> {'GOMA'.slice(0, form.familiaChars).toUpperCase()} ({form.familiaChars} chars)</span>
            }
            <span><b>SUB:</b> {'Faldeta'.slice(0, form.subfamiliaChars).toUpperCase()} ({form.subfamiliaChars} chars)</span>
            <span>
              <b>FAB:</b>{' '}
              {form.fabricanteMode === 'primeros'
                ? `${'MARTINBOHORQUEZ'.slice(0, form.fabricanteChars).toUpperCase()} (${form.fabricanteChars} primeros)`
                : 'MB (iniciales)'}
            </span>
          </div>
        </div>
      </div>

      {/* Segmentos del código */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-base">Segmentos del código</h2>
          <p className="text-sm text-base-content/60 mb-4">
            Formato: <code className="font-mono bg-base-200 px-1 rounded">FAM-SUB-FAB-ESPmm-ANCHO×LARGO</code>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Familia */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Familia <span className="text-base-content/50">(FAM)</span></span>
                <span className="label-text-alt text-base-content/40">1–8 caracteres</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1} max={8}
                  value={form.familiaChars}
                  onChange={e => updateField('familiaChars', +e.target.value)}
                  className="range range-primary range-sm flex-1"
                />
                <span className="badge badge-primary badge-lg w-8 justify-center font-mono">
                  {form.familiaChars}
                </span>
              </div>
              <p className="text-xs text-base-content/40 mt-1">
                Ej: {'"GOMA"'} → {'"'+'GOMA'.slice(0, form.familiaChars).toUpperCase()+'"'}
              </p>
            </div>

            {/* Subfamilia */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Subfamilia <span className="text-base-content/50">(SUB)</span></span>
                <span className="label-text-alt text-base-content/40">1–8 caracteres</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1} max={8}
                  value={form.subfamiliaChars}
                  onChange={e => updateField('subfamiliaChars', +e.target.value)}
                  className="range range-primary range-sm flex-1"
                />
                <span className="badge badge-primary badge-lg w-8 justify-center font-mono">
                  {form.subfamiliaChars}
                </span>
              </div>
              <p className="text-xs text-base-content/40 mt-1">
                Ej: {'"Faldeta"'} → {'"'+'FALDETA'.slice(0, form.subfamiliaChars)+'"'}
              </p>
            </div>

            {/* Fabricante — modo */}
            <div className="form-control sm:col-span-2">
              <label className="label">
                <span className="label-text font-medium">Fabricante <span className="text-base-content/50">(FAB)</span></span>
              </label>
              <div className="flex flex-wrap gap-3 items-start">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fabricanteMode"
                      className="radio radio-primary radio-sm"
                      checked={form.fabricanteMode === 'iniciales'}
                      onChange={() => updateField('fabricanteMode', 'iniciales')}
                    />
                    <span className="text-sm">Iniciales de cada palabra</span>
                  </label>
                  <span className="text-xs text-base-content/40 self-center ml-1">
                    (MARTIN BOHORQUEZ → MB)
                  </span>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="fabricanteMode"
                      className="radio radio-primary radio-sm"
                      checked={form.fabricanteMode === 'primeros'}
                      onChange={() => updateField('fabricanteMode', 'primeros')}
                    />
                    <span className="text-sm">Primeros N caracteres del nombre</span>
                  </label>
                  {form.fabricanteMode === 'primeros' && (
                    <div className="flex items-center gap-2 ml-2">
                      <input
                        type="number"
                        min={1} max={10}
                        value={form.fabricanteChars}
                        onChange={e => updateField('fabricanteChars', +e.target.value)}
                        className="input input-sm input-bordered w-16 font-mono text-center"
                      />
                      <span className="text-xs text-base-content/40">
                        chars → {'"'+'MARTINBOHORQUEZ'.slice(0, form.fabricanteChars).toUpperCase()+'"'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Acabado */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Acabado <span className="text-base-content/50">(sin fabricante)</span></span>
                <span className="label-text-alt text-base-content/40">1–8 caracteres</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1} max={8}
                  value={form.acabadoChars}
                  onChange={e => updateField('acabadoChars', +e.target.value)}
                  className="range range-primary range-sm flex-1"
                />
                <span className="badge badge-primary badge-lg w-8 justify-center font-mono">
                  {form.acabadoChars}
                </span>
              </div>
              <p className="text-xs text-base-content/40 mt-1">
                Ej: {'"NEGRA"'} → {'"'+'NEGRA'.slice(0, form.acabadoChars).toUpperCase()+'"'} (cuando no hay fabricante)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alias de familias */}
      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-base">Alias de familias</h2>
          <p className="text-sm text-base-content/60 mb-4">
            Sobreescribe la abreviatura automática para una familia concreta. Deja vacío para usar los primeros{' '}
            <b>{form.familiaChars} caracteres</b> del nombre.
          </p>

          {familiasOrdenadas.length === 0 ? (
            <p className="text-sm text-base-content/40">Cargando familias…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Familia</th>
                    <th>Automático</th>
                    <th>Alias personalizado</th>
                    <th>Vista previa</th>
                  </tr>
                </thead>
                <tbody>
                  {familiasOrdenadas.map(fam => {
                    const auto  = fam.nombre.slice(0, form.familiaChars).toUpperCase();
                    const alias = form.familiaAliases[fam.nombre] ?? '';
                    const usado = alias.trim().toUpperCase() || auto;
                    return (
                      <tr key={fam.id}>
                        <td className="font-medium">{fam.nombre}</td>
                        <td className="font-mono text-base-content/50">{auto}</td>
                        <td>
                          <input
                            type="text"
                            maxLength={8}
                            placeholder={auto}
                            value={alias}
                            onChange={e => updateAlias(fam.nombre, e.target.value.toUpperCase())}
                            className="input input-sm input-bordered w-24 font-mono uppercase"
                          />
                        </td>
                        <td>
                          <span className={`font-mono font-bold ${alias ? 'text-primary' : 'text-base-content/40'}`}>
                            {usado}
                          </span>
                          {alias ? <span className="ml-1 text-xs text-primary">(alias)</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje de feedback */}
      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{msg.text}</span>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <button
          className="btn btn-ghost gap-2"
          onClick={handleReset}
          disabled={!dirty || saving}
        >
          <RotateCcw className="w-4 h-4" />
          Descartar cambios
        </button>
        <button
          className="btn btn-primary gap-2"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          {saving
            ? <span className="loading loading-spinner loading-sm" />
            : <Save className="w-4 h-4" />
          }
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
