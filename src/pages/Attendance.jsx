import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';
import { styles } from '../styles/page';

const STATUSES = ['Present', 'Absent', 'Late', 'Excused'];
const statusColor = (s) =>
  s === 'Present' ? '#10b981' : s === 'Absent' ? '#ef4444' : s === 'Late' ? '#f59e0b' : '#6b7280';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
    api.get('/api/students').then((d) => setStudents(toArray(d))).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRecords(toArray(await api.get('/api/attendance')));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api.del(`/api/attendance/${id}`);
      toast.success('Record deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const studentName = (r) => r.students?.name || students.find((s) => s.id === r.student_id)?.name || 'Unknown';

  if (showForm) {
    return <AttendanceForm students={students} onClose={() => { setShowForm(false); load(); }} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>👥 Attendance</h2>
          <p style={styles.subtitle}>Record student attendance</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Record Attendance</button>
      </div>

      {loading && <p style={styles.loading}>Loading...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && records.length === 0 && !error && <div style={styles.empty}><p>📋 No attendance records</p></div>}

      {!loading && records.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr><th>Student</th><th>Lesson</th><th>Status</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={styles.nameCell}>{studentName(r)}</td>
                  <td>{r.lesson || '-'}</td>
                  <td><span style={{ ...styles.badge, backgroundColor: statusColor(r.status) }}>{r.status || '-'}</span></td>
                  <td>{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                  <td><button onClick={() => remove(r.id)} style={styles.deleteBtn}>🗑️ Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AttendanceForm({ students, onClose }) {
  const [form, setForm] = useState({ student_id: '', lesson: '', status: 'Present' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.lesson.trim()) {
      setError('Student and lesson are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/attendance', form);
      toast.success('Attendance recorded');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.formContainer}>
      <div style={styles.formCard}>
        <h2>➕ Record Attendance</h2>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Student *</label>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required style={styles.input}>
              <option value="">Select Student</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Lesson *</label>
              <input value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} required style={styles.input} placeholder="e.g. Mathematics" />
            </div>
            <div style={styles.formGroup}>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <p style={styles.error}>❌ {error}</p>}
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>{saving ? 'Saving...' : 'Record'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
