import React, { useState, useEffect } from 'react';

const Procesos = () => {
  const [datosProcesos, setDatosProcesos] = useState([]);
  const [procesosPrincipales, setProcesosPrincipales] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [espesores, setEspesores] = useState([]);

  const [selectedProceso, setSelectedProceso] = useState('');
  const [selectedMaquina, setSelectedMaquina] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedEspesor, setSelectedEspesor] = useState('');
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    const fetchProcesos = async () => {
      try {
        const response = await fetch('/data/procesos.json');
        const data = await response.json();
        setDatosProcesos(data);
        const procesosUnicos = [...new Set(data.map(p => p.procesoPrincipal))];
        setProcesosPrincipales(procesosUnicos);
      } catch (error) {
        console.error('Error fetching procesos:', error);
      }
    };
    fetchProcesos();
  }, []);

  useEffect(() => {
    if (selectedProceso) {
      const maquinasFiltradas = [...new Set(datosProcesos
        .filter(p => p.procesoPrincipal === selectedProceso)
        .map(p => p.maquina))];
      setMaquinas(maquinasFiltradas);
      setSelectedMaquina('');
      setMateriales([]);
      setSelectedMaterial('');
      setEspesores([]);
      setSelectedEspesor('');
      setDetalle(null);
    }
  }, [selectedProceso, datosProcesos]);

  useEffect(() => {
    if (selectedMaquina) {
      const materialesFiltrados = [...new Set(datosProcesos
        .filter(p => p.procesoPrincipal === selectedProceso && p.maquina === selectedMaquina)
        .map(p => p.material))];
      setMateriales(materialesFiltrados);
      setSelectedMaterial('');
      setEspesores([]);
      setSelectedEspesor('');
      setDetalle(null);
    }
  }, [selectedMaquina, selectedProceso, datosProcesos]);

  useEffect(() => {
    if (selectedMaterial) {
      const espesoresFiltrados = [...new Set(datosProcesos
        .filter(p => p.procesoPrincipal === selectedProceso && p.maquina === selectedMaquina && p.material === selectedMaterial)
        .map(p => p.espesor))];
      setEspesores(espesoresFiltrados);
      setSelectedEspesor('');
      setDetalle(null);
    }
  }, [selectedMaterial, selectedMaquina, selectedProceso, datosProcesos]);

  useEffect(() => {
    if (selectedEspesor) {
      const detalleSeleccionado = datosProcesos.find(d =>
        d.procesoPrincipal === selectedProceso &&
        d.maquina === selectedMaquina &&
        d.material === selectedMaterial &&
        d.espesor === selectedEspesor
      );
      setDetalle(detalleSeleccionado);
    }
  }, [selectedEspesor, selectedMaterial, selectedMaquina, selectedProceso, datosProcesos]);

  return (
    <div className="section">
      <h2>Procesos</h2>
      <div className="filtros-procesos">
        <select value={selectedProceso} onChange={(e) => setSelectedProceso(e.target.value)}>
          <option value="">Selecciona un proceso...</option>
          {procesosPrincipales.map(proceso => (
            <option key={proceso} value={proceso}>{proceso}</option>
          ))}
        </select>
        <select value={selectedMaquina} onChange={(e) => setSelectedMaquina(e.target.value)} disabled={!selectedProceso}>
          <option value="">Selecciona una máquina...</option>
          {maquinas.map(maquina => (
            <option key={maquina} value={maquina}>{maquina}</option>
          ))}
        </select>
        <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} disabled={!selectedMaquina}>
          <option value="">Selecciona un material...</option>
          {materiales.map(material => (
            <option key={material} value={material}>{material}</option>
          ))}
        </select>
        <select value={selectedEspesor} onChange={(e) => setSelectedEspesor(e.target.value)} disabled={!selectedMaterial}>
          <option value="">Selecciona un espesor...</option>
          {espesores.map(espesor => (
            <option key={espesor} value={espesor}>{espesor}</option>
          ))}
        </select>
      </div>

      {detalle && (
        <div id="info-panel">
          <h3>Detalles del Proceso</h3>
          <table>
            <tbody>
              {Object.entries(detalle).map(([clave, valor]) => (
                <tr key={clave}>
                  <th>{clave}</th>
                  <td>{Array.isArray(valor) ? valor.join(', ') : valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Procesos;