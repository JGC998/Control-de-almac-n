// src/components/KPICard.js

export default function KPICard({ title, value, icon }) {
  return (
    <div className="card bg-base-100 shadow-lg">
      <div className="card-body flex-row items-center">
        <div className="text-3xl text-primary mr-4">{icon}</div>
        <div>
          <div className="text-sm text-base-content/70">{title}</div>
          <div className="card-title text-2xl">{value}</div>
        </div>
      </div>
    </div>
  );
}
