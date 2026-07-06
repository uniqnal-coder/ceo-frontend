import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  fetchDashboard,
  attendanceCounts,
  taskCounts,
  financeSummary,
  feeTrend,
  rewardsAndFaults,
  timeAgo,
} from '../api/dashboard'

const money = (n) => `$${Number(n || 0).toLocaleString()}`

const PRIORITY_STYLE = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-green-50 text-green-600',
}

const STATUS_STYLE = {
  completed: 'bg-green-50 text-green-600',
  'in progress': 'bg-blue-50 text-blue-600',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

function chipClass(map, value) {
  return map[String(value || '').toLowerCase()] || 'bg-gray-100 text-gray-600'
}

export default function Home() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetchDashboard()
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const derived = useMemo(() => {
    if (!data) return null
    return {
      attendance: attendanceCounts(data.attendanceToday),
      tasks: taskCounts(data.tasks),
      finance: financeSummary(data.fees),
      trend: feeTrend(data.fees, 7),
      rf: rewardsAndFaults(data.salary),
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-gray-500">
          <i className="fas fa-circle-notch fa-spin mr-2" />
          Loading control center...
        </div>
      </div>
    )
  }

  const staffName = (id) => data.staff.find((s) => s.id === id)?.name || '—'
  const presentPct = data.attendanceToday.length
    ? Math.round((derived.attendance.present / data.attendanceToday.length) * 100)
    : null
  const healthy = data.health?.status === 'healthy'
  const recentTasks = data.tasks.slice(0, 6)
  const classesRunning = new Set(
    data.attendanceToday.map((r) => r.lesson).filter(Boolean),
  ).size

  return (
    <div className="min-h-full bg-gray-50 p-6">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Full Management Control Center</h1>
          <p className="text-sm text-gray-500">
            Welcome back{user?.name ? `, ${user.name}` : ''} · live overview of your school
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
            <i className="far fa-calendar mr-2 text-gray-400" />
            {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </span>
          <Link
            to="/tasks"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            <i className="fas fa-bolt mr-2" />
            Quick Action
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="fa-user-graduate" color="blue" label="Total Students" value={data.studentsTotal.toLocaleString()} />
        <KpiCard icon="fa-chalkboard-teacher" color="purple" label="Total Staff" value={data.staffTotal.toLocaleString()} />
        <KpiCard
          icon="fa-user-check"
          color="green"
          label="Present Today"
          value={derived.attendance.present.toLocaleString()}
          sub={presentPct !== null ? `${presentPct}% attendance` : 'No records yet today'}
        />
        <KpiCard
          icon="fa-dollar-sign"
          color="amber"
          label="Revenue This Month"
          value={money(derived.finance.thisMonth)}
          sub={`${money(derived.finance.total)} all time`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Attendance + live monitor */}
        <Card className="xl:col-span-2" icon="fa-video" title="Attendance Monitoring (Today)">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <MiniStat label="Present" value={derived.attendance.present} tone="text-green-600" />
            <MiniStat label="Absent" value={derived.attendance.absent} tone="text-red-500" />
            <MiniStat label="Late" value={derived.attendance.late} tone="text-amber-500" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Live Monitor</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex aspect-video flex-col items-center justify-center rounded-lg bg-gray-800 text-gray-500"
              >
                <i className="fas fa-video-slash mb-1" />
                <span className="text-[11px]">Camera {n} · offline</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">CCTV integration not connected yet</p>
        </Card>

        {/* Notifications */}
        <Card
          icon="fa-bell"
          title="Auto Notifications"
          action={
            data.notifications.some((n) => !n.read) && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {data.notifications.filter((n) => !n.read).length} new
              </span>
            )
          }
        >
          {data.notifications.length === 0 ? (
            <Empty text="No notifications" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {data.notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-700">{n.title}</p>
                    <p className="truncate text-xs text-gray-500">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Staff daily tasks */}
        <Card
          className="xl:col-span-2"
          icon="fa-list-check"
          title="Staff Daily Tasks"
          action={<Link to="/tasks" className="text-sm font-medium text-blue-600 hover:underline">View All Tasks</Link>}
        >
          {recentTasks.length === 0 ? (
            <Empty text="No tasks yet" cta={{ to: '/tasks', label: 'Create the first task' }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 pr-4 font-semibold">Task</th>
                    <th className="pb-2 pr-4 font-semibold">Assigned To</th>
                    <th className="pb-2 pr-4 font-semibold">Priority</th>
                    <th className="pb-2 pr-4 font-semibold">Deadline</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTasks.map((t) => (
                    <tr key={t.id}>
                      <td className="max-w-[220px] truncate py-2.5 pr-4 font-medium text-gray-700">{t.title}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{staffName(t.assigned_to)}</td>
                      <td className="py-2.5 pr-4">
                        <Chip className={chipClass(PRIORITY_STYLE, t.priority)}>{t.priority || '—'}</Chip>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-2.5">
                        <Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span><b className="text-amber-600">{derived.tasks.pending}</b> pending</span>
            <span><b className="text-blue-600">{derived.tasks.inProgress}</b> in progress</span>
            <span><b className="text-green-600">{derived.tasks.completed}</b> completed</span>
          </div>
        </Card>

        {/* Rewards & faults */}
        <Card icon="fa-award" title="Rewards & Faults">
          {data.salaryDenied ? (
            <Empty text="Admin access required" />
          ) : derived.rf.rewards.length === 0 && derived.rf.faults.length === 0 ? (
            <Empty text="No rewards or faults recorded" cta={{ to: '/salary', label: 'Open salary records' }} />
          ) : (
            <div className="space-y-4">
              <RfList
                title="Top Rewards"
                items={derived.rf.rewards}
                tone="text-green-600"
                sign="+"
                fallbackName={staffName}
              />
              <RfList
                title="Faults"
                items={derived.rf.faults}
                tone="text-red-500"
                sign="−"
                fallbackName={staffName}
              />
            </div>
          )}
        </Card>

        {/* Auto reports */}
        <Card className="xl:col-span-2" icon="fa-file-lines" title="Auto Reports">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportTile to="/attendance" icon="fa-calendar-day" color="text-green-600 bg-green-50" title="Daily Report" />
            <ReportTile to="/tasks" icon="fa-calendar-week" color="text-blue-600 bg-blue-50" title="Weekly Report" />
            <ReportTile to="/evaluations" icon="fa-calendar" color="text-purple-600 bg-purple-50" title="Monthly Report" />
            <ReportTile to="/attendance" icon="fa-user-check" color="text-amber-600 bg-amber-50" title="Attendance Report" />
            <ReportTile to="/evaluations" icon="fa-chart-line" color="text-pink-600 bg-pink-50" title="Performance Report" />
            <ReportTile to="/fees" icon="fa-coins" color="text-emerald-600 bg-emerald-50" title="Financial Report" />
          </div>
        </Card>

        {/* Daily monitoring */}
        <Card icon="fa-gauge-high" title="Daily Monitoring">
          <div className="grid grid-cols-2 gap-3">
            <MonitorStat
              icon="fa-fingerprint"
              label="Biometry Devices"
              value={data.biometryDenied ? '—' : `${data.biometry.filter((b) => b.is_active !== false).length} active`}
              sub={data.biometryDenied ? 'Admin only' : 'Enrolled fingerprints'}
            />
            <MonitorStat
              icon="fa-school"
              label="Classes Running"
              value={classesRunning || '—'}
              sub="From today's attendance"
            />
            <MonitorStat
              icon="fa-shield-halved"
              label="Security Status"
              value={healthy ? 'Secure' : 'Check'}
              sub={healthy ? 'All systems OK' : 'Backend unhealthy'}
              tone={healthy ? 'text-green-600' : 'text-red-500'}
            />
            <MonitorStat
              icon="fa-database"
              label="Database"
              value={data.health?.database === 'connected' ? 'Connected' : 'Down'}
              sub={healthy ? `Uptime ${Math.floor((data.health?.uptime || 0) / 3600)}h` : 'Unreachable'}
              tone={data.health?.database === 'connected' ? 'text-green-600' : 'text-red-500'}
            />
          </div>
        </Card>

        {/* Finance overview */}
        <Card className="xl:col-span-2" icon="fa-sack-dollar" title="Finance Overview">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat label="This Month" value={money(derived.finance.thisMonth)} tone="text-emerald-600" />
            <MiniStat label="All Time" value={money(derived.finance.total)} tone="text-gray-700" />
            <MiniStat label="Unpaid Records" value={derived.finance.unpaidCount} tone="text-red-500" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fee Collection · last 7 days
          </p>
          <TrendChart points={derived.trend} />
        </Card>

        {/* Quick actions + system status */}
        <div className="space-y-4">
          <Card icon="fa-bolt" title="Quick Actions">
            <div className="grid grid-cols-3 gap-2">
              <ActionTile to="/students" icon="fa-user-plus" label="Add Student" />
              <ActionTile to="/staff" icon="fa-user-tie" label="Add Staff" />
              <ActionTile to="/attendance" icon="fa-clipboard-check" label="Attendance" />
              <ActionTile to="/tasks" icon="fa-list-check" label="Assign Task" />
              <ActionTile to="/fees" icon="fa-file-invoice-dollar" label="Add Fee" />
              <ActionTile to="/salary" icon="fa-award" label="Reward / Fault" />
            </div>
          </Card>

          <Card icon="fa-server" title="System Status">
            <ul className="space-y-2 text-sm">
              <StatusRow label="Server" ok={healthy} okText="Online" badText="Unreachable" />
              <StatusRow label="Database" ok={data.health?.database === 'connected'} okText="Online" badText="Down" />
              <StatusRow label="Environment" ok okText={data.health?.environment || '—'} neutral />
              <StatusRow label="Version" ok okText={data.health?.version || '—'} neutral />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ---------- building blocks ---------- */

function Card({ icon, title, action, className = '', children }) {
  return (
    <section className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <i className={`fas ${icon} text-blue-500`} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function KpiCard({ icon, color, label, value, sub }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${colors[color]}`}>
        <i className={`fas ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="truncate text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function MonitorStat({ icon, label, value, sub, tone = 'text-gray-800' }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="mb-1 text-xs text-gray-500">
        <i className={`fas ${icon} mr-1 text-blue-500`} />
        {label}
      </p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] text-gray-400">{sub}</p>
    </div>
  )
}

function Chip({ className = '', children }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

function RfList({ title, items, tone, sign, fallbackName }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">None recorded</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-600">{r.name || fallbackName(r.staff_id)}</span>
              <span className={`font-semibold ${tone}`}>{sign}{money(r.amount)}</span>
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
      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-blue-200 hover:shadow-sm"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <i className={`fas ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-700">{title}</p>
        <p className="text-[11px] text-gray-400">Auto generated</p>
      </div>
    </Link>
  )
}

function ActionTile({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-lg border border-gray-100 p-3 text-center transition hover:border-blue-200 hover:bg-blue-50/40"
    >
      <i className={`fas ${icon} text-blue-500`} />
      <span className="text-[11px] font-medium leading-tight text-gray-600">{label}</span>
    </Link>
  )
}

function StatusRow({ label, ok, okText, badText, neutral }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      {neutral ? (
        <span className="font-medium text-gray-700">{okText}</span>
      ) : (
        <span className={`flex items-center gap-1.5 font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
          {ok ? okText : badText}
        </span>
      )}
    </li>
  )
}

function TrendChart({ points }) {
  const width = 560
  const height = 120
  const pad = 8
  const max = Math.max(...points.map((p) => p.value), 1)
  const stepX = (width - pad * 2) / Math.max(points.length - 1, 1)
  const coords = points.map((p, i) => [
    pad + i * stepX,
    height - pad - (p.value / max) * (height - pad * 2),
  ])
  const path = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `${pad},${height - pad} ${path} ${width - pad},${height - pad}`

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Fee collection trend">
        <polygon points={area} fill="rgb(16 185 129 / 0.08)" />
        <polyline points={path} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#10b981" />
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[11px] text-gray-400">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

function Empty({ text, cta }) {
  return (
    <div className="py-6 text-center text-sm text-gray-400">
      <p>{text}</p>
      {cta && (
        <Link to={cta.to} className="mt-1 inline-block text-blue-600 hover:underline">
          {cta.label}
        </Link>
      )}
    </div>
  )
}
