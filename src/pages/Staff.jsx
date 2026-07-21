import { useState, useEffect } from 'react'
import { validateForm, getValidationError } from '../utils/validation'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [monitorStaff, setMonitorStaff] = useState(null)

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/api/staff')
      setStaff(toArray(data))
    } catch (err) {
      setError(err.message)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    
    try {
      await api.del(`/api/staff/${id}`)
      toast.success('Staff member deleted successfully')
      fetchStaff()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingStaff(null)
    fetchStaff()
  }

  if (showForm) {
    return <StaffForm staff={editingStaff} onClose={handleFormClose} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} className="page-header">
        <div>
          <h2>👥 Staff Management</h2>
          <p style={styles.subtitle} className="page-subtitle">Manage teachers and administrative staff</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton} className="add-button">
          ➕ Add Staff Member
        </button>
      </div>

      {loading && <p style={styles.loading}>Loading staff...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && staff.length === 0 && !error && (
        <div style={styles.empty} className="empty-state">
          <p>📋 No staff members found</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyButton}>
            Add First Staff Member
          </button>
        </div>
      )}

      {!loading && staff.length > 0 && (
        <div style={styles.tableContainer} className="data-table-container">
          <table style={styles.table} className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Role</th>
                <th>Department</th>
                <th>Salary</th>
                <th>Phone</th>
                <th>Certificate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id}>
                  <td style={styles.nameCell}>{member.name}</td>
                  <td>{member.age || '-'}</td>
                  <td>{member.role || '-'}</td>
                  <td>{member.department || '-'}</td>
                  <td style={styles.salaryCell}>
                    {member.salary ? `$${Number(member.salary).toLocaleString()}` : '-'}
                  </td>
                  <td>{member.phone || '-'}</td>
                  <td>{member.certificate || '-'}</td>
                  <td>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: member.status === 'Active' ? '#10b981' : '#ef4444'
                    }}>
                      {member.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div style={styles.actionsRow}>
                      <button
                        onClick={() => setMonitorStaff(member)}
                        style={styles.monitorBtn}
                        title="Lessons, leave & check-ins"
                      >
                        <i className="fas fa-book-open" /> Lessons
                      </button>
                      <button
                        onClick={() => handleEdit(member)}
                        style={styles.editBtn}
                        title="Edit"
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        style={styles.deleteBtn}
                        title="Delete"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {monitorStaff && (
        <StaffMonitorDialog
          member={monitorStaff}
          onClose={() => setMonitorStaff(null)}
        />
      )}
    </div>
  )
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function StaffMonitorDialog({ member, onClose }) {
  const [tab, setTab] = useState('lessons')
  const userId = member.user_id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-800">👩‍🏫 {member.name}</h2>
            <p className="text-[12px] text-slate-500">
              {member.role || 'Teacher'} · {member.department || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-[18px] leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {!userId ? (
          <div className="px-6 py-10 text-center">
            <p className="text-[14px] font-semibold text-slate-700">No app login yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-slate-500">
              Edit this staff member and add an <b>email</b> — saving creates a
              teacher app login with a one-time temporary password, and lessons
              can then be assigned here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-1 px-6 pt-3">
              {[
                { key: 'tasks', label: 'Tasks', icon: 'fa-list-check' },
                { key: 'lessons', label: 'Lessons', icon: 'fa-book-open' },
                { key: 'leave', label: 'Leave', icon: 'fa-umbrella-beach' },
                { key: 'checkins', label: 'Check-ins', icon: 'fa-location-dot' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-t-xl px-4 py-2 text-[12.5px] font-semibold transition ${
                    tab === t.key ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <i className={`fas ${t.icon} mr-1.5`} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="min-h-[280px] flex-1 overflow-y-auto border-t border-slate-100 px-6 py-4">
              {tab === 'tasks' && <StaffTasksTab userId={userId} staffName={member.name} />}
              {tab === 'lessons' && <TeacherLessonsTab userId={userId} teacherName={member.name} />}
              {tab === 'leave' && <TeacherLeaveTab userId={userId} teacherName={member.name} />}
              {tab === 'checkins' && <TeacherCheckinsTab userId={userId} />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function useFetchList(path) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  const reload = async () => {
    try {
      setError('')
      setRows(toArray(await api.get(path)))
    } catch (err) {
      setError(err.message)
      setRows([])
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return { rows, error, reload }
}

function StaffTasksTab({ userId, staffName }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', department: '', priority: 'normal', due_at: '', subtasks: '',
  })
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    try {
      setError('')
      setRows(toArray(await api.get(`/api/staff-tasks/user/${userId}`)))
    } catch (err) {
      setError(err.message)
      setRows([])
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const assign = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api.post('/api/staff-tasks', {
        user_id: userId,
        title: form.title.trim(),
        department: form.department.trim(),
        priority: form.priority,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        subtasks: form.subtasks.split('\n').map((s) => s.trim()).filter(Boolean),
      })
      toast.success(`Task assigned to ${staffName}`)
      setForm({ title: '', department: '', priority: 'normal', due_at: '', subtasks: '' })
      setShowForm(false)
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeTask = async (id) => {
    if (!confirm('Remove this task?')) return
    try {
      await api.del(`/api/staff-tasks/${id}`)
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const viewPhoto = async (reportId) => {
    try {
      const r = await api.get(`/api/staff-tasks/report-photo/${reportId}`)
      if (r.url) window.open(r.url, '_blank')
      else toast.error('No photo on this report')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const progressOf = (t) => {
    if (t.status === 'completed') return 1
    const subs = t.subtasks || []
    if (!subs.length) return 0
    return subs.filter((s) => s.status === 'completed').length / subs.length
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-dark"
        >
          {showForm ? 'Cancel' : '➕ Assign Task'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={assign} className="mb-4 space-y-2.5 rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Task title *"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <div className="grid grid-cols-3 gap-2.5">
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="Area (e.g. Supervisor/Retail)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            >
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <input
              type="datetime-local"
              value={form.due_at}
              onChange={(e) => setForm({ ...form, due_at: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <textarea
            value={form.subtasks}
            onChange={(e) => setForm({ ...form, subtasks: e.target.value })}
            placeholder={'Sub-tasks — one per line\nCheck lights/power\nInspect displays'}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </form>
      )}

      {error && <p className="py-6 text-center text-[12.5px] text-red-500">{error}</p>}
      {rows === null && !error && <p className="py-6 text-center text-[12.5px] text-slate-400">Loading…</p>}
      {rows?.length === 0 && !error && (
        <p className="py-6 text-center text-[13px] text-slate-400">No tasks assigned yet.</p>
      )}
      <div className="space-y-3">
        {rows?.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 p-3.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-bold text-slate-700">{t.title}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase ${
                    t.priority === 'high'
                      ? 'bg-red-50 text-red-500'
                      : 'bg-sky-50 text-sky-600'
                  }`}
                >
                  {t.priority}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    t.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {t.status === 'completed' ? '✓ Completed' : `${Math.round(progressOf(t) * 100)}%`}
                </span>
                <button
                  onClick={() => removeTask(t.id)}
                  className="rounded px-1.5 text-[12px] text-red-400 hover:bg-red-50"
                  title="Remove"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>
            </div>
            {t.department && (
              <p className="text-[11.5px] text-slate-400">{t.department}</p>
            )}
            {(t.subtasks || []).length > 0 && (
              <ul className="mt-2 space-y-1">
                {t.subtasks.map((sTask) => (
                  <li key={sTask.id} className="flex items-center gap-2 text-[12px] text-slate-600">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        sTask.status === 'completed'
                          ? 'bg-emerald-500'
                          : sTask.status === 'pending'
                            ? 'bg-amber-400'
                            : 'bg-slate-300'
                      }`}
                    />
                    <span className={sTask.status === 'completed' ? 'line-through text-slate-400' : ''}>
                      {sTask.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {(t.reports || []).length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                {t.reports.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-[12px] text-slate-600">
                    <i className={`fas ${r.done ? 'fa-circle-check text-emerald-500' : 'fa-message'} mt-0.5`} />
                    <span className="flex-1">
                      {r.note || (r.done ? 'Marked done' : 'Progress update')}
                      <span className="ml-1 text-[10.5px] text-slate-400">
                        {new Date(r.created_at).toLocaleString('en-GB', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </span>
                    {r.photo_path && (
                      <button
                        onClick={() => viewPhoto(r.id)}
                        className="rounded bg-violet-50 px-1.5 py-0.5 text-[10.5px] font-bold text-violet-600 hover:bg-violet-100"
                      >
                        📷 Photo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TeacherLessonsTab({ userId, teacherName }) {
  const { rows, error, reload } = useFetchList(`/api/lessons/user/${userId}`)
  const [showAssign, setShowAssign] = useState(false)
  const [form, setForm] = useState({
    subject: '', grade: '', room: '', day_of_week: '1', start_time: '08:00', end_time: '08:45',
  })
  const [saving, setSaving] = useState(false)

  const assign = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) return
    setSaving(true)
    try {
      await api.post('/api/lessons', {
        teacher_user_id: userId,
        subject: form.subject.trim(),
        grade: form.grade.trim(),
        room: form.room.trim(),
        day_of_week: parseInt(form.day_of_week, 10),
        start_time: form.start_time,
        end_time: form.end_time,
      })
      toast.success(`Lesson added for ${teacherName}`)
      setForm({ ...form, subject: '', grade: '', room: '' })
      setShowAssign(false)
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeLesson = async (id) => {
    if (!confirm('Remove this lesson?')) return
    try {
      await api.del(`/api/lessons/${id}`)
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowAssign((v) => !v)}
          className="rounded-lg bg-brand px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-dark"
        >
          {showAssign ? 'Cancel' : '➕ Add Lesson'}
        </button>
      </div>

      {showAssign && (
        <form onSubmit={assign} className="mb-4 space-y-2.5 rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
          <div className="grid grid-cols-3 gap-2.5">
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Subject *"
              required
              className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <input
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              placeholder="Grade (e.g. Grade 8)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <input
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
              placeholder="Room"
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <select
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            >
              {DAY_NAMES.slice(1).map((d, i) => (
                <option key={d} value={i + 1}>{d}</option>
              ))}
            </select>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add Lesson'}
          </button>
        </form>
      )}

      {error && <p className="py-8 text-center text-[13px] text-red-500">{error}</p>}
      {rows === null && !error && <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>}
      {rows?.length === 0 && !error && (
        <p className="py-8 text-center text-[13px] text-slate-400">No lessons scheduled yet.</p>
      )}
      {rows?.length > 0 && (
        <div className="space-y-2">
          {rows.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-700">
                  {l.subject}{l.grade ? ` — ${l.grade}` : ''}
                </p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {DAY_NAMES[l.day_of_week] || ''} · {String(l.start_time).slice(0, 5)}–{String(l.end_time).slice(0, 5)}
                  {l.room ? ` · Room ${l.room}` : ''}
                </p>
              </div>
              <button
                onClick={() => removeLesson(l.id)}
                className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-red-500 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TeacherLeaveTab({ userId, teacherName }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'casual', days: '1', start_date: '', note: '' })
  const [saving, setSaving] = useState(false)

  const reload = async () => {
    try {
      setError('')
      setData(await api.get(`/api/leave/user/${userId}`))
    } catch (err) {
      setError(err.message)
      setData({ records: [] })
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const record = async (e) => {
    e.preventDefault()
    if (!form.start_date) return
    setSaving(true)
    try {
      await api.post('/api/leave', {
        user_id: userId,
        type: form.type,
        days: parseInt(form.days, 10) || 1,
        start_date: form.start_date,
        note: form.note.trim(),
      })
      toast.success(`Leave recorded for ${teacherName}`)
      setShowForm(false)
      setForm({ type: 'casual', days: '1', start_date: '', note: '' })
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const removeRecord = async (id) => {
    if (!confirm('Remove this leave record?')) return
    try {
      await api.del(`/api/leave/${id}`)
      reload()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      {data?.casual && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {[['Casual', data.casual, 'text-brand'], ['Sick', data.sick, 'text-violet-600']].map(([label, b, cls]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-slate-400">{label} leave</p>
              <p className={`text-[20px] font-extrabold ${cls}`}>
                {b.left} <span className="text-[12px] font-semibold text-slate-400">/ {b.total} days left</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-dark"
        >
          {showForm ? 'Cancel' : '\u2795 Record Leave'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={record} className="mb-4 space-y-2.5 rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
          <div className="grid grid-cols-3 gap-2.5">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            >
              <option value="casual">Casual</option>
              <option value="sick">Sick</option>
            </select>
            <input
              type="number"
              min="1"
              max="60"
              value={form.days}
              onChange={(e) => setForm({ ...form, days: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
              placeholder="Days"
            />
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </div>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Note (optional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Saving\u2026' : 'Record'}
          </button>
        </form>
      )}

      {error && <p className="py-4 text-center text-[12.5px] text-red-500">{error}</p>}
      {data?.records?.length === 0 && !error && (
        <p className="py-6 text-center text-[13px] text-slate-400">No leave recorded this year.</p>
      )}
      {data?.records?.length > 0 && (
        <div className="space-y-2">
          {data.records.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-[13px] font-semibold text-slate-700">
                  {r.days} day{r.days > 1 ? 's' : ''} {r.type}
                  <span className="ml-2 text-[11.5px] font-normal text-slate-400">
                    from {new Date(r.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </p>
                {r.note && <p className="text-[12px] text-slate-500">{r.note}</p>}
              </div>
              <button
                onClick={() => removeRecord(r.id)}
                className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-red-500 transition hover:bg-red-50"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TeacherCheckinsTab({ userId }) {
  const { rows, error } = useFetchList(`/api/checkins/user/${userId}`)

  if (error) return <p className="py-8 text-center text-[13px] text-red-500">{error}</p>
  if (rows === null) return <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>
  if (rows.length === 0)
    return <p className="py-8 text-center text-[13px] text-slate-400">No check-ins recorded yet.</p>

  const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'

  const viewSelfie = async (c) => {
    try {
      const r = await api.get(`/api/checkins/selfie/${userId}?date=${c.date}`)
      if (r.url) window.open(r.url, '_blank')
      else toast.error('No selfie stored for this day')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <table className="w-full text-left text-[12.5px]">
      <thead>
        <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
          <th className="py-2 pr-3">Date</th>
          <th className="py-2 pr-3">Check-in</th>
          <th className="py-2 pr-3">Check-out</th>
          <th className="py-2 pr-3">Location</th>
          <th className="py-2">Selfie</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id} className="border-b border-slate-100">
            <td className="py-2.5 pr-3 font-semibold text-slate-700">
              {new Date(c.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </td>
            <td className="py-2.5 pr-3 text-emerald-600">{fmtTime(c.check_in_time)}</td>
            <td className="py-2.5 pr-3 text-slate-600">{fmtTime(c.check_out_time)}</td>
            <td className="py-2.5 pr-3">
              {c.latitude != null ? (
                <a
                  href={`https://maps.google.com/?q=${c.latitude},${c.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-600 hover:bg-sky-100"
                >
                  <i className="fas fa-location-dot" /> Map
                </a>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
            <td className="py-2.5">
              {c.selfie_verified ? (
                <button
                  onClick={() => viewSelfie(c)}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-100"
                >
                  <i className="fas fa-user-check" /> View
                </button>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
function StaffForm({ staff, onClose }) {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    age: staff?.age || '',
    phone: staff?.phone || '',
    certificate: staff?.certificate || '',
    role: staff?.role || 'Teacher',
    salary: staff?.salary || '',
    department: staff?.department || '',
    stage: staff?.stage || 'Junior',
    status: staff?.status || 'Active',
    email: staff?.email || '',
    app_role: 'teacher'
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [account, setAccount] = useState(null)

  const validateField = (field, value) => {
    const error = getValidationError(field, value)
    setErrors(prev => ({
      ...prev,
      [field]: error
    }))
    return !error
  }

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all required fields
    const validation = validateForm(formData, ['name', 'department'])
    
    // Validate optional fields if they have values
    if (formData.phone) validateField('phone', formData.phone)
    if (formData.age) validateField('age', formData.age)
    if (formData.salary) validateField('salary', formData.salary)
    
    if (!validation.isValid) {
      setErrors(validation.errors)
      toast.error('Please fix validation errors')
      return
    }

    setSaving(true)
    setErrors({})

    try {
      if (staff) {
        await api.put(`/api/staff/${staff.id}`, formData)
        toast.success('Staff member updated successfully')
        onClose()
      } else {
        const created = await api.post('/api/staff', formData)
        toast.success('Staff member added successfully')
        if (created?.account?.tempPassword) {
          setAccount(created.account)
          return
        }
        if (created?.account?.error) {
          toast.error(`Staff saved but app login failed: ${created.account.error}`)
        }
        onClose()
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (account) {
    return <TeacherPasswordDialog account={account} onDone={onClose} />
  }

  return (
    <div style={styles.formContainer}>
      <div style={styles.formCard}>
        <h2>{staff ? '✏️ Edit Staff Member' : '➕ Add New Staff Member'}</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleFieldChange('name', e.target.value)}
                required
                style={{
                  ...styles.input,
                  borderColor: errors.name ? '#ef4444' : '#d1d5db'
                }}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>
            <div style={styles.formGroup}>
              <label>Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => handleFieldChange('age', e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: errors.age ? '#ef4444' : '#d1d5db'
                }}
              />
              {errors.age && <span style={styles.errorText}>{errors.age}</span>}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Email {staff ? '' : '(creates app login)'}</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="person@school.com"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>App type</label>
              <select
                value={formData.app_role}
                onChange={e => setFormData({...formData, app_role: e.target.value})}
                style={styles.input}
              >
                <option value="teacher">Teacher app (lessons, attendance)</option>
                <option value="staff">Staff app (tasks, reports)</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                style={styles.input}
              >
                <option>Teacher</option>
                <option>Professor</option>
                <option>Lecturer</option>
                <option>Assistant Professor</option>
                <option>Admin</option>
                <option>Coordinator</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Department *</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => handleFieldChange('department', e.target.value)}
                required
                style={{
                  ...styles.input,
                  borderColor: errors.department ? '#ef4444' : '#d1d5db'
                }}
              />
              {errors.department && <span style={styles.errorText}>{errors.department}</span>}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => handleFieldChange('phone', e.target.value)}
                placeholder="07XX XXX XXXX"
                style={{
                  ...styles.input,
                  borderColor: errors.phone ? '#ef4444' : '#d1d5db'
                }}
              />
              {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
            </div>
            <div style={styles.formGroup}>
              <label>Salary</label>
              <input
                type="number"
                value={formData.salary}
                onChange={e => handleFieldChange('salary', e.target.value)}
                placeholder="0"
                style={{
                  ...styles.input,
                  borderColor: errors.salary ? '#ef4444' : '#d1d5db'
                }}
              />
              {errors.salary && <span style={styles.errorText}>{errors.salary}</span>}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Certificate</label>
              <input
                type="text"
                value={formData.certificate}
                onChange={e => setFormData({...formData, certificate: e.target.value})}
                style={styles.input}
                placeholder="e.g., PhD Computer Science"
              />
            </div>
            <div style={styles.formGroup}>
              <label>Level</label>
              <select
                value={formData.stage}
                onChange={e => setFormData({...formData, stage: e.target.value})}
                style={styles.input}
              >
                <option>Junior</option>
                <option>Mid-level</option>
                <option>Senior</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label>Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              style={styles.input}
            >
              <option>Active</option>
              <option>On Leave</option>
              <option>Inactive</option>
            </select>
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : (staff ? 'Update Staff' : 'Add Staff')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TeacherPasswordDialog({ account, onDone }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.tempPassword)
      setCopied(true)
    } catch {
      /* select-all fallback below */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <i className="fas fa-key" />
        </div>
        <h2 className="text-[16px] font-bold text-slate-800">Teacher app login created</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Give these to the teacher. This password is shown <b>only once</b> —
          they will set their own on first login in the HRNAL app.
        </p>

        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
            <p className="select-all text-[13.5px] font-semibold text-slate-700">{account.email}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Temporary password</p>
            <div className="flex items-center justify-between gap-2">
              <p className="select-all font-mono text-[16px] font-bold tracking-wide text-slate-800">
                {account.tempPassword}
              </p>
              <button
                onClick={copy}
                className="rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white transition hover:bg-brand-dark"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onDone}
          className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Done — I saved the password
        </button>
      </div>
    </div>
  )
}

const styles = {

  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  subtitle: {
    color: '#666',
    margin: '5px 0 0 0'
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#188a54',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666'
  },
  error: {
    color: '#dc2626',
    padding: '15px',
    backgroundColor: '#fee2e2',
    borderRadius: '6px',
    margin: '20px 0'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f9fafb',
    borderRadius: '14px'
  },
  emptyButton: {
    marginTop: '15px',
    padding: '10px 24px',
    backgroundColor: '#188a54',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  nameCell: {
    fontWeight: '500'
  },
  salaryCell: {
    fontWeight: '600',
    color: '#059669'
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: '500'
  },
  actionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap'
  },
  monitorBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    backgroundColor: '#0d9488',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap'
  },
  editBtn: {
    width: '32px',
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff4fb',
    color: '#3066b4',
    border: '1px solid #d7e3f4',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  deleteBtn: {
    width: '32px',
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdf1f1',
    color: '#ef4444',
    border: '1px solid #f6d9d9',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  formContainer: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  formCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  form: {
    marginTop: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '30px'
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: '#188a54',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  errorText: {
    color: '#ef4444',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  }
}
