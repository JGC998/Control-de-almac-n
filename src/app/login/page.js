"use client";
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Warehouse, Lock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // FRONT-04: Validar redirect para evitar open redirect hacia dominios externos
  const raw = searchParams.get('redirect') || '/';
  const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  const [pin, setPin]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'PIN incorrecto');
      }
      router.push(redirect);
      router.refresh();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-sm bg-base-100 shadow-2xl border border-base-300">
        <div className="card-body gap-4">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="bg-primary/10 rounded-full p-3">
              <Warehouse className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">CRM Taller</h1>
            <span className="flex items-center gap-1 text-xs text-base-content/50">
              <Lock className="w-3 h-3" /> Acceso protegido
            </span>
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">PIN de acceso</span>
              </label>
              <input
                type="password"
                className="input input-bordered text-center tracking-[0.5em] text-xl"
                placeholder="····"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                maxLength={20}
              />
            </div>
            <button
              type="submit"
              disabled={!pin.trim() || loading}
              className="btn btn-primary w-full"
            >
              {loading
                ? <span className="loading loading-spinner loading-sm" />
                : 'Entrar'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
