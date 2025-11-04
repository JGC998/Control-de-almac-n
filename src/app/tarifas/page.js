import TarifasTable from '@/components/TarifasTable';
import { FileSliders } from 'lucide-react';

export default function TarifasPage() {
  return (
    <div className="container mx-auto p-4">
       <h1 className="text-3xl font-bold mb-6 flex items-center"><FileSliders className="mr-2" /> Editor de Tarifas</h1>
      <TarifasTable />
    </div>
  );
}
