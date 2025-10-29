import { FaWrench } from "react-icons/fa";

const getProgressColor = (stock, stockMinimo) => {
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
                    {stockItems.slice(0, 4).map(item => (
                        <div key={item.id}>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-semibold">{item.nombre}</span>
                                <span className="font-mono">{item.stock} / {item.stock_minimo * 2}</span>
                            </div>
                            <progress 
                                className={`progress ${getProgressColor(item.stock, item.stock_minimo)} w-full`} 
                                value={item.stock} 
                                max={item.stock_minimo * 2}></progress>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}