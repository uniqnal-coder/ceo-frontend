import { useState, useEffect } from 'react'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [monitorStudent, setMonitorStudent] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/api/students')
      setStudents(toArray(data))
    } catch (err) {
      setError(err.message)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      await api.del(`/api/students/${id}`)
      toast.success('Student deleted successfully')
      fetchStudents()
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  const handleEdit = (student) => {
    setEditingStudent(student)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingStudent(null)
    fetchStudents()
  }

  if (showForm) {
    return <StudentForm student={editingStudent} onClose={handleFormClose} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>👨‍🎓 Students Management</h2>
          <p style={styles.subtitle}>Manage student records and information</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>
          ➕ Add Student
        </button>
      </div>

      {loading && <p style={styles.loading}>Loading students...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && students.length === 0 && !error && (
        <div style={styles.empty}>
          <p>📋 No students found</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyButton}>
            Add First Student
          </button>
        </div>
      )}

      {!loading && students.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Department</th>
                <th>Stage</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>{student.studentid || 'N/A'}</td>
                  <td style={styles.nameCell}>{student.name}</td>
                  <td>{student.age || '-'}</td>
                  <td>{student.gender || '-'}</td>
                  <td>{student.department || '-'}</td>
                  <td>{student.stage || '-'}</td>
                  <td>{student.phone || '-'}</td>
                  <td>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: student.status === 'Active' ? '#10b981' : '#ef4444'
                    }}>
                      {student.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div style={styles.actionsRow}>
                      <button
                        onClick={() => setMonitorStudent(student)}
                        style={styles.monitorBtn}
                        title="Reports, tasks & check-ins"
                      >
                        <i className="fas fa-chart-line" /> Monitor
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        style={styles.editBtn}
                        title="Edit"
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
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

      {monitorStudent && (
        <StudentMonitorDialog
          student={monitorStudent}
          onClose={() => setMonitorStudent(null)}
        />
      )}
    </div>
  )
}

const MONITOR_TABS = [
  { key: 'reports', label: 'Daily Reports', icon: 'fa-file-lines' },
  { key: 'tasks', label: 'Tasks', icon: 'fa-list-check' },
  { key: 'checkins', label: 'Check-ins', icon: 'fa-location-dot' },
]

