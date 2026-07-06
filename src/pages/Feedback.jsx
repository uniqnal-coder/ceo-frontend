import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';
import { styles } from '../styles/page';

export default function Feedback() {
  const [items, setItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
    api.get('/api/staff').then((d) => setStaff(toArray(d))).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(toArray(await api.get('/api/feedback')));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      await api.del(`/api/feedback/${id}`);
      toast.success('Feedback deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const staffName = (r) => r.staff_profiles?.name || staff.find((s) => s.id === r.staff_id)?.name || 'Unknown';

  if (showForm) {
    return <FeedbackForm staff={staff} onClose={() => { setShowForm(false); load(); }} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>💬 Feedback</h2>
          <p style={styles.subtitle}>Staff feedback notes</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Add Feedback</button>
      </div>

      {loading && <p style={styles.loading}>Loading...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && items.length === 0 && !error && <div style={styles.empty}><p>📋 No feedback found</p></div>}

      {!loading && items.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr><th>Staff</th><th>Title</th><th>Notes</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td style={styles.nameCell}>{staffName(r)}</td>
                  <td>{r.title}</td>
                  <td>{r.notes || '-'}</td>
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

function FeedbackForm({ staff, onClose }) {
  const [form, setForm] = useState({ staff_id: '', title: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff_id || !form.title.trim()) {
      setError('Staff and title are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/feedback', form);
      toast.success('Feedback added');
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
        <h2>➕ Add Feedback</h2>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Staff *</label>
            <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} required style={styles.input}>
              <option value="">Select Staff</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...styles.input, minHeight: '100px' }} />
          </div>
          {error && <p style={styles.error}>❌ {error}</p>}
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>{saving ? 'Saving...' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
