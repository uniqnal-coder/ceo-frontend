import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Skeleton from '../components/ui/Skeleton'

const PERIODS = {
  daily: { label: 'Daily', hint: 'Names, unfinished tasks, delays & faults for one day' },
  weekly: { label: 'Weekly', hint: 'Monday–Sunday rollup of attendance, tasks, and faults' },
  monthly: { label: 'Monthly', hint: 'Full-month performance: completion, delays, faults' },
}

const todayISO = () => new Date().toISOString().slice(0, 10)

function fmtMoney(n) {
  return `$${Number(n || 0).toLocaleString()}`
}

function fmtTime(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '—'
}

function fmtDay(iso) {
  if (!iso) return '—'
  return new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

export default function PeriodReports() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('period')
  const period = PERIODS[raw] ? raw : 'daily'
  const meta = PERIODS[period]
  const [date, setDate] = useState(params.get('date') || todayISO())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('attendance')

  const setPeriod = (next) => {
    const q = new URLSearchParams(params)
    q.set('period', next)
    setParams(q)
  }

  useEffect(() => {
    let live = true
    setLoading(true)
    setError('')
    api
      .get(`/api/reports/period?period=${period}&date=${date}`)
      .then((d) => {
        if (!live) return
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        if (!live) return
        setError(err.message)
        setData(null)
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [period, date])

  const s = data?.summary

  const tabs = useMemo(
    () => [
      { key: 'attendance', label: 'Attendance', count: data?.attendance?.total },
      { key: 'unfinished', label: 'Unfinished', count: data?.unfinished_tasks?.length },
      { key: 'delayed', label: 'Delays', count: data?.delayed_tasks?.length },
      { key: 'faults', label: 'Faults', count: data?.faults?.length },
    ],
    [data]
  )

  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">Reports</h2>
          <p className="text-[13px] text-slate-500">{meta.hint}</p>
          {data && (
            <p className="mt-1 text-[12px] font-medium text-slate-400">
              {data.from === data.to ? fmtDay(data.from) : `${fmtDay(data.from)} → ${fmtDay(data.to)}`}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.keys(PERIODS).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  key === period
                    ? 'bg-brand text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {PERIODS[key].label}
              </button>
            ))}
          </div>
        </div>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => {
            setDate(e.target.value)
            const q = new URLSearchParams(params)
            q.set('date', e.target.value)
            setParams(q)
          }}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </div>

      {error && <p className="mb-4 text-center text-[13px] text-red-500">{error}</p>}

      {loading || !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat tone="text-brand" label="Present" value={s.attendance_present} sub={`of ${s.staff_total} staff`} />
            <Stat tone="text-amber-500" label="Late / delays" value={s.tasks_delayed} sub={`${s.attendance_late} late punches`} />
            <Stat tone="text-kpi-blue" label="Unfinished tasks" value={s.tasks_unfinished} sub={`${s.completion_rate ?? '—'}% done`} />
            <Stat tone="text-danger" label="Faults" value={s.faults_count} sub={fmtMoney(s.faults_total)} />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  tab === t.key
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
                {t.count != null && (
                  <span className={`ml-1.5 ${tab === t.key ? 'text-white/70' : 'text-slate-400'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === 'attendance' && <AttendanceTable people={data.attendance.people} period={period} />}
          {tab === 'unfinished' && <TaskTable rows={data.unfinished_tasks} empty="No unfinished tasks in this period." />}
          {tab === 'delayed' && <TaskTable rows={data.delayed_tasks} empty="No delayed tasks — great work." highlight />}
          {tab === 'faults' && <FaultsTable faults={data.faults} rewards={data.rewards} />}
        </>
      )}
    </div>
  )
}

function Stat({ tone, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-[26px] font-extrabold leading-8 ${tone}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </div>
  )
}

function AttendanceTable({ people, period }) {
  if (!people?.length) {
    return <Empty text="No staff/teachers enrolled yet." />
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-3 py-3 font-semibold">Role</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            {period === 'daily' ? (
              <>
                <th className="px-3 py-3 font-semibold">In</th>
                <th className="px-3 py-3 font-semibold">Out</th>
              </>
            ) : (
              <>
                <th className="px-3 py-3 font-semibold">Present days</th>
                <th className="px-3 py-3 font-semibold">Late days</th>
                <th className="px-3 py-3 font-semibold">Absent days</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {people.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-2.5 font-semibold text-slate-700">
                <Link to={`/attendance?user=${p.id}`} className="hover:text-brand hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 capitalize text-slate-500">{p.role}</td>
              <td className="px-3 py-2.5">
                <StatusPill status={p.status} />
              </td>
              {period === 'daily' ? (
                <>
                  <td className="px-3 py-2.5 text-slate-600">{fmtTime(p.check_in_time)}</td>
                  <td className="px-3 py-2.5 text-slate-600">{fmtTime(p.check_out_time)}</td>
                </>
              ) : (
                <>
                  <td className="px-3 py-2.5 font-semibold text-brand">{p.days_present}</td>
                  <td className="px-3 py-2.5 font-semibold text-amber-500">{p.days_late}</td>
                  <td className="px-3 py-2.5 font-semibold text-danger">{p.days_absent}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TaskTable({ rows, empty, highlight }) {
  if (!rows?.length) return <Empty text={empty} />
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Person</th>
            <th className="px-3 py-3 font-semibold">Task</th>
            <th className="px-3 py-3 font-semibold">Due</th>
            <th className="px-3 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((t) => (
            <tr key={t.id} className={highlight ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}>
              <td className="px-4 py-2.5">
                <p className="font-semibold text-slate-700">{t.name}</p>
                <p className="text-[11px] capitalize text-slate-400">{t.role}</p>
              </td>
              <td className="px-3 py-2.5 text-slate-600">{t.title}</td>
              <td className="px-3 py-2.5 text-slate-500">{fmtDay(t.due_at)}</td>
              <td className="px-3 py-2.5">
                {t.overdue ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-danger">Delayed</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-500">
                    {t.status}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FaultsTable({ faults, rewards }) {
  if (!faults?.length && !rewards?.length) {
    return <Empty text="No faults or rewards recorded in this period." />
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-[13px] font-bold text-danger">Faults</h3>
        </div>
        {!faults?.length ? (
          <p className="px-4 py-6 text-center text-[12px] text-slate-400">None</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {faults.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                <div>
                  <p className="font-semibold text-slate-700">{f.name}</p>
                  <p className="text-[11px] text-slate-400">{fmtDay(f.date)}</p>
                </div>
                <span className="font-bold text-danger">−{fmtMoney(f.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-[13px] font-bold text-brand">Rewards</h3>
        </div>
        {!rewards?.length ? (
          <p className="px-4 py-6 text-center text-[12px] text-slate-400">None</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {rewards.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                <div>
                  <p className="font-semibold text-slate-700">{r.name}</p>
                  <p className="text-[11px] text-slate-400">{fmtDay(r.date)}</p>
                </div>
                <span className="font-bold text-brand">+{fmtMoney(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const map = {
    present: 'bg-brand-soft text-brand',
    late: 'bg-amber-50 text-amber-600',
    absent: 'bg-red-50 text-danger',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-[13px] text-slate-400">
      {text}
    </div>
  )
}
