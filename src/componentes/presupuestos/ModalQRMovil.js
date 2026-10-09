'use client';
import { useEffect, useRef, useState } from 'react';
import { Smartphone, X } from 'lucide-react';

const URL_MOVIL = 'http://192.168.1.250/ventas/presupuesto-rapido';

export default function ModalQRMovil() {
  const dialogRef = useRef(null);
  const [qrSrc, setQrSrc] = useState(null);

  async function abrirModal() {
    if (!qrSrc) {
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(URL_MOVIL, { width: 280, margin: 2 });
      setQrSrc(url);
    }
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button type="button" onClick={abrirModal} className="btn btn-outline btn-secondary gap-2">
        <Smartphone className="w-4 h-4" /> Presupuesto móvil
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-sm text-center">
          <button
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => dialogRef.current?.close()}
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-lg mb-1">Presupuesto desde móvil</h3>
          <p className="text-sm text-base-content/60 mb-4">Escanea el QR con el teléfono</p>
          {qrSrc && <img src={qrSrc} alt="QR presupuesto móvil" className="mx-auto rounded-lg" />}
          <p className="text-xs text-base-content/40 mt-3 break-all">{URL_MOVIL}</p>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>cerrar</button>
        </form>
      </dialog>
    </>
  );
}
