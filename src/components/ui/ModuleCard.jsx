import { Link } from 'react-router-dom'

const ACCENTS = {
  primary: 'bg-brand-soft text-brand',
  info: 'bg-blue-50 text-kpi-blue',
  sky: 'bg-sky-50 text-kpi-sky',
  success: 'bg-emerald-50 text-success',
  warning: 'bg-amber-50 text-kpi-gold',
  danger: 'bg-red-50 text-danger',
  purple: 'bg-violet-50 text-kpi-purple',
  pink: 'bg-pink-50 text-kpi-pink',
  indigo: 'bg-indigo-50 text-indigo-500',
}

export default function ModuleCard({ to, icon, title, desc, accent = 'primary' }) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${ACCENTS[accent] || ACCENTS.primary}`}>
          <i className={`fas ${icon}`} />
        </span>
        <i className="fas fa-arrow-right text-sm text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
      <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{desc}</p>
    </Link>
  )
}
