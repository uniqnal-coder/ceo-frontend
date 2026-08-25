// Report Center — punishment scores gathered from the four sources:
// Attendance (check-ins), Monitor (daily reports), Tasks (task
// tracking) and Feedback (entered notes), weighted 30/20/30/20.
// The score maps to a severity tier and sets the month's salary
// deduction ratio (score × 10%, capped at 20%).

import { useEffect, useMemo, useState } from 'react'
import { toast } from '../utils/toast'
import { api } from '../api/client'
import { ReportCard } from '../components/ReportCard'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const monthStartISO = () => `${todayISO().slice(0, 8)}01`

const SEVERITY_META = {
  severe: { label: 'Severe', chip: 'bg-rose-100 text-rose-600', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  high: { label: 'High', chip: 'bg-orange-100 text-orange-600', bar: 'bg-orange-400', dot: 'bg-orange-400' },
  medium: { label: 'Medium', chip: 'bg-amber-100 text-amber-600', bar: 'bg-amber-400', dot: 'bg-amber-400' },
  low: { label: 'Low', chip: 'bg-emerald-100 text-emerald-600', bar: 'bg-emerald-400', dot: 'bg-emerald-400' },
  info: { label: 'Info', chip: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300', dot: 'bg-slate-300' },
}

const REASON_COLORS = ['#ef4444', '#f97316', '#6366f1', '#10b981', '#3b82f6', '#94a3b8', '#a855f7']

const TYPES = [
  { key: 'all', label: 'All Reports', hint: 'Attendance, Monitor, Tasks & Feedback' },
  { key: 'attendance', label: 'Attendance', hint: 'Check in/out, selfie, GPS' },
  { key: 'monitor', label: 'Monitor', hint: 'Daily reporter' },
  { key: 'tasks', label: 'Tasks Report', hint: 'Task tracking' },
  { key: 'feedback', label: 'Feedback', hint: 'Manager evaluations & entered notes' },
]

const fmtMoney = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} IQD`
const fmtRange = (from, to) => {
  const f = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${f(from)} – ${f(to)}, ${to.slice(0, 4)}`
}

