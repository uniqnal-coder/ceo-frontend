import { useEffect, useMemo, useState } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';

const todayISO = () => new Date().toISOString().slice(0, 10);

const ROLE_BADGE = {
  teacher: 'bg-violet-50 text-violet-600',
  staff: 'bg-sky-50 text-sky-600',
};

// Auto Task: pick a user → their role's template tasks appear →
// multi-select → due date → Save assigns them all at once.
export default function AutoTask() {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [roleTasks, setRoleTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [dueDate, setDueDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);

  const loadHistory = async () => {
    try {
      setHistory(toArray(await api.get('/api/staff-tasks/recent')));
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    api.get(`/api/checkins/overview?date=${todayISO()}`)
      .then((d) => setPeople((d.people || []).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setPeople([]));
    loadHistory();
  }, []);

  const user = people.find((p) => p.id === userId) || null;

  // Load the selected user's role task list automatically.
  useEffect(() => {
    if (!user) { setRoleTasks([]); setSelected(new Set()); return; }
    let live = true;
    setTasksLoading(true);
    api.get(`/api/role-tasks?role=${user.role}`)
      .then((rows) => { if (live) { setRoleTasks(toArray(rows)); setSelected(new Set()); } })
      .catch(() => { if (live) setRoleTasks([]); })
      .finally(() => { if (live) setTasksLoading(false); });
    return () => { live = false; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, search]);

  const toggle = (title) => {
    setSelected((prev) => {
      const nextSel = new Set(prev);
      if (nextSel.has(title)) nextSel.delete(title);
      else nextSel.add(title);
      return nextSel;
    });
  };

  const allSelected = roleTasks.length > 0 && selected.size === roleTasks.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(roleTasks.map((t) => t.title)));
  };

  const save = async () => {
    if (!user || selected.size === 0 || !dueDate) return;
    setSaving(true);
    try {
      const r = await api.post('/api/staff-tasks/bulk', {
        user_id: user.id,
        titles: roleTasks.map((t) => t.title).filter((t) => selected.has(t)),
        due_at: dueDate,
      });
      toast.success(
        `Assigned ${r.created} task${r.created === 1 ? '' : 's'} to ${user.name}` +
        (r.skipped ? ` (${r.skipped} already assigned for that day)` : '')
      );
      // Reset for the next assignment.
      setUserId('');
      setSearch('');
      setSelected(new Set());
      setDueDate(todayISO());
      loadHistory();
    } catch (e) {
      toast.error(e.message || 'Assignment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-5">
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800">⚡ Auto Task</h1>
        <p className="text-[13px] text-slate-500">
          Assign a role's standard tasks to a person in one click — they appear instantly in their app.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Step 1 — user */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Step 1 · Select a user
        </p>
        <div className="mb-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by name…"
            className="h-10 rounded-xl border border-slate-200 px-3.5 text-[13.5px] outline-none focus:border-brand sm:w-56"
          />
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] font-semibold text-slate-700 outline-none focus:border-brand"
          >
            <option value="">— Choose a person —</option>
            {visiblePeople.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
            ))}
          </select>
          {user && (
            <span className={`inline-flex h-10 items-center whitespace-nowrap rounded-xl px-3.5 text-[12px] font-extrabold uppercase ${ROLE_BADGE[user.role] || 'bg-slate-100 text-slate-500'}`}>
              {user.role}
            </span>
          )}
        </div>

        {/* Step 2 — tasks */}
        {user && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step 2 · Select tasks ({user.role} list)
              </p>
              {roleTasks.length > 0 && (
                <button onClick={toggleAll} className="text-[11.5px] font-bold text-brand hover:underline">
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>

            {tasksLoading ? (
              <p className="py-6 text-center text-[13px] text-slate-400">Loading tasks…</p>
            ) : roleTasks.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] text-amber-700">
                No tasks defined for the {user.role} role yet — add them in the <b>Task</b> section first.
              </p>
            ) : (
              <div className="space-y-1.5">
                {roleTasks.map((t, i) => {
                  const on = selected.has(t.title);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggle(t.title)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        on ? 'border-brand bg-brand-soft/40' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <i className={`fas ${on ? 'fa-square-check text-brand' : 'fa-square text-slate-200'} text-[17px]`} />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-slate-700">
                        {i + 1}. {t.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — date + save */}
        {user && roleTasks.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 3 · Due date</p>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 px-3 text-[13.5px] outline-none focus:border-brand"
              />
            </div>
            <div className="flex flex-1 items-end justify-between gap-3 sm:justify-end">
              <p className="text-[12.5px] font-bold text-slate-500">
                {selected.size} of {roleTasks.length} selected
              </p>
              <button
                onClick={save}
                disabled={saving || selected.size === 0 || !dueDate}
                className="rounded-xl bg-brand px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Assigning…' : `Assign to ${user.name.split(' ')[0]}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Assignment history (latest 25)
        </p>
        {!history ? (
          <p className="py-4 text-center text-[12.5px] text-slate-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-slate-400">No tasks assigned yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Task</th>
                  <th className="px-2 py-2">Due</th>
                  <th className="px-2 py-2">Assigned</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50">
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-slate-700">
                      {t.users?.name || '—'}
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${ROLE_BADGE[t.users?.role] || 'bg-slate-100 text-slate-400'}`}>
                        {t.users?.role || '?'}
                      </span>
                    </td>
                    <td className="max-w-[260px] truncate px-2 py-2 text-slate-600">{t.title}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                      {t.due_at ? new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        t.status === 'completed' ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {t.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
