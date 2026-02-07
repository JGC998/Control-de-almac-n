import React from 'react';
import CalculadoraInversa from '@/componentes/calculadoras/CalculadoraInversa';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CalculadoraInversaPage() {
    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <div className="mb-6">
                <Link href="/calculadora" className="btn btn-ghost btn-sm gap-2 mb-2 pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-4 h-4" /> Volver a Calculadoras
                </Link>
                <h1 className="text-3xl font-bold">Calculadora Inversa</h1>
            </div>

            <CalculadoraInversa />
        </div>
    );
}
