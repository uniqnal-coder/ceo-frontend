import { useEffect, useState } from 'react'
import { api, toArray } from '../api/client'

const todayISO = () => new Date().toISOString().slice(0, 10)
const norm = (s) => String(s || '').toLowerCase().replace(/[\s_-]/g, '')
const settle = (r, fb) => (r.status === 'fulfilled' ? r.value : fb)
const totalOf = (res) => res?.pagination?.total ?? toArray(res ?? []).length

// Aggregates real dashboard numbers from the existing CRUD endpoints.
// Each call is isolated (Promise.allSettled) so an admin-only 403 or a
// transient failure degrades that stat gracefully instead of breaking.
export function useDashboardStats() {
  const [state, setState] = useState({ loading: true, stats: null })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [students, staff, attendance, fees, tasks] = await Promise.allSettled([
        api.get('/api/students?page=1&limit=1000'),
        api.get('/api/staff?page=1&limit=1000'),
        api.get(`/api/attendance/date/${todayISO()}`),
        api.get('/api/fees?page=1&limit=1000'),
        api.get('/api/tasks?page=1&limit=500'),
      ])

      const attRows = toArray(settle(attendance, []))
      const present = attRows.filter((r) => ['present', 'late'].includes(norm(r.status))).length

      const feeRows = toArray(settle(fees, []))
      const now = new Date()
      const monthKey = `${now.getFullYear()}-${now.getMonth()}`
      let revenue = 0
      let revenueMonth = 0
      for (const f of feeRows) {
        const amt = Number(f.paid) || 0
        revenue += amt
        const d = f.date ? new Date(f.date) : null
        if (d && `${d.getFullYear()}-${d.getMonth()}` === monthKey) revenueMonth += amt
      }

      const taskRows = toArray(settle(tasks, []))
      const pending = taskRows.filter((t) => norm(t.status) === 'pending').length
      const inProgress = taskRows.filter((t) => norm(t.status) === 'inprogress').length

      if (!alive) return
      setState({
        loading: false,
        stats: {
          students: totalOf(settle(students, null)),
          staff: totalOf(settle(staff, null)),
          attendance: { present, total: attRows.length },
          revenue: { total: revenue, month: revenueMonth },
          tasks: { pending, inProgress, total: totalOf(settle(tasks, null)) },
        },
      })
    })()
    return () => {
      alive = false
    }
  }, [])

  return state
}
