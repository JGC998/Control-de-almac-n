"use client";
import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import { toast, toastError } from '@/lib/toast';
import { useConfirmacion } from '@/componentes/ui/ModalConfirmacion';

export default function EmailButton({ id, emailCliente }) {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { confirmar, ModalConfirmacion } = useConfirmacion();

    const handleSend = async () => {
        const ok = await confirmar({
            titulo: '¿Enviar presupuesto?',
            mensaje: `Se enviará el presupuesto por email a ${emailCliente}.`,
            variante: 'exito',
        });
        if (!ok) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/presupuestos/${id}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: emailCliente })
            });

            const data = await res.json();

            if (!res.ok) {
                toastError(data.message || 'Error al enviar email');
            } else {
                toast(data.message);
                setSent(true);
            }
        } catch (error) {
            console.error('[EmailButton]', error?.message ?? 'Error desconocido');
            toastError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    if (!emailCliente) {
        return (
            <button className="btn btn-outline btn-sm gap-2" disabled title="El cliente no tiene email">
                <Mail className="w-4 h-4" /> Enviar Email
            </button>
        );
    }

    return (
        <>
            <button
                onClick={handleSend}
                className={`btn btn-outline btn-sm gap-2 ${sent ? 'btn-success text-white' : ''}`}
                disabled={loading}
            >
                {loading ? <span className="loading loading-spinner loading-xs"></span> : <Mail className="w-4 h-4" />}
                {loading ? 'Enviando...' : sent ? 'Enviado' : 'Enviar Email'}
            </button>
            <ModalConfirmacion />
        </>
    );
}
