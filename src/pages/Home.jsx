import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchDashboard,
  markAllNotificationsRead,
  attendanceCounts,
  attendanceTrend,
  taskCounts,
  financeSummary,
  feeTrend,
  rewardsAndFaults,
  timeAgo,
} from '../api/dashboard'

// Currency symbol used across the dashboard — change here to localize.
const CURRENCY = '₹'
const money = (n) => `${CURRENCY} ${Number(n || 0).toLocaleString()}`

const PRIORITY_STYLE = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-brand-soft text-brand',
}

const STATUS_STYLE = {
  completed: 'bg-brand-soft text-brand',
  'in progress': 'bg-blue-50 text-blue-600',
  inprogress: 'bg-blue-50 text-blue-600',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-slate-100 text-slate-500',
}

function chipClass(map, value) {
  return map[String(value || '').toLowerCase()] || 'bg-slate-100 text-slate-600'
}

const NOTIF_ICON = {
  attendance: { icon: 'fa-user-check', color: 'bg-brand-soft text-brand' },
  fee: { icon: 'fa-coins', color: 'bg-amber-100 text-amber-600' },
  finance: { icon: 'fa-coins', color: 'bg-amber-100 text-amber-600' },
  task: { icon: 'fa-list-check', color: 'bg-blue-100 text-blue-600' },
  alert: { icon: 'fa-triangle-exclamation', color: 'bg-red-100 text-red-600' },
  general: { icon: 'fa-bell', color: 'bg-indigo-100 text-indigo-600' },
}
const notifStyle = (type) => NOTIF_ICON[String(type || '').toLowerCase()] || NOTIF_ICON.general

