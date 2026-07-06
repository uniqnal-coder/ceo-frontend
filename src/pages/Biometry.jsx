import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';
import { styles } from '../styles/page';

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const HANDS = ['Right', 'Left'];

const qualityColor = (q) => (q >= 80 ? '#10b981' : q >= 50 ? '#f59e0b' : '#ef4444');

export default function Biometry() {
  const [records, setRecords] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
    api.get('/api/staff').then((d) => setStaff(toArray(d))).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      setRecords(toArray(await api.get('/api/biometry')));
    } catch (err) {
      if (err.status === 403) setForbidden(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this fingerprint?')) return;
    try {
      await api.patch(`/api/biometry/${id}/deactivate`);
      toast.success('Fingerprint deactivated');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const staffName = (r) => staff.find((s) => s.id === r.staff_id)?.name || r.staff_id || 'Unknown';

  if (forbidden) {
    return (
      <div style={styles.container}>
        <h2>👆 Biometry</h2>
        <div style={{ ...styles.empty, marginTop: 20 }}><p>🔒 Admin access required to view biometry records.</p></div>
      </div>
    );
  }

  if (showForm) {
    return <BiometryForm staff={staff} onClose={() => { setShowForm(false); load(); }} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>👆 Biometry</h2>
          <p style={styles.subtitle}>Fingerprint enrollment</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Enroll Fingerprint</button>
      </div>

      {loading && <p style={styles.loading}>Loading...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && records.length === 0 && !error && <div style={styles.empty}><p>📋 No biometry records</p></div>}

      {!loading && records.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr><th>Staff</th><th>Finger</th><th>Hand</th><th>Fingerprint ID</th><th>Quality</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={styles.nameCell}>{staffName(r)}</td>
                  <td>{r.finger_position}</td>
                  <td>{r.hand}</td>
                  <td><code>{r.fingerprint_id}</code></td>
                  <td><span style={{ ...styles.badge, backgroundColor: qualityColor(r.quality_score) }}>{r.quality_score ?? 0}%</span></td>
                  <td>{r.verification_status || '-'}</td>
                  <td><button onClick={() => deactivate(r.id)} style={styles.deleteBtn}>Deactivate</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BiometryForm({ staff, onClose }) {
  const [form, setForm] = useState({
    staff_id: '',
    finger_position: 'Index',
    hand: 'Right',
    fingerprint_id: `FP-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    quality_score: 85,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff_id) {
      setError('Staff is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/api/biometry/enroll', { ...form, quality_score: Number(form.quality_score) || 0 });
      toast.success('Fingerprint enrolled');
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
        <h2>➕ Enroll Fingerprint</h2>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Staff *</label>
            <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} required style={styles.input}>
              <option value="">Select Staff</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Finger</label>
              <select value={form.finger_position} onChange={(e) => setForm({ ...form, finger_position: e.target.value })} style={styles.input}>
                {FINGERS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Hand</label>
              <select value={form.hand} onChange={(e) => setForm({ ...form, hand: e.target.value })} style={styles.input}>
                {HANDS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Fingerprint ID</label>
              <input value={form.fingerprint_id} onChange={(e) => setForm({ ...form, fingerprint_id: e.target.value })} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Quality Score (0-100)</label>
              <input type="number" min="0" max="100" value={form.quality_score} onChange={(e) => setForm({ ...form, quality_score: e.target.value })} style={styles.input} />
            </div>
          </div>
          {error && <p style={styles.error}>❌ {error}</p>}
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>{saving ? 'Saving...' : 'Enroll'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
