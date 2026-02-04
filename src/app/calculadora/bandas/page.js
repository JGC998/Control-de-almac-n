"use client";
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Calculator, Download, Trash2, FileText, ClipboardList } from 'lucide-react';
import { formatCurrency, formatWeight } from '@/utils/utils';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import CalculadoraBandas from '@/componentes/calculadoras/CalculadoraBandas';

export default function CalculadoraBandasPage() {
    const [itemsAgregados, setItemsAgregados] = useState([]);

    const handleAddItem = (item) => {
        setItemsAgregados(prev => [...prev, { ...item, id: Date.now() }]);
    };

    const totales = useMemo(() => itemsAgregados.reduce((acc, i) => ({
        precio: acc.precio + i.precioTotal,
        peso: acc.peso + i.pesoTotal
    }), { precio: 0, peso: 0 }), [itemsAgregados]);

    // --- UTILS PDF ---
    const loadImage = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result); // devulve base64
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn("No se pudo cargar el logo:", e);
            return null;
        }
    };

    const generatePDF = async (type = 'CLIENTE') => {
        if (itemsAgregados.length === 0) return;
        const doc = new jsPDF();

        // --- CONFIG ---
        const COMPANY_ADDRESS = 'C. La Jarra, 41, 14540 La Rambla, Córdoba';
        const COMPANY_PHONE = '957 68 28 19';
        const isTaller = type === 'TALLER';
        const title = isTaller ? "ORDEN DE TRABAJO - TALLER" : "PRESUPUESTO BANDAS";
        const filename = isTaller ? `orden_taller_${Date.now()}.pdf` : `presupuesto_bandas_${Date.now()}.pdf`;

        // --- LOGO ---
        const logoBase64 = await loadImage('/logo-crm.png');
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', 145, 15, 50, 15);
        }

        // --- HEADER ---
        doc.setFontSize(20);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, 22);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        // EMPRESA (Derecha)
        doc.text(COMPANY_ADDRESS, 200, 38, { align: 'right' });
        doc.text(`Teléfono: ${COMPANY_PHONE}`, 200, 44, { align: 'right' });

        // REF (Izquierda)
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Ref:`, 14, 36);
        doc.setFont("helvetica", "normal");
        doc.text(`Calc-${Date.now().toString().slice(-6)}`, 38, 36);

        doc.setFont("helvetica", "bold");
        doc.text(`Fecha:`, 14, 42);
        doc.setFont("helvetica", "normal");
        doc.text(new Date().toLocaleDateString('es-ES'), 38, 42);

        // CLIENTE BOX (Simulada si no hay cliente real seleccionado en calculadora)
        doc.rect(14, 55, 90, 20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, 61);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("(Borrador de Calculadora)", 20, 67);

        // --- TABLA ---
        let head, body, foot;

        if (isTaller) {
            // TALLER: Sin precios, con medidas técnicas
            head = [["#", "Descripción Técnica", "Medidas (mm)", "Cant.", "Peso Total"]];
            body = itemsAgregados.map((i, index) => [
                index + 1,
                i.descripcion,
                `${i.dimensiones?.ancho || '?'} x ${i.dimensiones?.largo || '?'} (Esp: ${i.dimensiones?.espesor || '?'})`,
                i.unidades,
                formatWeight(i.pesoTotal) + " Kg"
            ]);
            foot = [["", "", "TOTAL PESO:", "", formatWeight(totales.peso) + " Kg"]];
        } else {
            // CLIENTE: Con precios
            head = [["Descripción", "Medidas", "Cant.", "Precio Unit.", "Total"]];
            body = itemsAgregados.map(i => [
                i.descripcion, i.medidas, i.unidades, formatCurrency(i.precioUnitario), formatCurrency(i.precioTotal)
            ]);
            foot = [["", "", "", "TOTAL:", formatCurrency(totales.precio)]];
        }

        autoTable(doc, {
            startY: 85,
            head: head,
            body: body,
            foot: foot,
            theme: 'grid',
            headStyles: isTaller ? { fillColor: [60, 60, 60] } : undefined // Dark header for Taller
        });

        // --- FOOTER & TOTALES (Solo Cliente) ---
        const finalY = doc.lastAutoTable.finalY;

        if (!isTaller) {
            doc.setFontSize(10);
            const subtotal = totales.precio; // Asumimos que precioTotal ya incluye todo para simplicidad en calculadora
            // Nota: En calculadora, el precioTotal es final (con IVA o sin IVA segun logica). 
            // Asumiremos que es BASE IMPONIBLE para seguir logica CRM o TOTAL. 
            // Para simplificar y dado que es borrador:

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`TOTAL ESTIMADO:`, 145, finalY + 10);
            doc.text(`${formatCurrency(totales.precio)}`, 198, finalY + 10, { align: 'right' });

            // Nota validez
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("Nota Importante:", 14, finalY + 25);
            doc.setFont("helvetica", "normal");
            doc.text("Este documento es un borrador de calculadora. Precios sujetos a revisión.", 14, finalY + 30);
        } else {
            // Notas Taller
            doc.text("Notas de Taller / Observaciones:", 14, finalY + 15);
            doc.rect(14, finalY + 20, 180, 40);
        }

        doc.save(filename);
    };

    return (
        <div className="container mx-auto p-4 max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="tabs tabs-boxed">
                    <Link href="/calculadora" className="tab">Piezas (m²)</Link>
                    <Link href="/calculadora/bandas" className="tab tab-active">Bandas PVC</Link>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => generatePDF('TALLER')} className="btn btn-warning" disabled={itemsAgregados.length === 0}>
                        <ClipboardList className="w-4 h-4" /> Nota Taller
                    </button>
                    <button onClick={() => generatePDF('CLIENTE')} className="btn btn-secondary" disabled={itemsAgregados.length === 0}>
                        <Download className="w-4 h-4" /> Presupuesto
                    </button>
                </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
                <Calculator className="text-secondary w-8 h-8" />
                <h1 className="text-3xl font-bold">Calculadora Bandas PVC</h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* CONFIGURADOR (Componente Reutilizable) */}
                <div className="xl:col-span-1">
                    <CalculadoraBandas onAddItem={handleAddItem} />
                </div>

                {/* LISTADO */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="stats shadow w-full border border-base-200">
                        <div className="stat place-items-end">
                            <div className="stat-title">Total Presupuesto</div>
                            <div className="stat-value text-secondary">{formatCurrency(totales.precio)}</div>
                            <div className="stat-desc text-secondary">{formatWeight(totales.peso)} Kg</div>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="table w-full">
                                <thead className="bg-base-200">
                                    <tr>
                                        <th>Descripción</th>
                                        <th>Medidas</th>
                                        <th>Cant</th>
                                        <th className="text-right">Unitario</th>
                                        <th className="text-right">Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsAgregados.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-gray-400">No hay bandas añadidas</td></tr>
                                    ) : (
                                        itemsAgregados.map(item => (
                                            <tr key={item.id} className="hover">
                                                <td className="font-semibold">{item.descripcion}</td>
                                                <td className="font-mono text-xs">{item.medidas}</td>
                                                <td className="font-bold">{item.unidades}</td>
                                                <td className="text-right">{formatCurrency(item.precioUnitario)}</td>
                                                <td className="text-right font-bold text-secondary">{formatCurrency(item.precioTotal)}</td>
                                                <td>
                                                    <button className="btn btn-ghost btn-xs text-error" onClick={() => setItemsAgregados(prev => prev.filter(i => i.id !== item.id))}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
