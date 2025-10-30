'use client';

import { useState, useEffect, useMemo } from 'react';
import { FaCalculator, FaRulerCombined, FaLayerGroup, FaTh, FaHashtag, FaPlus, FaTrash, FaFilePdf } from 'react-icons/fa';
import { formatCurrency, formatWeight } from "@/utils/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function CalculadoraPage() {
    // Estado para los datos y la UI
    const [datosMateriales, setDatosMateriales] = useState([]);
    const [error, setError] = useState(null);
    const [historial, setHistorial] = useState([]);

    // Estado de los inputs del formulario
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [selectedEspesor, setSelectedEspesor] = useState('');
    const [largo, setLargo] = useState(''); // en mm
    const [ancho, setAncho] = useState(''); // en mm
    const [cantidad, setCantidad] = useState(1);

    // Cargar historial desde localStorage
    useEffect(() => {
        try {
            const historialGuardado = JSON.parse(localStorage.getItem('calculosHistorial')) || [];
            setHistorial(historialGuardado);
        } catch (e) {
            console.error("Error al cargar el historial de localStorage", e);
            setHistorial([]);
        }
    }, []);

    // Cargar datos de precios.json al montar el componente
    useEffect(() => {
        const fetchMateriales = async () => {
            try {
                const response = await fetch('/api/precios');
                if (!response.ok) {
                    throw new Error('No se pudo cargar el archivo de precios.');
                }
                const data = await response.json();
                setDatosMateriales(data);
            } catch (error) {
                console.error('Error fetching materiales:', error);
                setError(error.message);
            }
        };
        fetchMateriales();
    }, []);

    // Guardar historial en localStorage
    useEffect(() => {
        localStorage.setItem('calculosHistorial', JSON.stringify(historial));
    }, [historial]);

    // Listas para los selects, calculadas a partir de los datos
    const materialesUnicos = useMemo(() => [...new Set(datosMateriales.map(item => item.material))], [datosMateriales]);
    const espesoresDisponibles = useMemo(() => {
        if (selectedMaterial) {
            return datosMateriales
                .filter(item => item.material === selectedMaterial)
                .map(item => item.espesor);
        }
        return [];
    }, [selectedMaterial, datosMateriales]);

    // Resetear espesor si el material cambia
    useEffect(() => {
        if (selectedMaterial) {
            setSelectedEspesor('');
        }
    }, [selectedMaterial]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const item = datosMateriales.find(
            d => d.material === selectedMaterial && d.espesor == selectedEspesor
        );

        if (item) {
            const anchoMM = parseFloat(ancho);
            const largoMM = parseFloat(largo);
            const cant = parseInt(cantidad, 10);

            const areaM2 = (anchoMM / 1000) * (largoMM / 1000);

            const precioIndividual = areaM2 * item.precio;
            const pesoIndividual = areaM2 * item.peso;

            const precioTotal = precioIndividual * cant;
            const pesoTotal = pesoIndividual * cant;

            const calculo = {
                id: Date.now(),
                material: selectedMaterial,
                espesor: selectedEspesor,
                anchoMM,
                largoMM,
                cantidad: cant,
                precioIndividual,
                pesoIndividual,
                precioTotal,
                pesoTotal
            };

            setHistorial(prev => [...prev, calculo]);

            // Reset form
            setSelectedMaterial('');
            setSelectedEspesor('');
            setAncho('');
            setLargo('');
            setCantidad(1);
        }
    };

    const handleBorrarFila = (id) => {
        setHistorial(historial.filter(item => item.id !== id));
    };

    const handleBorrarHistorial = () => {
        if (window.confirm('¿Estás seguro de que quieres borrar todo el historial?')) {
            setHistorial([]);
        }
    };

    const handleExportarPDF = () => {
        if (historial.length === 0) {
            alert('No hay cálculos en el historial para exportar.');
            return;
        }

        const doc = new jsPDF();
        const granTotalPrecio = historial.reduce((sum, calculo) => sum + calculo.precioTotal, 0);
        const currentDate = new Date().toLocaleDateString('es-ES');

        // Título y Fecha
        doc.setFontSize(22);
        doc.setTextColor(40, 167, 69); // Color primario de DaisyUI (aproximado)
        doc.text("Presupuesto de Piezas", 14, 22);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Fecha: ${currentDate}`, 14, 30);

        // Tabla
        const head = [["Material", "Espesor", "Dimensiones", "Cant.", "Precio Ind.", "Precio Total"]];
        const body = historial.map(item => [
            item.material,
            item.espesor,
            `${item.anchoMM}x${item.largoMM} mm`,
            item.cantidad,
            formatCurrency(item.precioIndividual),
            formatCurrency(item.precioTotal)
        ]);

        autoTable(doc, { startY: 40, head, body, theme: 'striped', headStyles: { fillColor: [40, 167, 69] } });

        // Total
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(14);
        doc.text(`Total Presupuesto: ${formatCurrency(granTotalPrecio)}`, 140, finalY + 15, { align: 'right' });

        doc.save(`Presupuesto faldetas ${currentDate.replace(/\//g, '-')}.pdf`);
    };

    const { granTotalPrecio, granTotalPeso } = useMemo(() => {
        return historial.reduce((acc, item) => {
            acc.granTotalPrecio += item.precioTotal;
            acc.granTotalPeso += item.pesoTotal;
            return acc;
        }, { granTotalPrecio: 0, granTotalPeso: 0 });
    }, [historial]);

    if (error) {
        return <div className="p-8 text-center text-error">Error: {error}</div>;
    }

    if (datosMateriales.length === 0) {
        return <div className="p-8 text-center">Cargando datos de materiales...</div>;
    }

    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaCalculator /> Calculadora de Piezas
            </h1>

            {/* Formulario de entrada */}
            <div className="card bg-base-100 shadow-xl mb-8">
                <form onSubmit={handleSubmit} className="card-body">
                    <h2 className="card-title mb-4">Añadir Pieza al Presupuesto</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="form-control w-full">
                            <div className="label"><span className="label-text flex items-center gap-2"><FaLayerGroup /> Material</span></div>
                            <select className="select select-bordered" value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} required>
                                <option value="" disabled>Selecciona un material</option>
                                {materialesUnicos.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </label>
                        <label className="form-control w-full">
                            <div className="label"><span className="label-text flex items-center gap-2"><FaTh /> Espesor</span></div>
                            <select className="select select-bordered" value={selectedEspesor} onChange={(e) => setSelectedEspesor(e.target.value)} disabled={!selectedMaterial} required>
                                <option value="" disabled>Selecciona un espesor</option>
                                {espesoresDisponibles.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </label>
                        <label className="form-control w-full">
                            <div className="label"><span className="label-text flex items-center gap-2"><FaRulerCombined /> Largo (mm)</span></div>
                            <input type="number" placeholder="Ej: 1200" className="input input-bordered w-full" value={largo} onChange={(e) => setLargo(e.target.value)} required min="1" />
                        </label>
                        <label className="form-control w-full">
                            <div className="label"><span className="label-text flex items-center gap-2"><FaRulerCombined /> Ancho (mm)</span></div>
                            <input type="number" placeholder="Ej: 800" className="input input-bordered w-full" value={ancho} onChange={(e) => setAncho(e.target.value)} required min="1" />
                        </label>
                        <label className="form-control w-full">
                            <div className="label"><span className="label-text flex items-center gap-2"><FaHashtag /> Cantidad</span></div>
                            <input type="number" className="input input-bordered w-full" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required min="1" />
                        </label>
                        <div className="form-control w-full md:col-span-2 lg:col-span-1 self-end">
                            <button type="submit" className="btn btn-primary w-full"><FaPlus /> Añadir al Presupuesto</button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Historial y Totales */}
            {historial.length > 0 && (
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h2 className="card-title mb-4">Historial del Presupuesto</h2>
                        <div className="overflow-x-auto">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Material</th>
                                        <th>Espesor</th>
                                        <th>Dimensiones</th>
                                        <th className="text-center">Cant.</th>
                                        <th className="text-right">Precio Ind.</th>
                                        <th className="text-right">Peso Ind.</th>
                                        <th className="text-right">Precio Total</th>
                                        <th className="text-right">Peso Total</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historial.map((calculo) => (
                                        <tr key={calculo.id} className="hover">
                                            <td>{calculo.material}</td>
                                            <td>{calculo.espesor}</td>
                                            <td>{`${calculo.anchoMM}x${calculo.largoMM} mm`}</td>
                                            <td className="text-center">{calculo.cantidad}</td>
                                            <td className="text-right font-mono">{formatCurrency(calculo.precioIndividual)}</td>
                                            <td className="text-right font-mono">{formatWeight(calculo.pesoIndividual)}</td>
                                            <td className="text-right font-mono font-bold">{formatCurrency(calculo.precioTotal)}</td>
                                            <td className="text-right font-mono font-bold">{formatWeight(calculo.pesoTotal)}</td>
                                            <td className="text-center">
                                                <button onClick={() => handleBorrarFila(calculo.id)} className="btn btn-ghost btn-xs"><FaTrash /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold text-base">
                                        <td colSpan="6">Totales</td>
                                        <td className="text-right text-primary">{formatCurrency(granTotalPrecio)}</td>
                                        <td className="text-right text-secondary">{formatWeight(granTotalPeso)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="card-actions justify-end mt-6 gap-2">
                            <button onClick={handleBorrarHistorial} className="btn btn-error btn-outline"><FaTrash /> Borrar Historial</button>
                            <button onClick={handleExportarPDF} className="btn btn-accent"><FaFilePdf /> Exportar a PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default CalculadoraPage;
