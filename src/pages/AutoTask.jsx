import { useEffect, useMemo, useState } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';

const todayISO = () => new Date().toISOString().slice(0, 10);
const yearEndISO = () => `${new Date().getFullYear()}-12-31`;
const HISTORY_PAGE = 25;

const ROLE_BADGE = {
  teacher: 'bg-violet-50 text-violet-600',
  staff: 'bg-sky-50 text-sky-600',
};

const REPEATS = [
  { key: 'once', label: 'Once' },
  { key: 'daily', label: 'Daily (working days)' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom days' },
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Does a recurring plan fire on this date? Mirrors the backend rule.
function planFiresOn(plan, dayISO) {
  if (dayISO < plan.start_date || dayISO > plan.end_date) return false;
  const d = new Date(`${dayISO}T00:00:00`);
  const a = new Date(`${plan.anchor_date}T00:00:00`);
  const dow = d.getDay();
  if (plan.repeat === 'daily') return dow !== 5 && dow !== 6;
  if (plan.repeat === 'custom') return (plan.weekdays || []).map(Number).includes(dow);
  if (plan.repeat === 'weekly') return dow === a.getDay();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getDate() === Math.min(a.getDate(), last);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Expand a one-off/preview schedule into dates (max 366). Weekend = Fri + Sat.
const localISO = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

function computeDates(repeat, dueDate, fromDate, toDate, weekdays = []) {
  if (repeat === 'once') return dueDate ? [dueDate] : [];
  if (!fromDate || !toDate) return [];
  const out = [];
  const end = new Date(`${toDate}T00:00:00`);
  const d = new Date(`${fromDate}T00:00:00`);
  const dayOfMonth = d.getDate();
  while (d <= end && out.length < 366) {
    const dow = d.getDay();
    if (repeat === 'daily') {
      if (dow !== 5 && dow !== 6) out.push(localISO(d));
      d.setDate(d.getDate() + 1);
    } else if (repeat === 'custom') {
      if (weekdays.includes(dow)) out.push(localISO(d));
      d.setDate(d.getDate() + 1);
    } else if (repeat === 'weekly') {
      out.push(localISO(d));
      d.setDate(d.getDate() + 7);
    } else {
      out.push(localISO(d));
      d.setMonth(d.getMonth() + 1, dayOfMonth);
    }
  }
  return out;
}

// Auto Task: assign a role's tasks to one person or a whole team —
// once, or as a recurring plan that generates tasks automatically.
export default function AutoTask() {
  const [people, setPeople] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [detailUser, setDetailUser] = useState(null);
  const [roleTasks, setRoleTasks] = useState([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [repeat, setRepeat] = useState('once');
  const [weekdaysSel, setWeekdaysSel] = useState(new Set([0, 2, 4]));
  const [followList, setFollowList] = useState(true);
  const [dueDate, setDueDate] = useState(todayISO());
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(yearEndISO());
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [view, setView] = useState('assign');
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

  const loadPlans = async () => {
    try {
      setPlans(toArray(await api.get('/api/task-schedules')));
    } catch {
      setPlans([]);
    }
  };

  useEffect(() => {
    api.get(`/api/checkins/overview?date=${todayISO()}`)
      .then((d) => setPeople((d.people || []).sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setPeople([]));
    loadHistory();
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const selectAllUsers = () => {
    const role = activeRole || visiblePeople[0]?.role;
    setSelectedUsers(new Set(visiblePeople.filter((p) => p.role === role).map((p) => p.id)));
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

  const dates = useMemo(
    () => computeDates(repeat, dueDate, fromDate, toDate, [...weekdaysSel]),
    [repeat, dueDate, fromDate, toDate, weekdaysSel]
  );
  const recurring = repeat !== 'once';
  const usingList = recurring && followList;
  const taskCount = usingList ? roleTasks.length : selected.size;
  const canSave = selectedUsers.size > 0 && taskCount > 0 &&
    (repeat === 'custom' ? weekdaysSel.size > 0 : true) &&
    (recurring ? fromDate && toDate && toDate >= fromDate : !!dueDate);

  const resetForm = () => {
    setSelectedUsers(new Set());
    setUserSearch('');
    setTaskSearch('');
    setSelected(new Set());
    setRepeat('once');
    setFollowList(true);
    setDueDate(todayISO());
    setFromDate(todayISO());
    setToDate(yearEndISO());
  };

  const save = async () => {
    if (!canSave || saving) return;
    const titles = roleTasks.map((t) => t.title).filter((t) => selected.has(t));
    setSaving(true);
    try {
      if (!recurring) {
        const r = await api.post('/api/staff-tasks/bulk', {
          user_ids: [...selectedUsers],
          titles,
          dates,
        });
        toast.success(
          `Assigned ${r.created} task${r.created === 1 ? '' : 's'} across ${r.users} user${r.users === 1 ? '' : 's'}` +
          (r.skipped ? ` (${r.skipped} duplicate${r.skipped === 1 ? '' : 's'} skipped)` : '')
        );
      } else {
        const everyone = people.filter((p) => p.role === activeRole)
          .every((p) => selectedUsers.has(p.id));
        const r = await api.post('/api/task-schedules', {
          role: activeRole,
          user_ids: everyone ? [] : [...selectedUsers],
          titles: usingList ? [] : titles,
          repeat,
          weekdays: repeat === 'custom' ? [...weekdaysSel] : [],
          start_date: fromDate,
          end_date: toDate,
        });
        toast.success(
          `Recurring plan created — tasks generate automatically` +
          (r.createdToday ? ` (${r.createdToday} created for today)` : '')
        );
        loadPlans();
      }
      resetForm();
      loadHistory(true);
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const togglePlan = async (plan) => {
    try {
      await api.patch(`/api/task-schedules/${plan.id}`, { active: !plan.active });
      loadPlans();
      if (!plan.active) loadHistory(true);
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const deletePlan = async (plan) => {
    if (!confirm('Delete this recurring plan? Already-created tasks stay.')) return;
    try {
      await api.del(`/api/task-schedules/${plan.id}`);
      loadPlans();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800">⚡ Auto Task</h1>
          <p className="text-[13px] text-slate-500">
            Assign a role's standard tasks once, or set a recurring plan that runs all year by itself.
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {[['assign', 'fa-bolt', 'Assign'], ['planner', 'fa-calendar-days', 'Year Planner']].map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12.5px] font-extrabold transition ${
                view === key ? 'bg-brand text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <i className={`fas ${icon} text-[11px]`} /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'planner' && (
        <PlannerView
          plans={plans || []}
          people={people}
          onEditPlan={setEditPlan}
          onTogglePlan={togglePlan}
        />
      )}

      <div className={view === 'assign' ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'hidden'}>
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
              Select all {activeRole ? (activeRole === 'staff' ? 'staff' : 'teachers') : ''}
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
                <div
                  key={p.id}
                  className={`flex items-center rounded-lg transition ${
                    on ? 'bg-brand-soft/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <button
                    onClick={() => !locked && toggleUser(p)}
                    disabled={locked}
                    title={locked ? `Deselect ${activeRole}s first — one role per save` : undefined}
                    className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left ${locked ? 'opacity-35' : ''}`}
                  >
                    <i className={`fas ${on ? 'fa-square-check text-brand' : 'fa-square text-slate-200'} text-[15px]`} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">{p.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${ROLE_BADGE[p.role] || 'bg-slate-100 text-slate-400'}`}>
                      {p.role}
                    </span>
                  </button>
                  <button
                    onClick={() => setDetailUser(p)}
                    title={`${p.name} — details & task calendar`}
                    className="mx-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white hover:text-brand"
                  >
                    <i className="fas fa-calendar-days text-[13px]" />
                  </button>
                </div>
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
                Step 2 · Tasks ({activeRole} list)
              </p>
              {!usingList && roleTasks.length > 0 && (
                <button onClick={toggleAllTasks} className="text-[11.5px] font-bold text-brand hover:underline">
                  {allTasksSelected ? 'Clear all' : `Select all${taskSearch ? ' matching' : ''}`}
                </button>
              )}
            </div>

            {recurring && (
              <label className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2.5">
                <input
                  type="checkbox"
                  checked={followList}
                  onChange={(e) => setFollowList(e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--color-brand,#188a54)]"
                />
                <span className="text-[12.5px] font-semibold text-slate-600">
                  Always follow the role's task list — when you edit the Task section, the plan updates automatically
                </span>
              </label>
            )}

            {tasksLoading ? (
              <p className="py-6 text-center text-[13px] text-slate-400">Loading tasks…</p>
            ) : roleTasks.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] text-amber-700">
                No tasks defined for the {activeRole} role yet — add them in the <b>Task</b> section first.
              </p>
            ) : usingList ? (
              <p className="rounded-xl border border-brand/20 bg-brand-soft/30 px-4 py-3 text-[12.5px] font-semibold text-slate-600">
                <i className="fas fa-rotate mr-1.5 text-brand" />
                Using the full {activeRole} task list ({roleTasks.length} task{roleTasks.length === 1 ? '' : 's'}), always in sync with the Task section.
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

        {/* Step 3 — schedule + save */}
        {activeRole && roleTasks.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Step 3 · Schedule — one day, or a plan that runs by itself
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {REPEATS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRepeat(r.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition ${
                    repeat === r.key
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              {!recurring ? (
                <div>
                  <p className="mb-1 text-[10.5px] font-semibold text-slate-400">Due date</p>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-[13.5px] outline-none focus:border-brand"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-1 text-[10.5px] font-semibold text-slate-400">From</p>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-[13.5px] outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] font-semibold text-slate-400">To</p>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-[13.5px] outline-none focus:border-brand"
                    />
                  </div>
                  {repeat === 'custom' && (
                    <div className="pb-1">
                      <p className="mb-1 text-[10.5px] font-semibold text-slate-400">On these days</p>
                      <div className="flex gap-1">
                        {WEEKDAY_LABELS.map((label, i) => {
                          const on = weekdaysSel.has(i);
                          return (
                            <button
                              key={i}
                              onClick={() => setWeekdaysSel((prev) => {
                                const nextSel = new Set(prev);
                                if (nextSel.has(i)) nextSel.delete(i);
                                else nextSel.add(i);
                                return nextSel;
                              })}
                              className={`h-9 w-10 rounded-lg text-[11px] font-extrabold transition ${
                                on ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <p className="pb-2.5 text-[11px] text-slate-400">
                    {repeat === 'daily' && 'Every working day (Fri & Sat skipped)'}
                    {repeat === 'weekly' && 'Every week on the “From” weekday'}
                    {repeat === 'monthly' && 'Every month on the “From” day'}
                    {repeat === 'custom' && `Every ${[...weekdaysSel].sort().map((i) => WEEKDAY_LABELS[i]).join(', ') || '—'}`}
                    {' · ~'}{dates.length} day{dates.length === 1 ? '' : 's'}
                  </p>
                </>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-50 pt-3">
              <p className="text-[12.5px] font-bold text-slate-500">
                {selectedUsers.size} user{selectedUsers.size === 1 ? '' : 's'} · {usingList ? `role list (${roleTasks.length})` : `${selected.size} task${selected.size === 1 ? '' : 's'}`}
                {recurring
                  ? <span className="text-slate-400"> · generated automatically each {repeat === 'daily' ? 'working day' : repeat.replace('ly', '')}</span>
                  : <span className="text-slate-400"> = {selectedUsers.size * selected.size} assignment{selectedUsers.size * selected.size === 1 ? '' : 's'}</span>}
              </p>
              <button
                onClick={save}
                disabled={saving || !canSave}
                className="rounded-xl bg-brand px-6 py-2.5 text-[13.5px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                {saving ? 'Saving…' : recurring ? 'Create Recurring Plan' : 'Save & Assign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recurring plans */}
      {view === 'assign' && plans && plans.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recurring plans
          </p>
          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${ROLE_BADGE[plan.role]}`}>
                  {plan.role}
                </span>
                <span className="text-[12.5px] font-bold text-slate-700">
                  {REPEATS.find((r) => r.key === plan.repeat)?.label || plan.repeat}
                </span>
                <span className="text-[11.5px] text-slate-500">
                  {plan.user_ids?.length ? `${plan.user_ids.length} user${plan.user_ids.length === 1 ? '' : 's'}` : `All ${plan.role === 'staff' ? 'staff' : 'teachers'}`}
                  {' · '}
                  {plan.titles?.length ? `${plan.titles.length} task${plan.titles.length === 1 ? '' : 's'}` : 'role task list (auto)'}
                  {' · '}
                  {plan.start_date} → {plan.end_date}
                </span>
                <span className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={() => togglePlan(plan)}
                    className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                      plan.active
                        ? 'bg-brand-soft text-brand hover:opacity-80'
                        : 'bg-slate-200 text-slate-500 hover:opacity-80'
                    }`}
                  >
                    {plan.active ? '● Active' : '⏸ Paused'}
                  </button>
                  <button
                    onClick={() => setEditPlan(plan)}
                    title="Edit / reschedule plan"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-brand"
                  >
                    <i className="fas fa-pen text-[11px]" />
                  </button>
                  <button
                    onClick={() => deletePlan(plan)}
                    title="Delete plan"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <i className="fas fa-trash text-[11px]" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className={view === 'assign' ? 'mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm' : 'hidden'}>
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

      {detailUser && (
        <UserDetailDialog person={detailUser} onClose={() => setDetailUser(null)} />
      )}
      {editPlan && (
        <PlanEditDialog
          plan={editPlan}
          onClose={() => setEditPlan(null)}
          onSaved={() => { setEditPlan(null); loadPlans(); }}
        />
      )}
    </div>
  );
}

/* ============ Year Planner: month calendar of plans + assignments ============ */

function PlannerView({ plans, people, onEditPlan, onTogglePlan }) {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [summary, setSummary] = useState({});
  const [selDay, setSelDay] = useState(todayISO());

  const monthStart = `${month.y}-${String(month.m + 1).padStart(2, '0')}-01`;
  const monthEnd = `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(new Date(month.y, month.m + 1, 0).getDate()).padStart(2, '0')}`;

  useEffect(() => {
    let live = true;
    api.get(`/api/staff-tasks/summary?from=${monthStart}&to=${monthEnd}`)
      .then((d) => { if (live) setSummary(d || {}); })
      .catch(() => { if (live) setSummary({}); });
    return () => { live = false; };
  }, [monthStart, monthEnd]);

  const today = todayISO();
  const cells = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const blanks = Array.from({ length: first.getDay() }, () => null);
    const count = new Date(month.y, month.m + 1, 0).getDate();
    const days = Array.from({ length: count }, (_, i) =>
      `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
    return [...blanks, ...days];
  }, [month]);

  const shiftMonth = (delta) => {
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const firing = (day) => plans.filter((p) => p.active && planFiresOn(p, day));
  const roleUserCount = (plan) =>
    plan.user_ids?.length || people.filter((p) => p.role === plan.role).length;
  const planTaskLabel = (plan) =>
    plan.titles?.length ? `${plan.titles.length} task${plan.titles.length === 1 ? '' : 's'}` : 'role task list';

  const dayPlans = firing(selDay);
  const daySum = summary[selDay];

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shiftMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
          <i className="fas fa-chevron-left text-[12px]" />
        </button>
        <p className="text-[15px] font-extrabold text-slate-800">
          {MONTHS[month.m]} {month.y}
        </p>
        <button onClick={() => shiftMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
          <i className="fas fa-chevron-right text-[12px]" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i} className={`py-1 text-[10px] font-extrabold ${i >= 5 ? 'text-red-300' : 'text-slate-400'}`}>{d}</span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={`b${i}`} />;
          const s = summary[d];
          const fp = firing(d);
          const isSel = d === selDay;
          const isToday = d === today;
          const overdue = s && s.pending > 0 && d < today;
          const tone = !s ? '' :
            overdue ? 'bg-red-50' :
            s.pending > 0 ? 'bg-amber-50' :
            'bg-brand-soft/60';
          return (
            <button
              key={d}
              onClick={() => setSelDay(d)}
              className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg transition ${
                tone || 'hover:bg-slate-50'
              } ${isSel ? 'ring-2 ring-brand' : isToday ? 'ring-1 ring-slate-300' : ''}`}
            >
              <span className={`text-[12px] font-bold ${overdue ? 'text-red-600' : s?.pending ? 'text-amber-600' : s ? 'text-brand' : 'text-slate-600'}`}>
                {Number(d.slice(8))}
              </span>
              {s ? (
                <span className="text-[8.5px] font-extrabold leading-none text-slate-500">{s.total}</span>
              ) : fp.length > 0 ? (
                <span className="flex gap-0.5">
                  {fp.slice(0, 3).map((p) => (
                    <span key={p.id} className={`h-1.5 w-1.5 rounded-full ${p.role === 'staff' ? 'bg-sky-400' : 'bg-violet-400'}`} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />All done</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Pending</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />Overdue</span>
        <span className="ml-2"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />Teacher plan</span>
        <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-sky-400" />Staff plan</span>
      </div>

      {/* Day breakdown */}
      <div className="mt-4 border-t border-slate-100 pt-3.5">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          {new Date(`${selDay}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        {daySum ? (
          <p className="mb-2.5 text-[12.5px] font-semibold text-slate-600">
            <b>{daySum.total}</b> task{daySum.total === 1 ? '' : 's'} assigned ·{' '}
            <span className="text-brand">{daySum.completed} completed</span> ·{' '}
            <span className={selDay < today && daySum.pending ? 'text-red-500' : 'text-amber-600'}>
              {daySum.pending} {selDay < today ? 'overdue' : 'pending'}
            </span>
          </p>
        ) : (
          <p className="mb-2.5 text-[12px] text-slate-400">No tasks assigned for this day yet.</p>
        )}

        {dayPlans.length > 0 ? (
          <div className="space-y-1.5">
            {dayPlans.map((plan) => (
              <div key={plan.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                <i className="fas fa-rotate text-[11px] text-brand" />
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${ROLE_BADGE[plan.role]}`}>{plan.role}</span>
                <span className="text-[12px] font-bold text-slate-700">
                  {REPEATS.find((r) => r.key === plan.repeat)?.label || plan.repeat}
                </span>
                <span className="text-[11px] text-slate-500">
                  {planTaskLabel(plan)} → {plan.user_ids?.length ? `${plan.user_ids.length} users` : `all ${plan.role === 'staff' ? 'staff' : 'teachers'}`} ({roleUserCount(plan)})
                </span>
                <span className="ml-auto flex gap-1">
                  <button onClick={() => onEditPlan(plan)} title="Edit" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white hover:text-brand">
                    <i className="fas fa-pen text-[10.5px]" />
                  </button>
                  <button onClick={() => onTogglePlan(plan)} title="Pause / resume" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-white hover:text-amber-500">
                    <i className={`fas ${plan.active ? 'fa-pause' : 'fa-play'} text-[10.5px]`} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-slate-400">
            No recurring plans fire on this day{selDay >= today ? ' — tasks can still be assigned once from the Assign tab.' : '.'}
          </p>
        )}
      </div>
    </div>
  );
}

/* ============ Edit / reschedule a recurring plan ============ */

function PlanEditDialog({ plan, onClose, onSaved }) {
  const [repeat, setRepeat] = useState(plan.repeat);
  const [weekdays, setWeekdays] = useState(new Set((plan.weekdays || []).map(Number)));
  const [startDate, setStartDate] = useState(plan.start_date);
  const [endDate, setEndDate] = useState(plan.end_date);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (repeat === 'custom' && weekdays.size === 0) {
      toast.error('Pick at least one weekday');
      return;
    }
    setSaving(true);
    try {
      const body = { repeat, start_date: startDate, end_date: endDate };
      // The weekdays column arrives with migration 012 — only send it
      // when the custom mode actually needs it.
      if (repeat === 'custom') body.weekdays = [...weekdays];
      await api.patch(`/api/task-schedules/${plan.id}`, body);
      toast.success('Plan updated');
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[15px] font-extrabold text-slate-800">
            Edit plan
            <span className={`ml-2 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${ROLE_BADGE[plan.role]}`}>{plan.role}</span>
          </p>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <i className="fas fa-xmark" />
          </button>
        </div>

        <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Repeat</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {REPEATS.filter((r) => r.key !== 'once').map((r) => (
            <button
              key={r.key}
              onClick={() => setRepeat(r.key)}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition ${
                repeat === r.key ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {repeat === 'custom' && (
          <div className="mb-3">
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">On these days</p>
            <div className="flex gap-1">
              {WEEKDAY_LABELS.map((label, i) => {
                const on = weekdays.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => setWeekdays((prev) => {
                      const nextSel = new Set(prev);
                      if (nextSel.has(i)) nextSel.delete(i);
                      else nextSel.add(i);
                      return nextSel;
                    })}
                    className={`h-9 w-10 rounded-lg text-[11px] font-extrabold transition ${
                      on ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-1.5 flex gap-3">
          <div className="flex-1">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">From</p>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-brand" />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">To</p>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-brand" />
          </div>
        </div>
        <p className="mb-4 text-[11px] text-slate-400">
          To change the tasks or people, delete this plan and create a new one from the Assign tab.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !startDate || !endDate || endDate < startDate}
            className="rounded-xl bg-brand px-6 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ Per-user profile: stats + task calendar ============ */

function UserDetailDialog({ person, onClose }) {
  const [tasks, setTasks] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [dayISO, setDayISO] = useState(todayISO());

  useEffect(() => {
    api.get(`/api/staff-tasks/user/${person.id}`)
      .then((d) => setTasks(toArray(d)))
      .catch(() => setTasks([]));
  }, [person.id]);

  const today = todayISO();
  const dayOf = (t) => String(t.due_at || t.created_at || '').slice(0, 10);
  const bucketOf = (t) =>
    t.status === 'completed' ? 'done' : dayOf(t) < today ? 'overdue' : 'pending';

  const stats = useMemo(() => {
    const s = { total: 0, done: 0, pending: 0, overdue: 0 };
    for (const t of tasks || []) {
      s.total += 1;
      s[bucketOf(t)] += 1;
    }
    return s;
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const map = new Map();
    for (const t of tasks || []) {
      const d = dayOf(t);
      if (!d) continue;
      const cell = map.get(d) || { done: 0, pending: 0, overdue: 0 };
      cell[bucketOf(t)] += 1;
      map.set(d, cell);
    }
    return map;
  }, [tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  // Calendar cells: week starts Sunday (weekend here is Fri + Sat).
  const cells = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const blanks = Array.from({ length: first.getDay() }, () => null);
    const count = new Date(month.y, month.m + 1, 0).getDate();
    const days = Array.from({ length: count }, (_, i) =>
      `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
    return [...blanks, ...days];
  }, [month]);

  const shiftMonth = (delta) => {
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const dayTasks = (tasks || []).filter((t) => dayOf(t) === dayISO);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-[15px] font-extrabold ${ROLE_BADGE[person.role] || 'bg-slate-100 text-slate-500'}`}>
            {person.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-extrabold text-slate-800">{person.name}</p>
            <p className="text-[11.5px] font-bold uppercase text-slate-400">{person.role}</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
            <i className="fas fa-xmark" />
          </button>
        </div>

        {!tasks ? (
          <p className="py-10 text-center text-[13px] text-slate-400">Loading…</p>
        ) : (
          <>
            {/* Stat tiles */}
            <div className="grid grid-cols-4 gap-2">
              <StatTile label="Total" value={stats.total} tone="text-slate-800" soft="bg-slate-50" />
              <StatTile label="Completed" value={stats.done} tone="text-brand" soft="bg-brand-soft/50" />
              <StatTile label="Pending" value={stats.pending} tone="text-amber-600" soft="bg-amber-50" />
              <StatTile label="Overdue" value={stats.overdue} tone="text-red-500" soft="bg-red-50" />
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12px] font-extrabold text-slate-600">{pct}% done</span>
            </div>

            {/* Calendar */}
            <div className="mt-4 rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <button onClick={() => shiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
                  <i className="fas fa-chevron-left text-[11px]" />
                </button>
                <p className="text-[13px] font-extrabold text-slate-700">
                  {MONTHS[month.m]} {month.y}
                </p>
                <button onClick={() => shiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50">
                  <i className="fas fa-chevron-right text-[11px]" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className={`py-1 text-[10px] font-extrabold ${i >= 5 ? 'text-red-300' : 'text-slate-400'}`}>{d}</span>
                ))}
                {cells.map((d, i) => {
                  if (!d) return <span key={`b${i}`} />;
                  const c = byDay.get(d);
                  const isToday = d === today;
                  const isSel = d === dayISO;
                  const tone = !c ? '' :
                    c.overdue ? 'bg-red-50 text-red-600' :
                    c.pending ? 'bg-amber-50 text-amber-600' :
                    'bg-brand-soft text-brand';
                  const total = c ? c.done + c.pending + c.overdue : 0;
                  return (
                    <button
                      key={d}
                      onClick={() => setDayISO(d)}
                      className={`relative flex h-10 flex-col items-center justify-center rounded-lg text-[12px] font-bold transition ${
                        tone || 'text-slate-600 hover:bg-slate-50'
                      } ${isSel ? 'ring-2 ring-brand' : isToday ? 'ring-1 ring-slate-300' : ''}`}
                    >
                      {Number(d.slice(8))}
                      {total > 0 && (
                        <span className="text-[8.5px] font-extrabold leading-none opacity-80">{total} task{total === 1 ? '' : 's'}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand" />All done</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />Pending</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />Overdue</span>
              </div>
            </div>

            {/* Selected day */}
            <div className="mt-3">
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                {new Date(`${dayISO}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              {dayTasks.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3.5 py-3 text-[12px] text-slate-400">No tasks on this day</p>
              ) : (
                <ul className="space-y-1.5">
                  {dayTasks.map((t) => {
                    const b = bucketOf(t);
                    return (
                      <li key={t.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3.5 py-2.5">
                        <i className={`fas ${
                          b === 'done' ? 'fa-circle-check text-brand' :
                          b === 'overdue' ? 'fa-circle-exclamation text-red-400' :
                          'fa-clock text-amber-400'
                        } text-[14px]`} />
                        <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${b === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {t.title}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          b === 'done' ? 'bg-brand-soft text-brand' :
                          b === 'overdue' ? 'bg-red-50 text-red-500' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {b === 'done' ? 'Done' : b === 'overdue' ? 'Overdue' : 'Pending'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, tone, soft }) {
  return (
    <div className={`rounded-xl px-2 py-2.5 text-center ${soft}`}>
      <p className={`text-[19px] font-extrabold leading-6 ${tone}`}>{value}</p>
      <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
