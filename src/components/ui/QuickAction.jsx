import { Link } from 'react-router-dom'

export default function QuickAction({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
        <i className={`fas ${icon}`} />
      </span>
      <span className="text-[13px] font-semibold text-slate-700">{label}</span>
    </Link>
  )
}
