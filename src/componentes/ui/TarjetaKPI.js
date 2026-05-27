export default function TarjetaKPI({ title, value, icon, sub, color = 'primary' }) {
  const colorMap = {
    primary:  { bg: 'bg-primary/10',   text: 'text-primary',   border: 'border-primary/20' },
    success:  { bg: 'bg-success/10',   text: 'text-success',   border: 'border-success/20' },
    warning:  { bg: 'bg-warning/10',   text: 'text-warning',   border: 'border-warning/20' },
    error:    { bg: 'bg-error/10',     text: 'text-error',     border: 'border-error/20'   },
    info:     { bg: 'bg-info/10',      text: 'text-info',      border: 'border-info/20'    },
    neutral:  { bg: 'bg-base-200',     text: 'text-base-content/60', border: 'border-base-300' },
  };
  const c = colorMap[color] ?? colorMap.primary;

  return (
    <div className={`card bg-base-100 shadow border ${c.border} h-full`}>
      <div className="card-body p-5 flex-row items-center gap-4">
        <div className={`rounded-xl p-3 ${c.bg} ${c.text} shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-base-content/50 uppercase tracking-wider font-medium truncate">{title}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-base-content/40 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