export default function ReportCenter() {
  const [from, setFrom] = useState(monthStartISO())
  const [to, setTo] = useState(todayISO())
  const [role, setRole] = useState('') // '' = not chosen yet
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)
  const PAGE = 10

  const load = async () => {
    if (!from || !to || to < from) return
    setLoading(true)
    setError('')
    try {
      const d = await api.get(`/api/reports/center?from=${from}&to=${to}${role === 'teacher' || role === 'staff' ? `&role=${role}` : ''}`)
      setData(d)
      setPage(1)
    } catch (e) {
      setError(e.message || 'Could not load the report')
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [from, to, role]) // eslint-disable-line react-hooks/exhaustive-deps

  // A specific report type shows that component's own 0–2 score.
  const scoreOf = (p) => (type === 'all' ? p.score : p.components?.[type]?.raw ?? 0)
  // Same mechanism as the other lists: the people table stays empty
  // until a search or a filter is used.
  const hasQuery = !!(q.trim() || role || type !== 'all')
  const people = useMemo(() => {
    if (!hasQuery) return []
    let list = [...(data?.people || [])]
    const needle = q.trim().toLowerCase()
    if (needle) list = list.filter((p) => `${p.name} ${p.id}`.toLowerCase().includes(needle))
    if (type !== 'all') list.sort((a, b) => scoreOf(b) - scoreOf(a) || a.name.localeCompare(b.name))
    return list
  }, [data, type, q, hasQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(people.length / PAGE))
  const shown = people.slice((page - 1) * PAGE, page * PAGE)
  const top = people[0] || null
  // Everything visible follows the selected report type: for a specific
  // type the stats/reasons/severity are recomputed from that component.
  const TYPE_REASONS = {
    attendance: ['Check-in Fault', 'Verification Fault', 'GPS Fault'],
    monitor: ['Missed Report'],
    tasks: ['Late Task'],
    feedback: ['Feedback Note'],
  }
  const punishOf = (p) => {
    const c = p.components
    if (type === 'attendance') return c.attendance.absent + c.attendance.late + c.attendance.unverified + c.attendance.offsite
    if (type === 'monitor') return c.monitor.missing
    if (type === 'tasks') return c.tasks.overdue
    if (type === 'feedback') return c.feedback.count
    return p.punishments
  }
  const view = useMemo(() => {
    if (!data) return null
    const fullSet = type === 'all' && !q.trim()
    if (fullSet) {
      return { summary: data.summary, reasons: data.reasons, severity: data.severity, deltas: true }
    }
    // Everything recomputed over the filtered people only.
    const list = people
    const scores = list.map(scoreOf)
    const sevCount = {}
    for (const sc of scores) {
      const k = severityKeyOf(sc)
      sevCount[k] = (sevCount[k] || 0) + 1
    }
    const reasonTotals = {}
    for (const p of list) for (const r of p.reasons) reasonTotals[r.label] = (reasonTotals[r.label] || 0) + r.count
    let reasons = Object.entries(reasonTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }))
    if (type !== 'all') {
      const allowed = new Set(TYPE_REASONS[type])
      reasons = reasons.filter((r) => allowed.has(r.label))
    }
    return {
      summary: {
        total_records: data.summary.total_records,
        avg_score: list.length ? Math.round((scores.reduce((a, b) => a + b, 0) / list.length) * 100) / 100 : 0,
        high_risk: scores.filter((x) => x >= 0.8).length,
        total_punishments: list.reduce((n, p) => n + punishOf(p), 0),
        severe: sevCount.severe || 0,
      },
      reasons,
      severity: ['severe', 'high', 'medium', 'low', 'info'].map((key) => ({
        key,
        count: sevCount[key] || 0,
        pct: list.length ? Math.round(((sevCount[key] || 0) / list.length) * 1000) / 10 : 0,
      })),
      deltas: false,
    }
  }, [data, people, type, q]) // eslint-disable-line react-hooks/exhaustive-deps

  const s = view?.summary
  const prev = data?.prev
  const dl = (node) => (view?.deltas ? node : null)

  const delta = (cur, prv, pct = false) => {
    if (prv == null) return null
    const d = pct && prv ? Math.round(((cur - prv) / prv) * 100) : Math.round((cur - prv) * 100) / 100
    if (!d) return null
    const up = d > 0
    return (
      <span className={`text-[10.5px] font-bold ${up ? 'text-rose-500' : 'text-emerald-600'}`}>
        {up ? '+' : ''}{d}{pct ? '%' : ''} from last period
      </span>
    )
  }

  const exportCSV = () => {
    if (!data) return
    const esc = (v) => {
      const str = String(v ?? '')
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }
    const lines = []
    lines.push(['HRNAL Report Center', `${data.from} to ${data.to}`].map(esc).join(','))
    lines.push(['Generated', new Date().toLocaleString()].map(esc).join(','))
    lines.push('')
    lines.push(
      ['Name', 'Role', 'Score', 'Severity', 'Attendance raw', 'Monitor raw', 'Tasks raw', 'Feedback raw',
        'Absent', 'Late', 'Overdue tasks', 'Missed reports', 'Base salary (IQD)', 'Deduction %', 'Deducted (IQD)', 'Net pay (IQD)', 'Top reasons']
        .map(esc).join(',')
    )
    for (const p of data.people) {
      const c = p.components
      lines.push(
        [p.name, p.role, p.score, p.severity, c.attendance.raw, c.monitor.raw, c.tasks.raw, c.feedback.raw,
          c.attendance.absent, c.attendance.late, c.tasks.overdue, c.monitor.missing,
          p.base_salary, `${(p.deduction_ratio * 100).toFixed(1)}%`, p.deducted, p.net_pay,
          p.reasons.map((r) => `${r.label} x${r.count}`).join(' | ')]
          .map(esc).join(',')
      )
    }
    const blob = new Blob([`﻿${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `HRNAL-report-center-${data.from}_to_${data.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto max-w-6xl p-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">Report Center</h2>
          <p className="text-[13px] text-slate-500">Monitor and analyze all activities from mobile users</p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-slate-600">
              <i className="fas fa-calendar mr-1.5 text-slate-400" />
              {fmtRange(data.from, data.to)}
            </span>
          )}
          <button
            type="button"
            onClick={exportCSV}
            disabled={!data}
            className="rounded-xl bg-brand px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
          >
            <i className="fas fa-download mr-1.5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block min-w-[170px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Select report type</span>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1) }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
          >
            {TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-[190px] flex-1">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Search</span>
          <span className="relative block">
            <i className="fas fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-slate-300" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Name or ID…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </span>
        </label>
        <label className="block min-w-[130px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">User role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
          >
            <option value="">Choose role…</option>
            <option value="all">Everyone</option>
            <option value="teacher">Teachers</option>
            <option value="staff">Staff</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Date range</span>
          <span className="flex items-center gap-1.5">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold outline-none focus:border-brand" />
            <span className="text-[11px] font-bold text-slate-400">to</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold outline-none focus:border-brand" />
          </span>
        </label>
        <button
          type="button"
          onClick={() => { setFrom(monthStartISO()); setTo(todayISO()); setRole(''); setType('all'); setQ('') }}
          className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
        >
          <i className="fas fa-rotate-left mr-1.5" />
          Reset
        </button>
        <span className="ml-auto self-center text-[11px] text-slate-400">
          {TYPES.find((t) => t.key === type)?.hint}
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
          <span>{error}</span>
          <button type="button" onClick={load} className="rounded-lg bg-rose-500 px-3 py-1.5 text-[12px] font-extrabold text-white">Retry</button>
        </div>
      )}

      {type === 'monitor' && <SupervisionPanel from={from} to={to} />}
      {type === 'feedback' && <ManagerFeedbackPanel from={from} to={to} />}

      {loading || !data ? (
        <p className="py-16 text-center text-[13px] text-slate-400">{loading ? 'Calculating…' : ''}</p>
      ) : !hasQuery ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[22px] text-brand">
            <i className="fas fa-magnifying-glass" />
          </span>
          <p className="text-[15px] font-extrabold text-slate-700">Search or choose a filter to see the report</p>
          <p className="mt-1 text-[12.5px] text-slate-400">
            {data.people.length} people scored this period — search a name, or pick a role or report type. Every card,
            chart and the table will follow your filter.
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard icon="fa-chart-line" label="Total Records" value={s.total_records.toLocaleString()} extra={dl(delta(s.total_records, prev?.total_records, true))} />
            <StatCard
              icon="fa-gauge" label="Punishment Score (Avg)" value={s.avg_score}
              chip={SEVERITY_META[data.people.length ? severityKeyOf(s.avg_score) : 'info']}
              extra={dl(delta(s.avg_score, prev?.avg_score))}
            />
            <StatCard icon="fa-user-shield" label="High Risk Users" value={s.high_risk} extra={dl(delta(s.high_risk, prev?.high_risk))} />
            <StatCard icon="fa-bolt" label="Total Punishments" value={s.total_punishments} extra={dl(delta(s.total_punishments, prev?.total_punishments, true))} />
            <StatCard icon="fa-triangle-exclamation" label="Severe" value={s.severe} extra={dl(delta(s.severe, prev?.severe))} />
          </div>

          {/* Charts row */}
          <div className="mb-5 grid gap-4 lg:grid-cols-[1.1fr_0.8fr_1.4fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[13.5px] font-extrabold text-slate-800">Punishment by Reason</p>
              <ReasonDonut reasons={view.reasons} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[13.5px] font-extrabold text-slate-800">Punishment by Severity</p>
              <div className="space-y-2.5">
                {view.severity.map((x) => {
                  const m = SEVERITY_META[x.key]
                  return (
                    <div key={x.key} className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                      <span className="w-16 text-[12.5px] font-bold text-slate-600">{m.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${x.pct}%` }} />
                      </div>
                      <span className="w-20 text-right font-mono text-[11px] text-slate-400">{x.count} · {x.pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <ScoreExplainer person={top} weights={data.weights} />
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-[15px] font-extrabold text-slate-800">Punishment Based on Selected Report</p>
            {people.length === 0 ? (
              <p className="px-6 py-10 text-center text-[13px] text-slate-400">No people match these filters.</p>
            ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">{type === 'all' ? 'Punishment score' : `${TYPES.find((t) => t.key === type)?.label} score`}</th>
                    <th className="px-2 py-2">Severity</th>
                    <th className="px-2 py-2">Top reasons</th>
                    <th className="px-2 py-2 text-right">Deduction</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => {
                    const sc = scoreOf(p)
                    const sev = type === 'all' ? p.severity : severityKeyOf(sc)
                    const m = SEVERITY_META[sev]
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setDetail(p)}
                        className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/70"
                      >
                        <td className="whitespace-nowrap px-2 py-3">
                          <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 align-middle text-[10.5px] font-extrabold text-slate-500">
                            {p.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                          </span>
                          <span className="align-middle font-extrabold text-slate-700">{p.name}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 capitalize text-slate-500">{p.role}</td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-10 font-mono text-[12.5px] font-bold text-slate-700">{sc.toFixed(2)}</span>
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                              <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${Math.min(100, (sc / 2) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${m.chip}`}>{m.label}</span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.reasons.slice(0, 2).map((r) => (
                              <span key={r.label} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-500">
                                {r.label}
                              </span>
                            ))}
                            {p.reasons.length > 2 && (
                              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-400">
                                +{p.reasons.length - 2}
                              </span>
                            )}
                            {!p.reasons.length && <span className="text-[11px] text-slate-300">—</span>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right">
                          {p.base_salary > 0 ? (
                            <span className="font-mono text-[12px] font-bold text-rose-500">
                              −{fmtMoney(p.deducted)} <span className="text-slate-400">({(p.deduction_ratio * 100).toFixed(1)}%)</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-300">no salary set</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11.5px] text-slate-400">
                Showing {people.length ? (page - 1) * PAGE + 1 : 0} to {Math.min(page * PAGE, people.length)} of {people.length} people
              </p>
              {pages > 1 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`h-8 w-8 rounded-lg text-[12px] font-extrabold transition ${
                        n === page ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </>
      )}

      {detail && <PersonDetailDialog person={detail} weights={data?.weights} onClose={() => setDetail(null)} />}
    </div>
  )
}

const severityKeyOf = (score) => {
  if (score >= 1.2) return 'severe'
  if (score >= 0.8) return 'high'
  if (score >= 0.45) return 'medium'
  if (score >= 0.15) return 'low'
  return 'info'
}

function StatCard({ icon, label, value, chip, extra }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
        <i className={`fas ${icon} text-brand`} />
        {label}
      </p>
      <p className="text-[24px] font-extrabold leading-none text-slate-800">
        {value}
        {chip && <span className={`ml-2 align-middle rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${chip.chip}`}>{chip.label}</span>}
      </p>
      <p className="mt-1.5 min-h-[14px]">{extra}</p>
    </div>
  )
}

function ReasonDonut({ reasons }) {
  const total = reasons.reduce((n, r) => n + r.count, 0)
  if (!total) return <p className="py-8 text-center text-[12.5px] text-slate-400">No punishments in this period 🎉</p>
  const R = 42
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="h-36 w-36 shrink-0 -rotate-90">
        {reasons.map((r, i) => {
          const frac = r.count / total
          const seg = (
            <circle
              key={r.label}
              cx="55" cy="55" r={R} fill="none"
              stroke={REASON_COLORS[i % REASON_COLORS.length]}
              strokeWidth="14"
              strokeDasharray={`${Math.max(frac * C - 1.5, 0.6)} ${C}`}
              strokeDashoffset={-offset * C}
            />
          )
          offset += frac
          return seg
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {reasons.map((r, i) => (
          <div key={r.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: REASON_COLORS[i % REASON_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{r.label}</span>
            <span className="font-mono font-bold text-slate-700">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* Worked example for the highest-scoring person. */
function ScoreExplainer({ person, weights }) {
  if (!person) return null
  const c = person.components
  const rows = [
    ['Attendance', c.attendance.raw, weights.attendance, 'bg-rose-400'],
    ['Monitor', c.monitor.raw, weights.monitor, 'bg-orange-400'],
    ['Tasks', c.tasks.raw, weights.tasks, 'bg-rose-500'],
    ['Feedback', c.feedback.raw, weights.feedback, 'bg-amber-400'],
  ]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[13.5px] font-extrabold text-slate-800">How a Punishment Score is calculated</p>
        <span className="rounded-lg bg-rose-50 px-2.5 py-1 font-mono text-[13px] font-extrabold text-rose-500">{person.score.toFixed(2)}</span>
      </div>
      <p className="mb-3 text-[11.5px] text-slate-400">
        Worked example for <span className="font-bold text-slate-600">{person.name}</span> · {person.role}, this period
      </p>
      <div className="space-y-2">
        {rows.map(([label, raw, w, bar]) => (
          <div key={label} className="flex items-center gap-2 text-[12px]">
            <span className="w-20 font-semibold text-slate-600">{label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${(raw / 2) * 100}%` }} />
            </div>
            <span className="w-16 text-right font-mono text-[11px] text-slate-400">{raw.toFixed(2)} raw</span>
            <span className="w-12 text-right font-mono text-[11.5px] font-bold text-slate-700">{(raw * w).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 border-t border-dashed border-slate-200 pt-2.5 text-[11.5px] text-slate-500">
        Attendance ({weights.attendance * 100}%) + Monitor ({weights.monitor * 100}%) + Tasks ({weights.tasks * 100}%) + Feedback ({weights.feedback * 100}%)
        <span className="ml-1 font-mono font-extrabold text-rose-500">= {person.score.toFixed(2)}</span>
      </p>
      <div className="mt-3 rounded-xl bg-[#eff6ff] p-3">
        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#1e40af]">
          <i className="fas fa-coins mr-1" />
          Score sets this period's salary deduction ratio
        </p>
        {person.base_salary > 0 ? (
          <p className="font-mono text-[12px] text-slate-600">
            {fmtMoney(person.base_salary)} × <span className="font-bold">{(person.deduction_ratio * 100).toFixed(1)}%</span> ={' '}
            <span className="font-bold text-rose-500">−{fmtMoney(person.deducted)}</span> →{' '}
            <span className="font-bold text-emerald-600">{fmtMoney(person.net_pay)} net</span>
          </p>
        ) : (
          <p className="text-[11.5px] text-slate-400">
            Deduction ratio {(person.deduction_ratio * 100).toFixed(1)}% — set this person's salary in Teachers &amp; Staff to see amounts.
          </p>
        )}
      </div>
    </div>
  )
}

function PersonDetailDialog({ person, weights, onClose }) {
  const c = person.components
  const m = SEVERITY_META[person.severity]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[16px] font-extrabold text-slate-800">{person.name}</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${m.chip}`}>{m.label} · {person.score.toFixed(2)}</span>
        </div>
        <div className="space-y-2 text-[12.5px]">
          <DetailRow label={`Attendance (${weights.attendance * 100}%)`} raw={c.attendance.raw}
            note={`${c.attendance.absent} absent · ${c.attendance.late} late · ${c.attendance.unverified} unverified · ${c.attendance.offsite} off-site of ${c.attendance.workdays} workdays`} />
          <DetailRow label={`Monitor (${weights.monitor * 100}%)`} raw={c.monitor.raw}
            note={`${c.monitor.missing} of ${c.monitor.expected} daily reports missing`} />
          <DetailRow label={`Tasks (${weights.tasks * 100}%)`} raw={c.tasks.raw}
            note={`${c.tasks.overdue} of ${c.tasks.total} task items past deadline`} />
          <DetailRow label={`Feedback (${weights.feedback * 100}%)`} raw={c.feedback.raw}
            note={`${c.feedback.count} feedback note${c.feedback.count === 1 ? '' : 's'} recorded`} />
        </div>
        {person.base_salary > 0 && (
          <p className="mt-4 rounded-xl bg-slate-50 p-3 font-mono text-[12px] text-slate-600">
            {fmtMoney(person.base_salary)} × {(person.deduction_ratio * 100).toFixed(1)}% ={' '}
            <span className="font-bold text-rose-500">−{fmtMoney(person.deducted)}</span> →{' '}
            <span className="font-bold text-emerald-600">{fmtMoney(person.net_pay)}</span>
          </p>
        )}
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-500 hover:bg-slate-50">
          Close
        </button>
      </div>
    </div>
  )
}

function DetailRow({ label, raw, note }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-extrabold text-slate-700">{label}</span>
        <span className="font-mono text-[12px] font-bold text-slate-600">{raw.toFixed(2)} / 2</span>
      </div>
      <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand" style={{ width: `${(raw / 2) * 100}%` }} />
      </div>
      <p className="text-[11px] text-slate-400">{note}</p>
    </div>
  )
}

/* Supervisor daily reviews (Do / Don't) from the StudyNal app — the raw
   submissions behind the Monitor component's daily reports. */
function SupervisionPanel({ from, to }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!from || !to || to < from) return
      setLoading(true)
      setError('')
      try {
        const d = await api.get(`/api/supervision/reports?from=${from}&to=${to}`)
        if (alive) setRows(d.rows || [])
      } catch (e) {
        if (alive) {
          setError(e.message || 'Could not load supervision reports')
          setRows([])
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [from, to])

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[14.5px] font-extrabold text-slate-800">Supervision Reviews</p>
        <span className="text-[11px] text-slate-400">
          {rows.length} mark{rows.length === 1 ? '' : 's'} in this period
        </span>
      </div>
      <p className="mb-3 text-[11.5px] text-slate-400">
        Daily Do / Don&apos;t task reviews submitted by supervisors in the StudyNal app.
      </p>
      {error ? (
        <p className="py-6 text-center text-[12.5px] font-bold text-rose-500">{error}</p>
      ) : loading ? (
        <p className="py-6 text-center text-[13px] text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-slate-400">No supervisor reviews in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] tracking-wide text-slate-400 uppercase">
                <th className="px-2 py-2 font-bold">Date</th>
                <th className="px-2 py-2 font-bold">Employee</th>
                <th className="px-2 py-2 font-bold">Role</th>
                <th className="px-2 py-2 font-bold">Task</th>
                <th className="px-2 py-2 font-bold">Mark</th>
                <th className="px-2 py-2 font-bold">Supervisor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="whitespace-nowrap px-2 py-2 text-slate-400">{r.report_date}</td>
                  <td className="px-2 py-2 font-bold text-slate-700">{r.employee}</td>
                  <td className="px-2 py-2 text-slate-400">{r.employee_role}</td>
                  <td className="px-2 py-2 text-slate-600">{r.task}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-extrabold ${
                        r.done ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                      }`}
                    >
                      {r.done ? 'Do' : "Don't"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-500">{r.supervisor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* Manager evaluations (Reward / Normal / Punish) submitted from the StudyNal
   app after reading Collab staff reports. */
const EVAL_CHIP = {
  reward: 'bg-emerald-50 text-emerald-600',
  normal: 'bg-slate-100 text-slate-500',
  punish: 'bg-rose-50 text-rose-500',
}

function ManagerFeedbackPanel({ from, to }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!from || !to || to < from) return
      setLoading(true)
      setError('')
      try {
        const d = await api.get(`/api/manager/feedback?from=${from}&to=${to}`)
        if (alive) setData(d)
      } catch (e) {
        if (alive) {
          setError(e.message || 'Could not load manager feedback')
          setData(null)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [from, to])

  const rows = data?.rows || []
  const summary = data?.summary || { reward: 0, normal: 0, punish: 0 }

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14.5px] font-extrabold text-slate-800">Manager Feedback</p>
        <span className="flex gap-1.5 text-[11px] font-extrabold">
          <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-600">{summary.reward} reward</span>
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-slate-500">{summary.normal} normal</span>
          <span className="rounded-lg bg-rose-50 px-2 py-0.5 text-rose-500">{summary.punish} punish</span>
        </span>
      </div>
      <p className="mb-3 text-[11.5px] text-slate-400">
        Final evaluations managers submitted in the StudyNal app after reviewing Collab staff reports.
      </p>
      {error ? (
        <p className="py-6 text-center text-[12.5px] font-bold text-rose-500">{error}</p>
      ) : loading ? (
        <p className="py-6 text-center text-[13px] text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-slate-400">No manager evaluations in this period yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10.5px] tracking-wide text-slate-400 uppercase">
                <th className="px-2 py-2 font-bold">Date</th>
                <th className="px-2 py-2 font-bold">Staff name</th>
                <th className="px-2 py-2 font-bold">Role</th>
                <th className="px-2 py-2 font-bold">Evaluate</th>
                <th className="px-2 py-2 font-bold">Note</th>
                <th className="px-2 py-2 font-bold">Manager</th>
                <th className="px-2 py-2 text-right font-bold">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setDetail(r)}
                  className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-2 py-2 text-slate-400">{r.report_date}</td>
                  <td className="px-2 py-2 font-bold text-slate-700">{r.employee}</td>
                  <td className="px-2 py-2 text-slate-400">{r.employee_role}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-extrabold capitalize ${
                        EVAL_CHIP[r.evaluation] || 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {r.evaluation}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-2 py-2 text-slate-500" title={r.note}>{r.note}</td>
                  <td className="px-2 py-2 text-slate-500">{r.manager}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(r)}
                      title="View the full report — photos and voice notes"
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-slate-500 transition hover:border-brand hover:text-brand"
                    >
                      <i className="fas fa-eye text-[12px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && <FeedbackDetailDialog row={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

/* Full detail for one manager evaluation: the verdict and note, plus the
   Collab report it was based on — text, photos and voice notes. */
function FeedbackDetailDialog({ row, onClose }) {
  const report = row.report

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[17px] font-extrabold text-slate-800">{row.employee}</p>
            <p className="text-[12px] text-slate-400">
              {[row.employee_role, row.report_date].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 text-[12px] font-extrabold capitalize ${
              EVAL_CHIP[row.evaluation] || 'bg-slate-100 text-slate-500'
            }`}
          >
            {row.evaluation}
          </span>
          <span className="text-[12px] text-slate-400">
            by <span className="font-bold text-slate-600">{row.manager}</span>
          </span>
        </div>

        {row.note && (
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              Manager&apos;s note
            </p>
            <p className="text-[12.5px] leading-relaxed text-slate-600">{row.note}</p>
          </div>
        )}

        <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          Collab report
        </p>
        {report ? (
          <ReportCard report={report} />
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] text-slate-400">
            No report was submitted on this day — the manager evaluated without one.
          </p>
        )}
      </div>
    </div>
  )
}
