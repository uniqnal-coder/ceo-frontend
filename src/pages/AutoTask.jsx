import { useEffect, useMemo, useState } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';

const todayISO = () => new Date().toISOString().slice(0, 10);
const yearEndISO = () => `${new Date().getFullYear()}-12-31`;
const HISTORY_PAGE = 25;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

const REPEATS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'custom', label: 'Custom' },
];

const ROLE_BADGE = {
  teacher: 'bg-violet-50 text-violet-600',
  staff: 'bg-sky-50 text-sky-600',
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatHHMM = (hhmm) => {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return hhmm || '—';
  let h = Number(m[1]);
  const min = m[2];
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
};

const formatTaskTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Baghdad',
    });
  } catch {
    return '';
  }
};

const isPastDue = (dueAt) => {
  if (!dueAt) return false;
  const t = new Date(dueAt).getTime();
  return Number.isFinite(t) && t < Date.now();
};

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

const localISO = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

/**
 * Week containing `iso`, Sunday→Saturday (matches work week after Fri/Sat weekend).
 * Returns { days: string[], label: string }.
 */
function weekWindow(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { days: [], label: '' };
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay()); // Sunday
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return localISO(x);
  });
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt) =>
    dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return { days, label: `${fmt(start)} – ${fmt(end)}` };
}

function formatDayLabel(dateISO, withWeekday = true) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  if (withWeekday) opts.weekday = 'short';
  return d.toLocaleDateString('en-GB', opts);
}

/** Race a promise against a timeout so the UI never sticks on “Assigning…”. */
function withTimeout(promise, ms, label = 'Request') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out — try again`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function endOfWeekISO(anchorISO) {
  const d = new Date(`${anchorISO}T00:00:00`);
  const dow = d.getDay();
  const toThu = dow <= 4 ? 4 - dow : 4 + (7 - dow);
  d.setDate(d.getDate() + toThu);
  return localISO(d);
}

function endOfMonthISO(anchorISO) {
  const d = new Date(`${anchorISO}T00:00:00`);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return localISO(last);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function datesInMonth(y, monthIndex) {
  const n = daysInMonth(y, monthIndex);
  return Array.from({ length: n }, (_, i) =>
    `${y}-${String(monthIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
  );
}

