import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function DailyReportsFeed() {
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    api
      .get(`/api/daily-reports/all?date=${date}`)
      .then((d) => live && setData(d))
      .catch((err) => live && setError(err.message))
    return () => {
      live = false
    }
  }, [date])

  const missing = useMemo(() => {
    if (!data) return []
    const submitted = new Set((data.reports || []).map((r) => r.user_id))
    return (data.people || [])
      .filter((p) => !submitted.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data])

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">📝 Daily Reports</h2>
          <p className="text-[13px] text-slate-500">
            Every report submitted from the app for the chosen day.
          </p>
        </div>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </div>

      {error && <p className="py-8 text-center text-[13px] text-red-500">{error}</p>}
      {!data && !error && <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>}

      {data && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {(data.reports || []).length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-[13px] text-slate-400">
                No reports submitted on this day.
              </div>
            )}
            {(data.reports || []).map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-slate-700">
                    {r.users?.name || 'Unknown'}
                    <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-bold uppercase text-sky-600">
                      {r.users?.role || ''}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    {r.tasks_total > 0 && (
                      <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                        {r.tasks_completed}/{r.tasks_total} tasks
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
                  {r.content}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm self-start">
            <p className="mb-2 text-[13px] font-bold text-slate-700">
              Not submitted ({missing.length})
            </p>
            {missing.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-emerald-600">
                🎉 Everyone reported!
              </p>
            ) : (
              <ul className="space-y-1.5">
                {missing.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] font-semibold text-slate-600"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
