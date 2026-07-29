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
    staff,
    checkins,
    notifications,
    salary,
    biometry,
    health,
  ] = await Promise.allSettled([
    api.get('/api/staff?page=1&limit=500'),
    api.get(`/api/checkins/overview?date=${todayISO()}`),
    api.get('/api/notifications'),
    api.get('/api/salary?page=1&limit=200'),
    api.get('/api/biometry'),
    api.get('/health'),
  ])

  const staffRes = settle(staff, null)

  return {
    staff: toArray(staffRes ?? []),
    staffTotal: staffRes?.pagination?.total ?? toArray(staffRes ?? []).length,
    checkinsToday: settle(checkins, { checkins: [], people: [] }),
    notifications: toArray(settle(notifications, [])),
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

// Verified punch stats for today from /api/checkins/overview.
// Late = first punch after 08:30 (matches the mobile apps' rule).
export function checkinCounts(overview) {
  const checkins = overview?.checkins || []
  const people = overview?.people || []
  let present = 0
  let out = 0
  let late = 0
  let selfies = 0
  for (const c of checkins) {
    if (!c.check_in_time) continue
    present += 1
    if (c.check_out_time) out += 1
    if (c.selfie_verified) selfies += 1
    const t = new Date(c.check_in_time)
    if (t.getHours() > 8 || (t.getHours() === 8 && t.getMinutes() > 30)) late += 1
  }
  const total = Math.max(people.length, present)
  return { present, out, late, selfies, total, notIn: Math.max(total - present, 0) }
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
