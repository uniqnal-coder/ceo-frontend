import { useState, useEffect } from 'react'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

export default function Students() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

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
                    <button
                      onClick={() => handleEdit(student)}
                      style={styles.editBtn}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(student.id)}
                      style={styles.deleteBtn}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
  editBtn: {
    padding: '6px 12px',
    backgroundColor: '#3066b4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginRight: '8px'
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
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
