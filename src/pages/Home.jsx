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
      <div className="flex h-full items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-500">
          <i className="fas fa-circle-notch fa-spin mr-2" />
          Loading control center...
        </div>
      </div>
    )
  }

  const staffName = (id) => data.staff.find((s) => s.id === id)?.name || '—'
  const todayTotal = data.attendanceToday.length
  const presentPct = todayTotal ? Math.round((derived.attendance.present / todayTotal) * 1000) / 10 : null
  const healthy = data.health?.status === 'healthy'
  const recentTasks = data.tasks.slice(0, 5)
  const classesRunning = new Set(data.attendanceToday.map((r) => r.lesson).filter(Boolean)).size
  const biometryActive = data.biometryDenied ? null : data.biometry.filter((b) => b.is_active !== false).length
  const unread = data.notifications.filter((n) => !n.read).length
  const todayCollection = derived.trend[derived.trend.length - 1]?.value || 0
  const uptimeH = Math.floor((data.health?.uptime || 0) / 3600)

  return (
    <div className="min-h-full space-y-4 bg-gray-100 p-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="fa-user-graduate"
          color="bg-blue-100 text-blue-600"
          label="Total Students"
          value={data.studentsTotal.toLocaleString()}
          delta={{ text: `${data.students.length ? 'Enrolled and active' : 'No students yet'}`, tone: 'text-green-600' }}
        />
        <KpiCard
          icon="fa-users"
          color="bg-sky-100 text-sky-600"
          label="Total Staff"
          value={data.staffTotal.toLocaleString()}
          delta={{ text: 'Across all departments', tone: 'text-green-600' }}
        />
        <KpiCard
          icon="fa-circle-check"
          color="bg-green-100 text-green-600"
          label="Present Today"
          value={derived.attendance.present.toLocaleString()}
          delta={
            presentPct !== null
              ? { text: `${presentPct}% of today's records`, tone: 'text-green-600' }
              : { text: 'No records yet today', tone: 'text-gray-400' }
          }
        />
        <KpiCard
          icon="fa-sack-dollar"
          color="bg-amber-100 text-amber-600"
          label="Total Revenue"
          value={money(derived.finance.total)}
          delta={{ text: `${money(derived.finance.thisMonth)} this month`, tone: 'text-green-600' }}
        />
      </div>

      {/* Row 2: attendance donut · live monitor · notifications */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card icon="fa-chart-pie" iconColor="text-green-600" title="Attendance Overview (Today)">
          <div className="flex items-center gap-5">
            <Donut pct={presentPct} />
            <ul className="min-w-0 flex-1 space-y-2.5">
              <LegendRow
                dot="bg-green-500"
                label="Present"
                value={derived.attendance.present}
                extra={presentPct !== null ? `(${presentPct}%)` : ''}
              />
              <LegendRow dot="bg-red-500" label="Absent" value={derived.attendance.absent} />
              <LegendRow dot="bg-amber-400" label="Late" value={derived.attendance.late} />
              <li className="border-t border-gray-100 pt-2 text-[11px] text-gray-400">
                {todayTotal ? `${todayTotal} records today` : 'No attendance marked yet today'}
              </li>
            </ul>
          </div>
        </Card>

        <Card
          icon="fa-video"
          iconColor="text-blue-500"
          title="Staff Attendance (Camera & Biometry)"
          action={<Link to="/attendance" className="text-[11px] font-semibold text-blue-600 hover:underline">View All</Link>}
        >
          <div className="mb-3 grid grid-cols-3 gap-2">
            <MiniStat label="Present" value={derived.attendance.present} tone="text-green-600" />
            <MiniStat label="Absent" value={derived.attendance.absent} tone="text-red-500" />
            <MiniStat label="Late" value={derived.attendance.late} tone="text-amber-500" />
          </div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">Live Monitor</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex h-14 flex-col items-center justify-center rounded-md bg-slate-800 text-slate-500">
                <i className="fas fa-video-slash text-[11px]" />
                <span className="mt-0.5 text-[9px]">Cam {n}</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400">CCTV integration not connected yet</p>
        </Card>

        <Card
          icon="fa-bell"
          iconColor="text-amber-500"
          title="Auto Notifications"
          action={
            unread > 0 ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread} new</span>
            ) : (
              <span className="text-[11px] text-gray-400">All read</span>
            )
          }
        >
          {data.notifications.length === 0 ? (
            <Empty text="No notifications yet" />
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="flex items-start gap-2.5 py-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-gray-300' : 'bg-blue-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-gray-700">{n.title}</p>
                    <p className="truncate text-[11px] text-gray-400">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                </li>
              ))}
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
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="pb-1.5 pr-2 font-semibold">Task</th>
                  <th className="pb-1.5 pr-2 font-semibold">Assignee</th>
                  <th className="pb-1.5 pr-2 font-semibold">Priority</th>
                  <th className="pb-1.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTasks.map((t) => (
                  <tr key={t.id}>
                    <td className="max-w-[120px] truncate py-1.5 pr-2 font-medium text-gray-700">{t.title}</td>
                    <td className="max-w-[80px] truncate py-1.5 pr-2 text-gray-500">{staffName(t.assigned_to)}</td>
                    <td className="py-1.5 pr-2">
                      <Chip className={chipClass(PRIORITY_STYLE, t.priority)}>{t.priority || '—'}</Chip>
                    </td>
                    <td className="py-1.5">
                      <Chip className={chipClass(STATUS_STYLE, t.status)}>{t.status || 'Pending'}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <CardFooter
            left={
              <span className="text-[11px] text-gray-400">
                <b className="text-amber-600">{derived.tasks.pending}</b> pending ·{' '}
                <b className="text-blue-600">{derived.tasks.inProgress}</b> active ·{' '}
                <b className="text-green-600">{derived.tasks.completed}</b> done
              </span>
            }
            link={{ to: '/tasks', label: 'View All Tasks' }}
          />
        </Card>

        <Card icon="fa-file-lines" iconColor="text-indigo-500" title="Auto Reports (All)">
          <div className="grid grid-cols-3 gap-2">
            <ReportTile to="/attendance" icon="fa-calendar-day" color="bg-blue-50 text-blue-600" title="Daily Report" />
            <ReportTile to="/tasks" icon="fa-calendar-week" color="bg-green-50 text-green-600" title="Weekly Report" />
            <ReportTile to="/evaluations" icon="fa-calendar" color="bg-purple-50 text-purple-600" title="Monthly Report" />
            <ReportTile to="/attendance" icon="fa-user-check" color="bg-amber-50 text-amber-600" title="Attendance" />
            <ReportTile to="/evaluations" icon="fa-chart-line" color="bg-pink-50 text-pink-600" title="Performance" />
            <ReportTile to="/fees" icon="fa-coins" color="bg-emerald-50 text-emerald-600" title="Financial" />
          </div>
          <CardFooter link={{ to: '/evaluations', label: 'View All Reports' }} />
        </Card>

        <Card icon="fa-award" iconColor="text-yellow-500" title="Rewards & Faults (Auto)">
          {data.salaryDenied ? (
            <Empty text="Admin access required" />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <RfColumn title="Top Rewards Today" items={derived.rf.rewards} tone="text-green-600" sign="+" fallbackName={staffName} />
              <RfColumn title="Today's Faults" items={derived.rf.faults} tone="text-red-500" sign="−" fallbackName={staffName} />
            </div>
          )}
          <CardFooter link={{ to: '/salary', label: 'View All Rewards & Faults' }} />
        </Card>
      </div>

      {/* Row 4: daily monitoring · finance · quick actions + status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card icon="fa-gauge-high" iconColor="text-cyan-600" title="Daily Monitoring (Live Overview)">
          <div className="grid grid-cols-3 gap-2">
            <MonitorTile icon="fa-video" label="Cameras Active" value="0/4" sub="Not connected" subTone="text-gray-400" />
            <MonitorTile
              icon="fa-fingerprint"
              label="Biometry Devices"
              value={biometryActive === null ? '—' : biometryActive}
              sub={biometryActive === null ? 'Admin only' : 'Enrolled'}
              subTone={biometryActive ? 'text-green-600' : 'text-gray-400'}
            />
            <MonitorTile
              icon="fa-school"
              label="Classes Running"
              value={classesRunning || '—'}
              sub="From attendance"
              subTone={classesRunning ? 'text-green-600' : 'text-gray-400'}
            />
            <MonitorTile
              icon="fa-shield-halved"
              label="Security Status"
              value={healthy ? 'Secure' : 'Check'}
              valueTone={healthy ? 'text-green-600' : 'text-red-500'}
              sub={healthy ? 'All systems OK' : 'Backend unhealthy'}
              subTone={healthy ? 'text-green-600' : 'text-red-500'}
            />
            <MonitorTile
              icon="fa-bolt"
              label="Server Uptime"
              value={healthy ? `${uptimeH}h` : '—'}
              sub={healthy ? 'Running' : 'Unreachable'}
              subTone={healthy ? 'text-green-600' : 'text-red-500'}
            />
            <MonitorTile
              icon="fa-database"
              label="Database"
              value={data.health?.database === 'connected' ? 'Online' : 'Down'}
              valueTone={data.health?.database === 'connected' ? 'text-green-600' : 'text-red-500'}
              sub="Supabase"
              subTone="text-gray-400"
            />
          </div>
        </Card>

        <Card icon="fa-sack-dollar" iconColor="text-emerald-600" title="Finance Overview">
          <div className="mb-3 grid grid-cols-3 gap-2">
            <FinanceTile icon="fa-coins" color="text-emerald-600" label="Today's Collection" value={money(todayCollection)} />
            <FinanceTile icon="fa-calendar-check" color="text-blue-600" label="This Month" value={money(derived.finance.thisMonth)} />
            <FinanceTile icon="fa-triangle-exclamation" color="text-red-500" label="Unpaid Records" value={derived.finance.unpaidCount} />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Fee Collection Trend</p>
          <TrendChart points={derived.trend} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card icon="fa-bolt" iconColor="text-green-600" title="Quick Actions">
            <div className="grid grid-cols-3 gap-2">
              <ActionTile to="/students" icon="fa-user-plus" label="Add Student" />
              <ActionTile to="/staff" icon="fa-user-tie" label="Add Staff" />
              <ActionTile to="/attendance" icon="fa-clipboard-check" label="Attendance" />
              <ActionTile to="/tasks" icon="fa-list-check" label="Assign Task" />
              <ActionTile to="/fees" icon="fa-file-invoice-dollar" label="Add Fee" />
              <ActionTile to="/salary" icon="fa-award" label="Reward" />
            </div>
          </Card>

          <Card icon="fa-server" iconColor="text-gray-500" title="System Status" className="flex-1">
            <ul className="space-y-1.5 text-[12px]">
              <StatusRow label="Database" ok={data.health?.database === 'connected'} okText="Online" badText="Down" />
              <StatusRow label="Server" ok={healthy} okText="Online" badText="Unreachable" />
              <StatusRow label="Notifications" ok okText="Active" />
              <StatusRow label="Environment" ok okText={data.health?.environment || '—'} neutral />
              <StatusRow label="Version" ok okText={data.health?.version || '—'} neutral />
            </ul>
          </Card>
        </div>
      </div>

      <p className="pb-1 text-center text-[10px] text-gray-400">
        Welcome back{user?.name ? `, ${user.name}` : ''} — data refreshes on reload
      </p>
    </div>
  )
}

/* ---------- building blocks ---------- */

function Card({ icon, iconColor = 'text-blue-500', title, action, className = '', children }) {
  return (
    <section className={`rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-bold text-gray-700">
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
    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
      <span>{left}</span>
      {link && (
        <Link to={link.to} className="text-[11px] font-semibold text-blue-600 hover:underline">
          {link.label}
        </Link>
      )}
    </div>
  )
}

function KpiCard({ icon, color, label, value, delta }) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-gray-200/80 bg-white p-4 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base ${color}`}>
        <i className={`fas ${icon}`} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-gray-400">{label}</p>
        <p className="text-[22px] font-extrabold leading-7 text-gray-800">{value}</p>
        {delta && <p className={`truncate text-[11px] ${delta.tone}`}>{delta.text}</p>}
      </div>
    </div>
  )
}

function Donut({ pct }) {
  const r = 52
  const c = 2 * Math.PI * r
  const filled = pct != null ? (Math.min(pct, 100) / 100) * c : 0
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="13" />
        {pct != null && (
          <circle
            cx="64" cy="64" r={r} fill="none" stroke="#22c55e" strokeWidth="13"
            strokeDasharray={`${filled} ${c}`} strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-gray-800">{pct != null ? `${pct}%` : '—'}</span>
        <span className="text-[9px] uppercase tracking-wide text-gray-400">Overall Present</span>
      </div>
    </div>
  )
}

function LegendRow({ dot, label, value, extra = '' }) {
  return (
    <li className="flex items-center gap-2 text-[13px]">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="flex-1 text-gray-500">{label}</span>
      <span className="font-bold text-gray-800">
        {Number(value).toLocaleString()} <span className="font-normal text-gray-400">{extra}</span>
      </span>
    </li>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-md bg-gray-50 px-2 py-2 text-center">
      <p className={`text-lg font-extrabold leading-6 ${tone}`}>{value}</p>
      <p className="text-[10px] text-gray-400">{label}</p>
    </div>
  )
}

function MonitorTile({ icon, label, value, sub, valueTone = 'text-gray-800', subTone = 'text-gray-400' }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50/60 p-2.5">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] text-gray-400">
        <i className={`fas ${icon} text-blue-500`} />
        <span className="truncate">{label}</span>
      </p>
      <p className={`text-[15px] font-extrabold leading-5 ${valueTone}`}>{value}</p>
      <p className={`truncate text-[10px] ${subTone}`}>{sub}</p>
    </div>
  )
}

function FinanceTile({ icon, color, label, value }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50/60 p-2.5 text-center">
      <i className={`fas ${icon} ${color} text-xs`} />
      <p className="mt-1 text-[15px] font-extrabold leading-5 text-gray-800">{value}</p>
      <p className="truncate text-[10px] text-gray-400">{label}</p>
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
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
      {items.length === 0 ? (
        <p className="py-2 text-[11px] text-gray-300">None recorded</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate text-gray-600">{r.name || fallbackName(r.staff_id)}</span>
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
      className="flex flex-col items-center gap-1.5 rounded-md border border-gray-100 bg-gray-50/50 p-2.5 text-center transition hover:border-blue-200 hover:bg-blue-50/40"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs ${color}`}>
        <i className={`fas ${icon}`} />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-gray-700">{title}</span>
      <span className="-mt-1 text-[9px] text-gray-400">Auto Generated</span>
    </Link>
  )
}

function ActionTile({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 rounded-md border border-gray-100 bg-gray-50/50 p-2.5 text-center transition hover:border-green-300 hover:bg-green-50/40"
    >
      <i className={`fas ${icon} text-[13px] text-green-600`} />
      <span className="text-[10px] font-medium leading-tight text-gray-600">{label}</span>
    </Link>
  )
}

function StatusRow({ label, ok, okText, badText, neutral }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      {neutral ? (
        <span className="font-semibold text-gray-700">{okText}</span>
      ) : (
        <span className={`flex items-center gap-1.5 font-semibold ${ok ? 'text-green-600' : 'text-red-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
          {ok ? okText : badText}
        </span>
      )}
    </li>
  )
}

function TrendChart({ points }) {
  const width = 560
  const height = 96
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
          <circle key={i} cx={x} cy={y} r="2.5" fill="#10b981" />
        ))}
      </svg>
      <div className="flex justify-between px-1 text-[10px] text-gray-400">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  )
}

function Empty({ text, cta }) {
  return (
    <div className="py-5 text-center text-[12px] text-gray-400">
      <p>{text}</p>
      {cta && (
        <Link to={cta.to} className="mt-1 inline-block font-medium text-blue-600 hover:underline">
          {cta.label}
        </Link>
      )}
    </div>
  )
}
