import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchDashboard,
  markAllNotificationsRead,
  checkinCounts,
  taskCounts,
  rewardsAndFaults,
  timeAgo,
} from '../api/dashboard'
import Skeleton from '../components/ui/Skeleton'

const money = (n) => `$${Number(n || 0).toLocaleString()}`
const pctOf = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : null)

const PRIORITY_STYLE = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-brand-soft text-brand',
}

const STATUS_STYLE = {
  completed: 'bg-brand-soft text-brand',
  'in progress': 'bg-blue-50 text-kpi-blue',
  inprogress: 'bg-blue-50 text-kpi-blue',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

const chipClass = (map, value) => map[String(value || '').toLowerCase()] || 'bg-slate-100 text-slate-600'

const NOTIF_ICON = {
  attendance: { icon: 'fa-user-check', color: 'bg-brand-soft text-brand' },
  fee: { icon: 'fa-coins', color: 'bg-amber-100 text-amber-600' },
  finance: { icon: 'fa-coins', color: 'bg-amber-100 text-amber-600' },
  task: { icon: 'fa-list-check', color: 'bg-blue-100 text-kpi-blue' },
  alert: { icon: 'fa-triangle-exclamation', color: 'bg-red-100 text-red-600' },
  general: { icon: 'fa-bell', color: 'bg-indigo-100 text-indigo-600' },
}
const notifStyle = (type) => NOTIF_ICON[String(type || '').toLowerCase()] || NOTIF_ICON.general

export default function Home() {
  const [data, setData] = useState(null)
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    let alive = true
    fetchDashboard().then((d) => {
      if (!alive) return
      setData(d)
      setNotifs(d.notifications)
    })
    return () => {
      alive = false
    }
  }, [])

  const derived = useMemo(() => {
    if (!data) return null
    return {
      checkins: checkinCounts(data.checkinsToday),
      tasks: taskCounts(data.tasks),
      rf: rewardsAndFaults(data.salary),
    }
  }, [data])

  async function handleMarkAllRead() {
    const current = notifs
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsRead(current)
    } catch {
      /* optimistic; transient failures are refetched on next load */
    }
  }

  if (!data) return <DashboardSkeleton />

  const ci = derived.checkins
  const presentPct = pctOf(ci.present, ci.total)
  const people = data.checkinsToday?.people || []
  const teachersTotal = people.filter((p) => p.role === 'teacher').length
  const staffAppTotal = people.filter((p) => p.role === 'staff').length
  const healthy = data.health?.status === 'healthy'
  const dbOnline = data.health?.database === 'connected'
  const recentTasks = data.tasks.slice(0, 5)
  const staffName = (id) => data.staff.find((s) => s.id === id)?.name || '—'
  const unread = notifs.filter((n) => !n.read).length
  const biometryTotal = data.biometryDenied ? null : data.biometry.length
  const biometryActive = data.biometryDenied ? null : data.biometry.filter((b) => b.is_active !== false).length
  const uptimeH = Math.floor((data.health?.uptime || 0) / 3600)

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      {/* ---- KPI row ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard color="bg-kpi-blue" icon="fa-users" label="Total Staff" value={data.staffTotal.toLocaleString()}
          delta={{ text: 'Across all departments', up: true }} />
        <KpiCard color="bg-kpi-sky" icon="fa-chalkboard-user" label="Teachers (App)" value={teachersTotal.toLocaleString()}
          delta={{ text: 'With mobile login', up: true }} />
        <KpiCard color="bg-kpi-purple" icon="fa-user-tie" label="Staff (App)" value={staffAppTotal.toLocaleString()}
          delta={{ text: 'With mobile login', up: true }} />
        <KpiCard color="bg-kpi-green" icon="fa-circle-check" label="Present Today" value={ci.present.toLocaleString()}
          delta={presentPct !== null ? { text: `${presentPct}% checked in`, up: true } : { text: 'No punches yet', muted: true }} />
      </div>

      {/* ---- Row 2: attendance · camera & biometry · notifications ---- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5" icon="fa-chart-pie" iconColor="text-brand" title="Check-ins Today (Verified)"
          action={<CardLink to="/today" label="Today's Board" />}>
          <div className="flex items-center justify-center gap-6">
            <Donut pct={presentPct} />
            <ul className="space-y-2.5">
              <LegendRow dot="bg-brand" label="In" value={ci.present} extra={pctOf(ci.present, ci.total)} />
              <LegendRow dot="bg-danger" label="Not in" value={ci.notIn} extra={pctOf(ci.notIn, ci.total)} />
              <LegendRow dot="bg-amber-400" label="Late" value={ci.late} extra={pctOf(ci.late, ci.total)} />
            </ul>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3.5">
            <div className="grid grid-cols-3 gap-1.5">
              <MiniStat label="On shift now" value={Math.max(ci.present - ci.out, 0)} tone="text-kpi-blue" />
              <MiniStat label="Checked out" value={ci.out} tone="text-slate-700" />
              <MiniStat label="Selfie verified" value={ci.selfies} tone="text-brand" />
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Every punch is verified with GPS location + selfie from the HRNAL app.
            </p>
          </div>
        </Card>

        <Card
          className="xl:col-span-4"
          icon="fa-video"
          iconColor="text-kpi-blue"
          title="Staff Attendance (Camera & Biometry)"
          action={<CardLink to="/biometry" label="View All" />}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Today's Records</p>
              <div className="grid grid-cols-3 gap-1.5">
                <MiniStat label="Present" value={ci.present} tone="text-brand" />
                <MiniStat label="Absent" value={ci.notIn} tone="text-danger" />
                <MiniStat label="Late" value={ci.late} tone="text-amber-500" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Biometry Devices</p>
              <div className="grid grid-cols-3 gap-1.5">
                <MiniStat label="Active" value={biometryActive ?? '—'} tone="text-brand" />
                <MiniStat label="Total" value={biometryTotal ?? '—'} tone="text-slate-700" />
                <MiniStat label="Offline" value={biometryTotal === null ? '—' : biometryTotal - biometryActive} tone="text-danger" />
              </div>
            </div>
          </div>
          <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Monitor</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex aspect-video flex-col items-center justify-center rounded-lg bg-slate-800 text-slate-500">
                <i className="fas fa-video-slash text-[11px]" />
                <span className="mt-1 text-[8px]">Cam {n}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">CCTV feed not connected yet</p>
        </Card>

        <Card
          className="xl:col-span-3"
          icon="fa-bell"
          iconColor="text-amber-500"
          title="Auto Notifications"
          action={
            unread > 0 ? (
              <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-brand hover:underline">
                Mark All Read
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">All read</span>
            )
          }
        >
          {notifs.length === 0 ? (
            <Empty text="No notifications yet" />
          ) : (
            <ul className="divide-y divide-slate-50">
              {notifs.slice(0, 5).map((n) => {
                const s = notifStyle(n.type)
                return (
                  <li key={n.id} className="flex items-start gap-2.5 py-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${s.color}`}>
                      <i className={`fas ${s.icon}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] ${n.read ? 'font-medium text-slate-500' : 'font-semibold text-slate-700'}`}>
                        {n.title}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{n.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* ---- Row 3: task division · auto reports · rewards & faults ---- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card
          className="xl:col-span-5"
          icon="fa-list-check"
          iconColor="text-kpi-blue"
          title="Daily Task Division (Auto)"
          action={<CardLink to="/tasks" label="View All Tasks" />}
        >
          {recentTasks.length === 0 ? (
            <Empty text="No tasks yet" cta={{ to: '/tasks', label: 'Create the first task' }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Task</Th>
                    <Th>Assigned To</Th>
                    <Th>Priority</Th>
                    <Th>Deadline</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map((t) => (
                    <tr key={t.id}>
                      <Td className="max-w-[150px] truncate font-medium text-slate-700">{t.title}</Td>
                      <Td className="max-w-[100px] truncate text-slate-500">{staffName(t.assigned_to)}</Td>
                      <Td><Chip className={chipClass(PRIORITY_STYLE, t.priority)}>{t.priority || '—'}</Chip></Td>
                      <Td className="whitespace-nowrap text-slate-500">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                      </Td>
                      <Td><Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
            <b className="text-amber-600">{derived.tasks.pending}</b> pending ·{' '}
            <b className="text-kpi-blue">{derived.tasks.inProgress}</b> in progress ·{' '}
            <b className="text-brand">{derived.tasks.completed}</b> completed
          </p>
        </Card>

        <Card
          className="xl:col-span-4"
          icon="fa-file-lines"
          iconColor="text-indigo-500"
          title="Auto Reports (All)"
          action={<CardLink to="/evaluations" label="View All Reports" />}
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <ReportTile to="/daily-reports" icon="fa-calendar-day" color="bg-blue-50 text-kpi-blue" title="Daily Report" />
            <ReportTile to="/tasks" icon="fa-calendar-week" color="bg-brand-soft text-brand" title="Weekly Report" />
            <ReportTile to="/evaluations" icon="fa-calendar" color="bg-violet-50 text-kpi-purple" title="Monthly Report" />
            <ReportTile to="/today" icon="fa-user-check" color="bg-amber-50 text-kpi-gold" title="Attendance Report" />
            <ReportTile to="/evaluations" icon="fa-chart-line" color="bg-pink-50 text-kpi-pink" title="Performance Report" />
            <ReportTile to="/staff" icon="fa-umbrella-beach" color="bg-emerald-50 text-success" title="Leave Report" />
          </div>
        </Card>

        <Card
          className="xl:col-span-3"
          icon="fa-award"
          iconColor="text-kpi-gold"
          title="Rewards & Faults (Auto)"
          action={<CardLink to="/salary" label="View All" />}
        >
          {data.salaryDenied ? (
            <Empty text="Admin access required" />
          ) : (
            <div className="space-y-4">
              <RfList title="Top Rewards Today" items={derived.rf.rewards} tone="text-brand" sign="+" fallbackName={staffName} />
              <RfList title="Today's Faults" items={derived.rf.faults} tone="text-danger" sign="−" fallbackName={staffName} />
            </div>
          )}
        </Card>
      </div>

      {/* ---- Row 4: monitoring · quick actions · system status ---- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5" icon="fa-gauge-high" iconColor="text-cyan-600" title="Daily Monitoring (Live Overview)">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <MonitorTile icon="fa-video" color="text-kpi-blue" label="Cameras Active" value="0/5" sub="Not connected" />
            <MonitorTile
              icon="fa-fingerprint" color="text-indigo-500" label="Biometry Devices"
              value={biometryTotal === null ? '—' : `${biometryActive}/${biometryTotal}`}
              sub={biometryTotal === null ? 'Admin only' : biometryTotal ? 'Online' : 'None enrolled'}
              good={!!biometryActive}
            />
            <MonitorTile icon="fa-user-check" color="text-brand" label="On Shift Now" value={Math.max(ci.present - ci.out, 0) || '—'} sub="Checked in, not out" good={ci.present - ci.out > 0} />
            <MonitorTile icon="fa-shield-halved" color="text-amber-500" label="Security Status" value={healthy ? 'Secure' : 'Check'} sub={healthy ? 'All systems OK' : 'Backend unhealthy'} good={healthy} bad={!healthy} />
            <MonitorTile icon="fa-heart-pulse" color="text-rose-500" label="System Health" value={healthy ? 'Excellent' : 'Degraded'} sub={healthy ? `${uptimeH}h uptime` : 'Unreachable'} good={healthy} bad={!healthy} />
            <MonitorTile icon="fa-database" color="text-teal-500" label="Database" value={dbOnline ? 'Online' : 'Down'} sub="Supabase" good={dbOnline} bad={!dbOnline} />
          </div>
        </Card>

        <Card className="xl:col-span-4" icon="fa-bolt" iconColor="text-brand" title="Quick Actions">
          <div className="grid grid-cols-3 gap-2">
            <ActionTile to="/staff" icon="fa-user-tie" label="Add Staff" />
            <ActionTile to="/tasks" icon="fa-list-check" label="Assign Task" />
            <ActionTile to="/today" icon="fa-calendar-day" label="Today's Board" />
            <ActionTile to="/announcements" icon="fa-bullhorn" label="Announce" />
            <ActionTile to="/salary" icon="fa-award" label="Add Reward" />
            <ActionTile to="/salary" icon="fa-gavel" label="Add Fault" />
          </div>
        </Card>

        <Card className="xl:col-span-3" icon="fa-server" iconColor="text-slate-500" title="System Status">
          <ul className="space-y-2.5 text-[12px]">
            <StatusRow label="Database" ok={dbOnline} okText="Online" badText="Down" />
            <StatusRow label="Server" ok={healthy} okText="Online" badText="Unreachable" />
            <StatusRow label="Security" ok={healthy} okText="Active" badText="Check" />
            <StatusRow label="Notifications" ok okText="Active" />
            <StatusRow label="Environment" okText={data.health?.environment || '—'} neutral />
            <StatusRow label="Version" okText={data.health?.version || '—'} neutral />
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ================= building blocks ================= */

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

function CardLink({ to, label }) {
  return (
    <Link to={to} className="shrink-0 text-[11px] font-semibold text-brand hover:underline">
      {label}
    </Link>
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
        <p className="text-[24px] font-extrabold leading-8 tracking-tight text-slate-800">{value}</p>
        {delta && (
          <p className={`flex items-center gap-1 truncate text-[11px] font-medium ${delta.muted ? 'text-slate-400' : 'text-brand'}`}>
            {delta.up && !delta.muted && <i className="fas fa-arrow-trend-up text-[9px]" />}
            {delta.text}
          </p>
        )}
      </div>
    </div>
  )
}

function Donut({ pct }) {
  const r = 50
  const c = 2 * Math.PI * r
  const filled = pct != null ? (Math.min(pct, 100) / 100) * c : 0
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="13" />
        {pct != null && (
          <circle cx="64" cy="64" r={r} fill="none" stroke="#188a54" strokeWidth="13"
            strokeDasharray={`${filled} ${c}`} strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-extrabold text-slate-800">{pct != null ? `${pct}%` : '—'}</span>
        <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">Overall Present</span>
      </div>
    </div>
  )
}

function LegendRow({ dot, label, value, extra }) {
  return (
    <li className="flex items-center gap-2.5 text-[12.5px]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="w-14 text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">
        {Number(value).toLocaleString()}
        {extra != null && <span className="ml-1 font-normal text-slate-400">({extra}%)</span>}
      </span>
    </li>
  )
}


function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-slate-50 px-1.5 py-2.5 text-center">
      <p className={`text-[17px] font-extrabold leading-6 ${tone}`}>{value}</p>
      <p className="text-[9.5px] text-slate-400">{label}</p>
    </div>
  )
}

