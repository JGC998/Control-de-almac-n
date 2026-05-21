import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';

function HubCard({ item, color }) {
  if (item.disabled) {
    return (
      <div className="card bg-base-100 border border-base-200 opacity-50 cursor-not-allowed">
        <div className="card-body p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl bg-base-200`}>
              <item.icon className="w-5 h-5 text-base-content/30" />
            </div>
            <span className="badge badge-sm badge-ghost gap-1">
              <Clock className="w-3 h-3" /> Próximamente
            </span>
          </div>
          <h2 className="font-semibold text-base mb-1 text-base-content/40">{item.titulo}</h2>
          <p className="text-sm text-base-content/30 leading-relaxed">{item.descripcion}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="card bg-base-100 border border-base-200 hover:border-primary/40 hover:shadow-md transition-all group"
    >
      <div className="card-body p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl bg-${color}/10 group-hover:bg-${color}/20 transition-colors`}>
            <item.icon className={`w-5 h-5 text-${color}`} />
          </div>
          {item.badge && (
            <span className="badge badge-sm badge-ghost">{item.badge}</span>
          )}
        </div>
        <h2 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
          {item.titulo}
        </h2>
        <p className="text-sm text-base-content/50 leading-relaxed flex-1">
          {item.descripcion}
        </p>
        <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          {item.accion}
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

/**
 * Uso con lista plana:      <HubPage items={[...]} ... />
 * Uso con grupos:           <HubPage groups={[{ titulo, items }]} ... />
 */
export default function HubPage({ title, descripcion, icon: Icon, color = 'primary', items, groups }) {
  return (
    <div className="max-w-5xl mx-auto">

      {/* Cabecera */}
      <div className="mb-8 pb-6 border-b border-base-200">
        <div className="flex items-center gap-3 mb-1">
          <div className={`p-2 rounded-xl bg-${color}/10`}>
            <Icon className={`w-7 h-7 text-${color}`} />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <p className="text-base-content/50 ml-[52px] text-sm">{descripcion}</p>
      </div>

      {/* Grupos con título propio */}
      {groups ? (
        <div className="flex flex-col gap-8">
          {groups.map(group => (
            <div key={group.titulo}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-3">
                {group.titulo}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.items.map(item => (
                  <HubCard key={item.titulo} item={item} color={color} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Lista plana */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <HubCard key={item.titulo} item={item} color={color} />
          ))}
        </div>
      )}
    </div>
  );
}
