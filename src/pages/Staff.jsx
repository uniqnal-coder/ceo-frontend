import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { validateForm, getValidationError } from '../utils/validation'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [roleFilter, setRoleFilter] = useState('all')

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

  const appRoleOf = (m) => m.users?.role || null
  const visibleStaff = staff.filter((m) => {
    if (roleFilter === 'all') return true
    if (roleFilter === 'teacher') return appRoleOf(m) === 'teacher'
    if (roleFilter === 'staff') return appRoleOf(m) === 'staff'
    return !appRoleOf(m) // no login
  })

  return (
    <div style={styles.container}>
      <div style={styles.header} className="page-header">
        <div>
          <h2>👥 Staff Management</h2>
          <p style={styles.subtitle} className="page-subtitle">View all users and add new staff members</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton} className="add-button">
          ➕ Add Staff Member
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 px-1">
        {[
          ['all', 'Everyone'],
          ['teacher', '👩‍🏫 Teachers'],
          ['staff', '🧑‍💼 Staff'],
          ['none', 'No app login'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-[12.5px] font-semibold transition ${
              roleFilter === key
                ? 'border-brand bg-brand text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p style={styles.loading}>Loading staff...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && visibleStaff.length === 0 && !error && (
        <div style={styles.empty} className="empty-state">
          <p>📋 No staff members found</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyButton}>
            Add First Staff Member
          </button>
        </div>
      )}

      {!loading && visibleStaff.length > 0 && (
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
                <th>App</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleStaff.map(member => (
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
                    {appRoleOf(member) === 'teacher' ? (
                      <span className="whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-bold text-violet-600">Teacher app</span>
                    ) : appRoleOf(member) === 'staff' ? (
                      <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-bold text-sky-600">Staff app</span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
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
                      {member.user_id && (
                        <Link
                          to={`/attendance?user=${member.user_id}`}
                          style={styles.editBtn}
                          title="Check-in / selfie / location"
                        >
                          <i className="fas fa-location-dot" />
                        </Link>
                      )}
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
    </div>
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
