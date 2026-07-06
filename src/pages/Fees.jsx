import { useState, useEffect } from 'react'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

// Backend `fees` contract: { id, student_id, paid (number), reminder (text), date }
const REMINDERS = ['Tuition-paid', 'Pending', 'Overdue', 'Partial']

const reminderColor = (r) =>
  r === 'Tuition-paid' ? '#10b981' : r === 'Overdue' ? '#ef4444' : r === 'Partial' ? '#3b82f6' : '#f59e0b'

export default function Fees() {
  const [fees, setFees] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingFee, setEditingFee] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchFees()
    fetchStudents()
  }, [])

  const fetchFees = async () => {
    setLoading(true)
    setError('')
    try {
      setFees(toArray(await api.get('/api/fees')))
    } catch (err) {
      setError(err.message)
      setFees([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      setStudents(toArray(await api.get('/api/students')))
    } catch (err) {
      console.error('Failed to fetch students:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fee record?')) return
    try {
      await api.del(`/api/fees/${id}`)
      toast.success('Fee record deleted')
      fetchFees()
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  const handleEdit = (fee) => {
    setEditingFee(fee)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingFee(null)
    fetchFees()
  }

  const studentName = (id) => students.find((s) => s.id === id)?.name || 'Unknown'

  const filteredFees = fees.filter((fee) => (filter === 'all' ? true : fee.reminder === filter))
  const totalPaid = filteredFees.reduce((sum, fee) => sum + (Number(fee.paid) || 0), 0)

  if (showForm) {
    return <FeeForm fee={editingFee} students={students} onClose={handleFormClose} />
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>💰 Fees Management</h2>
          <p style={styles.subtitle}>Track student fee payments</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Add Fee Record</button>
      </div>

      <div style={styles.statsContainer}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <div style={styles.statLabel}>Total Paid</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>${totalPaid.toLocaleString()}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
          <div style={styles.statLabel}>Records</div>
          <div style={styles.statValue}>{filteredFees.length}</div>
        </div>
      </div>

      <div style={styles.filterContainer}>
        <button
          onClick={() => setFilter('all')}
          style={{ ...styles.filterBtn, backgroundColor: filter === 'all' ? '#1e40af' : '#e5e7eb', color: filter === 'all' ? 'white' : '#374151' }}
        >
          All ({fees.length})
        </button>
        {REMINDERS.map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r)}
            style={{ ...styles.filterBtn, backgroundColor: filter === r ? reminderColor(r) : '#e5e7eb', color: filter === r ? 'white' : '#374151' }}
          >
            {r} ({fees.filter((f) => f.reminder === r).length})
          </button>
        ))}
      </div>

      {loading && <p style={styles.loading}>Loading fees...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && filteredFees.length === 0 && !error && (
        <div style={styles.empty}>
          <p>📋 No fee records found</p>
          <button onClick={() => setShowForm(true)} style={styles.emptyButton}>Add First Fee Record</button>
        </div>
      )}

      {!loading && filteredFees.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Paid</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFees.map((fee) => (
                <tr key={fee.id}>
                  <td style={styles.nameCell}>{fee.students?.name || studentName(fee.student_id)}</td>
                  <td style={styles.amountCell}>${Number(fee.paid || 0).toLocaleString()}</td>
                  <td>
                    <span style={{ ...styles.badge, backgroundColor: reminderColor(fee.reminder) }}>
                      {fee.reminder || 'Pending'}
                    </span>
                  </td>
                  <td>{fee.date ? new Date(fee.date).toLocaleDateString() : '-'}</td>
                  <td>
                    <button onClick={() => handleEdit(fee)} style={styles.editBtn}>✏️ Edit</button>
                    <button onClick={() => handleDelete(fee.id)} style={styles.deleteBtn}>🗑️ Delete</button>
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

function FeeForm({ fee, students, onClose }) {
  const [formData, setFormData] = useState({
    student_id: fee?.student_id || '',
    paid: fee?.paid ?? '',
    reminder: fee?.reminder || 'Tuition-paid',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.student_id) {
      setError('Student is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        student_id: formData.student_id,
        paid: Number(formData.paid) || 0,
        reminder: formData.reminder,
      }
      if (fee) {
        await api.put(`/api/fees/${fee.id}`, payload)
      } else {
        await api.post('/api/fees', payload)
      }
      toast.success(fee ? 'Fee updated' : 'Fee added')
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.formContainer}>
      <div style={styles.formCard}>
        <h2>{fee ? '✏️ Edit Fee Record' : '➕ Add New Fee Record'}</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Student *</label>
            <select
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              required
              style={styles.input}
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.department ? `- ${student.department}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Paid Amount</label>
              <input
                type="number"
                value={formData.paid}
                onChange={(e) => setFormData({ ...formData, paid: e.target.value })}
                style={styles.input}
                placeholder="0"
              />
            </div>
            <div style={styles.formGroup}>
              <label>Status</label>
              <select
                value={formData.reminder}
                onChange={(e) => setFormData({ ...formData, reminder: e.target.value })}
                style={styles.input}
              >
                {REMINDERS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p style={styles.error}>❌ {error}</p>}

          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : fee ? 'Update Fee' : 'Add Fee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: { padding: '20px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  subtitle: { color: '#666', margin: '5px 0 0 0' },
  addButton: { padding: '10px 20px', backgroundColor: '#1e40af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  statsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' },
  statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  statLabel: { fontSize: '12px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' },
  statValue: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937' },
  filterContainer: { display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' },
  filterBtn: { padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  loading: { textAlign: 'center', padding: '40px', color: '#666' },
  error: { color: '#dc2626', padding: '15px', backgroundColor: '#fee2e2', borderRadius: '6px', margin: '20px 0' },
  empty: { textAlign: 'center', padding: '60px 20px', backgroundColor: '#f9fafb', borderRadius: '8px' },
  emptyButton: { marginTop: '15px', padding: '10px 24px', backgroundColor: '#1e40af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  tableContainer: { backgroundColor: 'white', borderRadius: '8px', overflow: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  nameCell: { fontWeight: '500' },
  amountCell: { fontWeight: '600', color: '#059669' },
  badge: { padding: '4px 12px', borderRadius: '12px', fontSize: '12px', color: 'white', fontWeight: '500', display: 'inline-block' },
  editBtn: { padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' },
  deleteBtn: { padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
  formContainer: { padding: '20px', maxWidth: '700px', margin: '0 auto' },
  formCard: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  form: { marginTop: '20px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { marginBottom: '20px' },
  input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' },
  formActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#1e40af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' },
}
