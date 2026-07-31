import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Skeleton from '../components/ui/Skeleton'

const ROLE_BADGE = {
  teacher: 'bg-violet-50 text-violet-600',
  staff: 'bg-sky-50 text-sky-600',
}

function fmtWhen(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const day = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Baghdad',
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Baghdad',
  })
  return `${day} · ${time}`
}

function StatTile({ label, value, tone, soft }) {
  return (
    <div className={`rounded-xl px-3 py-3 text-center ${soft}`}>
      <p className={`text-[22px] font-extrabold leading-6 ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function TaskList({ rows, empty, tone }) {
  if (!rows?.length) {
    return <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] text-slate-400">{empty}</p>
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((t) => (
        <li
          key={t.id}
          className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-700">{t.title}</p>
            <p className="text-[11px] text-slate-400">Due {fmtWhen(t.due_at)}</p>
          </div>
          {tone === 'done' ? (
            <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-extrabold text-brand">
              Done
            </span>
          ) : t.overdue ? (
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-500">
              Overdue
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-600">
              Pending
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function TasksTracking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | pending | overdue | done
  const [expanded, setExpanded] = useState(() => new Set())

  const load = () => {
    setLoading(true)
    setError('')
    api
      .get('/api/staff-tasks/tracking')
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setData(null)
        setLoading(false)
      })
  }

  useEffect(() => {
    load()
  }, [])

  const people = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.people || []).filter((p) => {
      if (filter === 'pending' && !p.totals.pending) return false
      if (filter === 'overdue' && !p.totals.overdue) return false
      if (filter === 'done' && !(p.totals.assigned && !(p.totals.unfinished ?? (p.totals.pending + p.totals.overdue)))) return false
      if (!q) return true
      if (p.name.toLowerCase().includes(q)) return true
      return p.assigned_tasks.some((t) => t.title.toLowerCase().includes(q))
    })
  }, [data, search, filter])

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const s = data?.summary

  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-slate-800">
            <i className="fas fa-list-check text-brand" />
            Tasks Tracking
          </h2>
          <p className="text-[13px] text-slate-500">
            Pending = still before the deadline. Overdue = past the deadline and not finished.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/auto-task"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Assign Task
          </Link>
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-brand px-3.5 py-2 text-[12.5px] font-extrabold text-white shadow-sm hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatTile label="Staff" value={s.staff} tone="text-slate-700" soft="bg-slate-50" />
            <StatTile label="Assigned" value={s.assigned} tone="text-slate-700" soft="bg-slate-50" />
            <StatTile label="Completed" value={s.completed} tone="text-brand" soft="bg-brand-soft" />
            <StatTile label="Pending" value={s.pending} tone="text-amber-600" soft="bg-amber-50" />
            <StatTile label="Overdue" value={s.overdue} tone="text-red-500" soft="bg-red-50" />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by staff or task name…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand"
              />
            </div>
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Has pending' },
              { key: 'overdue', label: 'Has overdue' },
              { key: 'done', label: 'All done' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
                  filter === f.key
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {people.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-[13px] text-slate-400">
              No staff match this filter.
            </div>
          ) : (
            <div className="space-y-2.5">
              {people.map((p) => {
                const open = expanded.has(p.user_id)
                return (
                  <div
                    key={p.user_id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(p.user_id)}
                      className="flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[14.5px] font-extrabold text-slate-800">{p.name}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${ROLE_BADGE[p.role] || 'bg-slate-100 text-slate-500'}`}
                          >
                            {p.role}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-slate-400">
                          {p.totals.assigned
                            ? `${p.totals.completed} done · ${p.totals.pending} pending · ${p.totals.overdue} overdue`
                            : 'No tasks yet'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-brand-soft px-2 py-1 text-[11px] font-extrabold text-brand" title="Completed">
                          {p.totals.completed}
                        </span>
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-amber-600" title="Pending (before deadline)">
                          {p.totals.pending}
                        </span>
                        <span className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-extrabold text-red-500" title="Overdue (past deadline)">
                          {p.totals.overdue}
                        </span>
                        <i
                          className={`fas fa-chevron-${open ? 'up' : 'down'} ml-1 text-[11px] text-slate-300`}
                        />
                      </div>
                    </button>

                    {open && (
                      <div className="grid gap-4 border-t border-slate-100 px-4 py-4 md:grid-cols-3">
                        <div>
                          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                            Pending (on time)
                          </p>
                          <TaskList
                            rows={p.pending_tasks}
                            empty="None on time"
                            tone="pending"
                          />
                        </div>
                        <div>
                          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                            Overdue
                          </p>
                          <TaskList
                            rows={p.overdue_tasks || []}
                            empty="No overdue tasks"
                            tone="pending"
                          />
                        </div>
                        <div>
                          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                            Completed
                          </p>
                          <TaskList
                            rows={p.completed_tasks}
                            empty="No completed tasks yet"
                            tone="done"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
