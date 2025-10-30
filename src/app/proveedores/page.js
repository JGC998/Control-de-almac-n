'use client';

import { useState, useEffect } from 'react';
import { FaTruck, FaPlus, FaTrash, FaCalculator, FaEuroSign, FaCheck, FaUndo } from 'react-icons/fa';

function PedidosProveedoresPage() {
    const [pedidos, setPedidos] = useState([]);
    const [proveedor, setProveedor] = useState(''); // Common provider for both types
    const [material, setMaterial] = useState(''); // General description for the order (used for container, or as a fallback for national)

    // State for National Order specific fields
    const [commonMaterial, setCommonMaterial] = useState(''); // Material common to all coils in a national order
    const [nationalExpenses, setNationalExpenses] = useState([{ description: '', amount: '' }]); // Array of expenses for national order
    const [nationalCoils, setNationalCoils] = useState([{ pricePerLinearMeter: '', length: '', width: '', attribute: '', espesor: '' }]);
    const [calculatedNationalCoilCosts, setCalculatedNationalCoilCosts] = useState(null); // Stores array of coils with final calculated prices

    // State for Container Order specific fields
    const [orderType, setOrderType] = useState('Nacional'); // 'Nacional' or 'Contenedor'
    const [costUSD, setCostUSD] = useState('');
    const [conversionRate, setConversionRate] = useState('');
    const [containerExpenses, setContainerExpenses] = useState([{ description: '', amount: '' }]);
    const [containerCoils, setContainerCoils] = useState([{ quantity: '', totalMeters: '', material: '', espesor: '' }]); // Renamed from 'coils'
    const [calculatedContainerCostPerMeter, setCalculatedContainerCostPerMeter] = useState(null); // Renamed from 'calculatedCostPerMeter'

    const [materialsList, setMaterialsList] = useState([]);

    useEffect(() => {
        const fetchPedidos = async () => {
            try {
                const response = await fetch('/api/pedidos-proveedores-data');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setPedidos(data);
            } catch (error) {
                console.error("Error fetching pedidos proveedores data:", error);
                setPedidos([]);
            }
        };
        fetchPedidos();

        const fetchMaterials = async () => {
            try {
                const response = await fetch('/data/materiales.json'); // Now fetching from public/data
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setMaterialsList(data);
            } catch (error) {
                console.error("Error fetching materials data:", error);
                setMaterialsList([
                    { id: "pvc", nombre: "PVC" },
                    { id: "pet", nombre: "PET" },
                    { id: "pp", nombre: "PP" },
                    { id: "aluminio", nombre: "Aluminio" }
                ]);
            }
        };
        fetchMaterials();
    }, []);

    useEffect(() => {
        handleCalculateNationalCoilCosts(); // Trigger calculation on changes
    }, [nationalCoils, nationalExpenses]);

    useEffect(() => {
        handleCalculateContainerCosts(); // Trigger calculation on changes
    }, [containerCoils, costUSD, conversionRate, containerExpenses]);

    const savePedidosToApi = async (updatedPedidos) => {
        try {
            const response = await fetch('/api/pedidos-proveedores-data', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedPedidos),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log("Pedidos proveedores data saved successfully!");
        } catch (error) {
            console.error("Error saving pedidos proveedores data:", error);
            alert("Error al guardar los pedidos de proveedores.");
        }
    };

    useEffect(() => {
        if (pedidos.length > 0) { // Only save if there are actual pedidos to save
            savePedidosToApi(pedidos);
        }
    }, [pedidos]);

    // Handlers for Container Coil list
    const handleContainerCoilChange = (index, field, value) => {
        const newCoils = [...containerCoils];
        newCoils[index][field] = value;
        setContainerCoils(newCoils);
    };

    const addContainerCoil = () => {
        setContainerCoils([...containerCoils, { quantity: '', totalMeters: '', material: '', espesor: '' }]);
    };

    const removeContainerCoil = (index) => {
        const newCoils = containerCoils.filter((_, i) => i !== index);
        setContainerCoils(newCoils);
    };

    // Handlers for Container Expenses list
    const handleContainerExpenseChange = (index, field, value) => {
        const newExpenses = [...containerExpenses];
        newExpenses[index][field] = value;
        setContainerExpenses(newExpenses);
    };

    const addContainerExpense = () => {
        setContainerExpenses([...containerExpenses, { description: '', amount: '' }]);
    };

    const removeContainerExpense = (index) => {
        const newExpenses = containerExpenses.filter((_, i) => i !== index);
        setContainerExpenses(newExpenses);
    };

    // Handlers for National Coil list
    const handleNationalCoilChange = (index, field, value) => {
        const newCoils = [...nationalCoils];
        newCoils[index][field] = value;
        setNationalCoils(newCoils);
    };

    const addNationalCoil = () => {
        setNationalCoils([...nationalCoils, { pricePerLinearMeter: '', length: '', width: '', attribute: '' }]);
    };

    const removeNationalCoil = (index) => {
        const newCoils = nationalCoils.filter((_, i) => i !== index);
        setNationalCoils(newCoils);
    };

    // Handlers for National Expenses list
    const handleNationalExpenseChange = (index, field, value) => {
        const newExpenses = [...nationalExpenses];
        newExpenses[index][field] = value;
        setNationalExpenses(newExpenses);
    };

    const addNationalExpense = () => {
        setNationalExpenses([...nationalExpenses, { description: '', amount: '' }]);
    };

    const removeNationalExpense = (index) => {
        const newExpenses = nationalExpenses.filter((_, i) => i !== index);
        setNationalExpenses(newExpenses);
    };

    // Cost calculation logic for Contenedor
    const handleCalculateContainerCosts = () => {
        const parsedCostUSD = parseFloat(costUSD);
        const parsedConversionRate = parseFloat(conversionRate);
        
        const totalContainerExpenses = containerExpenses.reduce((sum, expense) => {
            const amount = parseFloat(expense.amount);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        const validCostUSD = isNaN(parsedCostUSD) || parsedCostUSD < 0 ? 0 : parsedCostUSD;
        const validConversionRate = isNaN(parsedConversionRate) || parsedConversionRate < 0 ? 0 : parsedConversionRate;

        let totalLinearMeters = 0;
        const validCoils = containerCoils.filter(coil => {
            const meters = parseFloat(coil.totalMeters);
            return !isNaN(meters) && meters > 0;
        });

        if (validCoils.length === 0) {
            setCalculatedContainerCostPerMeter(null);
            return;
        }

        totalLinearMeters = validCoils.reduce((sum, coil) => sum + parseFloat(coil.totalMeters), 0);

        const costEUR = validCostUSD * validConversionRate;
        const totalExpensesEUR = costEUR + totalContainerExpenses;
        const costPerMeter = totalExpensesEUR / totalLinearMeters;

        setCalculatedContainerCostPerMeter(costPerMeter);
    };

    // Cost calculation logic for Nacional
    const handleCalculateNationalCoilCosts = () => {
        const totalNationalExpenses = nationalExpenses.reduce((sum, expense) => {
            const amount = parseFloat(expense.amount);
            return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        let totalLinearMetersOrder = 0;
        const calculatedCoils = nationalCoils.map(coil => {
            const price = parseFloat(coil.pricePerLinearMeter);
            const length = parseFloat(coil.length);
            const width = parseFloat(coil.width); // Input is in mm
            
            const validPrice = isNaN(price) || price < 0 ? 0 : price;
            const validLength = isNaN(length) || length <= 0 ? 0 : length;
            const validWidthMm = isNaN(width) || width <= 0 ? 0 : width;
            const validWidthMeters = validWidthMm / 1000; // Convert mm to meters

            const linearMeters = validLength; // Assuming length is linear meters
            totalLinearMetersOrder += linearMeters;
            return { ...coil, price: validPrice, linearMeters: linearMeters, width: validWidthMeters };
        });

        if (totalLinearMetersOrder === 0) {
            setCalculatedNationalCoilCosts([]); // No coils or invalid meters, so no calculated costs
            return;
        }

        const proratedExpensesPerLinearMeter = totalNationalExpenses / totalLinearMetersOrder;

        const finalCalculatedCoils = calculatedCoils.map(coil => ({
            ...coil,
            finalPricePerLinearMeter: coil.price + proratedExpensesPerLinearMeter
        }));

        setCalculatedNationalCoilCosts(finalCalculatedCoils);
    };


    // Function to reset all form fields
    const resetFormFields = () => {
        setProveedor('');
        setMaterial('');
        setCommonMaterial('');
        setNationalExpenses([{ description: '', amount: '' }]);
        setNationalCoils([{ pricePerLinearMeter: '', length: '', width: '', attribute: '', espesor: '' }]);
        setCalculatedNationalCoilCosts(null);
        setCostUSD('');
        setConversionRate('');
        setContainerExpenses([{ description: '', amount: '' }]);
        setContainerCoils([{ quantity: '', totalMeters: '', material: '', espesor: '' }]);
        setCalculatedContainerCostPerMeter(null);
        setOrderType('Nacional'); // Reset to Nacional as default for next entry
    };


    // New function to handle adding any type of order
    const handleAddOrder = (e) => {
        e.preventDefault();

        let newOrder;
        
        // Basic validation for common fields
        if (!proveedor.trim()) {
            alert('Por favor, introduce el nombre del Proveedor.');
            return;
        }

        if (orderType === 'Nacional') {
            if (!commonMaterial.trim()) {
                alert('Por favor, selecciona el Material común para el pedido Nacional.');
                return;
            }
            if (calculatedNationalCoilCosts === null || calculatedNationalCoilCosts.length === 0) {
                alert('Por favor, calcula primero los costes de las bobinas para el pedido Nacional.');
                return;
            }
            newOrder = {
                id: Date.now(),
                type: 'Nacional',
                proveedor,
                commonMaterial,
                nationalExpenses: nationalExpenses.map(exp => ({...exp, amount: parseFloat(exp.amount)})), // Store expenses
                coils: calculatedNationalCoilCosts.map(c => ({ // Store the calculated coils
                    pricePerLinearMeter: c.price,
                    length: c.length,
                    width: c.width,
                    attribute: c.attribute,
                    espesor: c.espesor,
                    finalPricePerLinearMeter: c.finalPricePerLinearMeter
                })),
                fecha: new Date().toISOString(),
                estado: 'Pendiente',
            };
        } else { // Contenedor
            if (!material.trim()) { // General description for the container order
                alert('Por favor, introduce una descripción general para el pedido de Contenedor.');
                return;
            }
            // Add strict validation for container coils here
            const allContainerCoilsValid = containerCoils.every(coil => {
                const quantity = parseInt(coil.quantity);
                const totalMeters = parseFloat(coil.totalMeters);
                return !isNaN(quantity) && quantity > 0 &&
                       !isNaN(totalMeters) && totalMeters > 0 &&
                       coil.material.trim() !== '' &&
                       coil.espesor.trim() !== '';
            });

            if (!allContainerCoilsValid) {
                alert('Por favor, asegúrate de que todas las bobinas del Contenedor tienen Cantidad, Metros Totales, Material y Espesor válidos y positivos.');
                return;
            }

            if (calculatedContainerCostPerMeter === null) {
                alert('Por favor, calcula primero el coste por metro lineal para el pedido de Contenedor.');
                return;
            }
                id: Date.now(),
                type: 'Contenedor',
                proveedor,
                material, // General description for the container order
                costUSD: parseFloat(costUSD),
                conversionRate: parseFloat(conversionRate),
                containerExpenses: containerExpenses.map(exp => ({...exp, amount: parseFloat(exp.amount)})), // Store expenses
                coils: containerCoils.map(c => ({...c, totalMeters: parseFloat(c.totalMeters), quantity: parseInt(c.quantity)})),
                calculatedCostPerMeter: calculatedContainerCostPerMeter,
                fecha: new Date().toISOString(),
                estado: 'Pendiente',
            };
        }
        
        setPedidos(prev => [newOrder, ...prev]);
        resetFormFields();
        alert('Pedido añadido correctamente!');
    };

    const handleToggleEstado = (id) => {
        setPedidos(pedidos.map(p => {
            if (p.id === id) {
                return { ...p, estado: p.estado === 'Pendiente' ? 'Recibido' : 'Pendiente' };
            }
            return p;
        }));
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
            setPedidos(pedidos.filter(p => p.id !== id));
        }
    };


    return (
        <main className="p-4 sm:p-6 md:p-8 bg-base-200 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-primary flex items-center gap-3">
                <FaTruck /> Pedidos a Proveedores
            </h1>

            {/* Formulario de Añadir Nuevo Pedido (Nacional o Contenedor) */}
            <div className="card bg-base-100 shadow-xl mb-8">
                <form onSubmit={handleAddOrder} className="card-body">
                    <h2 className="card-title mb-4">Añadir Nuevo Pedido</h2>

                    <div className="form-control mb-4">
                        <label className="label cursor-pointer justify-start gap-4">
                            <input
                                type="radio"
                                name="orderType"
                                className="radio radio-primary"
                                value="Nacional"
                                checked={orderType === 'Nacional'}
                                onChange={() => { setOrderType('Nacional'); resetFormFields(); }}
                            />
                            <span className="label-text">Nacional</span>
                            <input
                                type="radio"
                                name="orderType"
                                className="radio radio-primary ml-4"
                                value="Contenedor"
                                checked={orderType === 'Contenedor'}
                                onChange={() => { setOrderType('Contenedor'); resetFormFields(); }}
                            />
                            <span className="label-text">Contenedor Importado (China)</span>
                        </label>
                    </div>

                    {/* Campos comunes para todos los tipos de pedido */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="label"><span className="label-text">Proveedor</span></label>
                            <input
                                type="text"
                                placeholder="Nombre del Proveedor"
                                className="input input-bordered w-full"
                                value={proveedor}
                                onChange={(e) => setProveedor(e.target.value)}
                                required
                            />
                        </div>
                        {orderType === 'Contenedor' && (
                            <div>
                                <label className="label"><span className="label-text">Descripción General del Pedido (Contenedor)</span></label>
                                <input
                                    type="text"
                                    placeholder="Ej: Contenedor de PVC" 
                                    className="input input-bordered w-full"
                                    value={material}
                                    onChange={(e) => setMaterial(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                    </div>


                    {orderType === 'Nacional' && (
                        <> 
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="label"><span className="label-text">Material Común</span></label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={commonMaterial}
                                        onChange={(e) => setCommonMaterial(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecciona Material</option>
                                        {materialsList.map(mat => (
                                            <option key={mat.id} value={mat.nombre}>{mat.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold mb-3">Gastos del Pedido Nacional</h3>
                            {nationalExpenses.map((expense, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-base-200 relative">
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Descripción</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Transporte"
                                            className="input input-bordered w-full"
                                            value={expense.description}
                                            onChange={(e) => handleNationalExpenseChange(index, 'description', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Cantidad (EUR)</span></label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 50"
                                            className="input input-bordered w-full"
                                            value={expense.amount}
                                            onChange={(e) => handleNationalExpenseChange(index, 'amount', e.target.value)}
                                            step="0.01"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        {nationalExpenses.length > 1 && (
                                            <button type="button" onClick={() => removeNationalExpense(index)} className="btn btn-error btn-sm">
                                                <FaTrash />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end mb-6">
                                <button type="button" onClick={addNationalExpense} className="btn btn-outline btn-sm">
                                    <FaPlus /> Añadir Gasto Nacional
                                </button>
                            </div>

                            <h3 className="text-lg font-semibold mb-3">Bobinas del Pedido Nacional</h3>
                            {nationalCoils.map((coil, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4 p-4 border rounded-lg bg-base-200 relative">
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Precio/Metro Lineal (EUR)</span></label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 2.50"
                                            className="input input-bordered w-full"
                                            value={coil.pricePerLinearMeter}
                                            onChange={(e) => handleNationalCoilChange(index, 'pricePerLinearMeter', e.target.value)}
                                            step="0.01"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Largo (Metros)</span></label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 100"
                                            className="input input-bordered w-full"
                                            value={coil.length}
                                            onChange={(e) => handleNationalCoilChange(index, 'length', e.target.value)}
                                            step="0.01"
                                            min="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Ancho (mm)</span></label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 1500"
                                            className="input input-bordered w-full"
                                            value={coil.width}
                                            onChange={(e) => handleNationalCoilChange(index, 'width', e.target.value)}
                                            step="1"
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Espesor</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 6mm"
                                            className="input input-bordered w-full"
                                            value={coil.espesor}
                                            onChange={(e) => handleNationalCoilChange(index, 'espesor', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Descripción (Ej: 8+2)</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 8+2"
                                            className="input input-bordered w-full"
                                            value={coil.attribute}
                                            onChange={(e) => handleNationalCoilChange(index, 'attribute', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        {nationalCoils.length > 1 && (
                                            <button type="button" onClick={() => removeNationalCoil(index)} className="btn btn-error btn-sm">
                                                <FaTrash />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end mb-6">
                                <button type="button" onClick={addNationalCoil} className="btn btn-outline btn-sm">
                                    <FaPlus /> Añadir Bobina Nacional
                                </button>
                            </div>



                            {calculatedNationalCoilCosts && calculatedNationalCoilCosts.length > 0 && (
                                <div className="mt-6 p-4 rounded-lg">
                                    <h4 className="text-lg font-bold mb-2">Costes Calculados por Bobina (Nacional):</h4>
                                    <div className="overflow-x-auto">
                                        <table className="table w-full table-zebra">
                                            <thead>
                                                <tr>
                                                    <th>Material</th>
                                                    <th>Espesor</th>
                                                    <th>Largo</th>
                                                    <th>Ancho (mm)</th>
                                                    <th>Descripción</th>
                                                    <th>Precio Final/Metro Lineal</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {calculatedNationalCoilCosts.map((coil, index) => (
                                                    <tr key={index}>
                                                        <td>{commonMaterial}</td>
                                                        <td>{coil.espesor}</td>
                                                        <td>{coil.length} m</td>
                                                        <td>{coil.width * 1000} mm</td>
                                                        <td>{coil.attribute}</td>
                                                        <td><FaEuroSign /> {coil.finalPricePerLinearMeter.toFixed(4)} EUR</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}


                    {orderType === 'Contenedor' && (
                        <> 
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="label"><span className="label-text">Coste Total (USD)</span></label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 15000"
                                        className="input input-bordered w-full"
                                        value={costUSD}
                                        onChange={(e) => setCostUSD(e.target.value)}
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Tasa Conversión (USD a EUR)</span></label>
                                    <input
                                        type="number"
                                        placeholder="Ej: 0.92"
                                        className="input input-bordered w-full"
                                        value={conversionRate}
                                        onChange={(e) => setConversionRate(e.target.value)}
                                        step="0.0001"
                                        required
                                    />
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold mb-3">Gastos (Transporte/Aduanas/Otros) del Contenedor</h3>
                            {containerExpenses.map((expense, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg bg-base-200 relative">
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Descripción</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Flete marítimo"
                                            className="input input-bordered w-full"
                                            value={expense.description}
                                            onChange={(e) => handleContainerExpenseChange(index, 'description', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Cantidad (EUR)</span></label>
                                        <input
                                            type="number"
                                            placeholder="Ej: 1500"
                                            className="input input-bordered w-full"
                                            value={expense.amount}
                                            onChange={(e) => handleContainerExpenseChange(index, 'amount', e.target.value)}
                                            step="0.01"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        {containerExpenses.length > 1 && (
                                            <button type="button" onClick={() => removeContainerExpense(index)} className="btn btn-error btn-sm">
                                                <FaTrash />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end mb-6">
                                <button type="button" onClick={addContainerExpense} className="btn btn-outline btn-sm">
                                    <FaPlus /> Añadir Gasto de Contenedor
                                </button>
                            </div>

                            <h3 className="text-lg font-semibold mb-3">Bobinas del Pedido Contenedor</h3>
                            {containerCoils.map((coil, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 border rounded-lg bg-base-200 relative">
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Cantidad</span></label>
                                        <input
                                            type="number"
                                            placeholder="Cantidad"
                                            className="input input-bordered w-full"
                                            value={coil.quantity}
                                            onChange={(e) => handleContainerCoilChange(index, 'quantity', e.target.value)}
                                            min="1"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Metros Totales</span></label>
                                        <input
                                            type="number"
                                            placeholder="Metros Lineales"
                                            className="input input-bordered w-full"
                                            value={coil.totalMeters}
                                            onChange={(e) => handleContainerCoilChange(index, 'totalMeters', e.target.value)}
                                            step="0.01"
                                            min="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Material</span></label>
                                        <select
                                            className="select select-bordered w-full"
                                            value={coil.material}
                                            onChange={(e) => handleContainerCoilChange(index, 'material', e.target.value)}
                                            required
                                        >
                                            <option value="">Selecciona Material</option>
                                            {materialsList.map(mat => (
                                                <option key={mat.id} value={mat.nombre}>{mat.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="label"><span className="label-text">Espesor</span></label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 0.5mm"
                                            className="input input-bordered w-full"
                                            value={coil.espesor}
                                            onChange={(e) => handleContainerCoilChange(index, 'espesor', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        {containerCoils.length > 1 && (
                                            <button type="button" onClick={() => removeContainerCoil(index)} className="btn btn-error btn-sm">
                                                <FaTrash />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="flex justify-end mb-6">
                                <button type="button" onClick={addContainerCoil} className="btn btn-outline btn-sm">
                                    <FaPlus /> Añadir Bobina Contenedor
                                </button>
                            </div>



                            {calculatedContainerCostPerMeter !== null && (
                                <div className="mt-6 p-4 bg-success text-success-content rounded-lg text-center text-xl font-bold">
                                    Coste por Metro Lineal: <FaEuroSign /> {calculatedContainerCostPerMeter.toFixed(4)} EUR
                                </div>
                            )}
                        </>
                    )}

                    {/* Botón final para añadir el pedido al historial */}
                    <div className="card-actions justify-end mt-4">
                        <button type="submit" className="btn btn-success btn-lg">
                            <FaPlus /> Añadir Pedido a Historial
                        </button>
                    </div>
                </form>
            </div>

            {/* Historial de Pedidos */} 
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="card-title">Historial de Pedidos</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Proveedor</th>
                                    <th>Tipo</th>
                                    <th>Material/Descripción</th>
                                    <th className="text-center">Estado</th>
                                    <th className="text-center">Coste/Metro (EUR)</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map(p => (
                                    <tr key={p.id} className={`hover ${p.estado === 'Recibido' ? 'opacity-50' : ''}`}>
                                        <td>{new Date(p.fecha).toLocaleDateString('es-ES')}</td>
                                        <td>{p.proveedor}</td>
                                        <td>{p.type}</td>
                                        <td className="whitespace-pre-wrap">
                                            {p.type === 'Nacional' ? `${p.commonMaterial}` : p.material}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${p.estado === 'Recibido' ? 'badge-success' : 'badge-warning'}`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            {p.type === 'Contenedor' && p.calculatedCostPerMeter !== null ?
                                                `${p.calculatedCostPerMeter.toFixed(4)} €` :
                                            p.type === 'Nacional' && p.coils && p.coils.length > 0 ?
                                                'Ver Bobinas' : 'N/A'
                                            }
                                        </td>
                                        <td className="text-center space-x-1">
                                            <button onClick={() => handleToggleEstado(p.id)} className="btn btn-ghost btn-xs" title={p.estado === 'Pendiente' ? 'Marcar como Recibido' : 'Marcar como Pendiente'}>
                                                {p.estado === 'Pendiente' ? <FaCheck /> : <FaUndo />} 
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="btn btn-ghost btn-xs text-error" title="Eliminar">
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pedidos.length === 0 && (
                                    <tr><td colSpan="7" className="text-center">No hay pedidos registrados.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default PedidosProveedoresPage;