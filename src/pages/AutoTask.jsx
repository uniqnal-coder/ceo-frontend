import { useEffect, useMemo, useState } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';

const todayISO = () => new Date().toISOString().slice(0, 10);
const HISTORY_PAGE = 25;

const ROLE_BADGE = {
  teacher: 'bg-violet-50 text-violet-600',
  staff: 'bg-sky-50 text-sky-600',
};

// Auto Task: pick one or many users of a role → the role's template
// tasks appear → multi-select → due date → one Save assigns everything.
// Built to stay fast with hundreds of users and long task lists:
// searchable scrollable pickers, batched save, paginated history.
export default function AutoTask() {
  const [people, setPeople] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [roleTasks, setRoleTasks] = useState([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [dueDate, setDueDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyDone, setHistoryDone] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = async (reset = true) => {
    setHistoryLoading(true);
    try {
      const offset = reset ? 0 : (history?.length || 0);
      const page = toArray(await api.get(`/api/staff-tasks/recent?limit=${HISTORY_PAGE}&offset=${offset}`));
      setHistory((prev) => (reset ? page : [...(prev || []), ...page]));
      setHistoryDone(page.length < HISTORY_PAGE);
    } catch {
      if (reset) setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    api.get(`/api/checkins/overview?date=${todayISO()}`)
      .then((d) => setPeople((d.people || []).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setPeople([]));
    loadHistory();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // All selected users share one role — that role drives the task list.
  const activeRole = useMemo(() => {
    const first = people.find((p) => selectedUsers.has(p.id));
    return first?.role || null;
  }, [people, selectedUsers]);

  useEffect(() => {
    if (!activeRole) { setRoleTasks([]); setSelected(new Set()); return; }
    let live = true;
    setTasksLoading(true);
    api.get(`/api/role-tasks?role=${activeRole}`)
      .then((rows) => { if (live) { setRoleTasks(toArray(rows)); setSelected(new Set()); } })
      .catch(() => { if (live) setRoleTasks([]); })
      .finally(() => { if (live) setTasksLoading(false); });
    return () => { live = false; };
  }, [activeRole]);

  const visiblePeople = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, userSearch]);

  const visibleTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return q ? roleTasks.filter((t) => t.title.toLowerCase().includes(q)) : roleTasks;
  }, [roleTasks, taskSearch]);

  const toggleUser = (p) => {
    setSelectedUsers((prev) => {
      const nextSel = new Set(prev);
      if (nextSel.has(p.id)) nextSel.delete(p.id);
      else nextSel.add(p.id);
      return nextSel;
    });
  };

  // Select every visible user of the active (or searched) role.
  const selectAllUsers = () => {
    const pool = activeRole
      ? visiblePeople.filter((p) => p.role === activeRole)
      : visiblePeople.filter((p) => p.role === visiblePeople[0]?.role);
    setSelectedUsers(new Set(pool.map((p) => p.id)));
  };

  const toggleTask = (title) => {
    setSelected((prev) => {
      const nextSel = new Set(prev);
      if (nextSel.has(title)) nextSel.delete(title);
      else nextSel.add(title);
      return nextSel;
    });
  };

  const allTasksSelected = visibleTasks.length > 0 &&
    visibleTasks.every((t) => selected.has(t.title));
  const toggleAllTasks = () => {
    setSelected((prev) => {
      const nextSel = new Set(prev);
      for (const t of visibleTasks) {
        if (allTasksSelected) nextSel.delete(t.title);
        else nextSel.add(t.title);
      }
      return nextSel;
    });
  };

  const save = async () => {
    if (selectedUsers.size === 0 || selected.size === 0 || !dueDate) return;
    setSaving(true);
    try {
      const r = await api.post('/api/staff-tasks/bulk', {
        user_ids: [...selectedUsers],
        titles: roleTasks.map((t) => t.title).filter((t) => selected.has(t)),
        due_at: dueDate,
      });
      toast.success(
        `Assigned ${r.created} task${r.created === 1 ? '' : 's'} across ${r.users} user${r.users === 1 ? '' : 's'}` +
        (r.skipped ? ` (${r.skipped} duplicate${r.skipped === 1 ? '' : 's'} skipped)` : '')
      );
      setSelectedUsers(new Set());
      setUserSearch('');
      setTaskSearch('');
      setSelected(new Set());
      setDueDate(todayISO());
      loadHistory(true);
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
          Assign a role's standard tasks to one person — or a whole team — in one save.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Step 1 — users */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Step 1 · Select users {activeRole && <span className="ml-1 normal-case">(role locked to {activeRole})</span>}
          </p>
          <div className="flex items-center gap-3">
            {selectedUsers.size > 0 && (
              <button onClick={() => setSelectedUsers(new Set())} className="text-[11.5px] font-bold text-slate-400 hover:underline">
                Clear
              </button>
            )}
            <button onClick={selectAllUsers} className="text-[11.5px] font-bold text-brand hover:underline">
              Select all {activeRole ? `${activeRole}s` : ''}
            </button>
          </div>
        </div>
        <input
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          placeholder={`🔍 Search ${people.length} people by name…`}
          className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-[13.5px] outline-none focus:border-brand"
        />
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1.5">
          {visiblePeople.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-slate-400">No one matches that search</p>
          ) : (
            visiblePeople.map((p) => {
              const on = selectedUsers.has(p.id);
              const locked = activeRole && p.role !== activeRole;
              return (
                <button
                  key={p.id}
                  onClick={() => !locked && toggleUser(p)}
                  disabled={locked}
                  title={locked ? `Deselect ${activeRole}s first — one role per save` : undefined}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition ${
                    on ? 'bg-brand-soft/50' : locked ? 'opacity-35' : 'hover:bg-slate-50'
                  }`}
                >
                  <i className={`fas ${on ? 'fa-square-check text-brand' : 'fa-square text-slate-200'} text-[15px]`} />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${ROLE_BADGE[p.role] || 'bg-slate-100 text-slate-400'}`}>
                    {p.role}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selectedUsers.size > 1 && (
          <p className="mt-1.5 text-[11.5px] font-semibold text-brand">
            {selectedUsers.size} users selected — the same tasks go to all of them
          </p>
        )}

        {/* Step 2 — tasks */}
        {activeRole && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step 2 · Select tasks ({activeRole} list)
              </p>
              {roleTasks.length > 0 && (
                <button onClick={toggleAllTasks} className="text-[11.5px] font-bold text-brand hover:underline">
                  {allTasksSelected ? 'Clear all' : `Select all${taskSearch ? ' matching' : ''}`}
                </button>
              )}
            </div>

            {tasksLoading ? (
              <p className="py-6 text-center text-[13px] text-slate-400">Loading tasks…</p>
            ) : roleTasks.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] text-amber-700">
                No tasks defined for the {activeRole} role yet — add them in the <b>Task</b> section first.
              </p>
            ) : (
              <>
                {roleTasks.length > 6 && (
                  <input
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder={`🔍 Filter ${roleTasks.length} tasks…`}
                    className="mb-2 h-9 w-full rounded-xl border border-slate-200 px-3.5 text-[13px] outline-none focus:border-brand"
                  />
                )}
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-0.5">
                  {visibleTasks.map((t) => {
                    const on = selected.has(t.title);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTask(t.title)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${
                          on ? 'border-brand bg-brand-soft/40' : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <i className={`fas ${on ? 'fa-square-check text-brand' : 'fa-square text-slate-200'} text-[17px]`} />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-slate-700">
                          {t.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3 — date + save */}
        {activeRole && roleTasks.length > 0 && (
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
                {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} · {selected.size} task{selected.size === 1 ? '' : 's'}
                <span className="text-slate-400"> = {selectedUsers.size * selected.size} assignment{selectedUsers.size * selected.size === 1 ? '' : 's'}</span>
              </p>
              <button
                onClick={save}
                disabled={saving || selected.size === 0 || selectedUsers.size === 0 || !dueDate}
                className="rounded-xl bg-brand px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Assigning…' : 'Save & Assign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Assignment history
        </p>
        {!history ? (
          <p className="py-4 text-center text-[12.5px] text-slate-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-slate-400">No tasks assigned yet</p>
        ) : (
          <>
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
            {!historyDone && (
              <button
                onClick={() => loadHistory(false)}
                disabled={historyLoading}
                className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-[12.5px] font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {historyLoading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
