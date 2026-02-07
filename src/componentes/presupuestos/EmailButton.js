"use client";
import React, { useState } from 'react';
import { Mail } from 'lucide-react';

export default function EmailButton({ id, emailCliente }) {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSend = async () => {
        if (!confirm(`¿Enviar presupuesto por email a ${emailCliente}?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/presupuestos/${id}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: emailCliente })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || 'Error al enviar email');
            } else {
                alert(data.message); // "Email enviado correctamente" o "Envío simulado"
                setSent(true);
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
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
        <button
            onClick={handleSend}
            className={`btn btn-outline btn-sm gap-2 ${sent ? 'btn-success text-white' : ''}`}
            disabled={loading}
        >
            {loading ? <span className="loading loading-spinner loading-xs"></span> : <Mail className="w-4 h-4" />}
            {loading ? 'Enviando...' : sent ? 'Enviado' : 'Enviar Email'}
        </button>
    );
}
