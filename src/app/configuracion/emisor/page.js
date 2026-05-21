"use client";
import { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, AlertCircle, FlaskConical, Globe } from 'lucide-react';

export default function ConfiguracionEmisorPage() {
  const [form, setForm]       = useState({ nif: '', nombre: '', direccion: '', entorno: 'pruebas' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState(null); // 'ok' | 'error'

  useEffect(() => {
    fetch('/api/configuracion/emisor')
      .then(r => r.json())
      .then(data => { setForm({ nif: data.nif || '', nombre: data.nombre || '', direccion: data.direccion || '', entorno: data.entorno || 'pruebas' }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch('/api/configuracion/emisor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setResult(res.ok ? 'ok' : 'error');
    } catch {
      setResult('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center"><span className="loading loading-spinner loading-md" /></div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Emisor VeriFactu</h1>
          <p className="text-sm text-base-content/60">Datos del obligado a emisión y entorno de envío a la AEAT</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card bg-base-200 p-5 space-y-4">
          <div>
            <label className="label label-text font-medium">NIF / CIF del emisor</label>
            <input
              type="text"
              className="input input-bordered w-full font-mono"
              placeholder="B12345678"
              value={form.nif}
              onChange={e => setForm(p => ({ ...p, nif: e.target.value }))}
              maxLength={9}
              required
            />
            <p className="text-xs text-base-content/50 mt-1">9 caracteres, sin espacios. Entra en el hash SHA-256 de cada factura.</p>
          </div>

          <div>
            <label className="label label-text font-medium">Nombre / Razón social</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="MI EMPRESA SL"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label label-text font-medium">Dirección fiscal</label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="C/ Ejemplo, 1, 14000 Córdoba"
              value={form.direccion}
              onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
            />
          </div>
        </div>

        {/* Entorno */}
        <div className="card bg-base-200 p-5">
          <label className="label label-text font-medium mb-2">Entorno de verificación AEAT</label>
          <div className="flex gap-3">
            <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.entorno === 'pruebas' ? 'border-warning bg-warning/10' : 'border-base-300 hover:border-base-400'}`}>
              <input type="radio" name="entorno" value="pruebas" checked={form.entorno === 'pruebas'} onChange={() => setForm(p => ({ ...p, entorno: 'pruebas' }))} className="hidden" />
              <FlaskConical className={`w-5 h-5 ${form.entorno === 'pruebas' ? 'text-warning' : 'text-base-content/40'}`} />
              <div>
                <div className="font-medium text-sm">Pruebas</div>
                <div className="text-xs text-base-content/50">preportal.aeat.es</div>
              </div>
            </label>
            <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${form.entorno === 'produccion' ? 'border-success bg-success/10' : 'border-base-300 hover:border-base-400'}`}>
              <input type="radio" name="entorno" value="produccion" checked={form.entorno === 'produccion'} onChange={() => setForm(p => ({ ...p, entorno: 'produccion' }))} className="hidden" />
              <Globe className={`w-5 h-5 ${form.entorno === 'produccion' ? 'text-success' : 'text-base-content/40'}`} />
              <div>
                <div className="font-medium text-sm">Producción</div>
                <div className="text-xs text-base-content/50">portal AEAT real</div>
              </div>
            </label>
          </div>
          {form.entorno === 'pruebas' && (
            <div className="alert alert-warning mt-3 text-xs py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Los QR de las facturas apuntarán a <strong>preportal.aeat.es</strong> — no serán válidos para clientes reales.</span>
            </div>
          )}
          {form.entorno === 'produccion' && (
            <div className="alert alert-success mt-3 text-xs py-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Los QR apuntarán al portal real de la AEAT. Asegúrate de que el NIF sea correcto.</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary gap-2" disabled={saving}>
            {saving ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
          {result === 'ok'    && <span className="flex items-center gap-1 text-success text-sm"><CheckCircle className="w-4 h-4" /> Guardado</span>}
          {result === 'error' && <span className="flex items-center gap-1 text-error text-sm"><AlertCircle className="w-4 h-4" /> Error al guardar</span>}
        </div>
      </form>
    </div>
  );
}
