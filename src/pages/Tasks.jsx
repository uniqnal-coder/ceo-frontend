import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';
import { styles } from '../styles/page';

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

const statusColor = (s) =>
  s === 'Completed' ? '#10b981' : s === 'In Progress' ? '#3b82f6' : s === 'Cancelled' ? '#6b7280' : '#f59e0b';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    load();
    api.get('/api/staff').then((d) => setStaff(toArray(d))).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setTasks(toArray(await api.get('/api/tasks')));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.del(`/api/tasks/${id}`);
      toast.success('Task deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const staffName = (id) => staff.find((s) => s.id === id)?.name || '-';
  const filtered = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));

  if (showForm) {
    return (
      <TaskForm
        task={editing}
        staff={staff}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2>📋 Tasks</h2>
          <p style={styles.subtitle}>Assign and track tasks</p>
        </div>
        <button onClick={() => setShowForm(true)} style={styles.addButton}>➕ Add Task</button>
      </div>

      <div style={styles.filterContainer}>
        <button onClick={() => setFilter('all')} style={{ ...styles.filterBtn, backgroundColor: filter === 'all' ? '#1e40af' : '#e5e7eb', color: filter === 'all' ? 'white' : '#374151' }}>
          All ({tasks.length})
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ ...styles.filterBtn, backgroundColor: filter === s ? statusColor(s) : '#e5e7eb', color: filter === s ? 'white' : '#374151' }}>
            {s} ({tasks.filter((t) => t.status === s).length})
          </button>
        ))}
      </div>

      {loading && <p style={styles.loading}>Loading tasks...</p>}
      {error && <p style={styles.error}>❌ {error}</p>}

      {!loading && filtered.length === 0 && !error && (
        <div style={styles.empty}><p>📋 No tasks found</p></div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td style={styles.nameCell}>{t.title}</td>
                  <td>{staffName(t.assigned_to)}</td>
                  <td>{t.priority || '-'}</td>
                  <td><span style={{ ...styles.badge, backgroundColor: statusColor(t.status) }}>{t.status || 'Pending'}</span></td>
                  <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <button onClick={() => { setEditing(t); setShowForm(true); }} style={styles.editBtn}>✏️ Edit</button>
                    <button onClick={() => remove(t.id)} style={styles.deleteBtn}>🗑️ Delete</button>
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

function TaskForm({ task, staff, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_to: task?.assigned_to || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Pending',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    const payload = { ...form, assigned_to: form.assigned_to || null, due_date: form.due_date || null };
    try {
      if (task) await api.put(`/api/tasks/${task.id}`, payload);
      else await api.post('/api/tasks', payload);
      toast.success(task ? 'Task updated' : 'Task created');
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
        <h2>{task ? '✏️ Edit Task' : '➕ Add Task'}</h2>
        <form onSubmit={submit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...styles.input, minHeight: '80px' }} />
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Assign To</label>
              <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} style={styles.input}>
                <option value="">Unassigned</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={styles.input}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} style={styles.input} />
            </div>
          </div>
          {error && <p style={styles.error}>❌ {error}</p>}
          <div style={styles.formActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>{saving ? 'Saving...' : task ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