export default function Home() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    let alive = true
    fetchDashboard()
      .then((d) => {
        if (!alive) return
        setData(d)
        setNotifs(d.notifications)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const derived = useMemo(() => {
    if (!data) return null
    return {
      attendance: attendanceCounts(data.attendanceToday),
      attTrend: attendanceTrend(data.attendanceAll, 7),
      tasks: taskCounts(data.tasks),
      finance: financeSummary(data.fees),
      trend: feeTrend(data.fees, 7),
      rf: rewardsAndFaults(data.salary),
    }
  }, [data])

  async function handleMarkAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await markAllNotificationsRead(notifs)
    } catch {
      /* optimistic — server already told once, ignore transient errors */
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-500">
          <i className="fas fa-circle-notch fa-spin mr-2 text-brand" />
          Loading control center...
        </div>
      </div>
    )
  }

  const staffName = (id) => data.staff.find((s) => s.id === id)?.name || '—'
  const todayTotal = data.attendanceToday.length
  const presentPct = todayTotal ? Math.round((derived.attendance.present / todayTotal) * 1000) / 10 : null
  const absentPct = todayTotal ? Math.round((derived.attendance.absent / todayTotal) * 1000) / 10 : null
  const latePct = todayTotal ? Math.round((derived.attendance.late / todayTotal) * 1000) / 10 : null
  const healthy = data.health?.status === 'healthy'
  const recentTasks = data.tasks.slice(0, 5)
  const classesRunning = new Set(data.attendanceToday.map((r) => r.lesson).filter(Boolean)).size
  const biometryTotal = data.biometryDenied ? null : data.biometry.length
  const biometryActive = data.biometryDenied ? null : data.biometry.filter((b) => b.is_active !== false).length
  const unread = notifs.filter((n) => !n.read).length
  const todayCollection = derived.trend[derived.trend.length - 1]?.value || 0
  const uptimeH = Math.floor((data.health?.uptime || 0) / 3600)

  return (
    <div className="min-h-full space-y-4 bg-slate-100 p-4 sm:p-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="fa-user-graduate"
          color="bg-kpi-blue"
          label="Total Students"
          value={data.studentsTotal.toLocaleString()}
          delta={{ text: data.students.length ? 'Enrolled & active' : 'No students yet', tone: 'text-brand', arrow: 'fa-arrow-trend-up' }}
        />
        <KpiCard
          icon="fa-users"
          color="bg-kpi-sky"
          label="Total Staff"
          value={data.staffTotal.toLocaleString()}
          delta={{ text: 'Across all departments', tone: 'text-brand', arrow: 'fa-arrow-trend-up' }}
        />
        <KpiCard
          icon="fa-circle-check"
          color="bg-kpi-green"
          label="Present Today"
          value={derived.attendance.present.toLocaleString()}
          delta={
            presentPct !== null
              ? { text: `${presentPct}% attendance`, tone: 'text-brand', arrow: 'fa-arrow-trend-up' }
              : { text: 'No records today', tone: 'text-slate-400' }
          }
        />
        <KpiCard
          icon="fa-sack-dollar"
          color="bg-kpi-gold"
          label="Total Revenue"
          value={money(derived.finance.total)}
          delta={{ text: `${money(derived.finance.thisMonth)} this month`, tone: 'text-brand', arrow: 'fa-arrow-trend-up' }}
        />
      </div>

      {/* Row 2: attendance overview + trend · camera/biometry · notifications */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card icon="fa-chart-pie" iconColor="text-brand" title="Attendance Overview (Today)">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <Donut pct={presentPct} />
              <ul className="min-w-0 space-y-2">
                <LegendRow dot="bg-brand" label="Present" value={derived.attendance.present} extra={presentPct !== null ? `${presentPct}%` : ''} />
                <LegendRow dot="bg-red-500" label="Absent" value={derived.attendance.absent} extra={absentPct !== null ? `${absentPct}%` : ''} />
                <LegendRow dot="bg-amber-400" label="Late" value={derived.attendance.late} extra={latePct !== null ? `${latePct}%` : ''} />
              </ul>
            </div>
            <div className="min-w-0 flex-1 border-slate-100 sm:border-l sm:pl-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Weekly Trend</p>
              <TrendLines series={derived.attTrend} />
            </div>
          </div>
        </Card>

        <Card
          icon="fa-video"
          iconColor="text-blue-500"
          title="Staff Attendance (Camera & Biometry)"
          action={<Link to="/attendance" className="text-[11px] font-semibold text-brand hover:underline">View All</Link>}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Camera Attendance</p>
              <div className="grid grid-cols-3 gap-1.5">
                <MiniStat label="Present" value={derived.attendance.present} tone="text-brand" />
                <MiniStat label="Absent" value={derived.attendance.absent} tone="text-red-500" />
                <MiniStat label="Late" value={derived.attendance.late} tone="text-amber-500" />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Biometry Devices</p>
              <div className="grid grid-cols-3 gap-1.5">
                <MiniStat label="Active" value={biometryActive === null ? '—' : biometryActive} tone="text-brand" />
                <MiniStat label="Total" value={biometryTotal === null ? '—' : biometryTotal} tone="text-slate-700" />
                <MiniStat
                  label="Offline"
                  value={biometryTotal === null ? '—' : biometryTotal - biometryActive}
                  tone="text-red-500"
                />
              </div>
            </div>
          </div>
          <p className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Monitor</p>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex aspect-square flex-col items-center justify-center rounded-md bg-slate-800 text-slate-500">
                <i className="fas fa-video-slash text-[10px]" />
                <span className="mt-0.5 text-[8px]">Cam {n}</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">CCTV feed not connected yet</p>
        </Card>

        <Card
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
                  <li key={n.id} className="flex items-start gap-2.5 py-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${s.color}`}>
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

      {/* Row 3: task table · auto reports · rewards & faults */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card icon="fa-list-check" iconColor="text-blue-500" title="Daily Task Division (Auto)">
          {recentTasks.length === 0 ? (
            <Empty text="No tasks yet" cta={{ to: '/tasks', label: 'Create the first task' }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="pb-1.5 pr-2 font-semibold">Task</th>
                    <th className="pb-1.5 pr-2 font-semibold">Assignee</th>
                    <th className="pb-1.5 pr-2 font-semibold">Priority</th>
                    <th className="pb-1.5 pr-2 font-semibold">Deadline</th>
                    <th className="pb-1.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTasks.map((t) => (
                    <tr key={t.id}>
                      <td className="max-w-[110px] truncate py-1.5 pr-2 font-medium text-slate-700">{t.title}</td>
                      <td className="max-w-[70px] truncate py-1.5 pr-2 text-slate-500">{staffName(t.assigned_to)}</td>
                      <td className="py-1.5 pr-2">
                        <Chip className={chipClass(PRIORITY_STYLE, t.priority)}>{t.priority || '—'}</Chip>
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-2 text-slate-500">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="py-1.5">
                        <Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <CardFooter
            left={
              <span className="text-[11px] text-slate-400">
                <b className="text-amber-600">{derived.tasks.pending}</b> pending ·{' '}
                <b className="text-blue-600">{derived.tasks.inProgress}</b> active ·{' '}
                <b className="text-brand">{derived.tasks.completed}</b> done
              </span>
            }
            link={{ to: '/tasks', label: 'View All Tasks' }}
          />
        </Card>

        <Card icon="fa-file-lines" iconColor="text-indigo-500" title="Auto Reports (All)">
          <div className="grid grid-cols-3 gap-2">
            <ReportTile to="/attendance" icon="fa-calendar-day" color="bg-blue-50 text-blue-600" title="Daily Report" />
            <ReportTile to="/tasks" icon="fa-calendar-week" color="bg-brand-soft text-brand" title="Weekly Report" />
            <ReportTile to="/evaluations" icon="fa-calendar" color="bg-purple-50 text-purple-600" title="Monthly Report" />
            <ReportTile to="/attendance" icon="fa-user-check" color="bg-amber-50 text-amber-600" title="Attendance" />
            <ReportTile to="/evaluations" icon="fa-chart-line" color="bg-pink-50 text-pink-600" title="Performance" />
            <ReportTile to="/fees" icon="fa-coins" color="bg-teal-50 text-teal-600" title="Financial" />
          </div>
          <CardFooter link={{ to: '/evaluations', label: 'View All Reports' }} />
        </Card>

        <Card icon="fa-award" iconColor="text-yellow-500" title="Rewards & Faults (Auto)">
          {data.salaryDenied ? (
            <Empty text="Admin access required" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <RfColumn title="Top Rewards Today" items={derived.rf.rewards} tone="text-brand" sign="+" fallbackName={staffName} />
              <RfColumn title="Today's Faults" items={derived.rf.faults} tone="text-red-500" sign="−" fallbackName={staffName} />
            </div>
          )}
          <CardFooter link={{ to: '/salary', label: 'View All Rewards & Faults' }} />
        </Card>
      </div>

      {/* Row 4: daily monitoring · finance · quick actions + status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card icon="fa-gauge-high" iconColor="text-cyan-600" title="Daily Monitoring (Live Overview)">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <MonitorTile icon="fa-video" color="text-blue-500" label="Cameras Active" value="0/5" sub="Not connected" subTone="text-slate-400" />
            <MonitorTile
              icon="fa-fingerprint"
              color="text-indigo-500"
              label="Biometry Devices"
              value={biometryTotal === null ? '—' : `${biometryActive}/${biometryTotal}`}
              sub={biometryTotal === null ? 'Admin only' : biometryTotal ? 'Online' : 'None enrolled'}
              subTone={biometryActive ? 'text-brand' : 'text-slate-400'}
            />
            <MonitorTile
              icon="fa-school"
              color="text-brand"
              label="Classes Running"
              value={classesRunning || '—'}
              sub="From attendance"
              subTone={classesRunning ? 'text-brand' : 'text-slate-400'}
            />
            <MonitorTile
              icon="fa-shield-halved"
              color="text-amber-500"
              label="Security Status"
              value={healthy ? 'Secure' : 'Check'}
              valueTone={healthy ? 'text-brand' : 'text-red-500'}
              sub={healthy ? 'All systems OK' : 'Backend unhealthy'}
              subTone={healthy ? 'text-brand' : 'text-red-500'}
            />
            <MonitorTile
              icon="fa-heart-pulse"
              color="text-rose-500"
              label="System Health"
              value={healthy ? 'Excellent' : 'Degraded'}
              valueTone={healthy ? 'text-brand' : 'text-red-500'}
              sub={healthy ? `${uptimeH}h uptime` : 'Unreachable'}
              subTone={healthy ? 'text-brand' : 'text-red-500'}
            />
            <MonitorTile
              icon="fa-database"
              color="text-teal-500"
              label="Database"
              value={data.health?.database === 'connected' ? 'Online' : 'Down'}
              valueTone={data.health?.database === 'connected' ? 'text-brand' : 'text-red-500'}
              sub="Supabase"
              subTone="text-slate-400"
            />
          </div>
        </Card>

        <Card icon="fa-sack-dollar" iconColor="text-brand" title="Finance Overview">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <FinanceTile icon="fa-coins" color="text-brand" label="Today's Collection" value={money(todayCollection)} />
            <FinanceTile icon="fa-calendar-check" color="text-blue-600" label="This Month" value={money(derived.finance.thisMonth)} />
            <FinanceTile icon="fa-triangle-exclamation" color="text-red-500" label="Unpaid Records" value={derived.finance.unpaidCount} />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fee Collection Trend</p>
          <AreaChart points={derived.trend} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card icon="fa-bolt" iconColor="text-brand" title="Quick Actions">
            <div className="grid grid-cols-4 gap-2">
              <ActionTile to="/students" icon="fa-user-plus" label="Add Student" />
              <ActionTile to="/staff" icon="fa-user-tie" label="Add Staff" />
              <ActionTile to="/attendance" icon="fa-clipboard-check" label="Attendance" />
              <ActionTile to="/tasks" icon="fa-list-check" label="Assign Task" />
              <ActionTile to="/fees" icon="fa-file-invoice-dollar" label="Add Fee" />
              <ActionTile to="/salary" icon="fa-award" label="Reward" />
              <ActionTile to="/salary" icon="fa-gavel" label="Fault" />
              <ActionTile to="/evaluations" icon="fa-file-export" label="Report" />
            </div>
          </Card>

          <Card icon="fa-server" iconColor="text-slate-500" title="System Status" className="flex-1">
            <ul className="space-y-1.5 text-[12px]">
              <StatusRow label="Database" ok={data.health?.database === 'connected'} okText="Online" badText="Down" />
              <StatusRow label="Server" ok={healthy} okText="Online" badText="Unreachable" />
              <StatusRow label="Notifications" ok okText="Active" />
              <StatusRow label="Environment" okText={data.health?.environment || '—'} neutral />
              <StatusRow label="Version" okText={data.health?.version || '—'} neutral />
            </ul>
          </Card>
        </div>
      </div>

      <p className="pb-1 text-center text-[10px] text-slate-400">
        Welcome back{user?.name ? `, ${user.name}` : ''} — data refreshes on reload
      </p>
    </div>
  )
}

/* ---------- building blocks ---------- */

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

function CardFooter({ left, link }) {
  return (
    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
      <span>{left}</span>
      {link && (
        <Link to={link.to} className="text-[11px] font-semibold text-brand hover:underline">
          {link.label}
        </Link>
      )}
    </div>
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
        <p className="text-[22px] font-extrabold leading-7 text-slate-800">{value}</p>
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

function Donut({ pct }) {
  const r = 46
  const c = 2 * Math.PI * r
  const filled = pct != null ? (Math.min(pct, 100) / 100) * c : 0
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        {pct != null && (
          <circle
            cx="64" cy="64" r={r} fill="none" stroke="#36a860" strokeWidth="14"
            strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-slate-800">{pct != null ? `${pct}%` : '—'}</span>
        <span className="text-[8px] uppercase tracking-wide text-slate-400">Present</span>
      </div>
    </div>
  )
}

function LegendRow({ dot, label, value, extra = '' }) {
  return (
    <li className="flex items-center gap-2 text-[12px]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="w-14 text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">
        {Number(value).toLocaleString()} {extra && <span className="font-normal text-slate-400">({extra})</span>}
      </span>
    </li>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-md bg-slate-50 px-1.5 py-2 text-center">
      <p className={`text-base font-extrabold leading-5 ${tone}`}>{value}</p>
      <p className="text-[9px] text-slate-400">{label}</p>
    </div>
  )
}

function MonitorTile({ icon, color = 'text-blue-500', label, value, sub, valueTone = 'text-slate-800', subTone = 'text-slate-400' }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-400">
        <i className={`fas ${icon} ${color}`} />
        <span className="truncate">{label}</span>
      </p>
      <p className={`text-[15px] font-extrabold leading-5 ${valueTone}`}>{value}</p>
      <p className={`truncate text-[10px] ${subTone}`}>{sub}</p>
    </div>
  )
}

function FinanceTile({ icon, color, label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-center">
      <i className={`fas ${icon} ${color} text-xs`} />
      <p className="mt-1 text-[14px] font-extrabold leading-5 text-slate-800">{value}</p>
      <p className="truncate text-[10px] text-slate-400">{label}</p>
    </div>
  )
}

function Chip({ className = '', children }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${className}`}>
      {children}
    </span>
  )
}

function RfColumn({ title, items, tone, sign, fallbackName }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
      {items.length === 0 ? (
        <p className="py-2 text-[11px] text-slate-300">None recorded</p>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate text-slate-600">{r.name || fallbackName(r.staff_id)}</span>
              <span className={`shrink-0 font-bold ${tone}`}>{sign}{money(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReportTile({ to, icon, color, title }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-center transition hover:border-brand/40 hover:bg-brand-soft/40"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${color}`}>
        <i className={`fas ${icon}`} />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-slate-700">{title}</span>
      <span className="-mt-1 text-[8px] text-slate-400">Auto Generated</span>
    </Link>
  )
}

function ActionTile({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-center transition hover:border-brand/50 hover:bg-brand-soft/50"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[12px] text-brand">
        <i className={`fas ${icon}`} />
      </span>
      <span className="text-[9px] font-medium leading-tight text-slate-600">{label}</span>
    </Link>
  )
}

function StatusRow({ label, ok, okText, badText, neutral }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      {neutral ? (
        <span className="font-semibold capitalize text-slate-700">{okText}</span>
      ) : (
        <span className={`flex items-center gap-1.5 font-semibold ${ok ? 'text-brand' : 'text-red-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-brand' : 'bg-red-500'}`} />
          {ok ? okText : badText}
        </span>
      )}
    </li>
  )
}

// Two-line attendance trend (present green, absent red).
function TrendLines({ series }) {
  const width = 300
  const height = 90
  const pad = 6
  const max = Math.max(...series.flatMap((p) => [p.present, p.absent]), 1)
  const stepX = (width - pad * 2) / Math.max(series.length - 1, 1)
  const toY = (v) => height - pad - (v / max) * (height - pad * 2)
  const line = (key) => series.map((p, i) => `${pad + i * stepX},${toY(p[key])}`).join(' ')

  const hasData = series.some((p) => p.present || p.absent)
  if (!hasData) {
    return <p className="py-6 text-center text-[11px] text-slate-300">No attendance history yet</p>
  }

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Weekly attendance trend">
        <polyline points={line('present')} fill="none" stroke="#36a860" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={line('absent')} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" />
        {series.map((p, i) => (
          <g key={i}>
            <circle cx={pad + i * stepX} cy={toY(p.present)} r="2.5" fill="#36a860" />
            <circle cx={pad + i * stepX} cy={toY(p.absent)} r="2.5" fill="#ef4444" />
          </g>
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[9px] text-slate-400">
        {series.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

// Filled area line chart for fee collection.
function AreaChart({ points }) {
  const width = 560
  const height = 96
  const pad = 8
  const max = Math.max(...points.map((p) => p.value), 1)
  const stepX = (width - pad * 2) / Math.max(points.length - 1, 1)
  const coords = points.map((p, i) => [pad + i * stepX, height - pad - (p.value / max) * (height - pad * 2)])
  const path = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `${pad},${height - pad} ${path} ${width - pad},${height - pad}`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Fee collection trend">
        <polygon points={area} fill="rgb(48 102 180 / 0.10)" />
        <polyline points={path} fill="none" stroke="#3066b4" strokeWidth="2" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#3066b4" />
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[10px] text-slate-400">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

function Empty({ text, cta }) {
  return (
    <div className="py-5 text-center text-[12px] text-slate-400">
      <p>{text}</p>
      {cta && (
        <Link to={cta.to} className="mt-1 inline-block font-medium text-brand hover:underline">
          {cta.label}
        </Link>
      )}
    </div>
  )
}
