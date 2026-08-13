import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import Skeleton from '../components/ui/Skeleton'

const PERIODS = {
  daily: { label: 'Daily', hint: 'Tap a person to see their day — progress, pending & overdue' },
  weekly: { label: 'Weekly', hint: 'Monday–Sunday rollup per person for the selected week' },
  monthly: { label: 'Monthly', hint: 'Full-month progress per person for the selected month' },
  custom: { label: 'Custom', hint: 'Pick any date range — for reporting and download' },
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
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    })
  }
  const day = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Baghdad',
  })
  const hasTime = String(iso).length > 10
  if (!hasTime) return day
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Baghdad',
  })
  return `${day} · ${time}`
}

function periodLabel(period, from, to) {
  if (period === 'daily') return fmtDay(from)
  return `${fmtDay(from)} → ${fmtDay(to)}`
}

export default function PeriodReports() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('period')
  const period = PERIODS[raw] ? raw : 'daily'
  const meta = PERIODS[period]
  const [date, setDate] = useState(params.get('date') || todayISO())
  const [customFrom, setCustomFrom] = useState(params.get('from') || `${todayISO().slice(0, 8)}01`)
  const [customTo, setCustomTo] = useState(params.get('to') || todayISO())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('people')
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')

  const setPeriod = (next) => {
    const q = new URLSearchParams(params)
    q.set('period', next)
    setParams(q)
    setSelectedId(null)
  }

  useEffect(() => {
    let live = true
    setLoading(true)
    setError('')
    setSelectedId(null)
    if (period === 'custom' && (!customFrom || !customTo || customTo < customFrom)) {
      setLoading(false)
      setData(null)
      return undefined
    }
    api
      .get(
        period === 'custom'
          ? `/api/reports/period?period=custom&from=${customFrom}&to=${customTo}`
          : `/api/reports/period?period=${period}&date=${date}`
      )
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
  }, [period, date, customFrom, customTo])

  const downloadCSV = () => {
    if (!data) return
    const esc = (v) => {
      const str = String(v ?? '')
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
    }
    const lines = []
    lines.push(['HRNAL report', `${data.from} to ${data.to}`].map(esc).join(','))
    lines.push(['Generated', new Date().toLocaleString()].map(esc).join(','))
    lines.push('')
    lines.push(
      ['Name', 'Role', 'Progress %', 'Completed', 'Pending', 'Overdue', 'Total tasks', 'Days present', 'Status']
        .map(esc)
        .join(',')
    )
    for (const p of data.people || []) {
      const g = p.progress || {}
      lines.push(
        [
          p.name,
          p.role,
          g.percent ?? 0,
          g.completed ?? 0,
          g.pending ?? 0,
          g.overdue ?? 0,
          g.total ?? 0,
          p.attendance?.days_present ?? (p.attendance?.status === 'present' || p.attendance?.status === 'late' ? 1 : 0),
          p.attendance?.status || '',
        ]
          .map(esc)
          .join(',')
      )
    }
    if (data.faults?.length) {
      lines.push('')
      lines.push(['Faults'].map(esc).join(','))
      lines.push(['Name', 'Amount', 'Date', 'Reason'].map(esc).join(','))
      for (const f of data.faults) {
        lines.push([f.name || f.staff_name || '', f.amount ?? f.punish ?? '', f.date || '', f.reason || f.note || ''].map(esc).join(','))
      }
    }
    // BOM so Excel opens Kurdish/Arabic text correctly.
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `HRNAL-report-${data.from}_to_${data.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const s = data?.summary
  const selected = useMemo(
    () => (data?.people || []).find((p) => p.id === selectedId) || null,
    [data, selectedId]
  )

  const people = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.people || []).filter((p) => {
      if (!q) return true
      return p.name.toLowerCase().includes(q) || String(p.role || '').includes(q)
    })
  }, [data, search])

  const tabs = useMemo(
    () => [
      { key: 'people', label: 'People', count: data?.people?.length },
      { key: 'attendance', label: 'Attendance', count: data?.attendance?.total },
      { key: 'unfinished', label: 'Unfinished', count: data?.unfinished_tasks?.length },
      { key: 'delayed', label: 'Overdue', count: data?.delayed_tasks?.length },
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
              {periodLabel(period, data.from, data.to)}
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
        <div className="flex flex-wrap items-center gap-2">
          {period === 'custom' ? (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value)
                  const q = new URLSearchParams(params)
                  q.set('from', e.target.value)
                  setParams(q)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
              />
              <span className="text-[12px] font-bold text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => {
                  setCustomTo(e.target.value)
                  const q = new URLSearchParams(params)
                  q.set('to', e.target.value)
                  setParams(q)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </>
          ) : (
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
          )}
          <button
            type="button"
            onClick={downloadCSV}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            <i className="fas fa-download text-[11px]" />
            Download
          </button>
        </div>
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
            <Stat tone="text-amber-500" label="Pending tasks" value={s.tasks_pending ?? s.tasks_unfinished} sub="before deadline" />
            <Stat tone="text-danger" label="Overdue" value={s.tasks_delayed} sub={`${s.completion_rate ?? '—'}% done overall`} />
            <Stat tone="text-kpi-blue" label="Faults" value={s.faults_count} sub={fmtMoney(s.faults_total)} />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key)
                  if (t.key !== 'people') setSelectedId(null)
                }}
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

          {tab === 'people' && (
            <div className={`grid gap-4 ${selected ? 'lg:grid-cols-[1fr_1.15fr]' : ''}`}>
              <div>
                <div className="mb-3 relative">
                  <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-300" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people…"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand"
                  />
                </div>
                <PeopleList
                  people={people}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  period={period}
                />
              </div>
              {selected && (
                <PersonDetail
                  person={selected}
                  period={period}
                  rangeLabel={periodLabel(period, data.from, data.to)}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </div>
          )}
          {tab === 'attendance' && <AttendanceTable people={data.attendance.people} period={period} />}
          {tab === 'unfinished' && <TaskTable rows={data.unfinished_tasks} empty="No unfinished tasks in this period." />}
          {tab === 'delayed' && <TaskTable rows={data.delayed_tasks} empty="No overdue tasks — great work." highlight />}
          {tab === 'faults' && <FaultsTable faults={data.faults} rewards={data.rewards} />}
        </>
      )}
    </div>
  )
}

function PeopleList({ people, selectedId, onSelect, period }) {
  if (!people?.length) return <Empty text="No staff for this period." />
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-50">
        {people.map((p) => {
          const g = p.progress || {}
          const active = selectedId === p.id
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : p.id)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${
                  active ? 'bg-brand-soft/50' : 'hover:bg-slate-50/80'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-extrabold text-slate-600">
                  {(p.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[14px] font-extrabold text-slate-800">{p.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                      {p.role}
                    </span>
                    {p.attendance && <StatusPill status={p.attendance.status} />}
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-400">
                    {g.total
                      ? `${g.percent}% · ${g.completed} done · ${g.pending} pending · ${g.overdue} overdue`
                      : 'No tasks in this period'}
                    {period !== 'daily' && p.attendance
                      ? ` · ${p.attendance.days_present || 0}d present`
                      : ''}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[16px] font-extrabold text-brand">{g.percent ?? 0}%</p>
                  <p className="text-[10px] font-semibold text-slate-400">progress</p>
                </div>
                <i className={`fas fa-chevron-right text-[11px] ${active ? 'text-brand' : 'text-slate-300'}`} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PersonDetail({ person, period, rangeLabel, onClose }) {
  const g = person.progress || {}
  const pct = g.percent || 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-[16px] font-extrabold text-slate-800">{person.name}</p>
          <p className="text-[12px] capitalize text-slate-400">
            {person.role} · {rangeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-50 hover:text-slate-500"
        >
          <i className="fas fa-xmark" />
        </button>
      </div>

      {/* Overall progress — inspired by mobile card */}
      <div className="rounded-2xl bg-brand px-4 py-4 text-white shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold">Overall Progress</p>
          <p className="text-[18px] font-extrabold">{pct}%</p>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[12px] font-semibold text-white/90">
          <span>
            {g.completed || 0} of {g.total || 0} completed
          </span>
          <span>{g.remaining || 0} remaining</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <MiniStat
          icon="fa-circle-check"
          tone="text-emerald-600"
          soft="bg-emerald-50 border-emerald-100"
          value={g.completed || 0}
          label="Completed"
        />
        <MiniStat
          icon="fa-ellipsis"
          tone="text-amber-600"
          soft="bg-amber-50 border-amber-100"
          value={g.pending || 0}
          label="Pending"
        />
        <MiniStat
          icon="fa-clock"
          tone="text-red-500"
          soft="bg-red-50 border-red-100"
          value={g.overdue || 0}
          label="Overdue"
        />
        <MiniStat
          icon="fa-list-check"
          tone="text-sky-600"
          soft="bg-sky-50 border-sky-100"
          value={g.total || 0}
          label="Total Tasks"
        />
      </div>

      {person.attendance && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Attendance
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <StatusPill status={person.attendance.status} />
            {period === 'daily' ? (
              <span className="text-slate-500">
                In {fmtTime(person.attendance.check_in_time)} · Out {fmtTime(person.attendance.check_out_time)}
              </span>
            ) : (
              <span className="text-slate-500">
                {person.attendance.days_present} present · {person.attendance.days_late} late ·{' '}
                {person.attendance.days_absent} absent
              </span>
            )}
          </div>
        </div>
      )}

      <SubmittedReports userId={person.id} period={period} />

      <TaskSection title="Overdue" rows={person.tasks?.overdue} empty="None overdue" danger />
      <TaskSection title="Pending" rows={person.tasks?.pending} empty="None pending" />
      <TaskSection title="Completed" rows={person.tasks?.completed} empty="None completed" done />

      {(person.faults?.length > 0 || person.rewards?.length > 0) && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl bg-red-50 px-3 py-2">
            <p className="font-bold text-danger">Faults</p>
            <p className="text-[15px] font-extrabold text-danger">−{fmtMoney(person.faults_total)}</p>
          </div>
          <div className="rounded-xl bg-brand-soft px-3 py-2">
            <p className="font-bold text-brand">Rewards</p>
            <p className="text-[15px] font-extrabold text-brand">+{fmtMoney(person.rewards_total)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

const URL_RE = /https?:\/\/\S+/g
const ATTACHMENT_RE = /\[attachment:([^\]]+)\]/g
const isImage = (u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
const isAudio = (u) => /\.(m4a|aac|mp3|wav|ogg|webm)(\?|$)/i.test(u)

/** Storage is private — swap a storage path for a short-lived signed URL. */
function useSignedUrls(paths) {
  const key = paths.join('|')
  const [urls, setUrls] = useState({})

  useEffect(() => {
    let live = true
    if (!key) {
      setUrls({})
      return undefined
    }
    Promise.all(
      key.split('|').map((p) =>
        api
          .get(`/api/uploads/signed?path=${encodeURIComponent(p)}`)
          .then((d) => [p, d?.url || ''])
          .catch(() => [p, ''])
      )
    ).then((pairs) => live && setUrls(Object.fromEntries(pairs)))
    return () => {
      live = false
    }
  }, [key])

  return urls
}

/**
 * Written / photo / voice reports the person submitted from the app
 * (`daily_reports`). Attachments arrive as links inside the text, so pull them
 * out and show the photo and play the voice note here.
 */
function SubmittedReports({ userId, period }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setRows(null)
    setError('')
    api
      .get(`/api/daily-reports/user/${userId}?limit=${period === 'daily' ? 3 : 30}`)
      .then((d) => live && setRows(Array.isArray(d) ? d : d?.data || []))
      .catch((err) => live && setError(err.message))
    return () => {
      live = false
    }
  }, [userId, period])

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
        Submitted Reports
      </p>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[12px] text-danger">{error}</p>}
      {!rows && !error && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-400">Loading…</p>
      )}
      {rows?.length === 0 && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-400">
          No reports submitted
        </p>
      )}
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {(rows || []).map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </div>
    </div>
  )
}

function ReportCard({ report }) {
  const text = report.content || ''
  // Attachments come as `[attachment:<storage path>]`; older reports may still
  // carry raw links.
  const paths = useMemo(
    () => [...text.matchAll(ATTACHMENT_RE)].map((m) => m[1].trim()),
    [text]
  )
  const signed = useSignedUrls(paths)

  // Classify by the original name (the signed URL has query params), keeping
  // raw-link attachments from older reports working too.
  const items = [
    ...paths.map((p) => ({ name: p, url: signed[p] })),
    ...(text.match(URL_RE) || []).map((u) => ({ name: u, url: u })),
  ]
  const ready = items.filter((it) => it.url)
  const images = ready.filter((it) => isImage(it.name))
  const audios = ready.filter((it) => isAudio(it.name))
  const files = ready.filter((it) => !isImage(it.name) && !isAudio(it.name))
  const pending = items.length - ready.length
  const prose = text
    .replace(ATTACHMENT_RE, '')
    .replace(URL_RE, '')
    .replace(/^[ \t]*(📷 Image:|🎙 Voice report:)[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">
          {String(report.date || '').slice(0, 10)}
        </span>
        {report.tasks_total > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">
            {report.tasks_completed}/{report.tasks_total} tasks
          </span>
        )}
      </div>
      {prose && (
        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-600">{prose}</p>
      )}
      {pending > 0 && (
        <p className="mt-2 text-[11.5px] text-slate-400">Loading {pending} attachment(s)…</p>
      )}
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((it) => (
            <a key={it.name} href={it.url} target="_blank" rel="noreferrer">
              <img
                src={it.url}
                alt="Report attachment"
                className="h-20 w-20 rounded-lg border border-slate-200 object-cover hover:opacity-90"
              />
            </a>
          ))}
        </div>
      )}
      {audios.map((it) => (
        <audio key={it.name} controls preload="none" src={it.url} className="mt-2 h-9 w-full" />
      ))}
      {files.map((it) => (
        <a
          key={it.name}
          href={it.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-[12px] font-semibold text-brand hover:underline"
        >
          📎 {it.name}
        </a>
      ))}
    </div>
  )
}

function MiniStat({ icon, tone, soft, value, label }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${soft}`}>
      <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 ${tone}`}>
        <i className={`fas ${icon} text-[13px]`} />
      </span>
      <p className={`text-[22px] font-extrabold leading-6 ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p>
    </div>
  )
}

function TaskSection({ title, rows, empty, danger, done }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {!rows?.length ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-400">{empty}</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {rows.map((t) => (
            <li
              key={t.id}
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[12.5px] ${
                danger ? 'border-red-100 bg-red-50/40' : done ? 'border-slate-100 bg-slate-50/50' : 'border-slate-100'
              }`}
            >
              <span className={`min-w-0 truncate font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {t.title}
              </span>
              <span className="shrink-0 text-[11px] text-slate-400">{fmtDay(t.due_at)}</span>
            </li>
          ))}
        </ul>
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
              <td className="px-4 py-2.5 font-semibold text-slate-700">{p.name}</td>
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
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-danger">Overdue</span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                    Pending
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