function StudentMonitorDialog({ student, onClose }) {
  const [tab, setTab] = useState('reports')
  const userId = student.user_id

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-slate-800">📊 {student.name}</h2>
            <p className="text-[12px] text-slate-500">
              {student.department || '—'} · Stage {student.stage || '—'}
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
              This student was added before app logins existed, so there is no
              activity to show. Students created from the Add Student form get a
              login (and appear here) automatically.
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-1 px-6 pt-3">
              {MONITOR_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-t-xl px-4 py-2 text-[12.5px] font-semibold transition ${
                    tab === t.key
                      ? 'bg-brand text-white'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <i className={`fas ${t.icon} mr-1.5`} />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="min-h-[280px] flex-1 overflow-y-auto border-t border-slate-100 px-6 py-4">
              {tab === 'reports' && <StudentReportsTab userId={userId} />}
              {tab === 'tasks' && <StudentTasksTab userId={userId} studentName={student.name} />}
              {tab === 'checkins' && <StudentCheckinsTab userId={userId} />}
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

function TabStatus({ rows, error, emptyText }) {
  if (error) return <p className="py-8 text-center text-[13px] text-red-500">{error}</p>
  if (rows === null) return <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>
  if (rows.length === 0) return <p className="py-8 text-center text-[13px] text-slate-400">{emptyText}</p>
  return null
}

function StudentReportsTab({ userId }) {
  const { rows, error } = useFetchList(`/api/daily-reports/user/${userId}`)
  const status = <TabStatus rows={rows} error={error} emptyText="No reports submitted yet." />
  if (rows === null || error || rows?.length === 0) return status

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[12.5px] font-bold text-slate-700">
              📅 {new Date(r.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {r.tasks_total > 0 && (
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                {r.tasks_completed}/{r.tasks_total} tasks
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">{r.content}</p>
        </div>
      ))}
    </div>
  )
}

function StudentTasksTab({ userId, studentName }) {
  const { rows, error, reload } = useFetchList(`/api/student-tasks/user/${userId}`)
  const [showAssign, setShowAssign] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '' })
  const [saving, setSaving] = useState(false)

  const assign = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await api.post('/api/student-tasks', {
        user_id: userId,
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date || new Date().toISOString().slice(0, 10),
      })
      toast.success(`Task assigned to ${studentName}`)
      setForm({ title: '', description: '', due_date: '' })
      setShowAssign(false)
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const statusColor = (s) =>
    s === 'Completed'
      ? 'bg-emerald-100 text-emerald-700'
      : s === 'In Progress'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-200 text-slate-600'

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowAssign((v) => !v)}
          className="rounded-lg bg-brand px-3.5 py-2 text-[12px] font-semibold text-white transition hover:bg-brand-dark"
        >
          {showAssign ? 'Cancel' : '➕ Assign Task'}
        </button>
      </div>

      {showAssign && (
        <form onSubmit={assign} className="mb-4 space-y-2.5 rounded-xl border border-brand/30 bg-brand-soft/40 p-4">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Task title *"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      )}

      <TabStatus rows={rows} error={error} emptyText="No tasks assigned yet." />
      {rows?.length > 0 && (
        <div className="space-y-2">
          {rows.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-700">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-[12px] text-slate-500">{t.description}</p>
                )}
                {t.due_date && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Due {new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor(t.status)}`}>
                {t.status || 'Pending'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StudentCheckinsTab({ userId }) {
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
function StudentForm({ student, onClose }) {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    age: student?.age || '',
    gender: student?.gender || 'Male',
    phone: student?.phone || '',
    email: student?.email || '',
    department: student?.department || '',
    stage: student?.stage || '',
    studentID: student?.studentid || '',
    address: student?.address || '',
    status: student?.status || 'Active'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [account, setAccount] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (student) {
        await api.put(`/api/students/${student.id}`, formData)
      } else {
        const created = await api.post('/api/students', formData)
        // New students with an email get a mobile-app login; show the
        // one-time temporary password so the admin can hand it over.
        if (created?.account?.tempPassword) {
          setAccount(created.account)
          toast.success('Student added')
          return
        }
        if (created?.account?.error) {
          toast.error(`Student added, but no app login: ${created.account.error}`)
          onClose()
          return
        }
      }
      toast.success(student ? 'Student updated' : 'Student added')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (account) {
    return <TempPasswordDialog account={account} onDone={onClose} />
  }

  return (
    <div style={styles.formContainer}>
      <div style={styles.formCard}>
        <h2>{student ? '✏️ Edit Student' : '➕ Add New Student'}</h2>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Student ID *</label>
              <input
                type="text"
                value={formData.studentID}
                onChange={e => setFormData({...formData, studentID: e.target.value})}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={e => setFormData({...formData, age: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Gender</label>
              <select
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                style={styles.input}
              >
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Department *</label>
              <input
                type="text"
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Stage *</label>
              <input
                type="text"
                value={formData.stage}
                onChange={e => setFormData({...formData, stage: e.target.value})}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label>Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              style={{...styles.input, minHeight: '80px'}}
            />
          </div>

          <div style={styles.formGroup}>
            <label>Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value})}
              style={styles.input}
            >
              <option>Active</option>
              <option>Inactive</option>
              <option>Graduated</option>
            </select>
          </div>

          {error && <p style={styles.error}>❌ {error}</p>}

          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : (student ? 'Update Student' : 'Add Student')}
            </button>
          </div>
        </form>
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
  }
}


/**
 * One-time reveal of a newly provisioned student login. The password is
 * never shown again, so the admin copies it before closing.
 */
function TempPasswordDialog({ account, onDone }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.tempPassword)
      setCopied(true)
    } catch {
      /* selection fallback below */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <i className="fas fa-key" />
        </div>
        <h2 className="text-[16px] font-bold text-slate-800">Student app login created</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Give these to the student. This password is shown <b>only once</b> —
          they will set their own on first login.
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
