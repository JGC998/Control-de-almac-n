'use client';
import { Camera, Upload, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FotoCotizacionPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-8">

      <Link href="/herramientas" className="btn btn-ghost btn-sm w-fit gap-2">
        <ArrowLeft size={16} />
        Herramientas
      </Link>

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="bg-warning/10 text-warning rounded-full p-5">
          <Camera size={40} />
        </div>
        <h1 className="text-3xl font-bold">Foto → Cotización</h1>
        <p className="text-base-content/60 text-lg max-w-md">
          Sube una foto de la banda desgastada o un plano con medidas y la IA generará el cálculo de precio automáticamente.
        </p>
      </div>

      <div className="card bg-base-200 border border-base-300">
        <div className="card-body gap-6">

          <div className="flex items-center gap-3">
            <div className="badge badge-warning badge-lg gap-1">
              <Sparkles size={12} />
              Próximamente
            </div>
          </div>

          <p className="text-base-content/70">
            Esta herramienta usará un modelo de visión de Ollama (<code className="font-mono text-sm bg-base-300 px-1 rounded">qwen2.5-vl</code> o <code className="font-mono text-sm bg-base-300 px-1 rounded">llava</code>) para analizar la imagen y extraer:
          </p>

          <ul className="space-y-2 text-base-content/70">
            {[
              'Dimensiones (ancho × largo en mm)',
              'Material estimado (PVC, EPDM, caucho…)',
              'Tipo de confección (sin fin, con grapa, abierta)',
              'Espesor aproximado',
              'Número de lonas si es visible',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-warning mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>

          <div className="border-2 border-dashed border-base-300 rounded-xl p-10 flex flex-col items-center gap-3 text-base-content/30 cursor-not-allowed">
            <Upload size={32} />
            <span className="text-sm">Arrastra una foto aquí o haz clic para subir</span>
          </div>

          <p className="text-xs text-base-content/40 text-center">
            Requiere modelo de visión instalado en Ollama · En desarrollo
          </p>
        </div>
      </div>

    </div>
  );
}
