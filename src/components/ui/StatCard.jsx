import Skeleton from './Skeleton'

// Accent presets keyed to the semantic design tokens.
const ACCENTS = {
  primary: { icon: 'bg-brand-soft text-brand', hint: 'text-brand' },
  info: { icon: 'bg-blue-50 text-kpi-blue', hint: 'text-kpi-blue' },
  success: { icon: 'bg-emerald-50 text-success', hint: 'text-success' },
  warning: { icon: 'bg-amber-50 text-kpi-gold', hint: 'text-amber-600' },
  danger: { icon: 'bg-red-50 text-danger', hint: 'text-danger' },
  purple: { icon: 'bg-violet-50 text-kpi-purple', hint: 'text-kpi-purple' },
}

export default function StatCard({ icon, label, value, hint, accent = 'primary', loading = false }) {
  const a = ACCENTS[accent] || ACCENTS.primary
  return (
    <div className="group rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${a.icon}`}>
          <i className={`fas ${icon}`} />
        </span>
        {hint && !loading && (
          <span className={`inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold ${a.hint}`}>
            {hint}
          </span>
        )}
      </div>
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-[28px] font-extrabold leading-8 tracking-tight text-slate-800">{value}</p>
        )}
        <p className="mt-1 text-[13px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  )
}
