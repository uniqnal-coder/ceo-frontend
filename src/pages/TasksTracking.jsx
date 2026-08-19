import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, toArray } from '../api/client'
import Skeleton from '../components/ui/Skeleton'
import { PlannerView, PlanEditDialog, planFiresOn } from './AutoTask'
import { toast } from '../utils/toast'

const ROLE_BADGE = {
  teacher: 'bg-violet-50 text-violet-600',
  staff: 'bg-sky-50 text-sky-600',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

const fmtTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Baghdad' })
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

/* Per-user detail for one calendar day — progress, buckets, attendance. */
function DayDetailDialog({ person, dayISO, checkin, onClose }) {
  const items = person.itemsByDay.get(dayISO) || []
  const done = items.filter((t) => t.status === 'completed')
  const open = items.filter((t) => t.status !== 'completed')
  const overdue = open.filter((t) => t.overdue)
  const pending = open.filter((t) => !t.overdue)
  const pct = items.length ? Math.round((done.length / items.length) * 100) : 0
  const dayLabel = new Date(`${dayISO}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[20px] font-extrabold text-slate-800">{person.name}</p>
            <p className="text-[12.5px] font-semibold capitalize text-slate-400">
              {person.role} · {dayLabel}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl bg-brand p-4 text-white shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[14px] font-extrabold">Overall Progress</p>
            <p className="text-[20px] font-extrabold">{pct}%</p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px] font-semibold text-white/85">
            <span>{done.length} of {items.length} completed</span>
            <span>{open.length} remaining</span>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-emerald-50/70 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-500"><i className="fas fa-circle-check" /></span>
            <p className="mt-2 text-[24px] font-extrabold leading-6 text-emerald-600">{done.length}</p>
            <p className="text-[12px] font-semibold text-slate-500">Completed</p>
          </div>
          <div className="rounded-2xl bg-amber-50/70 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-amber-500"><i className="fas fa-ellipsis" /></span>
            <p className="mt-2 text-[24px] font-extrabold leading-6 text-amber-600">{pending.length}</p>
            <p className="text-[12px] font-semibold text-slate-500">Pending</p>
          </div>
          <div className="rounded-2xl bg-red-50/70 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500"><i className="fas fa-clock" /></span>
            <p className="mt-2 text-[24px] font-extrabold leading-6 text-red-500">{overdue.length}</p>
            <p className="text-[12px] font-semibold text-slate-500">Overdue</p>
          </div>
          <div className="rounded-2xl bg-sky-50/70 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sky-500"><i className="fas fa-list-check" /></span>
            <p className="mt-2 text-[24px] font-extrabold leading-6 text-sky-600">{items.length}</p>
            <p className="text-[12px] font-semibold text-slate-500">Total Tasks</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-100 p-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Attendance</p>
          {checkin === undefined ? (
            <p className="text-[12.5px] text-slate-400">Loading…</p>
          ) : checkin && checkin.check_in_time ? (
            <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-600">
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11.5px] font-extrabold text-brand">Present</span>
              In {fmtTime(checkin.check_in_time)} · Out {checkin.check_out_time ? fmtTime(checkin.check_out_time) : '—'}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-600">
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11.5px] font-extrabold text-red-500">Absent</span>
              In — · Out —
            </p>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            {overdue.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Overdue</p>
                <TaskList rows={overdue} empty="" tone="pending" />
              </div>
            )}
            {pending.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Pending</p>
                <TaskList rows={pending} empty="" tone="pending" />
              </div>
            )}
            {done.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
                <TaskList rows={done} empty="" tone="done" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksTracking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('') // '' = not chosen | all | pending | overdue | done
  const [roleF, setRoleF] = useState('') // '' = not chosen | all | teacher | staff
  const view = 'tracking' // Year Planner removed — Tracking projects plans itself
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [detail, setDetail] = useState(null) // person for day dialog
  const [checkinsByDay, setCheckinsByDay] = useState(new Map()) // dayISO -> Map(user_id -> checkin)

  // Year Planner (moved here from Assign Task)
  const [plans, setPlans] = useState(null)
  const [editPlan, setEditPlan] = useState(null)
  // Role task lists (per role) — resolve what an auto plan sends each day.
  const [rolePools, setRolePools] = useState(null)

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

  const loadPlans = async () => {
    try {
      setPlans(toArray(await api.get('/api/task-schedules')))
    } catch {
      setPlans([])
    }
  }

  useEffect(() => {
    load()
    loadPlans()
    Promise.all([
      api.get('/api/role-tasks?role=teacher').catch(() => []),
      api.get('/api/role-tasks?role=staff').catch(() => []),
    ]).then(([teacher, staff]) => setRolePools({ teacher: toArray(teacher), staff: toArray(staff) }))
  }, [])

  // Attendance for the selected day (for the person dialog).
  useEffect(() => {
    if (checkinsByDay.has(selectedDate)) return
    let live = true
    api
      .get(`/api/checkins/overview?date=${selectedDate}`)
      .then((d) => {
        if (!live) return
        const m = new Map()
        for (const c of d?.checkins || []) m.set(c.user_id, c)
        setCheckinsByDay((prev) => new Map(prev).set(selectedDate, m))
      })
      .catch(() => {
        if (live) setCheckinsByDay((prev) => new Map(prev).set(selectedDate, new Map()))
      })
    return () => { live = false }
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const calCellsKey = `${calYear}-${calMonth}`

  // Future days covered by active plans, projected before the scheduler
  // materializes them — so an assignment for 13→31 Aug shows on the
  // calendar the moment it is created.
  const virtualByPerson = useMemo(() => {
    const out = new Map() // user_id -> Map(day -> items)
    if (!plans || !data) return out
    const tISO = todayISO()
    const first = new Date(calYear, calMonth, 1)
    const count = new Date(calYear, calMonth + 1, 0).getDate()
    const days = []
    for (let d = 1; d <= count; d += 1) {
      days.push(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    if (!days.includes(selectedDate)) days.push(selectedDate)
    const future = days.filter((d) => d > tISO)
    if (!future.length) return out

    const titlesFor = (pl, dayISO) => {
      const dow = new Date(`${dayISO}T00:00:00`).getDay()
      const bucket = pl.day_titles && pl.day_titles[String(dow)]
      if (Array.isArray(bucket) && bucket.length) return bucket
      if (pl.titles?.length) return pl.titles
      const pool = rolePools?.[pl.role] || []
      const scoped = pl.category_id ? pool.filter((x) => x.category_id === pl.category_id) : pool
      return scoped.map((x) => x.title)
    }

    for (const pl of plans) {
      if (pl.active === false) continue
      for (const day of future) {
        if (!planFiresOn(pl, day)) continue
        const titles = titlesFor(pl, day)
        if (!titles.length) continue
        for (const p of data.people || []) {
          const targeted = pl.user_ids?.length ? pl.user_ids.includes(p.user_id) : pl.role === p.role
          if (!targeted) continue
          if (!out.has(p.user_id)) out.set(p.user_id, new Map())
          const dm = out.get(p.user_id)
          if (!dm.has(day)) dm.set(day, [])
          const list = dm.get(day)
          for (const title of titles) {
            if (!list.some((x) => x.title === title)) {
              list.push({
                id: `v:${pl.id}:${day}:${title}`,
                title,
                status: 'scheduled',
                virtual: true,
                due_at: `${day}T${pl.due_time || '17:00'}:00`,
              })
            }
          }
        }
      }
    }
    return out
  }, [plans, rolePools, data, calCellsKey, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  // People enriched with a day-indexed view of their tasks. Real tasks
  // win; scheduled projections fill days that have nothing yet.
  const enriched = useMemo(() => {
    return (data?.people || []).map((p) => {
      const itemsByDay = new Map()
      for (const t of p.assigned_tasks || []) {
        const day = String(t.due_at || '').slice(0, 10)
        if (!day) continue
        if (!itemsByDay.has(day)) itemsByDay.set(day, [])
        itemsByDay.get(day).push(t)
      }
      const vm = virtualByPerson.get(p.user_id)
      if (vm) {
        for (const [day, items] of vm) {
          if (!itemsByDay.has(day)) itemsByDay.set(day, items)
        }
      }
      return { ...p, itemsByDay }
    })
  }, [data, virtualByPerson])

  // Calendar cells: per-day totals across everyone.
  const dayTotals = useMemo(() => {
    const m = new Map()
    for (const p of enriched) {
      for (const [day, items] of p.itemsByDay) {
        const cur = m.get(day) || { total: 0, done: 0, overdue: 0 }
        for (const t of items) {
          cur.total += 1
          if (t.status === 'completed') cur.done += 1
          else if (t.overdue) cur.overdue += 1
        }
        m.set(day, cur)
      }
    }
    return m
  }, [enriched])

  const calCells = useMemo(() => {
    const first = new Date(calYear, calMonth, 1)
    const cells = Array.from({ length: first.getDay() }, () => null)
    const count = new Date(calYear, calMonth + 1, 0).getDate()
    for (let d = 1; d <= count; d += 1) {
      cells.push(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return cells
  }, [calYear, calMonth])

  // People list for the selected date: only those with work that day, with
  // that day's counts. Search + status filters apply to the day view.
  const trackingActive = !!(search.trim() || filter || roleF)
  const dayPeople = useMemo(() => {
    if (!trackingActive) return []
    const q = search.trim().toLowerCase()
    return enriched
      .filter((p) => !(roleF === 'teacher' || roleF === 'staff') || p.role === roleF)
      .map((p) => {
        const items = p.itemsByDay.get(selectedDate) || []
        const done = items.filter((t) => t.status === 'completed')
        const open = items.filter((t) => t.status !== 'completed')
        const overdue = open.filter((t) => t.overdue)
        const pending = open.filter((t) => !t.overdue)
        return { ...p, day: { items, done, pending, overdue } }
      })
      .filter((p) => {
        if (!p.day.items.length) return false
        if (filter === 'pending' && !p.day.pending.length) return false
        if (filter === 'overdue' && !p.day.overdue.length) return false
        if (filter === 'done' && !(p.day.items.length && !p.day.pending.length && !p.day.overdue.length)) return false
        if (!q) return true
        if (p.name.toLowerCase().includes(q)) return true
        return p.day.items.some((t) => t.title.toLowerCase().includes(q))
      })
      .sort((a, b) => {
        if (b.day.overdue.length !== a.day.overdue.length) return b.day.overdue.length - a.day.overdue.length
        return String(a.name).localeCompare(String(b.name))
      })
  }, [enriched, selectedDate, search, filter, roleF, trackingActive])

  const togglePlan = async (plan) => {
    try {
      await api.patch(`/api/task-schedules/${plan.id}`, { active: !plan.active })
      loadPlans()
    } catch (e) {
      toast.error(e.message || 'Update failed')
    }
  }

  const s = data?.summary
  const today = todayISO()
  const selLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long',
  })

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
            onClick={() => { load(); loadPlans() }}
            className="rounded-xl bg-brand px-3.5 py-2 text-[12.5px] font-extrabold text-white shadow-sm hover:opacity-90"
          >
            Refresh
          </button>
        </div>
      </div>

      {view === 'tracking' && loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {view === 'tracking' && !loading && error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <span>{error}</span>
          <button type="button" onClick={load} className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-extrabold text-white hover:opacity-90">
            Retry
          </button>
        </div>
      )}

      {view === 'tracking' && !loading && !error && data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatTile label="Staff" value={s.staff} tone="text-slate-700" soft="bg-slate-50" />
            <StatTile label="Assigned" value={s.assigned} tone="text-slate-700" soft="bg-slate-50" />
            <StatTile label="Completed" value={s.completed} tone="text-brand" soft="bg-brand-soft" />
            <StatTile label="Pending" value={s.pending} tone="text-amber-600" soft="bg-amber-50" />
            <StatTile label="Overdue" value={s.overdue} tone="text-red-500" soft="bg-red-50" />
          </div>

          {/* Month calendar — tap a date to see everyone's work that day */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => { const m = calMonth - 1; if (m < 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(m) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <i className="fas fa-chevron-left text-[12px]" />
              </button>
              <p className="text-[15px] font-extrabold text-slate-800">{MONTHS[calMonth]} {calYear}</p>
              <button
                type="button"
                onClick={() => { const m = calMonth + 1; if (m > 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(m) }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"
              >
                <i className="fas fa-chevron-right text-[12px]" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <p key={w} className={`pb-1 text-center text-[10.5px] font-bold uppercase ${w === 'Fri' || w === 'Sat' ? 'text-red-300' : 'text-slate-400'}`}>{w}</p>
              ))}
              {calCells.map((day, i) => {
                if (!day) return <div key={`x${i}`} />
                const t = dayTotals.get(day)
                const isSel = day === selectedDate
                const isToday = day === today
                const allDone = t && t.done === t.total
                const hasOverdue = t && t.overdue > 0
                const openCount = t ? t.total - t.done : 0
                let tone = 'hover:bg-slate-50 text-slate-600'
                if (t) {
                  if (allDone) tone = 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  else if (hasOverdue) tone = 'bg-red-50 text-red-600 hover:bg-red-100'
                  else tone = 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={`flex h-14 flex-col items-center justify-center rounded-xl text-[13px] font-extrabold transition ${tone} ${
                      isSel ? 'ring-2 ring-brand ring-offset-1' : ''
                    } ${isToday && !isSel ? 'ring-1 ring-slate-300' : ''}`}
                  >
                    <span>{Number(day.slice(8, 10))}</span>
                    {t ? (
                      day > today && !hasOverdue ? (
                        <span className="mt-0.5 flex gap-0.5">
                          {Array.from({ length: Math.min(3, t.total) }).map((_, j) => (
                            <span key={j} className="h-1 w-1 rounded-full bg-sky-400" />
                          ))}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold opacity-70">{allDone ? '✓' : openCount}</span>
                      )
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="mr-1 text-[13.5px] font-extrabold text-slate-700">
              <i className="fas fa-calendar-day mr-1.5 text-brand" />
              {selLabel}
            </p>
            <div className="relative min-w-[200px] flex-1">
              <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by staff or task name…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand"
              />
            </div>
            <select
              value={roleF}
              onChange={(e) => setRoleF(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
            >
              <option value="">Choose role…</option>
              <option value="all">Everyone</option>
              <option value="teacher">Teachers</option>
              <option value="staff">Staff</option>
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
            >
              <option value="">Choose status…</option>
              <option value="all">Any status</option>
              <option value="pending">Has pending</option>
              <option value="overdue">Has overdue</option>
              <option value="done">All done</option>
            </select>
            {trackingActive && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilter(''); setRoleF('') }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
              >
                <i className="fas fa-rotate-left mr-1.5" />
                Clear
              </button>
            )}
          </div>

          {!trackingActive ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[22px] text-brand">
                <i className="fas fa-magnifying-glass" />
              </span>
              <p className="text-[15px] font-extrabold text-slate-700">Search or choose a filter to see staff</p>
              <p className="mt-1 text-[12.5px] text-slate-400">
                Pick a role or status, or search a name — the list shows who has work on the selected day.
              </p>
            </div>
          ) : dayPeople.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-[13px] text-slate-400">
              No tasks on this date for this filter. Tap another day on the calendar or clear the filters.
            </div>
          ) : (
            <div className="space-y-2.5">
              {dayPeople.map((p) => {
                const pct = p.day.items.length ? Math.round((p.day.done.length / p.day.items.length) * 100) : 0
                return (
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => setDetail(p)}
                    className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-brand/40 hover:bg-slate-50/70"
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
                        {p.day.done.length} done · {p.day.pending.length} pending · {p.day.overdue.length} overdue
                      </p>
                      <div className="mt-1.5 h-1.5 max-w-[260px] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : p.day.overdue.length ? 'bg-red-400' : 'bg-amber-400'}`}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-lg bg-brand-soft px-2 py-1 text-[11px] font-extrabold text-brand" title="Completed">
                        {p.day.done.length}
                      </span>
                      <span className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-extrabold text-amber-600" title="Pending">
                        {p.day.pending.length}
                      </span>
                      <span className="rounded-lg bg-red-50 px-2 py-1 text-[11px] font-extrabold text-red-500" title="Overdue">
                        {p.day.overdue.length}
                      </span>
                      <i className="fas fa-chevron-right ml-1 text-[11px] text-slate-300" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {detail && (
        <DayDetailDialog
          person={detail}
          dayISO={selectedDate}
          checkin={checkinsByDay.get(selectedDate)?.get(detail.user_id) ?? (checkinsByDay.has(selectedDate) ? null : undefined)}
          onClose={() => setDetail(null)}
        />
      )}

      {editPlan && (
        <PlanEditDialog
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={() => { setEditPlan(null); loadPlans() }}
        />
      )}
    </div>
  )
}
