
'use client';

import React, { useEffect, useState } from 'react';

const GestionJsonPage = () => {
  const [jsonFiles, setJsonFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isTableEditable, setIsTableEditable] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);

  const fileDisplayNames = {
    'contenedores.json': 'Gestión de Contenedores',
    'fabricantes.json': 'Gestión de Fabricantes',
    'materiales.json': 'Gestión de Materiales',
    'movimientos.json': 'Gestión de Movimientos',
    'pedidos-clientes.json': 'Gestión de Pedidos de Clientes',
    'pedidos-proveedores.json': 'Gestión de Pedidos de Proveedores',
    'pedidos.json': 'Gestión de Pedidos',
    'plantillas.json': 'Gestión de Plantillas',
    'precios-pvc.json': 'Gestión de Precios PVC',
    'precios.json': 'Gestión de Precios',
    'procesos.json': 'Gestión de Procesos',
    'stock.json': 'Gestión de Stock',
  };

  useEffect(() => {
    fetchJsonFiles();
  }, []);

  const fetchJsonFiles = async () => {
    try {
      const response = await fetch('/api/edit-json?action=list');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}. Details: ${errorData.details || errorData.error}`);
      }
      const files = await response.json();
      setJsonFiles(files);
    } catch (err) {
      console.error("Error fetching JSON files:", err);
      setError(`Error al cargar la lista de archivos JSON: ${err.message}`);
      setMessage('');
    }
  };

  const fetchFileContent = async (filename) => {
    setError('');
    setMessage('');
    setIsTableEditable(false);
    setTableData([]);
    setTableColumns([]);
    try {
      const response = await fetch(`/api/edit-json?action=read&filename=${filename}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}. Details: ${errorData.details || errorData.error}`);
      }
      const data = await response.json();
      const content = data.content;

      // Check if content is an array of objects for table editing
      if (Array.isArray(content) && content.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
        setIsTableEditable(true);
        setTableData(content);
        // Determine columns from all unique keys in the array of objects
        const allKeys = new Set();
        content.forEach(item => {
          Object.keys(item).forEach(key => allKeys.add(key));
        });
        setTableColumns(Array.from(allKeys));
        setFileContent(JSON.stringify(content, null, 2)); // Keep textarea content updated as well
      } else {
        setIsTableEditable(false);
        setFileContent(JSON.stringify(content, null, 2));
      }
      setSelectedFile(filename);
    } catch (err) {
      console.error("Error fetching file content:", err);
      setError(`Error al cargar el contenido del archivo: ${err.message}`);
      setMessage('');
    }
  };

  const handleSaveContent = async () => {
    if (!selectedFile) return;

    setError('');
    setMessage('Guardando...');
    try {
      let contentToSave;
      if (isTableEditable) {
        contentToSave = tableData;
      } else {
        contentToSave = JSON.parse(fileContent);
      }

      const response = await fetch(`/api/edit-json?action=write&filename=${selectedFile}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: contentToSave }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}. Details: ${errorData.details || errorData.error}`);
      }

      const result = await response.json();
      setMessage(result.message || 'Archivo guardado correctamente.');
    } catch (err) {
      console.error("Error saving file content:", err);
      setError(`Error al guardar el archivo: ${err.message}`);
      setMessage('');
    }
  };

  const handleTableCellChange = (rowIndex, columnKey, value) => {
    const updatedTableData = [...tableData];
    updatedTableData[rowIndex] = { ...updatedTableData[rowIndex], [columnKey]: value };
    setTableData(updatedTableData);
    setFileContent(JSON.stringify(updatedTableData, null, 2)); // Keep textarea content in sync
  };

  const handleAddRow = () => {
    const newRow = {};
    tableColumns.forEach(col => newRow[col] = ''); // Initialize with empty strings
    setTableData([...tableData, newRow]);
    setFileContent(JSON.stringify([...tableData, newRow], null, 2)); // Keep textarea content in sync
  };

  const handleDeleteRow = (rowIndex) => {
    const updatedTableData = tableData.filter((_, index) => index !== rowIndex);
    setTableData(updatedTableData);
    setFileContent(JSON.stringify(updatedTableData, null, 2)); // Keep textarea content in sync
  };

  return (
    <div className="p-6 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-primary">Gestión de Datos del Sistema</h1>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Error: {error}</span>
        </div>
      )}

      {message && !error && (
        <div className="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>{message}</span>
        </div>
      )}

      <div className="flex space-x-6">
        <div className="w-1/3 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Archivos JSON Disponibles</h2>
          <ul className="space-y-2">
            {jsonFiles.map((file) => (
              <li key={file.path}>
                <button
                  onClick={() => fetchFileContent(file.name)}
                  className={`w-full text-left p-2 rounded-md transition-colors duration-200 btn btn-ghost
                    ${selectedFile === file.name ? 'btn-primary' : ''}`}
                >
                  {fileDisplayNames[file.name] || file.name}
                </button>
              </li>
            ))}
          </ul>
          </div>
        </div>

        <div className="w-2/3 card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Editar Contenido</h2>
          {selectedFile ? (
            <div>
              <p className="text-gray-600 mb-2">Editando: <span className="font-medium">{selectedFile}</span></p>
              {isTableEditable ? (
                <div className="overflow-x-auto">
                  <table className="table table-zebra table-pin-rows min-w-full">
                    <thead>
                      <tr>{tableColumns.map(col => (
                          <th key={col} className="py-3 px-4 bg-base-200 text-left text-sm font-semibold text-base-content">{col}</th>
                        ))}<th className="py-3 px-4 bg-base-200"></th></tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, rowIndex) => (
                        <tr key={rowIndex}>{tableColumns.map(col => (
                            <td key={col} className="py-2 px-4 border-b border-base-300">
                              <input
                                type="text"
                                value={row[col] || ''}
                                onChange={(e) => handleTableCellChange(rowIndex, col, e.target.value)}
                                className="input input-bordered input-sm w-full"
                              />
                            </td>
                          ))}<td className="py-2 px-4 border-b border-base-300">
                            <button
                              onClick={() => handleDeleteRow(rowIndex)}
                              className="btn btn-error btn-sm"
                            >
                              Eliminar
                            </button>
                          </td></tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={handleAddRow}
                    className="mt-4 btn btn-secondary"
                  >
                    Añadir Fila
                  </button>
                </div>
              ) : (
                <textarea
                  className="w-full h-96 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  spellCheck="false"
                />
              )}
              <button
                onClick={handleSaveContent}
                className="mt-4 btn btn-primary"
              >
                Guardar Cambios
              </button>
            </div>
          ) : (
            <p className="text-gray-500">Selecciona un archivo de la lista para editar.</p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionJsonPage;
