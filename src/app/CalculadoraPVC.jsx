import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const CalculadoraPVC = () => {
  const [datosPVC, setDatosPVC] = useState(null);
  const [colores, setColores] = useState([]);
  const [espesores, setEspesores] = useState([]);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedEspesor, setSelectedEspesor] = useState('');
  const [ancho, setAncho] = useState('');
  const [largo, setLargo] = useState('');
  const [union, setUnion] = useState(false);
  const [unionTipo, setUnionTipo] = useState('vulcanizado');
  const [tacos, setTacos] = useState(false);
  const [tacosTipo, setTacosTipo] = useState('recto');
  const [cantidadTacos, setCantidadTacos] = useState(1);
  const [altoTaco, setAltoTaco] = useState('');
  const [largoTaco, setLargoTaco] = useState('');
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    const fetchDatosPVC = async () => {
      try {
        const response = await fetch('/data/precios-pvc.json');
        const data = await response.json();
        setDatosPVC(data[0]);
        const coloresUnicos = [...new Set(data[0].bandas.map(item => item.color))];
        setColores(coloresUnicos);
      } catch (error) {
        console.error('Error fetching datos PVC:', error);
      }
    };
    fetchDatosPVC();

    const historialGuardado = JSON.parse(localStorage.getItem('calculosPvcHistorial')) || [];
    setHistorial(historialGuardado);
  }, []);

  useEffect(() => {
    if (selectedColor && datosPVC) {
      const espesoresFiltrados = datosPVC.bandas
        .filter(item => item.color === selectedColor)
        .map(item => item.espesor_mm);
      setEspesores(espesoresFiltrados);
      setSelectedEspesor('');
    } else {
      setEspesores([]);
    }
  }, [selectedColor, datosPVC]);

  useEffect(() => {
    localStorage.setItem('calculosPvcHistorial', JSON.stringify(historial));
  }, [historial]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!datosPVC) return;

    const color = selectedColor;
    const espesor = parseFloat(selectedEspesor);
    const anchoVal = parseFloat(ancho);
    const largoVal = parseFloat(largo);

    let precioTotal = 0;
    let costoBanda = 0;
    let costoUnion = 0;
    let costoTacos = 0;
    let costoCorte = 0;

    const bandaItem = datosPVC.bandas.find(b => b.color === color && b.espesor_mm === espesor);
    if (!bandaItem) {
      alert('Error: No se encontró el precio para el material y espesor seleccionados.');
      return;
    }
    costoBanda = (anchoVal / 1000) * (largoVal / 1000) * bandaItem.precio_m2;

    if (datosPVC.procesos.corte) {
      const corteAncho = datosPVC.procesos.corte.precio_por_corte;
      const corteLargo = datosPVC.procesos.corte.precio_por_corte;
      costoCorte = corteAncho + corteLargo;
    }

    if (union) {
      if (unionTipo === 'vulcanizado') {
        costoUnion = (anchoVal / 100) * datosPVC.procesos.union.vulcanizado.precio_por_100mm_ancho;
      } else if (unionTipo === 'grapa') {
        const tipoGrapa = datosPVC.procesos.union.grapa.tipos.find(g => anchoVal <= g.ancho_mm);
        if (tipoGrapa) {
          costoUnion = tipoGrapa.precio;
        }
      }
    }

    if (tacos) {
      const cantidadTacosVal = parseInt(cantidadTacos, 10);
      const largoTacoVal = parseFloat(largoTaco);
      const tacoTipoData = datosPVC.procesos.tacos.tipos.find(t => t.tipo === tacosTipo);
      if (tacoTipoData) {
        const precioBarra = (largoTacoVal / 1000) * tacoTipoData.precio_por_metro;
        const costoFijoTacos = cantidadTacosVal * datosPVC.procesos.tacos.coste_fijo_por_taco;
        costoTacos = (precioBarra * cantidadTacosVal) + costoFijoTacos;
      }
    }

    precioTotal = costoBanda + costoCorte + costoUnion + costoTacos;

    const calculo = {
      id: Date.now(),
      color,
      espesor_mm: espesor,
      ancho: anchoVal,
      largo: largoVal,
      unionTipo: union ? unionTipo : null,
      tacosTipo: tacos ? tacosTipo : null,
      costoBanda,
      costoCorte,
      costoUnion,
      costoTacos,
      precioTotal
    };

    setHistorial([...historial, calculo]);

    // Reset form
    setSelectedColor('');
    setSelectedEspesor('');
    setAncho('');
    setLargo('');
    setUnion(false);
    setTacos(false);
  };
  
  const handleBorrarHistorial = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar el historial?')) {
        setHistorial([]);
    }
  };

  const handleBorrarFila = (id) => {
    setHistorial(historial.filter(item => item.id !== id));
  };

  const handleExportarPDF = () => {
    if (historial.length === 0) {
        alert('No hay cálculos en el historial para exportar.');
        return;
    }

    const doc = new jsPDF();
    const granTotal = historial.reduce((sum, calculo) => sum + calculo.precioTotal, 0);
    const currentDate = new Date().toLocaleDateString('es-ES');

    doc.setFontSize(22);
    doc.setTextColor("#384d33");
    doc.text("Presupuesto de Bandas de PVC", 20, 20);

    doc.setFontSize(12);
    doc.setTextColor("#333333");
    doc.text(`Fecha: ${currentDate}`, 20, 30);
    
    const head = [['Material', 'Medidas', 'Unión', 'Tacos', 'Subtotal']];
    const body = historial.map(item => [
        `${item.color} ${item.espesor_mm}mm`,
        `${item.ancho}x${item.largo} mm`,
        item.unionTipo || 'No',
        item.tacosTipo || 'No',
        formatCurrency(item.precioTotal)
    ]);

    doc.autoTable({
        startY: 50,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: '#5c7a52' },
        styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
    });

    const finalY = doc.autoTable.previous.finalY;
    doc.setFontSize(12);
    doc.text(`Total Presupuesto: ${formatCurrency(granTotal)}`, 140, finalY + 20);

    doc.save(`Presupuesto_PVC_${currentDate}.pdf`);
  };

  const granTotal = historial.reduce((sum, calculo) => sum + calculo.precioTotal, 0);

  return (
    <div>
      <section className="section">
        <h2>Datos de la Banda</h2>
        <form id="pvc-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="color-select">Color</label>
            <select id="color-select" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} required>
              <option value="">-- Selecciona un color --</option>
              {colores.map(color => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="espesor-select">Espesor (mm)</label>
            <select id="espesor-select" value={selectedEspesor} onChange={(e) => setSelectedEspesor(e.target.value)} required disabled={!selectedColor}>
              <option value="">-- Selecciona un espesor --</option>
              {espesores.map(espesor => (
                <option key={espesor} value={espesor}>{espesor}mm</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ancho">Ancho (mm)</label>
            <input type="number" id="ancho" value={ancho} onChange={(e) => setAncho(e.target.value)} required min="1" />
          </div>
          <div>
            <label htmlFor="largo">Largo (mm)</label>
            <input type="number" id="largo" value={largo} onChange={(e) => setLargo(e.target.value)} required min="1" />
          </div>

          <div className="opciones-adicionales">
            <h3>Procesos y Suplementos</h3>
            <div>
              <input type="checkbox" id="union" checked={union} onChange={(e) => setUnion(e.target.checked)} />
              <label htmlFor="union">Unión de Puntas</label>
            </div>
            {union && (
              <div id="union-subapartado">
                <label htmlFor="union-tipo">Tipo de Unión</label>
                <select id="union-tipo" value={unionTipo} onChange={(e) => setUnionTipo(e.target.value)}>
                  <option value="vulcanizado">Vulcanizado</option>
                  <option value="grapa">Grapa</option>
                </select>
              </div>
            )}
            <div>
              <input type="checkbox" id="tacos" checked={tacos} onChange={(e) => setTacos(e.target.checked)} />
              <label htmlFor="tacos">Añadir Tacos</label>
            </div>
            {tacos && (
              <div id="tacos-subapartado">
                <label htmlFor="tacos-tipo">Tipo de Taco</label>
                <select id="tacos-tipo" value={tacosTipo} onChange={(e) => setTacosTipo(e.target.value)}>
                  <option value="recto">Recto</option>
                  <option value="inclinado">Inclinado</option>
                </select>
                <label htmlFor="cantidad-tacos">Cantidad de Tacos</label>
                <input type="number" id="cantidad-tacos" value={cantidadTacos} onChange={(e) => setCantidadTacos(e.target.value)} min="1" />
                <label htmlFor="alto-taco">Alto del Taco (mm)</label>
                <input type="number" id="alto-taco" value={altoTaco} onChange={(e) => setAltoTaco(e.target.value)} min="1" />
                <label htmlFor="largo-taco">Largo del Taco (mm)</label>
                <input type="number" id="largo-taco" value={largoTaco} onChange={(e) => setLargoTaco(e.target.value)} min="1" />
              </div>
            )}
          </div>

          <button type="submit">Calcular y Añadir</button>
        </form>
      </section>
      
      {historial.length > 0 && (
        <section id="historial-pvc-seccion" className="section">
          <h2>Historial de Cálculos</h2>
          <table id="historial-pvc">
            <thead>
              <tr>
                <th>Material</th>
                <th>Medidas</th>
                <th>Unión</th>
                <th>Tacos</th>
                <th>Subtotal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((calculo) => (
                <tr key={calculo.id}>
                  <td>{`${calculo.color} ${calculo.espesor_mm}mm`}</td>
                  <td>{`${calculo.ancho}x${calculo.largo} mm`}</td>
                  <td>{calculo.unionTipo || 'No'}</td>
                  <td>{calculo.tacosTipo || 'No'}</td>
                  <td>{formatCurrency(calculo.precioTotal)}</td>
                  <td><button onClick={() => handleBorrarFila(calculo.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="totales">
            <p>Total Presupuesto: <span>{formatCurrency(granTotal)}</span></p>
          </div>
          
          <div className="botones-historial">
            <button onClick={handleBorrarHistorial}>Borrar Historial</button>
            <button onClick={handleExportarPDF}>Exportar Presupuesto a PDF</button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CalculadoraPVC;