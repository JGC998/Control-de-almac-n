'use client';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, CheckCircle2, AlertCircle, Send, Eye, EyeOff } from 'lucide-react';
import { fetcher } from '@/lib/fetcher';

export default function ConfigWhatsAppPage() {
  const { data: config, mutate } = useSWR('/api/config', fetcher);

  const [phone,  setPhone]  = useState('');
  const [apikey, setApikey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg,     setMsg]     = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    if (config) {
      setPhone(config.whatsapp_presupuesto_phone  || '');
      setApikey(config.whatsapp_presupuesto_apikey || '');
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_presupuesto_phone:  phone.trim(),
          whatsapp_presupuesto_apikey: apikey.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al guardar');
      await mutate();
      setMsg({ type: 'success', text: 'Configuración guardada correctamente.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!phone || !apikey) {
      setMsg({ type: 'error', text: 'Guarda primero el número y la apikey.' });
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/herramientas/whatsapp-presupuesto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: '✅ Prueba de conexión CRM Taller — presupuestos rápidos configurados correctamente.' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ type: 'error', text: data.error || 'No se pudo enviar. Comprueba el número y la apikey.' });
      } else {
        setMsg({ type: 'success', text: '✅ Mensaje enviado. Comprueba tu WhatsApp.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setTesting(false);
    }
  };

  const configured = phone && apikey;

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-6">
      <Link href="/configuracion" className="btn btn-ghost btn-sm gap-1.5 -ml-2">
        <ArrowLeft className="w-4 h-4" /> Configuración
      </Link>

      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-success/10 rounded-xl">
          <MessageCircle className="w-7 h-7 text-success" />
        </div>
        <div>
          <h1 className="text-xl font-bold">WhatsApp presupuestos</h1>
          <p className="text-sm text-base-content/60">Número al que se envían los presupuestos rápidos.</p>
        </div>
        {configured && <CheckCircle2 className="w-5 h-5 text-success ml-auto shrink-0" />}
      </div>

      {/* Instrucciones de activación */}
      <div className="card bg-base-200 border border-base-300">
        <div className="card-body py-4 px-4 space-y-2">
          <p className="font-semibold text-sm">Cómo activar el número (1 vez, ~2 min)</p>
          <ol className="text-sm text-base-content/70 space-y-1.5 list-decimal list-inside">
            <li>Añade el contacto <span className="font-mono font-semibold">+34 644 59 11 21</span> en tu WhatsApp.</li>
            <li>Envíale exactamente este mensaje:
              <code className="block bg-base-100 rounded px-2 py-1 mt-1 font-mono text-xs select-all">
                I allow callmebot to send me messages
              </code>
            </li>
            <li>Recibirás un mensaje con tu <strong>apikey</strong>. Cópiala aquí abajo.</li>
          </ol>
        </div>
      </div>

      {/* Formulario */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Número de teléfono</span>
              <span className="label-text-alt text-base-content/50">Sin + ni espacios</span>
            </label>
            <input
              type="tel"
              className="input input-bordered font-mono"
              placeholder="34612345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                Ejemplo: 34612345678 (España: empieza por 34)
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">API Key de CallMeBot</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="input input-bordered w-full font-mono pr-12"
                placeholder="123456"
                value={apikey}
                onChange={e => setApikey(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                onClick={() => setShowKey(v => !v)}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {msg && (
            <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'} py-2`}>
              {msg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="text-sm">{msg.text}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
              {saving ? <span className="loading loading-spinner loading-sm" /> : null}
              Guardar
            </button>
            <button onClick={handleTest} disabled={testing || !phone || !apikey} className="btn btn-outline gap-2">
              {testing ? <span className="loading loading-spinner loading-sm" /> : <Send className="w-4 h-4" />}
              Probar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
