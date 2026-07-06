import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';
import { styles } from '../styles/page';

const ROLE_TYPES = ['teacher', 'supervisor', 'technical', 'monitor', 'media'];

const scoreColor = (s) => (s >= 8 ? '#10b981' : s >= 5 ? '#f59e0b' : '#ef4444');

export default function Evaluations() {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    load();
    api.get('/api/staff').then((d) => setStaff(toArray(d))).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      setItems(toArray(await api.get('/api/evaluations')));
    } catch (err) {
      if (err.status === 403) setForbidden(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this evaluation?')) return;
    try {
      await api.del(`/api/evaluations/${id}`);
      toast.success('Evaluation deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const staffName = (r) => staff.find((s) => s.id === r.subject_id)?.name || r.subject_id || 'Unknown';

  if (forbidden) {
    return (
      <div style={styles.container}>
        <h2>📊 Evaluations</h2>
        <div style={{ ...styles.empty, marginTop: 20 }}><p>🔒 Admin access required to view evaluations.</p></div>
      </div>
    );
  }

  if (showForm) {
    return <EvaluationForm record={editing} staff={staff} onClose={() => { setShowForm(false); setEditing(null); load(); }} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>📊 Evaluations</h2>
          <p style={styles.subtitle}>Performance evaluations</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Add Evaluation</button>
      </div>

      {loading && <p style={styles.loading}>Loading...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && items.length === 0 && !error && <div style={styles.empty}><p>📋 No evaluations</p></div>}

      {!loading && items.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr><th>Subject</th><th>Role Type</th><th>Score</th><th>Recommendations</th><th>Follow-up</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td style={styles.nameCell}>{staffName(r)}</td>
                  <td>{r.role_type}</td>
                  <td><span style={{ ...styles.badge, backgroundColor: scoreColor(Number(r.overall_score)) }}>{r.overall_score ?? '-'}</span></td>
                  <td>{r.recommendations || '-'}</td>
                  <td>{r.follow_up_date ? new Date(r.follow_up_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <button onClick={() => { setEditing(r); setShowForm(true); }} style={styles.editBtn}>✏️ Edit</button>
                    <button onClick={() => remove(r.id)} style={styles.deleteBtn}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EvaluationForm({ record, staff, onClose }) {
  const [form, setForm] = useState({
    subject_id: record?.subject_id || '',
    role_type: record?.role_type || 'teacher',
    overall_score: record?.overall_score ?? '',
    recommendations: record?.recommendations || '',
    follow_up_date: record?.follow_up_date ? record.follow_up_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject_id) {
      setError('Subject is required');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      subject_id: form.subject_id,
      role_type: form.role_type,
      overall_score: form.overall_score === '' ? null : Number(form.overall_score),
      recommendations: form.recommendations,
      follow_up_date: form.follow_up_date || null,
    };
    try {
      if (record) await api.put(`/api/evaluations/${record.id}`, payload);
      else await api.post('/api/evaluations', payload);
      toast.success(record ? 'Evaluation updated' : 'Evaluation created');
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
        <h2>{record ? '✏️ Edit Evaluation' : '➕ Add Evaluation'}</h2>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Subject (Staff) *</label>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required style={styles.input}>
                <option value="">Select Staff</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Role Type</label>
              <select value={form.role_type} onChange={(e) => setForm({ ...form, role_type: e.target.value })} style={styles.input}>
                {ROLE_TYPES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Overall Score</label>
              <input type="number" step="0.1" min="0" max="10" value={form.overall_score} onChange={(e) => setForm({ ...form, overall_score: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Follow-up Date</label>
              <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} style={styles.input} />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label>Recommendations</label>
            <textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} style={{ ...styles.input, minHeight: '90px' }} />
          </div>
          {error && <p style={styles.error}>❌ {error}</p>}
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>{saving ? 'Saving...' : record ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
