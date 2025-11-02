// src/components/InfoList.js

export default function InfoList({ title, items }) {
  return (
    <div className="bg-base-100 shadow-lg rounded-lg p-6 h-96">
      <h3 className="font-bold mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm p-2 bg-base-200 rounded">
            {item}
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-base-content/60">No hay información para mostrar.</li>}
      </ul>
    </div>
  );
}