// Compact header/data cells — the global table base styles are sized for
// full CRUD pages; the dashboard card needs a denser grid.
function Th({ children }) {
  return <th className="bg-transparent px-2 py-1.5 text-[10px] first:pl-0 last:pr-0">{children}</th>
}

function Td({ className = '', children }) {
  return <td className={`px-2 py-2 text-[12px] first:pl-0 last:pr-0 ${className}`}>{children}</td>
}

function Chip({ className = '', children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold capitalize ${className}`}>
      {children}
    </span>
  )
}

function ReportTile({ to, icon, color, title }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-sm"
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${color}`}>
        <i className={`fas ${icon}`} />
      </span>
      <span>
        <span className="block text-[12px] font-bold leading-tight text-slate-700">{title}</span>
        <span className="text-[9.5px] text-slate-400">Auto Generated</span>
      </span>
    </Link>
  )
}

function RfList({ title, items, tone, sign, fallbackName }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {items.length === 0 ? (
        <p className="py-1 text-[11px] text-slate-300">None recorded</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((r) => {
            const name = r.name || fallbackName(r.staff_id)
            return (
              <li key={r.id} className="flex items-center gap-2.5 text-[12.5px]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone === 'text-brand' ? 'bg-brand-soft text-brand' : 'bg-red-50 text-danger'}`}>
                  {String(name || '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-slate-600">{name}</span>
                <span className={`shrink-0 font-bold ${tone}`}>{sign}{money(r.amount)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function MonitorTile({ icon, color, label, value, sub, good, bad }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="mb-1.5 flex items-start gap-1.5 text-[10px] leading-tight text-slate-400">
        <i className={`fas ${icon} ${color} mt-px`} />
        <span>{label}</span>
      </p>
      <p className={`text-[16px] font-extrabold leading-6 ${bad ? 'text-danger' : good ? 'text-brand' : 'text-slate-800'}`}>{value}</p>
      <p className={`truncate text-[10px] ${bad ? 'text-danger' : good ? 'text-brand' : 'text-slate-400'}`}>{sub}</p>
    </div>
  )
}


function ActionTile({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-center transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-brand-soft/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-[13px] text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <span className="text-[9.5px] font-semibold leading-tight text-slate-600">{label}</span>
    </Link>
  )
}

function StatusRow({ label, ok, okText, badText, neutral }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-slate-500">
        <span className={`h-1.5 w-1.5 rounded-full ${neutral ? 'bg-slate-300' : ok ? 'bg-brand' : 'bg-danger'}`} />
        {label}
      </span>
      {neutral ? (
        <span className="font-semibold capitalize text-slate-700">{okText}</span>
      ) : (
        <span className={`font-semibold ${ok ? 'text-brand' : 'text-danger'}`}>{ok ? okText : badText}</span>
      )}
    </li>
  )
}



function Empty({ text, cta }) {
  return (
    <div className="py-6 text-center text-[12px] text-slate-400">
      <p>{text}</p>
      {cta && (
        <Link to={cta.to} className="mt-1 inline-block font-medium text-brand hover:underline">
          {cta.label}
        </Link>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4 sm:p-5 lg:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
