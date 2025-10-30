import { FaWrench } from "react-icons/fa";

const getProgressColor = (stock, stockMinimo) => {
    if (stockMinimo <= 0) return "progress-success"; // Avoid division by zero, assume good if no minimum
    const percentage = (stock / (stockMinimo * 2)) * 100;
    if (percentage < 25) return "progress-error";
    if (percentage < 50) return "progress-warning";
    return "progress-success";
};

export default function NivelesStock({ stockItems }) {
    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h2 className="card-title text-accent">Niveles de Stock</h2>
                <div className="space-y-4 mt-4">
                    {stockItems.slice(0, 4).map(item => {
                        const currentStock = isNaN(parseFloat(item.stock)) ? 0 : parseFloat(item.stock);
                        const minStock = isNaN(parseFloat(item.stock_minimo)) ? 0 : parseFloat(item.stock_minimo);
                        const maxProgress = minStock * 2;

                        return (
                            <div key={item.id}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold">{item.material}</span>
                                    <span className="font-mono">{currentStock} / {maxProgress}</span>
                                </div>
                                <progress 
                                    className={`progress ${getProgressColor(currentStock, minStock)} w-full`} 
                                    value={currentStock} 
                                    max={maxProgress}></progress>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}