function to24h(hour12, minute, ampm) {
  let h = Number(hour12);
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function from24h(hhmm) {
  const m = String(hhmm || '09:00').match(/^(\d{1,2}):(\d{2})$/);
  let h = m ? Number(m[1]) : 9;
  const min = m ? Number(m[2]) : 0;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { hour: h, minute: min, ampm };
}

function computeDates(mode, dueDate, fromDate, toDate, period = 'daily') {
  if (mode === 'once') {
    if (!dueDate) return [];
    if (period === 'weekly') return [endOfWeekISO(dueDate)];
    if (period === 'monthly') return [endOfMonthISO(dueDate)];
    return [dueDate];
  }
  if (!fromDate || !toDate) return [];
  const out = [];
  const end = new Date(`${toDate}T00:00:00`);
  const d = new Date(`${fromDate}T00:00:00`);
  const dayOfMonth = d.getDate();
  while (d <= end && out.length < 366) {
    const dow = d.getDay();
    if (period === 'daily') {
      if (dow !== 5 && dow !== 6) out.push(localISO(d));
      d.setDate(d.getDate() + 1);
    } else if (period === 'weekly') {
      out.push(localISO(d));
      d.setDate(d.getDate() + 7);
    } else {
      out.push(localISO(d));
      d.setMonth(d.getMonth() + 1, dayOfMonth);
    }
  }
  return out;
}

const selectCls =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-11 pr-9 text-[13.5px] font-semibold text-slate-700 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15';

export default function AutoTask() {
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [appType, setAppType] = useState('staff'); // teacher | staff
  const [categoryId, setCategoryId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [roleTasks, setRoleTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [period, setPeriod] = useState('daily');
  const [scheduleMode, setScheduleMode] = useState('once');
  const [followList, setFollowList] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [day, setDay] = useState(now.getDate());
  const initTime = from24h('09:00');
  const [hour12, setHour12] = useState(initTime.hour);
  const [minute] = useState(0);
  const [ampm, setAmpm] = useState(initTime.ampm);

  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState(null);
  const [editPlan, setEditPlan] = useState(null);
  const [view, setView] = useState('assign');
  const [history, setHistory] = useState(null);
  const [historyDone, setHistoryDone] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [already, setAlready] = useState(new Map());
  /** Weekly/monthly: { 'YYYY-MM-DD': string[] } titles scheduled that day. */
  const [dayPlan, setDayPlan] = useState({});

  const dueDate = useMemo(() => {
    const maxDay = daysInMonth(year, month);
    const d = Math.min(day, maxDay);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }, [year, month, day]);

  const startTime = useMemo(() => to24h(hour12, minute, ampm), [hour12, minute, ampm]);
  const dueTime = useMemo(() => {
    // Deadline = start + 8 hours (capped at 23:59)
    const [h, m] = startTime.split(':').map(Number);
    const endH = Math.min(h + 8, 23);
    return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [startTime]);

  const dates = useMemo(
    () => computeDates(scheduleMode, dueDate, dueDate, yearEndISO(), period),
    [scheduleMode, dueDate, period]
  );

  const week = useMemo(
    () => (period === 'weekly' ? weekWindow(dueDate) : { days: [], label: '' }),
    [period, dueDate]
  );

  const scheduleDays = useMemo(() => {
    if (period === 'weekly') return week.days;
    if (period === 'monthly') return datesInMonth(year, month);
    return [];
  }, [period, week.days, year, month]);

  const scheduleWindowKey = `${period}|${scheduleDays[0] || ''}|${scheduleDays[scheduleDays.length - 1] || ''}`;

  useEffect(() => {
    // Reset day buckets only when the week/month window actually changes.
    setDayPlan({});
  }, [scheduleWindowKey]);

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
    // Prefer Teachers & Staff roster (reliable). Fall back to check-in overview.
    (async () => {
      try {
        const rows = toArray(await api.get('/api/staff'));
        const mapped = rows
          .filter((r) => r.user_id && (r.users?.role === 'teacher' || r.users?.role === 'staff'))
          .map((r) => ({
            id: r.user_id,
            name: r.name || '—',
            role: r.users.role,
            job_role: r.role || null,
            category_id: r.category_id || null,
            category_name: null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (mapped.length) {
          setPeople(mapped);
          return;
        }
      } catch {
        /* try checkins next */
      }
      try {
        const d = await api.get(`/api/checkins/overview?date=${todayISO()}`);
        setPeople((d.people || []).sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        setPeople([]);
        toast.error(err.message || 'Could not load people');
      }
    })();
    loadHistory();
    loadPlans();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load roles (subjects / staff roles) when type changes.
  useEffect(() => {
    let live = true;
    setCategoryId('');
    setEmployeeId('');
    setSelected(new Set());
    (async () => {
      try {
        let rows = toArray(await api.get(`/api/role-categories?app_role=${appType}&active=1`));
        // If none marked active, still show all so Assign Task isn't empty.
        if (!rows.length) {
          rows = toArray(await api.get(`/api/role-categories?app_role=${appType}`));
        }
        if (live) setCategories(rows);
      } catch (err) {
        if (live) {
          setCategories([]);
          toast.error(err.message || 'Could not load roles');
        }
      }
    })();
    return () => { live = false; };
  }, [appType]);

  // Load task templates for type + role.
  useEffect(() => {
    if (!categoryId) { setRoleTasks([]); setSelected(new Set()); return; }
    let live = true;
    setTasksLoading(true);
    (async () => {
      try {
        const scoped = toArray(await api.get(`/api/role-tasks?role=${appType}&category_id=${categoryId}`));
        const roleWide = toArray(await api.get(`/api/role-tasks?role=${appType}&category_id=none`));
        const seen = new Set();
        const merged = [];
        for (const t of [...scoped, ...roleWide]) {
          if (seen.has(t.title)) continue;
          seen.add(t.title);
          merged.push(t);
        }
        if (live) {
          setRoleTasks(merged);
          setSelected(new Set(merged.map((t) => t.title)));
        }
      } catch {
        if (live) setRoleTasks([]);
      } finally {
        if (live) setTasksLoading(false);
      }
    })();
    return () => { live = false; };
  }, [appType, categoryId]);

  const roleLabel = appType === 'teacher' ? 'Subject' : 'Staff role';
  const activeCategory = categories.find((c) => c.id === categoryId) || null;
  const activeCategoryName = activeCategory?.name || null;

  const employees = useMemo(() => {
    let list = people.filter((p) => p.role === appType);
    if (categoryId) {
      const catName = (categories.find((c) => c.id === categoryId)?.name || '')
        .trim()
        .toLowerCase();
      list = list.filter((p) => {
        if (p.category_id === categoryId) return true;
        const job = String(p.job_role || p.category_name || '').trim().toLowerCase();
        return !!catName && job === catName;
      });
    }
    return list;
  }, [people, appType, categoryId, categories]);

  const selectedEmployee = employees.find((p) => p.id === employeeId) || null;
  const selectedUsers = useMemo(
    () => (employeeId ? new Set([employeeId]) : new Set()),
    [employeeId]
  );

  useEffect(() => {
    if (selectedUsers.size === 0 || dates.length === 0) { setAlready(new Map()); return; }
    let live = true;
    api.get(`/api/staff-tasks/existing?user_ids=${[...selectedUsers].join(',')}&from=${dates[0]}&to=${dates[dates.length - 1]}`)
      .then((rows) => {
        if (!live) return;
        const map = new Map();
        for (const r of toArray(rows)) {
          if (!map.has(r.title)) map.set(r.title, new Set());
          map.get(r.title).add(r.user_id);
        }
        setAlready(map);
      })
      .catch(() => { if (live) setAlready(new Map()); });
    return () => { live = false; };
  }, [selectedUsers, dates]);

  const toggleTask = (title) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const toggleDayTask = (date, title) => {
    setDayPlan((prev) => {
      const cur = new Set(prev[date] || []);
      if (cur.has(title)) cur.delete(title);
      else cur.add(title);
      const next = { ...prev };
      if (cur.size) next[date] = [...cur];
      else delete next[date];
      return next;
    });
  };

  const recurring = scheduleMode === 'recurring';
  const usingList = recurring && followList;
  const scheduledSlotCount = useMemo(
    () => Object.values(dayPlan).reduce((n, t) => n + (t?.length || 0), 0),
    [dayPlan]
  );
  const taskCount =
    period === 'daily'
      ? (usingList ? roleTasks.length : selected.size)
      : scheduledSlotCount;
  const canSave = !!employeeId && !!categoryId && taskCount > 0 && !!dueDate;

  const resetForm = () => {
    setEmployeeId('');
    setSelected(new Set(roleTasks.map((t) => t.title)));
    setPeriod('daily');
    setScheduleMode('once');
    setFollowList(true);
    setDayPlan({});
  };

  const save = async () => {
    if (saving) return;
    if (!categoryId) {
      toast.error(`Select a ${roleLabel.toLowerCase()} first`);
      return;
    }
    if (!employeeId) {
      toast.error('Select an employee first');
      return;
    }
    const titles = roleTasks.map((t) => t.title).filter((t) => selected.has(t));
    const assignments = Object.entries(dayPlan)
      .filter(([, list]) => list?.length)
      .map(([date, list]) => ({ date, titles: list }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (period === 'daily' && !titles.length && !usingList) {
      toast.error('Select at least one task');
      return;
    }
    if (period !== 'daily' && !assignments.length) {
      toast.error(`Tap tasks under each day to schedule them`);
      return;
    }
    setSaving(true);
    try {
      const periodWord = period.charAt(0).toUpperCase() + period.slice(1);
      const groupTitle = activeCategoryName
        ? `${activeCategoryName} ${periodWord} checklist`
        : `${periodWord} tasks`;

      const postBulk = (payload) =>
        withTimeout(
          api.post('/api/staff-tasks/bulk', {
            start_time: startTime,
            due_time: dueTime,
            group_title: groupTitle,
            period,
            ...payload,
          }),
          45000,
          'Assign'
        );

      if (!recurring) {
        let items = 0;
        let skippedCompleted = 0;
        if (period === 'daily') {
          const r = await postBulk({
            user_ids: [employeeId],
            titles,
            dates,
          });
          items = (r.subtasks || 0) + (r.created || 0);
          skippedCompleted = r.skippedCompleted || 0;
        } else {
          // Prefer one request with per-day assignments (newer API).
          // Fall back to one titles+dates call per day for older servers.
          try {
            const r = await postBulk({
              user_ids: [employeeId],
              assignments,
            });
            items = (r.subtasks || 0) + (r.created || 0);
            skippedCompleted = r.skippedCompleted || 0;
          } catch (firstErr) {
            const msg = String(firstErr?.message || '');
            // Older production APIs reject when `titles` is missing (no `assignments` support).
            const needLegacy = /titles is required|titles or assignments/i.test(msg);
            if (!needLegacy) throw firstErr;

            const results = await Promise.allSettled(
              assignments.map(({ date, titles: dayTitles }) =>
                postBulk({
                  user_ids: [employeeId],
                  titles: dayTitles,
                  dates: [date],
                })
              )
            );
            const failed = [];
            results.forEach((res, i) => {
              if (res.status === 'fulfilled') {
                items += (res.value.subtasks || 0) + (res.value.created || 0);
                skippedCompleted += res.value.skippedCompleted || 0;
              } else {
                failed.push(formatDayLabel(assignments[i].date, false));
              }
            });
            if (failed.length && !items) {
              const errMsg = results.find((r) => r.status === 'rejected')?.reason?.message;
              throw new Error(errMsg || `Assign failed for ${failed.join(', ')}`);
            }
            if (failed.length) {
              toast.error(`Some days failed: ${failed.join(', ')}`);
            }
          }
        }
        toast.success(
          `Assigned ${items} ${period} task${items === 1 ? '' : 's'}` +
          (skippedCompleted ? ` (${skippedCompleted} already done skipped)` : '')
        );
      } else {
        const day_titles = {};
        const weekdays = [];
        for (const { date, titles: dayTitles } of assignments) {
          const dow = new Date(`${date}T00:00:00`).getDay();
          day_titles[String(dow)] = dayTitles;
          weekdays.push(dow);
        }
        const useBuckets = period !== 'daily' && Object.keys(day_titles).length > 0;
        const allDayTitles = [...new Set(assignments.flatMap((a) => a.titles))];
        const r = await api.post('/api/task-schedules', {
          role: appType,
          category_id: categoryId || null,
          period,
          user_ids: [employeeId],
          titles: useBuckets ? allDayTitles : (usingList ? [] : titles),
          repeat: useBuckets ? 'custom' : period,
          weekdays: useBuckets ? [...new Set(weekdays)] : [],
          day_titles: useBuckets ? day_titles : undefined,
          start_date: dueDate,
          end_date: yearEndISO(),
          start_time: startTime,
          due_time: dueTime,
        });
        toast.success(
          `Recurring plan created` +
          (r.createdToday ? ` (${r.createdToday} for today)` : '')
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

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const dayOptions = Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1);
  const hourOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-slate-400">Tasks › Assign Task</p>
          <h1 className="text-[22px] font-extrabold text-slate-800">Assign Task</h1>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {[['assign', 'fa-paper-plane', 'Assign'], ['planner', 'fa-calendar-days', 'Year Planner']].map(([key, icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12.5px] font-extrabold transition ${
                view === key ? 'bg-[#1e3a5f] text-white' : 'text-slate-500 hover:bg-slate-50'
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

      {view === 'assign' && (
        <>
          <div className="space-y-5">
            {/* Who — always full width so selectors never disappear */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-[16px] font-extrabold text-slate-800">Assign to</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-extrabold text-white">1</span>
                    <span className="text-[13px] font-bold text-slate-700">Staff or Teacher</span>
                  </div>
                  <div className="relative">
                    <i className="fas fa-users absolute top-1/2 left-3.5 -translate-y-1/2 text-[13px] text-[#2563eb]" />
                    <select
                      value={appType}
                      onChange={(e) => setAppType(e.target.value)}
                      className={selectCls}
                    >
                      <option value="staff">Staff</option>
                      <option value="teacher">Teacher</option>
                    </select>
                    <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] text-slate-400" />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-extrabold text-white">2</span>
                    <span className="text-[13px] font-bold text-slate-700">{roleLabel}</span>
                  </div>
                  <div className="relative">
                    <i className="fas fa-briefcase absolute top-1/2 left-3.5 -translate-y-1/2 text-[13px] text-violet-500" />
                    <select
                      value={categoryId}
                      onChange={(e) => { setCategoryId(e.target.value); setEmployeeId(''); }}
                      className={selectCls}
                    >
                      <option value="">Select {roleLabel.toLowerCase()}…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.staff_count ? ` · ${c.staff_count}` : ''}
                        </option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] text-slate-400" />
                  </div>
                  {!categories.length && (
                    <p className="mt-1.5 text-[11.5px] text-amber-600">
                      {appType === 'teacher'
                        ? 'No subjects found — add them under Subjects.'
                        : 'No staff roles found — add them under Staff Roles.'}
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-[11px] font-extrabold text-white">3</span>
                    <span className="text-[13px] font-bold text-slate-700">Employee</span>
                  </div>
                  <div className="relative">
                    <i className="fas fa-user absolute top-1/2 left-3.5 -translate-y-1/2 text-[13px] text-emerald-500" />
                    <select
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      disabled={!categoryId}
                      className={`${selectCls} disabled:bg-slate-50 disabled:text-slate-400`}
                    >
                      <option value="">
                        {!categoryId ? `Select a ${roleLabel.toLowerCase()} first…` : 'Select employee…'}
                      </option>
                      {employees.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[10px] text-slate-400" />
                  </div>
                  {categoryId && !employees.length && (
                    <p className="mt-1.5 text-[11.5px] text-amber-600">
                      No one linked to this {roleLabel.toLowerCase()} — set it in Teachers &amp; Staff.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {/* Daily task checklist (weekly/monthly schedule below handles picking) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <i className="fas fa-clipboard-list text-[#2563eb]" />
                  <h3 className="text-[15px] font-extrabold text-slate-800">
                    {period === 'daily' ? 'Tasks' : 'Task pool'}
                  </h3>
                  <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[11px] font-extrabold text-white">
                    {period === 'daily' ? selected.size : roleTasks.length}
                  </span>
                </div>

                {period !== 'daily' && (
                  <p className="mb-3 text-[12px] text-slate-500">
                    Tap tasks under each day on the right to schedule them.
                    {selectedEmployee?.name ? (
                      <> · For <span className="font-bold text-slate-700">{selectedEmployee.name}</span></>
                    ) : null}
                  </p>
                )}

                {!categoryId ? (
                  <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-[12.5px] text-slate-400">
                    Select a {roleLabel.toLowerCase()} to load tasks
                  </p>
                ) : tasksLoading ? (
                  <p className="py-6 text-center text-[12.5px] text-slate-400">Loading tasks…</p>
                ) : roleTasks.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-[12.5px] text-amber-700">
                    No tasks for this {roleLabel.toLowerCase()} yet — add them in Add Task.
                  </p>
                ) : period === 'daily' ? (
                  <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl bg-[#eff6ff] p-3">
                    {/* Master toggle — only counts tasks that can still be
                        sent, so "already sent" ones never block it. */}
                    {(() => {
                      const selectable = roleTasks.filter(
                        (t) => !already.get(t.title)?.has(employeeId)
                      );
                      const allOn =
                        selectable.length > 0 &&
                        selectable.every((t) => selected.has(t.title));
                      const someOn = selectable.some((t) => selected.has(t.title));
                      return (
                        <label className="mb-1 flex cursor-pointer items-center gap-2.5 rounded-lg border-b border-blue-100 px-2 pb-2 hover:bg-white/70">
                          <input
                            type="checkbox"
                            checked={allOn}
                            ref={(el) => {
                              if (el) el.indeterminate = !allOn && someOn;
                            }}
                            disabled={selectable.length === 0}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                for (const t of selectable) {
                                  if (allOn) next.delete(t.title);
                                  else next.add(t.title);
                                }
                                return next;
                              })
                            }
                            className="h-4 w-4 accent-[#2563eb]"
                          />
                          <span className="text-[12.5px] font-extrabold text-slate-600">
                            {allOn ? 'Deselect all' : 'Select all'}
                          </span>
                          <span className="ml-auto text-[11px] font-bold text-slate-400">
                            {selectable.filter((t) => selected.has(t.title)).length}/{selectable.length}
                          </span>
                        </label>
                      );
                    })()}
                    {roleTasks.map((t) => {
                      const on = selected.has(t.title);
                      const have = already.get(t.title)?.has(employeeId);
                      return (
                        <label
                          key={t.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition ${
                            have ? 'opacity-50' : 'hover:bg-white/70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={!!have}
                            onChange={() => toggleTask(t.title)}
                            className="h-4 w-4 accent-[#2563eb]"
                          />
                          <span className={`text-[13px] font-semibold ${on ? 'text-slate-800' : 'text-slate-500'}`}>
                            {t.title}
                          </span>
                          {have && (
                            <span className="ml-auto text-[10px] font-bold text-slate-400">Already sent</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-3 text-[13px] font-semibold text-slate-600">
                    {roleTasks.map((t) => (
                      <li key={t.id} className="rounded-lg px-2 py-1.5">{t.title}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <i className="fas fa-calendar-days text-[#2563eb]" />
                  <h3 className="text-[15px] font-extrabold text-slate-800">Date &amp; Time</h3>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {PERIODS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPeriod(p.key)}
                      className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition ${
                        period === p.key
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-400">Month</span>
                    <div className="relative">
                      <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-7 text-[13px] font-bold text-slate-700 outline-none transition hover:border-[#2563eb]/40 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
                      >
                        {MONTH_SHORT.map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px] text-slate-400" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-400">
                      {period === 'weekly' ? 'Day in week' : 'Date'}
                    </span>
                    <div className="relative">
                      <select
                        value={Math.min(day, daysInMonth(year, month))}
                        onChange={(e) => setDay(Number(e.target.value))}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-7 text-[13px] font-bold text-slate-700 outline-none transition hover:border-[#2563eb]/40 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
                      >
                        {dayOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px] text-slate-400" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-400">Year</span>
                    <div className="relative">
                      <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-7 text-[13px] font-bold text-slate-700 outline-none transition hover:border-[#2563eb]/40 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
                      >
                        {years.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px] text-slate-400" />
                    </div>
                  </label>
                </div>

                {period === 'weekly' && week.label && (
                  <div className="mb-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[12.5px] font-bold text-[#1e40af]">
                    Week shown: {week.label}
                    <span className="mt-0.5 block text-[11px] font-semibold text-[#3b82f6]">
                      Sun–Sat week that includes {formatDayLabel(dueDate, false)}
                    </span>
                  </div>
                )}
                {period === 'monthly' && (
                  <div className="mb-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[12.5px] font-bold text-[#1e40af]">
                    Month shown: {MONTHS[month]} {year}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-400">Time start</span>
                    <div className="relative">
                      <select
                        value={hour12}
                        onChange={(e) => setHour12(Number(e.target.value))}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-7 text-[13px] font-bold text-slate-700 outline-none transition hover:border-[#2563eb]/40 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
                      >
                        {hourOptions.map((h) => (
                          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px] text-slate-400" />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-400">AM / PM</span>
                    <div className="relative">
                      <select
                        value={ampm}
                        onChange={(e) => setAmpm(e.target.value)}
                        className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-7 text-[13px] font-bold text-slate-700 outline-none transition hover:border-[#2563eb]/40 focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/15"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[9px] text-slate-400" />
                    </div>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { key: 'once', label: 'One-time' },
                    { key: 'recurring', label: 'Recurring plan' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setScheduleMode(m.key)}
                      className={`rounded-lg border px-3 py-1 text-[11.5px] font-bold transition ${
                        scheduleMode === m.key
                          ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {period !== 'daily' && (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[12.5px] font-extrabold text-slate-700">
                        Schedule by {period === 'weekly' ? 'weekday' : 'date'}
                      </p>
                      <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {scheduledSlotCount} slotted
                      </span>
                    </div>
                    <p className="mb-3 text-[11px] text-slate-400">
                      {period === 'weekly'
                        ? `Pick tasks for each day in ${week.label || 'this week'}.`
                        : `Pick tasks for each day in ${MONTHS[month]} ${year}.`}
                    </p>
                    {!roleTasks.length ? (
                      <p className="text-[12px] text-slate-400">Select a {roleLabel.toLowerCase()} first.</p>
                    ) : (
                      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {scheduleDays.map((dateISO) => {
                          const picked = new Set(dayPlan[dateISO] || []);
                          const pool = roleTasks.map((t) => t.title);
                          const isAnchor = dateISO === dueDate;
                          return (
                            <div
                              key={dateISO}
                              className={`rounded-xl border bg-white p-2.5 ${
                                isAnchor ? 'border-[#2563eb] ring-1 ring-[#2563eb]/20' : 'border-slate-200'
                              }`}
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <span className="text-[12px] font-extrabold text-slate-700">
                                  {formatDayLabel(dateISO, true)}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {picked.size} selected
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {pool.map((title) => {
                                  const on = picked.has(title);
                                  return (
                                    <button
                                      key={title}
                                      type="button"
                                      onClick={() => toggleDayTask(dateISO, title)}
                                      className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                                        on
                                          ? 'border-[#2563eb] bg-[#eff6ff] text-[#1e40af]'
                                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-white'
                                      }`}
                                    >
                                      {title}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5 rounded-xl bg-[#eff6ff] px-3.5 py-2.5 text-[12.5px] text-[#1e40af]">
              <i className="fas fa-circle-info mt-0.5" />
              <span>Make sure all details are correct before assigning the task.</span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !canSave}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                <i className="fas fa-paper-plane text-[12px]" />
                {saving ? 'Assigning…' : recurring ? 'Create plan' : 'Assign Task'}
              </button>
            </div>
          </div>

          {/* Recurring plans */}
          {plans && plans.length > 0 && (
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
                        type="button"
                        onClick={() => togglePlan(plan)}
                        className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition ${
                          plan.active ? 'bg-brand-soft text-brand' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {plan.active ? '● Active' : '⏸ Paused'}
                      </button>
                      <button type="button" onClick={() => setEditPlan(plan)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:text-brand">
                        <i className="fas fa-pen text-[11px]" />
                      </button>
                      <button type="button" onClick={() => deletePlan(plan)} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:text-red-500">
                        <i className="fas fa-trash text-[11px]" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((t) => (
                        <tr key={t.id} className="border-b border-slate-50">
                          <td className="whitespace-nowrap px-2 py-2 font-bold text-slate-700">
                            {t.users?.name || '—'}
                          </td>
                          <td className="max-w-[260px] truncate px-2 py-2 text-slate-600">{t.title}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-slate-500">
                            {t.due_at
                              ? `${new Date(t.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${formatTaskTime(t.due_at)}`
                              : '—'}
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
                    type="button"
                    onClick={() => loadHistory(false)}
                    disabled={historyLoading}
                    className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {historyLoading ? 'Loading…' : 'Load more'}
                  </button>
                )}
              </>
            )}
          </div>
        </>
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
  const [startTime, setStartTime] = useState(plan.start_time || '09:00');
  const [dueTime, setDueTime] = useState(plan.due_time || '17:00');
  const [saving, setSaving] = useState(false);
  const timesOk = startTime && dueTime && startTime < dueTime;

  const save = async () => {
    if (repeat === 'custom' && weekdays.size === 0) {
      toast.error('Pick at least one weekday');
      return;
    }
    if (!timesOk) {
      toast.error('Deadline must be after start time');
      return;
    }
    setSaving(true);
    try {
      const body = {
        repeat,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        due_time: dueTime,
      };
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

        <div className="mb-3 flex gap-3">
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
        <div className="mb-1.5 flex gap-3">
          <div className="flex-1">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Start time</p>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-brand" />
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Deadline</p>
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-brand" />
          </div>
        </div>
        <p className="mb-4 text-[11px] text-slate-400">
          {formatHHMM(startTime)} → {formatHHMM(dueTime)}. Past deadline counts as unfinished for fault tracking.
          To change the tasks or people, delete this plan and create a new one from the Assign tab.
        </p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || !startDate || !endDate || endDate < startDate || !timesOk}
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
    t.status === 'completed' ? 'done' : isPastDue(t.due_at) ? 'overdue' : 'pending';

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
                          {t.due_at && (
                            <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                              {t.start_at ? `${formatTaskTime(t.start_at)}–` : ''}{formatTaskTime(t.due_at)}
                            </span>
                          )}
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
