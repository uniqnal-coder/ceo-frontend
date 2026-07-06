import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';
import { styles } from '../styles/page';

export default function Salary() {
  const [records, setRecords] = useState([]);
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
      setRecords(toArray(await api.get('/api/salary')));
    } catch (err) {
      if (err.status === 403) setForbidden(true);
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const staffName = (r) => r.staff_profiles?.name || staff.find((s) => s.id === r.staff_id)?.name || 'Unknown';
  const totalPayroll = records.reduce((sum, r) => sum + (Number(r.tsalary) || 0), 0);

  if (forbidden) {
    return (
      <div style={styles.container}>
        <h2>💵 Salary</h2>
        <div style={{ ...styles.empty, marginTop: 20 }}>
          <p>🔒 Admin access required to view salary records.</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return <SalaryForm record={editing} staff={staff} onClose={() => { setShowForm(false); setEditing(null); load(); }} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>💵 Salary</h2>
          <p style={styles.subtitle}>Staff salary records</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Add Salary Record</button>
      </div>

      <div style={styles.statsContainer}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }}>
          <div style={styles.statLabel}>Total Payroll</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>${totalPayroll.toLocaleString()}</div>
        </div>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #3b82f6' }}>
          <div style={styles.statLabel}>Records</div>
          <div style={styles.statValue}>{records.length}</div>
        </div>
      </div>

      {loading && <p style={styles.loading}>Loading...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && records.length === 0 && !error && <div style={styles.empty}><p>📋 No salary records</p></div>}

      {!loading && records.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr><th>Staff</th><th>Total Salary</th><th>Reward</th><th>Punishment</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={styles.nameCell}>{staffName(r)}</td>
                  <td style={{ fontWeight: 600, color: '#059669' }}>${Number(r.tsalary || 0).toLocaleString()}</td>
                  <td style={{ color: '#10b981' }}>+${Number(r.reward || 0).toLocaleString()}</td>
                  <td style={{ color: '#ef4444' }}>-${Number(r.punish || 0).toLocaleString()}</td>
                  <td>{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                  <td><button onClick={() => { setEditing(r); setShowForm(true); }} style={styles.editBtn}>✏️ Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SalaryForm({ record, staff, onClose }) {
  const [form, setForm] = useState({
    staff_id: record?.staff_id || '',
    tsalary: record?.tsalary ?? '',
    reward: record?.reward ?? '',
    punish: record?.punish ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff_id || form.tsalary === '') {
      setError('Staff and total salary are required');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      staff_id: form.staff_id,
      tsalary: Number(form.tsalary) || 0,
      reward: Number(form.reward) || 0,
      punish: Number(form.punish) || 0,
    };
    try {
      if (record) await api.put(`/api/salary/${record.id}`, payload);
      else await api.post('/api/salary', payload);
      toast.success(record ? 'Salary updated' : 'Salary record added');
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
        <h2>{record ? '✏️ Edit Salary Record' : '➕ Add Salary Record'}</h2>
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
              <label>Total Salary *</label>
              <input type="number" value={form.tsalary} onChange={(e) => setForm({ ...form, tsalary: e.target.value })} required style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label>Reward</label>
              <input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} style={styles.input} />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label>Punishment</label>
            <input type="number" value={form.punish} onChange={(e) => setForm({ ...form, punish: e.target.value })} style={styles.input} />
          </div>
          {error && <p style={styles.error}>❌ {error}</p>}
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>{saving ? 'Saving...' : record ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
