import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'
import Skeleton from '../components/ui/Skeleton'

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
  'in progress': 'bg-blue-50 text-kpi-blue',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

const chipClass = (map, value) => map[String(value || '').toLowerCase()] || 'bg-slate-100 text-slate-600'

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
    api.get('/api/staff?page=1&limit=500').then((d) => setStaff(toArray(d))).catch(() => {})
  }, [])

  // Silent refresh after the first load — a full skeleton would unmount the
  // assignment panel and lose the selected staff member mid-flow.
  const load = async () => {
    setError('')
    try {
      setTasks(toArray(await api.get('/api/tasks?page=1&limit=500')))
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

  if (loading) return <TasksSkeleton />

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
          <i className="fas fa-triangle-exclamation mr-2" />
          {error}
        </div>
      )}

      {/* ---- KPI row ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard color="bg-kpi-blue" icon="fa-list-check" label="Total Tasks (All)" value={counts.total}
          delta={{ text: 'Across all staff' }} />
        <KpiCard color="bg-kpi-sky" icon="fa-calendar-day" label="Today's Tasks" value={counts.today}
          delta={{ text: 'Due today' }} />
        <KpiCard color="bg-kpi-green" icon="fa-circle-check" label="Completed" value={counts.completed}
          delta={{ text: `${counts.rate}% completion rate` }} />
        <KpiCard color="bg-kpi-gold" icon="fa-hourglass-half" label="Pending Tasks" value={counts.pending}
          delta={{ text: `${counts.inProgress} in progress`, tone: 'text-amber-600' }} />
        <KpiCard color="bg-danger" icon="fa-triangle-exclamation" label="Overdue Tasks" value={counts.overdue}
          delta={counts.overdue
            ? { text: 'Needs immediate attention', tone: 'text-danger' }
            : { text: 'All on schedule' }} />
      </div>

      {/* ---- Tabs + New Task ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-slate-200/70 bg-white p-1 shadow-sm">
          <TabButton active={tab === 'assign'} onClick={() => setTab('assign')} icon="fa-user-check" label="Task Assignment" />
          <TabButton active={tab === 'all'} onClick={() => setTab('all')} icon="fa-table-list" label="All Staff Tasks" />
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-brand px-4 py-2 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-brand-dark"
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

/* ================= Task Assignment tab ================= */

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
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Assign panel */}
        <Card className="xl:col-span-4" icon="fa-user-plus" iconColor="text-brand" title="Assign Tasks to Staff">
          <div className="mb-4 space-y-2.5">
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
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Priority">
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Effective Date">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>

          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Tasks</p>
          <ul className="mb-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {TASK_TEMPLATES.map((t, i) => (
              <li key={t.title}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition hover:border-brand/40">
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggle(i)}
                    className="mt-1 accent-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-slate-700">{t.title}</span>
                    <span className="block truncate text-[10.5px] text-slate-400">{t.description}</span>
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
            className="w-full rounded-xl bg-brand py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
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
          className="xl:col-span-5"
          icon="fa-clipboard-list"
          iconColor="text-kpi-blue"
          title={selectedStaff ? `Assigned Tasks — ${selectedStaff.name}` : 'Assigned Tasks'}
        >
          {!selectedStaff ? (
            <Empty icon="fa-hand-pointer" text="Select a staff member to see their assigned tasks" />
          ) : assigned.length === 0 ? (
            <Empty icon="fa-clipboard" text="No tasks assigned yet — pick templates on the left" />
          ) : (
            <ul className="space-y-2">
              {assigned.map((t, i) => (
                <li
                  key={t.id}
                  onClick={() => setDetail(t)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${
                    detail?.id === t.id ? 'border-brand/50 bg-brand-soft/40' : 'border-slate-100 bg-slate-50/60 hover:border-brand/30'
                  }`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 shadow-sm">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate-700">{t.title}</span>
                  <Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      unassign(t)
                    }}
                    title="Unassign"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <i className="fas fa-xmark text-[11px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {detail && (
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Details</p>
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
          className="xl:col-span-3"
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

      {/* ---- Bottom row: summary · donut · quick actions ---- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5" icon="fa-sitemap" iconColor="text-cyan-600" title="Task Assignment Summary">
          <DepartmentSummary tasks={tasks} staff={staff} />
        </Card>

        <Card className="xl:col-span-4" icon="fa-chart-pie" iconColor="text-brand" title="Total Assignments">
          <AssignmentDonut tasks={tasks} />
        </Card>

        <Card className="xl:col-span-3" icon="fa-bolt" iconColor="text-brand" title="Quick Actions">
          <div className="space-y-2">
            <QuickAction icon="fa-plus" title="Create New Task" sub="Add a new task with full details" onClick={onCreate} />
            <QuickAction
              icon="fa-layer-group"
              title="Bulk Assign Tasks"
              sub="Assign templates to multiple staff"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <QuickAction icon="fa-table-list" title="All Staff Tasks" sub="Browse, edit and filter every task" onClick={onViewAll} />
            <Link
              to="/evaluations"
              className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-left transition hover:border-brand/40 hover:bg-brand-soft/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs text-brand">
                <i className="fas fa-file-export" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-semibold text-slate-700">Task Reports</span>
                <span className="block truncate text-[10.5px] text-slate-400">View task assignment reports</span>
              </span>
            </Link>
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

  if (!rows.length) return <Empty icon="fa-users" text="No staff records yet" />

  return (
    <ul className="space-y-2">
      {rows.slice(0, 7).map((s) => (
        <li
          key={s.id}
          onClick={() => onPick(s.id)}
          className={`cursor-pointer rounded-xl border p-2.5 transition ${
            activeId === s.id ? 'border-brand/50 bg-brand-soft/40' : 'border-transparent hover:bg-slate-50'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">
                {String(s.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-slate-700">{s.name}</p>
                <p className="truncate text-[10px] text-slate-400">{s.department || s.role || '—'}</p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-slate-500">
              {s.done}/{s.total} <span className="font-normal text-slate-400">tasks</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${s.pct >= 70 ? 'bg-brand' : s.pct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
            <span className="w-9 text-right text-[10px] font-bold text-slate-500">{s.pct}%</span>
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

  if (!groups.length) return <Empty icon="fa-sitemap" text="No departments yet" />

  const icons = ['fa-shield-halved', 'fa-gears', 'fa-chalkboard-teacher', 'fa-headset', 'fa-book']
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {groups.slice(0, 6).map(([dept, g], i) => (
        <div key={dept} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm text-brand">
            <i className={`fas ${icons[i % icons.length]}`} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-bold capitalize text-slate-700">{dept}</p>
            <p className="text-[10.5px] text-slate-400">
              {g.members} staff member{g.members !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="shrink-0 text-[15px] font-extrabold text-slate-700">
            {g.tasks} <span className="text-[10px] font-normal text-slate-400">tasks</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function AssignmentDonut({ tasks }) {
  const done = tasks.filter((t) => String(t.status || '').toLowerCase() === 'completed').length
  const active = tasks.filter((t) => String(t.status || '').toLowerCase() === 'in progress').length
  const pending = Math.max(tasks.length - done - active, 0)
  const total = tasks.length || 1
  const r = 50
  const c = 2 * Math.PI * r
  const seg = (n) => (n / total) * c
  const pct = (n) => (tasks.length ? Math.round((n / total) * 100) : 0)

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#fbbf24" strokeWidth="13" />
          <circle cx="64" cy="64" r={r} fill="none" stroke="#3066b4" strokeWidth="13"
            strokeDasharray={`${seg(done) + seg(active)} ${c}`} />
          <circle cx="64" cy="64" r={r} fill="none" stroke="#188a54" strokeWidth="13"
            strokeDasharray={`${seg(done)} ${c}`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[26px] font-extrabold text-slate-800">{tasks.length}</span>
          <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Total Tasks</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-3 text-[12.5px]">
        <LegendRow dot="bg-brand" label="Completed" value={done} extra={pct(done)} />
        <LegendRow dot="bg-kpi-blue" label="In Progress" value={active} extra={pct(active)} />
        <LegendRow dot="bg-amber-400" label="Pending" value={pending} extra={pct(pending)} />
      </ul>
    </div>
  )
}

/* ================= All Staff Tasks tab ================= */

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
    <Card icon="fa-table-list" iconColor="text-kpi-blue" title="All Staff Tasks">
      <div className="mb-4 flex flex-wrap gap-1.5">
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
        <Empty icon="fa-clipboard" text="No tasks found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={isOverdue(t) ? 'bg-red-50/40' : ''}>
                  <td className="max-w-[280px] truncate font-medium">{t.title}</td>
                  <td className="max-w-[150px] truncate">{staffName(t.assigned_to)}</td>
                  <td><Chip className={chipClass(PRIORITY_STYLE, t.priority)}>{t.priority || '—'}</Chip></td>
                  <td className="whitespace-nowrap">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                    {isOverdue(t) && <i className="fas fa-triangle-exclamation ml-1.5 text-[10px] text-red-400" />}
                  </td>
                  <td><Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip></td>
                  <td>
                    <button
                      onClick={() => onEdit(t)}
                      title="Edit"
                      className="mr-1 h-7 w-7 rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-kpi-blue"
                    >
                      <i className="fas fa-pen text-[11px]" />
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      title="Delete"
                      className="h-7 w-7 rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <i className="fas fa-trash text-[11px]" />
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

/* ================= create / edit modal ================= */

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="animate-in w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 flex items-center gap-2.5 text-[15px] font-bold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-sm text-brand">
            <i className={`fas ${task ? 'fa-pen' : 'fa-plus'}`} />
          </span>
          {task ? 'Edit Task' : 'Create New Task'}
        </h2>
        <form onSubmit={submit} className="space-y-3.5">
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
              className="rounded-xl border border-slate-200 px-4 py-2 text-[12.5px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ================= building blocks (match Home conventions) ================= */

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15'

function Card({ icon, iconColor = 'text-kpi-blue', title, action, className = '', children }) {
  return (
    <section className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[13.5px] font-bold text-slate-800">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-xs ${iconColor}`}>
            <i className={`fas ${icon}`} />
          </span>
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
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${color} text-lg text-white shadow-sm`}>
        <i className={`fas ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-slate-400">{label}</p>
        <p className="text-[24px] font-extrabold leading-8 tracking-tight text-slate-800">{Number(value).toLocaleString()}</p>
        {delta && <p className={`truncate text-[11px] font-medium ${delta.tone || 'text-brand'}`}>{delta.text}</p>}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition ${
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
      className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition ${
        active ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold capitalize ${className}`}>
      {children}
    </span>
  )
}

function DetailRow({ label, value }) {
  return (
    <p className="flex gap-2 py-0.5 text-[12.5px]">
      <span className="w-20 shrink-0 text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 font-medium text-slate-700">{value}</span>
    </p>
  )
}

function LegendRow({ dot, label, value, extra }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="w-20 text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">
        {Number(value).toLocaleString()}
        <span className="ml-1 font-normal text-slate-400">({extra}%)</span>
      </span>
    </li>
  )
}

function QuickAction({ icon, title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-left transition hover:border-brand/40 hover:bg-brand-soft/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-xs text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold text-slate-700">{title}</span>
        <span className="block truncate text-[10.5px] text-slate-400">{sub}</span>
      </span>
    </button>
  )
}

function Empty({ icon = 'fa-inbox', text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300">
        <i className={`fas ${icon}`} />
      </span>
      <p className="text-[12px] text-slate-400">{text}</p>
    </div>
  )
}

function TasksSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-11 w-72 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-96 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
