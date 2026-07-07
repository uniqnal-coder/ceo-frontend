// Aggregated data loader for the control-center dashboard (Home page).
//
// The backend exposes row-level CRUD endpoints only, so the dashboard
// aggregates client-side. Every section loads independently via
// Promise.allSettled — a 403 on an admin-only endpoint (salary, biometry)
// or a transient failure blanks that card instead of breaking the page.

import { api, toArray } from './client'

const todayISO = () => new Date().toISOString().slice(0, 10)

const settle = (result, fallback) => (result.status === 'fulfilled' ? result.value : fallback)

export async function fetchDashboard() {
  const [
    students,
    staff,
    tasks,
    attendanceToday,
    attendanceAll,
    notifications,
    fees,
    salary,
    biometry,
    health,
  ] = await Promise.allSettled([
    api.get('/api/students?page=1&limit=500'),
    api.get('/api/staff?page=1&limit=500'),
    api.get('/api/tasks?page=1&limit=200&sortBy=created_at&order=desc'),
    api.get(`/api/attendance/date/${todayISO()}`),
    api.get('/api/attendance?page=1&limit=1000&sortBy=date&order=desc'),
    api.get('/api/notifications'),
    api.get('/api/fees?page=1&limit=1000'),
    api.get('/api/salary?page=1&limit=200'),
    api.get('/api/biometry'),
    api.get('/health'),
  ])

  const studentsRes = settle(students, null)
  const staffRes = settle(staff, null)
  const tasksRes = settle(tasks, null)

  return {
    students: toArray(studentsRes ?? []),
    studentsTotal: studentsRes?.pagination?.total ?? toArray(studentsRes ?? []).length,
    staff: toArray(staffRes ?? []),
    staffTotal: staffRes?.pagination?.total ?? toArray(staffRes ?? []).length,
    tasks: toArray(tasksRes ?? []),
    tasksTotal: tasksRes?.pagination?.total ?? toArray(tasksRes ?? []).length,
    attendanceToday: toArray(settle(attendanceToday, [])),
    attendanceAll: toArray(settle(attendanceAll, [])),
    notifications: toArray(settle(notifications, [])),
    fees: toArray(settle(fees, [])),
    salary: toArray(settle(salary, null) ?? []),
    salaryDenied: salary.status === 'rejected',
    biometry: toArray(settle(biometry, null) ?? []),
    biometryDenied: biometry.status === 'rejected',
    health: settle(health, { status: 'unreachable', database: 'unknown' }),
  }
}

// Marks every unread notification as read (backend is one-by-one).
export async function markAllNotificationsRead(notifications) {
  const unread = notifications.filter((n) => !n.read)
  await Promise.allSettled(unread.map((n) => api.put(`/api/notifications/${n.id}`, {})))
}

// ---- pure helpers (aggregation on already-fetched rows) ----

const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]/g, '')

export function attendanceCounts(records) {
  const counts = { present: 0, absent: 0, late: 0 }
  for (const r of records) {
    const s = norm(r.status)
    if (s === 'present') counts.present += 1
    else if (s === 'late') counts.late += 1
    else counts.absent += 1
  }
  return counts
}

// Present/absent per day for the last `days` days → [{ label, present, absent }]
export function attendanceTrend(records, days = 7) {
  const buckets = []
  const index = new Map()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    index.set(key, buckets.length)
    buckets.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), present: 0, absent: 0 })
  }
  for (const r of records) {
    if (!r.date) continue
    const key = String(r.date).slice(0, 10)
    if (!index.has(key)) continue
    const b = buckets[index.get(key)]
    const s = norm(r.status)
    if (s === 'present' || s === 'late') b.present += 1
    else b.absent += 1
  }
  return buckets
}

export function taskCounts(tasks) {
  const counts = { pending: 0, inProgress: 0, completed: 0, cancelled: 0 }
  for (const t of tasks) {
    const s = norm(t.status)
    if (s === 'completed') counts.completed += 1
    else if (s === 'inprogress') counts.inProgress += 1
    else if (s === 'cancelled') counts.cancelled += 1
    else counts.pending += 1
  }
  return counts
}

export function financeSummary(fees) {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  let total = 0
  let thisMonth = 0
  let unpaidCount = 0
  for (const f of fees) {
    const amount = Number(f.paid) || 0
    total += amount
    const d = f.date ? new Date(f.date) : null
    if (d && `${d.getFullYear()}-${d.getMonth()}` === monthKey) thisMonth += amount
    if (f.reminder && f.reminder !== 'Tuition-paid') unpaidCount += 1
  }
  return { total, thisMonth, unpaidCount }
}

// Daily fee totals for the last `days` days → [{ label, value }]
export function feeTrend(fees, days = 7) {
  const buckets = []
  const index = new Map()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString(undefined, { weekday: 'short' })
    index.set(key, buckets.length)
    buckets.push({ label, value: 0 })
  }
  for (const f of fees) {
    if (!f.date) continue
    const key = new Date(f.date).toISOString().slice(0, 10)
    if (index.has(key)) buckets[index.get(key)].value += Number(f.paid) || 0
  }
  return buckets
}

// Top rewards (+) and faults (−) from salary records.
export function rewardsAndFaults(salaryRecords, limit = 3) {
  const named = (r) => r.staff_profiles?.name || r.staff?.name || null
  const rewards = salaryRecords
    .filter((r) => Number(r.reward) > 0)
    .sort((a, b) => Number(b.reward) - Number(a.reward))
    .slice(0, limit)
    .map((r) => ({ id: r.id, name: named(r), staff_id: r.staff_id, amount: Number(r.reward) }))
  const faults = salaryRecords
    .filter((r) => Number(r.punish) > 0)
    .sort((a, b) => Number(b.punish) - Number(a.punish))
    .slice(0, limit)
    .map((r) => ({ id: r.id, name: named(r), staff_id: r.staff_id, amount: Number(r.punish) }))
  return { rewards, faults }
}

export function timeAgo(dateString) {
  if (!dateString) return ''
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const daysAgo = Math.floor(hours / 24)
  return `${daysAgo}d ago`
}
