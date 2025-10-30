
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
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Archivos JSON</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {message && !error && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4" role="alert">
          <p>{message}</p>
        </div>
      )}

      <div className="flex space-x-6">
        <div className="w-1/3 bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Archivos JSON Disponibles</h2>
          <ul className="space-y-2">
            {jsonFiles.map((file) => (
              <li key={file.path}>
                <button
                  onClick={() => fetchFileContent(file.name)}
                  className={`w-full text-left p-2 rounded-md transition-colors duration-200
                    ${selectedFile === file.name ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 text-gray-800'}`}
                >
                  {file.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-2/3 bg-white shadow-md rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Editar Contenido</h2>
          {selectedFile ? (
            <div>
              <p className="text-gray-600 mb-2">Editando: <span className="font-medium">{selectedFile}</span></p>
              {isTableEditable ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr>{tableColumns.map(col => (
                          <th key={col} className="py-2 px-4 border-b border-gray-300 bg-gray-100 text-left text-sm font-semibold text-gray-600">{col}</th>
                        ))}<th className="py-2 px-4 border-b border-gray-300 bg-gray-100"></th></tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, rowIndex) => (
                        <tr key={rowIndex}>{tableColumns.map(col => (
                            <td key={col} className="py-2 px-4 border-b border-gray-300">
                              <input
                                type="text"
                                value={row[col] || ''}
                                onChange={(e) => handleTableCellChange(rowIndex, col, e.target.value)}
                                className="w-full p-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            </td>
                          ))}<td className="py-2 px-4 border-b border-gray-300">
                            <button
                              onClick={() => handleDeleteRow(rowIndex)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
                            >
                              Eliminar
                            </button>
                          </td></tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={handleAddRow}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                className="mt-4 px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
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
  );
};

export default GestionJsonPage;
