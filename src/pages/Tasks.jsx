import { useEffect, useRef, useState } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';

const ROLES = [
  { key: 'teacher', label: 'Teacher', plural: 'teachers', icon: 'fa-person-chalkboard', color: 'text-kpi-sky', soft: 'bg-blue-50' },
  { key: 'staff', label: 'Staff', plural: 'staff', icon: 'fa-user-tie', color: 'text-kpi-purple', soft: 'bg-violet-50' },
];

// Role-based task templates: pick a role, edit its standard task list,
// save the whole list in one shot (PUT /api/role-tasks/:role).
export default function Tasks() {
  const [role, setRole] = useState('teacher');
  const [tasks, setTasks] = useState(['']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const lastAdded = useRef(null);

  const load = async (r) => {
    setLoading(true);
    setError('');
    try {
      const rows = toArray(await api.get(`/api/role-tasks?role=${r}`));
      setTasks(rows.length ? rows.map((t) => t.title) : ['']);
      setDirty(false);
    } catch (e) {
      setError(e.message || 'Could not load tasks');
      setTasks(['']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(role);
  }, [role]);

  const update = (i, value) => {
    setTasks((prev) => prev.map((t, idx) => (idx === i ? value : t)));
    setDirty(true);
  };

  const addField = () => {
    setTasks((prev) => [...prev, '']);
    setDirty(true);
    // Focus the new field on the next paint.
    setTimeout(() => lastAdded.current?.focus(), 0);
  };

  const removeField = (i) => {
    setTasks((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)));
    setDirty(true);
  };

  const save = async () => {
    const titles = tasks.map((t) => t.trim()).filter(Boolean);
    setSaving(true);
    try {
      const saved = toArray(await api.put(`/api/role-tasks/${role}`, { tasks: titles }));
      setTasks(saved.length ? saved.map((t) => t.title) : ['']);
      setDirty(false);
      toast.success(`Saved ${saved.length} task${saved.length === 1 ? '' : 's'} for ${ROLES.find((r) => r.key === role).plural}`);
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const activeRole = ROLES.find((r) => r.key === role);
  const filled = tasks.filter((t) => t.trim()).length;

  return (
    <div className="mx-auto max-w-3xl p-5">
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800">📋 Task Management</h1>
        <p className="text-[13px] text-slate-500">
          Each role has its own standard task list. Pick a role, add its tasks, then save.
        </p>
      </div>

      {/* Step 1 — role */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Step 1 · Select a role
        </p>
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${activeRole.soft}`}>
            <i className={`fas ${activeRole.icon} ${activeRole.color}`} />
          </span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[14px] font-semibold text-slate-700 outline-none focus:border-brand"
          >
            {ROLES.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 2 — tasks */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Step 2 · Tasks for {activeRole.plural}
          </p>
          <span className="text-[11px] font-semibold text-slate-400">
            {filled} task{filled === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>
        ) : error ? (
          <p className="py-8 text-center text-[13px] text-red-500">{error}</p>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-[12px] font-extrabold text-slate-400">
                  {i + 1}
                </span>
                <input
                  ref={i === tasks.length - 1 ? lastAdded : null}
                  value={t}
                  onChange={(e) => update(i, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addField()}
                  placeholder={`Task ${i + 1} — e.g. ${role === 'teacher' ? 'Prepare lesson materials' : 'Check entry points'}`}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 text-[13.5px] text-slate-700 outline-none focus:border-brand"
                />
                <button
                  onClick={() => removeField(i)}
                  title="Remove task"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <i className="fas fa-xmark text-[13px]" />
                </button>
              </div>
            ))}

            <button
              onClick={addField}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-[13px] font-bold text-slate-400 transition hover:border-brand/40 hover:text-brand"
            >
              <i className="fas fa-plus" /> Add Task
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <p className="text-[11.5px] text-slate-400">
            {dirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl bg-brand px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Save ${activeRole.label} Tasks`}
          </button>
        </div>
      </div>
    </div>
  );
}
