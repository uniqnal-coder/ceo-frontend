import { useEffect, useMemo, useState } from 'react'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled']

const PRIORITY_STYLE = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-brand-soft text-brand',
}

const STATUS_STYLE = {
  completed: 'bg-brand-soft text-brand',
  'in progress': 'bg-blue-50 text-blue-600',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

function chipClass(map, value) {
  return map[String(value || '').toLowerCase()] || 'bg-slate-100 text-slate-600'
}

// Ready-made daily-duty templates from the SchoolOS reference sheet — quick
// bulk assignment without retyping recurring duties.
const TASK_TEMPLATES = [
  { title: 'Monitor Students & Visitor Entry', description: 'Monitor all students, visitors and staff entry/exit points.', category: 'Security', freq: 'Daily' },
  { title: 'Visit Selected Areas', description: 'Make rounds in all selected areas of the school.', category: 'Security', freq: 'Daily' },
  { title: "Don't Allow Unregistered People", description: 'Prevent entry of unregistered or unknown persons.', category: 'Security', freq: 'Daily' },
  { title: 'Data Entry - Daily Report', description: 'Enter daily activities and incident reports.', category: 'Admin', freq: 'Daily' },
  { title: 'Check CCTV Cameras', description: 'Monitor all CCTV cameras and report issues.', category: 'Security', freq: 'Daily' },
  { title: 'Emergency Response Check', description: 'Ensure all emergency equipment is working.', category: 'Safety', freq: 'Weekly' },
  { title: 'Verify ID Cards', description: 'Verify ID cards of all staff and visitors.', category: 'Security', freq: 'Daily' },
]

const todayStr = () => new Date().toISOString().slice(0, 10)
const isToday = (d) => !!d && String(d).slice(0, 10) === todayStr()
const isDone = (t) => ['completed', 'cancelled'].includes(String(t.status || '').toLowerCase())
const isOverdue = (t) => !!t.due_date && String(t.due_date).slice(0, 10) < todayStr() && !isDone(t)

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('assign')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    load()
    api.get('/api/staff').then((d) => setStaff(toArray(d))).catch(() => {})
  }, [])

  // Refetches keep the current UI (and panel state) in place; only the very
  // first load shows the full-page spinner.
  const load = async () => {
    setError('')
    try {
      setTasks(toArray(await api.get('/api/tasks')))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const counts = useMemo(() => {
    const by = (s) => tasks.filter((t) => String(t.status || 'Pending').toLowerCase() === s).length
    const completed = by('completed')
    return {
      total: tasks.length,
      today: tasks.filter((t) => isToday(t.due_date)).length,
      completed,
      pending: by('pending'),
      inProgress: by('in progress'),
      overdue: tasks.filter(isOverdue).length,
      rate: tasks.length ? Math.round((completed / tasks.length) * 1000) / 10 : 0,
    }
  }, [tasks])

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-500">
          <i className="fas fa-circle-notch fa-spin mr-2 text-brand" />
          Loading task center...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full space-y-4 bg-slate-100 p-4 sm:p-5">
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
          <i className="fas fa-triangle-exclamation mr-2" />
          {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon="fa-list-check" color="bg-kpi-blue" label="Total Tasks (All)" value={counts.total}
          delta={{ text: 'Across all staff', tone: 'text-brand', arrow: 'fa-arrow-trend-up' }} />
        <KpiCard icon="fa-calendar-day" color="bg-kpi-sky" label="Today's Tasks" value={counts.today}
          delta={{ text: 'Due today', tone: 'text-brand' }} />
        <KpiCard icon="fa-circle-check" color="bg-kpi-green" label="Completed" value={counts.completed}
          delta={{ text: `${counts.rate}% completion rate`, tone: 'text-brand', arrow: 'fa-arrow-trend-up' }} />
        <KpiCard icon="fa-hourglass-half" color="bg-kpi-gold" label="Pending Tasks" value={counts.pending}
          delta={{ text: `${counts.inProgress} in progress`, tone: 'text-amber-600' }} />
        <KpiCard icon="fa-triangle-exclamation" color="bg-red-500" label="Overdue Tasks" value={counts.overdue}
          delta={counts.overdue ? { text: 'Needs immediate attention', tone: 'text-red-500' } : { text: 'All on schedule', tone: 'text-brand' }} />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-slate-200/70 bg-white p-1 shadow-sm">
          <TabButton active={tab === 'assign'} onClick={() => setTab('assign')} icon="fa-user-check" label="Task Assignment" />
          <TabButton active={tab === 'all'} onClick={() => setTab('all')} icon="fa-table-list" label="All Tasks" />
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brand px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <i className="fas fa-plus mr-1.5" />
          New Task
        </button>
      </div>

      {tab === 'assign' ? (
        <AssignmentCenter tasks={tasks} staff={staff} reload={load} onCreate={openCreate} onViewAll={() => setTab('all')} />
      ) : (
        <AllTasks tasks={tasks} staff={staff} reload={load} onEdit={(t) => { setEditing(t); setShowForm(true) }} />
      )}

      {showForm && (
        <TaskForm
          task={editing}
          staff={staff}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

/* ---------- Task Assignment tab ---------- */

function AssignmentCenter({ tasks, staff, reload, onCreate, onViewAll }) {
  const [staffId, setStaffId] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState(todayStr())
  const [checked, setChecked] = useState(() => new Set())
  const [custom, setCustom] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [detail, setDetail] = useState(null)

  const selectedStaff = staff.find((s) => s.id === staffId) || null
  const assigned = tasks.filter((t) => t.assigned_to === staffId)

  const toggle = (idx) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })

  async function assign() {
    if (!staffId) return toast.error('Select a staff member first')
    const picked = TASK_TEMPLATES.filter((_, i) => checked.has(i)).map((t) => ({
      title: t.title,
      description: t.description,
    }))
    if (custom.trim()) picked.push({ title: custom.trim(), description: '' })
    if (!picked.length) return toast.error('Pick at least one task')

    setAssigning(true)
    try {
      await Promise.all(
        picked.map((p) =>
          api.post('/api/tasks', {
            ...p,
            assigned_to: staffId,
            priority,
            status: 'Pending',
            due_date: dueDate || null,
          }),
        ),
      )
      toast.success(`${picked.length} task${picked.length > 1 ? 's' : ''} assigned to ${selectedStaff?.name}`)
      setChecked(new Set())
      setCustom('')
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAssigning(false)
    }
  }

  async function unassign(t) {
    try {
      await api.put(`/api/tasks/${t.id}`, {
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        due_date: t.due_date,
        assigned_to: null,
      })
      toast.success('Task unassigned')
      if (detail?.id === t.id) setDetail(null)
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Assign panel */}
        <Card icon="fa-user-plus" iconColor="text-brand" title="Assign Tasks to Staff">
          <div className="mb-3 grid grid-cols-1 gap-2">
            <Field label="Select Staff">
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputCls}>
                <option value="">— Choose staff member —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.department ? `· ${s.department}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Priority">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Due Date">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>

          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Tasks</p>
          <ul className="mb-2 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {TASK_TEMPLATES.map((t, i) => (
              <li key={t.title}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 p-2 transition hover:border-brand/40">
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-0.5 accent-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-slate-700">{t.title}</span>
                    <span className="block truncate text-[10px] text-slate-400">{t.description}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Chip className="bg-brand-soft text-brand">{t.category}</Chip>
                    <Chip className="bg-slate-100 text-slate-500">{t.freq}</Chip>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Or type a custom task title..."
            className={`${inputCls} mb-3`}
          />
          <button
            onClick={assign}
            disabled={assigning}
            className="w-full rounded-lg bg-brand py-2 text-[12px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {assigning ? (
              <>
                <i className="fas fa-circle-notch fa-spin mr-1.5" /> Assigning...
              </>
            ) : (
              <>
                <i className="fas fa-user-check mr-1.5" /> Assign Tasks
              </>
            )}
          </button>
        </Card>

        {/* Assigned tasks for selected staff */}
        <Card
          icon="fa-clipboard-list"
          iconColor="text-blue-500"
          title={selectedStaff ? `Assigned Tasks — ${selectedStaff.name}` : 'Assigned Tasks'}
        >
          {!selectedStaff ? (
            <Empty text="Select a staff member to see their tasks" />
          ) : assigned.length === 0 ? (
            <Empty text="No tasks assigned yet" />
          ) : (
            <ul className="space-y-1.5">
              {assigned.map((t, i) => (
                <li
                  key={t.id}
                  onClick={() => setDetail(t)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2 transition ${
                    detail?.id === t.id ? 'border-brand/50 bg-brand-soft/40' : 'border-slate-100 bg-slate-50/60 hover:border-brand/30'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-slate-500 shadow-sm">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">{t.title}</span>
                  <Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      unassign(t)
                    }}
                    title="Unassign"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <i className="fas fa-xmark text-[10px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {detail && (
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Details</p>
              <DetailRow label="Task" value={detail.title} />
              <DetailRow label="Priority" value={detail.priority || '—'} />
              <DetailRow label="Status" value={detail.status || 'Pending'} />
              <DetailRow label="Due" value={detail.due_date ? new Date(detail.due_date).toLocaleDateString() : '—'} />
              {detail.description && <DetailRow label="Description" value={detail.description} />}
            </div>
          )}
        </Card>

        {/* Staff overview */}
        <Card
          icon="fa-users"
          iconColor="text-indigo-500"
          title="Staff Task Overview"
          action={
            <button onClick={onViewAll} className="text-[11px] font-semibold text-brand hover:underline">
              View All Staff Tasks
            </button>
          }
        >
          <StaffOverview tasks={tasks} staff={staff} onPick={setStaffId} activeId={staffId} />
        </Card>
      </div>

      {/* Bottom row: summary · donut · quick actions */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card icon="fa-sitemap" iconColor="text-cyan-600" title="Task Assignment Summary">
          <DepartmentSummary tasks={tasks} staff={staff} />
        </Card>

        <Card icon="fa-chart-pie" iconColor="text-brand" title="Total Assignments">
          <AssignmentDonut tasks={tasks} />
        </Card>

        <Card icon="fa-bolt" iconColor="text-brand" title="Quick Actions">
          <div className="space-y-2">
            <QuickAction icon="fa-plus" title="Create New Task" sub="Add a new task with full details" onClick={onCreate} />
            <QuickAction
              icon="fa-layer-group"
              title="Bulk Assign Tasks"
              sub="Use the templates panel to assign many at once"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <QuickAction icon="fa-table-list" title="All Staff Tasks" sub="Browse, edit and filter every task" onClick={onViewAll} />
          </div>
        </Card>
      </div>
    </>
  )
}

function StaffOverview({ tasks, staff, onPick, activeId }) {
  const rows = useMemo(() => {
    return staff
      .map((s) => {
        const own = tasks.filter((t) => t.assigned_to === s.id)
        const done = own.filter(isDone).length
        return { ...s, total: own.length, done, pct: own.length ? Math.round((done / own.length) * 100) : 0 }
      })
      .sort((a, b) => b.total - a.total)
  }, [tasks, staff])

  if (!rows.length) return <Empty text="No staff records yet" />

  return (
    <ul className="space-y-2.5">
      {rows.slice(0, 7).map((s) => (
        <li
          key={s.id}
          onClick={() => onPick(s.id)}
          className={`cursor-pointer rounded-lg border p-2 transition ${
            activeId === s.id ? 'border-brand/50 bg-brand-soft/40' : 'border-transparent hover:bg-slate-50'
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">
                {String(s.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-700">{s.name}</p>
                <p className="truncate text-[10px] text-slate-400">{s.department || s.role || '—'}</p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-slate-500">
              {s.done}/{s.total} <span className="text-slate-400">tasks</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${s.pct >= 70 ? 'bg-brand' : s.pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-[10px] font-bold text-slate-500">{s.pct}%</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function DepartmentSummary({ tasks, staff }) {
  const groups = useMemo(() => {
    const byDept = new Map()
    for (const s of staff) {
      const key = s.department || 'Unassigned'
      if (!byDept.has(key)) byDept.set(key, { members: 0, tasks: 0 })
      const g = byDept.get(key)
      g.members += 1
      g.tasks += tasks.filter((t) => t.assigned_to === s.id).length
    }
    return [...byDept.entries()].sort((a, b) => b[1].tasks - a[1].tasks)
  }, [tasks, staff])

  if (!groups.length) return <Empty text="No departments yet" />

  const icons = ['fa-shield-halved', 'fa-gears', 'fa-chalkboard-teacher', 'fa-headset', 'fa-book']
  return (
    <ul className="space-y-2">
      {groups.slice(0, 5).map(([dept, g], i) => (
        <li key={dept} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs text-brand">
            <i className={`fas ${icons[i % icons.length]}`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold capitalize text-slate-700">{dept}</p>
            <p className="text-[10px] text-slate-400">{g.members} staff member{g.members !== 1 ? 's' : ''}</p>
          </div>
          <span className="shrink-0 text-[13px] font-extrabold text-slate-700">
            {g.tasks} <span className="text-[10px] font-normal text-slate-400">tasks</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function AssignmentDonut({ tasks }) {
  const done = tasks.filter((t) => String(t.status || '').toLowerCase() === 'completed').length
  const active = tasks.filter((t) => String(t.status || '').toLowerCase() === 'in progress').length
  const pending = tasks.length - done - active
  const total = tasks.length || 1
  const r = 46
  const c = 2 * Math.PI * r
  const seg = (n) => (n / total) * c
  const doneLen = seg(done)
  const activeLen = seg(active)

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#fbbf24" strokeWidth="14" />
          <circle cx="64" cy="64" r={r} fill="none" stroke="#3b82f6" strokeWidth="14"
            strokeDasharray={`${doneLen + activeLen} ${c}`} />
          <circle cx="64" cy="64" r={r} fill="none" stroke="#36a860" strokeWidth="14"
            strokeDasharray={`${doneLen} ${c}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-800">{tasks.length}</span>
          <span className="text-[8px] uppercase tracking-wide text-slate-400">Total Tasks</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-[12px]">
        <LegendRow dot="bg-brand" label="Completed" value={done} extra={tasks.length ? `${Math.round((done / total) * 100)}%` : ''} />
        <LegendRow dot="bg-blue-500" label="In Progress" value={active} extra={tasks.length ? `${Math.round((active / total) * 100)}%` : ''} />
        <LegendRow dot="bg-amber-400" label="Pending" value={pending} extra={tasks.length ? `${Math.round((pending / total) * 100)}%` : ''} />
      </ul>
    </div>
  )
}

/* ---------- All Tasks tab ---------- */

function AllTasks({ tasks, staff, reload, onEdit }) {
  const [filter, setFilter] = useState('all')
  const staffName = (id) => staff.find((s) => s.id === id)?.name || '—'
  const filtered = tasks.filter((t) => (filter === 'all' ? true : (t.status || 'Pending') === filter))

  const remove = async (id) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.del(`/api/tasks/${id}`)
      toast.success('Task deleted')
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Card icon="fa-table-list" iconColor="text-blue-500" title="All Staff Tasks">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${tasks.length})`} />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={filter === s}
            onClick={() => setFilter(s)}
            label={`${s} (${tasks.filter((t) => (t.status || 'Pending') === s).length})`}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty text="No tasks found" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3 font-semibold">Task</th>
                <th className="pb-2 pr-3 font-semibold">Assigned To</th>
                <th className="pb-2 pr-3 font-semibold">Priority</th>
                <th className="pb-2 pr-3 font-semibold">Deadline</th>
                <th className="pb-2 pr-3 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((t) => (
                <tr key={t.id} className={isOverdue(t) ? 'bg-red-50/40' : ''}>
                  <td className="max-w-[260px] truncate py-2 pr-3 font-medium text-slate-700">{t.title}</td>
                  <td className="max-w-[140px] truncate py-2 pr-3 text-slate-500">{staffName(t.assigned_to)}</td>
                  <td className="py-2 pr-3">
                    <Chip className={chipClass(PRIORITY_STYLE, t.priority)}>{t.priority || '—'}</Chip>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                    {isOverdue(t) && <i className="fas fa-triangle-exclamation ml-1.5 text-[10px] text-red-400" />}
                  </td>
                  <td className="py-2 pr-3">
                    <Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => onEdit(t)}
                      title="Edit"
                      className="mr-1 h-6 w-6 rounded text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <i className="fas fa-pen text-[10px]" />
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      title="Delete"
                      className="h-6 w-6 rounded text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <i className="fas fa-trash text-[10px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ---------- create / edit form (modal) ---------- */

function TaskForm({ task, staff, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Pending',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')
    setSaving(true)
    setError('')
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null }
    try {
      if (task) await api.put(`/api/tasks/${task.id}`, payload)
      else await api.post('/api/tasks', payload)
      toast.success(task ? 'Task updated' : 'Task created')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-slate-800">
          <i className={`fas ${task ? 'fa-pen' : 'fa-plus'} text-brand`} />
          {task ? 'Edit Task' : 'Create New Task'}
        </h2>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title *">
            <input value={form.title} onChange={set('title')} required className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={set('description')} rows={3} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assign To">
              <select value={form.assigned_to} onChange={set('assigned_to')} className={inputCls}>
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={set('priority')} className={inputCls}>
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Due Date">
              <input type="date" value={form.due_date} onChange={set('due_date')} className={inputCls} />
            </Field>
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------- building blocks (match Home.jsx conventions) ---------- */

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15'

function Card({ icon, iconColor = 'text-blue-500', title, action, className = '', children }) {
  return (
    <section className={`rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-slate-700">
          <i className={`fas ${icon} ${iconColor} text-xs`} />
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function KpiCard({ icon, color, label, value, delta }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${color} text-lg text-white shadow-sm`}>
        <i className={`fas ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-slate-400">{label}</p>
        <p className="text-[22px] font-extrabold leading-7 text-slate-800">{Number(value).toLocaleString()}</p>
        {delta && (
          <p className={`flex items-center gap-1 truncate text-[11px] ${delta.tone}`}>
            {delta.arrow && <i className={`fas ${delta.arrow} text-[9px]`} />}
            {delta.text}
          </p>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition ${
        active ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <i className={`fas ${icon} mr-1.5 text-[10px]`} />
      {label}
    </button>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
        active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function Chip({ className = '', children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${className}`}>
      {children}
    </span>
  )
}

function DetailRow({ label, value }) {
  return (
    <p className="flex gap-2 py-0.5 text-[12px]">
      <span className="w-20 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 font-medium text-slate-700">{value}</span>
    </p>
  )
}

function LegendRow({ dot, label, value, extra = '' }) {
  return (
    <li className="flex items-center gap-2 text-[12px]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="w-20 text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">
        {Number(value).toLocaleString()} {extra && <span className="font-normal text-slate-400">({extra})</span>}
      </span>
    </li>
  )
}

function QuickAction({ icon, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-left transition hover:border-brand/40 hover:bg-brand-soft/40"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold text-slate-700">{title}</span>
        <span className="block truncate text-[10px] text-slate-400">{sub}</span>
      </span>
    </button>
  )
}

function Empty({ text }) {
  return <p className="py-5 text-center text-[12px] text-slate-400">{text}</p>
}
