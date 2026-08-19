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
  // The list stays empty until the admin searches or picks a filter.
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('') // '' = not chosen yet
  const [subjectId, setSubjectId] = useState('')
  const [staffRoleId, setStaffRoleId] = useState('')
  const [subjects, setSubjects] = useState([])
  const [staffRoles, setStaffRoles] = useState([])

  useEffect(() => {
    fetchStaff()
    api.get('/api/role-categories?app_role=teacher&active=1').then((d) => setSubjects(toArray(d))).catch(() => {})
    api.get('/api/role-categories?app_role=staff&active=1').then((d) => setStaffRoles(toArray(d))).catch(() => {})
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
    if (
      !confirm(
        'Move this staff member to Archive? They will not be able to log in or appear on attendance until restored.'
      )
    ) {
      return
    }

    try {
      await api.del(`/api/staff/${id}`)
      toast.success('Moved to Archive')
      fetchStaff()
    } catch (err) {
      toast.error('Failed to archive: ' + err.message)
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
  const hasQuery = !!(search.trim() || group || subjectId || staffRoleId)
  const visibleStaff = !hasQuery
    ? []
    : staff.filter((m) => {
        if (group === 'teacher' && appRoleOf(m) !== 'teacher') return false
        if (group === 'staff' && appRoleOf(m) !== 'staff') return false
        if (group === 'none' && appRoleOf(m)) return false
        if (subjectId && !(appRoleOf(m) === 'teacher' && m.category_id === subjectId)) return false
        if (staffRoleId && !(appRoleOf(m) === 'staff' && m.category_id === staffRoleId)) return false
        const q = search.trim().toLowerCase()
        if (q) {
          const hay = `${m.name || ''} ${m.id || ''} ${m.user_id || ''} ${m.email || ''} ${m.phone || ''}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
  const clearFilters = () => {
    setSearch('')
    setGroup('')
    setSubjectId('')
    setStaffRoleId('')
  }

  return (
    <div style={styles.container}>
      <div style={styles.header} className="page-header">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-slate-800">
            <i className="fas fa-users text-brand" />
            Teachers &amp; Staff
          </h2>
          <p style={styles.subtitle} className="page-subtitle">
            Manage teachers (with subjects) and staff (with job roles)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/archive"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <i className="fas fa-box-archive" />
            Archive
          </Link>
          <button
            onClick={() => setShowForm(true)}
            style={styles.addButton}
            className="add-button inline-flex items-center gap-2"
          >
            <i className="fas fa-plus" />
            Add person
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block min-w-[220px] flex-1">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Search</span>
          <span className="relative block">
            <i className="fas fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-slate-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or ID…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </span>
        </label>
        <label className="block min-w-[150px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Group</span>
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value)
              if (e.target.value === 'teacher') setStaffRoleId('')
              if (e.target.value === 'staff' || e.target.value === 'none') setSubjectId('')
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
          >
            <option value="">Choose group…</option>
            <option value="all">Everyone</option>
            <option value="teacher">Teachers</option>
            <option value="staff">Staff</option>
            <option value="none">No app login</option>
          </select>
        </label>
        <label className="block min-w-[160px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Subject</span>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value)
              if (e.target.value) {
                setGroup('teacher')
                setStaffRoleId('')
              }
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
          >
            <option value="">All subjects</option>
            {subjects.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-[160px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Staff role</span>
          <select
            value={staffRoleId}
            onChange={(e) => {
              setStaffRoleId(e.target.value)
              if (e.target.value) {
                setGroup('staff')
                setSubjectId('')
              }
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-brand"
          >
            <option value="">All staff roles</option>
            {staffRoles.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        {hasQuery && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
          >
            <i className="fas fa-rotate-left mr-1.5" />
            Clear
          </button>
        )}
        {hasQuery && (
          <span className="h-10 content-center self-end text-[12px] font-bold text-slate-400">
            {visibleStaff.length} of {staff.length}
          </span>
        )}
      </div>

      {loading && <p style={styles.loading}>Loading staff...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && !error && !hasQuery && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[22px] text-brand">
            <i className="fas fa-magnifying-glass" />
          </span>
          <p className="text-[15px] font-extrabold text-slate-700">Search or choose a filter to see people</p>
          <p className="mt-1 text-[12.5px] text-slate-400">
            {staff.length} people on file — search by name or ID, or filter by group, subject or staff role.
          </p>
        </div>
      )}

      {!loading && hasQuery && visibleStaff.length === 0 && !error && (
        <div style={styles.empty} className="empty-state">
          <p>📋 No people match these filters</p>
          <button
            onClick={clearFilters}
            style={styles.emptyButton}
            className="inline-flex items-center gap-2"
          >
            <i className="fas fa-rotate-left" />
            Clear filters
          </button>
        </div>
      )}

      {!loading && visibleStaff.length > 0 && (
        <div style={styles.tableContainer} className="data-table-container">
          <table style={styles.table} className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Subject / Staff role</th>
                <th>Department</th>
                <th>Salary</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleStaff.map(member => (
                <tr key={member.id}>
                  <td style={styles.nameCell}>{member.name}</td>
                  <td>
                    {appRoleOf(member) === 'teacher' ? (
                      <span className="whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-bold text-violet-600">Teacher</span>
                    ) : appRoleOf(member) === 'staff' ? (
                      <span className="whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-bold text-sky-600">Staff</span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td>{member.role || <EmptyCell />}</td>
                  <td>{member.department || <EmptyCell />}</td>
                  <td style={member.salary != null && member.salary !== '' ? styles.salaryCell : undefined}>
                    {member.salary != null && member.salary !== ''
                      ? `$${Number(member.salary).toLocaleString()}`
                      : <EmptyCell />}
                  </td>
                  <td>{member.phone || <EmptyCell />}</td>
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
    app_role: staff?.users?.role || 'teacher',
    category_id: staff?.category_id || '',
  })
  const [categories, setCategories] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [account, setAccount] = useState(null)

  const isTeacher = formData.app_role === 'teacher'
  const categoryLabel = isTeacher ? 'Subject' : 'Staff role'
  const managePath = isTeacher ? '/teacher-subjects' : '/staff-roles'
  const manageLabel = isTeacher ? 'Subjects' : 'Staff Roles'

  // Load subjects (teacher) or staff roles (staff) for the selected type.
  useEffect(() => {
    let live = true
    api
      .get(`/api/role-categories?app_role=${formData.app_role}&active=1`)
      .then((rows) => {
        if (!live) return
        const list = Array.isArray(rows) ? rows : []
        setCategories(list)
        setFormData((prev) => {
          if (list.some((c) => c.id === prev.category_id)) return prev
          return { ...prev, category_id: '' }
        })
      })
      .catch(() => {
        if (live) setCategories([])
      })
    return () => {
      live = false
    }
  }, [formData.app_role])

  const setAppRole = (app_role) => {
    setFormData((prev) => ({
      ...prev,
      app_role,
      category_id: '',
      role: app_role === 'teacher' ? 'Teacher' : 'Staff',
    }))
  }

  const setCategory = (category_id) => {
    const cat = categories.find((c) => c.id === category_id)
    setFormData((prev) => ({
      ...prev,
      category_id,
      // Keep profile.role in sync with subject / staff role name for lists.
      role: cat?.name || (prev.app_role === 'teacher' ? 'Teacher' : 'Staff'),
    }))
  }

  const validateField = (field, value) => {
    const error = getValidationError(field, value)
    setErrors((prev) => ({ ...prev, [field]: error }))
    return !error
  }

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validation = validateForm(formData, ['name', 'department'])
    if (formData.phone) validateField('phone', formData.phone)
    if (formData.age) validateField('age', formData.age)
    if (formData.salary) validateField('salary', formData.salary)

    if (!formData.category_id) {
      setErrors((prev) => ({
        ...prev,
        ...validation.errors,
        category_id: `Please select a ${categoryLabel.toLowerCase()}`,
      }))
      toast.error(`Select a ${categoryLabel.toLowerCase()} first`)
      return
    }

    if (!validation.isValid) {
      setErrors(validation.errors)
      toast.error('Please fix validation errors')
      return
    }

    const cat = categories.find((c) => c.id === formData.category_id)
    const payload = {
      ...formData,
      role: cat?.name || formData.role || (isTeacher ? 'Teacher' : 'Staff'),
    }

    setSaving(true)
    setErrors({})

    try {
      if (staff) {
        await api.put(`/api/staff/${staff.id}`, payload)
        toast.success(isTeacher ? 'Teacher updated' : 'Staff member updated')
        onClose()
      } else {
        const created = await api.post('/api/staff', payload)
        if (created?.account?.tempPassword) {
          if (created.account.emailSent) {
            toast.success('Saved — login email sent')
          } else {
            toast.error(
              created.account.emailError
                ? `Saved but email failed: ${created.account.emailError}`
                : 'Saved but login email was not sent'
            )
          }
          setAccount(created.account)
          return
        }
        if (created?.account?.existing) {
          toast.success('Linked to an existing app login')
        } else {
          toast.success(isTeacher ? 'Teacher added' : 'Staff member added')
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
        <h2>{staff ? 'Edit person' : 'Add teacher or staff'}</h2>
        <p className="mb-4 text-[13px] text-slate-500">
          Choose Teacher or Staff first, then pick their {isTeacher ? 'subject' : 'job role'}.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Type */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              1 · Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'teacher', label: 'Teacher', hint: 'Subjects & attendance', icon: 'fa-person-chalkboard' },
                { key: 'staff', label: 'Staff', hint: 'Jobs & daily tasks', icon: 'fa-user-tie' },
              ].map((opt) => {
                const on = formData.app_role === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAppRole(opt.key)}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                      on
                        ? 'border-brand bg-white shadow-sm ring-1 ring-brand/30'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        opt.key === 'teacher' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'
                      }`}
                    >
                      <i className={`fas ${opt.icon}`} />
                    </span>
                    <span>
                      <span className="block text-[14px] font-extrabold text-slate-800">{opt.label}</span>
                      <span className="block text-[11px] text-slate-400">{opt.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject / Staff role */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                2 · {categoryLabel}
              </p>
              <Link to={managePath} className="text-[11.5px] font-bold text-brand hover:underline">
                Manage {manageLabel} →
              </Link>
            </div>
            <select
              value={formData.category_id}
              onChange={(e) => setCategory(e.target.value)}
              required
              style={{
                ...styles.input,
                borderColor: errors.category_id ? '#ef4444' : '#d1d5db',
              }}
            >
              <option value="">
                {isTeacher ? 'Select subject — e.g. Mathematics' : 'Select staff role — e.g. Security Guard'}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && <span style={styles.errorText}>{errors.category_id}</span>}
            {categories.length === 0 && (
              <p className="mt-2 text-[12px] text-amber-700">
                No {categoryLabel.toLowerCase()}s yet.{' '}
                <Link to={managePath} className="font-bold underline">
                  Add them in {manageLabel}
                </Link>
                .
              </p>
            )}
          </div>

          {/* Identity */}
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            3 · Personal details
          </p>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Full name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                required
                style={{
                  ...styles.input,
                  borderColor: errors.name ? '#ef4444' : '#d1d5db',
                }}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>
            <div style={styles.formGroup}>
              <label>Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleFieldChange('age', e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: errors.age ? '#ef4444' : '#d1d5db',
                }}
              />
              {errors.age && <span style={styles.errorText}>{errors.age}</span>}
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Email {!staff && '* (login credentials are emailed here)'}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="person@school.com"
                required={!staff}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="07XX XXX XXXX"
                style={{
                  ...styles.input,
                  borderColor: errors.phone ? '#ef4444' : '#d1d5db',
                }}
              />
              {errors.phone && <span style={styles.errorText}>{errors.phone}</span>}
            </div>
          </div>

          {/* Work */}
          <p className="mb-2 mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            4 · Work details
          </p>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Department *</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleFieldChange('department', e.target.value)}
                required
                style={{
                  ...styles.input,
                  borderColor: errors.department ? '#ef4444' : '#d1d5db',
                }}
              />
              {errors.department && <span style={styles.errorText}>{errors.department}</span>}
            </div>
            <div style={styles.formGroup}>
              <label>Salary</label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => handleFieldChange('salary', e.target.value)}
                placeholder="0"
                style={{
                  ...styles.input,
                  borderColor: errors.salary ? '#ef4444' : '#d1d5db',
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
                onChange={(e) => setFormData({ ...formData, certificate: e.target.value })}
                style={styles.input}
                placeholder={isTeacher ? 'e.g. B.Ed Mathematics' : 'e.g. Security certificate'}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Level</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
              {saving ? 'Saving…' : staff ? 'Save changes' : isTeacher ? 'Add teacher' : 'Add staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EmptyCell() {
  return <span className="text-slate-300">—</span>
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
          <i className="fas fa-envelope" />
        </div>
        <h2 className="text-[16px] font-bold text-slate-800">App login created</h2>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Login email and temporary password were sent to the staff member when SMTP is configured.
          This password is shown <b>only once</b> — they set their own on first login.
        </p>
        {account.emailSent === true && (
          <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-[12px] font-medium text-brand">
            Email sent to {account.email}
          </p>
        )}
        {account.emailSent === false && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700">
            Email not sent
            {account.emailError ? `: ${account.emailError}` : ' (SMTP not configured or failed)'}.
            Copy the password below and share it manually.
          </p>
        )}

        <div className="mt-4 space-y-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email / username</p>
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
