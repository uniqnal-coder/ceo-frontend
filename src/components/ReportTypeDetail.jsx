// What each report type actually measures, and how a person's number was
// arrived at. The Report Center showed scores with no way to interpret them —
// "0.42" and "Late Task" tell an admin nothing about what happened or what it
// cost. Everything here is the real formula from the scoring engine, not a
// paraphrase, so the page and the backend can't drift apart silently.

const WEIGHTS = { attendance: 30, monitor: 20, tasks: 30, feedback: 20 }

export const TYPE_GUIDE = {
  all: {
    title: 'Every report type, combined',
    measures:
      'One number per person, weighting the four types below. It drives the salary deduction.',
    formula:
      'score = 30% attendance + 20% monitor + 30% tasks + 20% feedback · deduction = score × 10%, capped at 20% of base pay',
    weight: null,
  },
  attendance: {
    title: 'Attendance',
    measures:
      'Days missed, arrivals after 08:30, punches that carried no verified selfie, and check-ins away from the registered location.',
    formula:
      '(absent×1 + late×0.5 + offsite×0.25 + unverified×0.25) ÷ working days × 2, capped at 2',
    weight: WEIGHTS.attendance,
  },
  monitor: {
    title: 'Monitor',
    measures:
      'Whether a daily report exists for each working day. A supervisor’s Do/Don’t review counts as one.',
    formula: 'missed days ÷ working days × 2, capped at 2',
    weight: WEIGHTS.monitor,
  },
  tasks: {
    title: 'Tasks',
    measures:
      'The share of assigned items already past their deadline and still not completed. Approved leave days are excluded.',
    formula: 'overdue items ÷ total items × 2, capped at 2',
    weight: WEIGHTS.tasks,
  },
  feedback: {
    title: 'Feedback',
    measures:
      'Notes a manager recorded against the person — a Punish or Risk verdict on a Colab report files one.',
    formula: 'notes × 0.5, capped at 2',
    weight: WEIGHTS.feedback,
  },
}

/** The explainer that sits above the numbers. */
export function TypeExplainer({ type, from, to }) {
  const g = TYPE_GUIDE[type] || TYPE_GUIDE.all
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[62ch]">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-extrabold text-slate-800">{g.title}</h3>
            {g.weight != null && (
              <span className="rounded-full bg-[#1e3a5f] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                {g.weight}% of the score
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{g.measures}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          {from} → {to}
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          How it is scored
        </span>
        <p className="mt-0.5 font-mono text-[11.5px] leading-relaxed text-slate-600">
          {g.formula}
        </p>
      </div>
    </div>
  )
}

const n = (v) => (v == null ? 0 : v)

/** The four components with the numbers behind each, for one person. */
export function PersonBreakdown({ person, type }) {
  const c = person.components || {}
  const rows = [
    {
      key: 'attendance',
      label: 'Attendance',
      raw: n(c.attendance?.raw),
      weight: WEIGHTS.attendance,
      facts: [
        ['Absent', n(c.attendance?.absent)],
        ['Late', n(c.attendance?.late)],
        ['Offsite', n(c.attendance?.offsite)],
        ['Unverified', n(c.attendance?.unverified)],
        ['Working days', n(c.attendance?.workdays)],
      ],
    },
    {
      key: 'monitor',
      label: 'Monitor',
      raw: n(c.monitor?.raw),
      weight: WEIGHTS.monitor,
      facts: [
        ['Missed reports', n(c.monitor?.missing)],
        ['Expected', n(c.monitor?.expected)],
      ],
    },
    {
      key: 'tasks',
      label: 'Tasks',
      raw: n(c.tasks?.raw),
      weight: WEIGHTS.tasks,
      facts: [
        ['Overdue', n(c.tasks?.overdue)],
        ['Total items', n(c.tasks?.total)],
      ],
    },
    {
      key: 'feedback',
      label: 'Feedback',
      raw: n(c.feedback?.raw),
      weight: WEIGHTS.feedback,
      facts: [['Notes recorded', n(c.feedback?.count)]],
    },
  ]
  const shown = type === 'all' ? rows : rows.filter((r) => r.key === type)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((r) => (
          <div key={r.key} className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] font-extrabold text-slate-700">{r.label}</span>
              <span className="font-mono text-[12px] font-bold text-slate-600">
                {r.raw.toFixed(2)}
                <span className="ml-1 text-[10px] font-bold text-slate-400">
                  × {r.weight}%
                </span>
              </span>
            </div>
            {/* Raw runs 0–2, so half the width is a full-height bar. */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  r.raw >= 1.2 ? 'bg-rose-500' : r.raw >= 0.6 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (r.raw / 2) * 100)}%` }}
              />
            </div>
            <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              {r.facts.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-1.5">
                  <dt className="text-[11px] text-slate-400">{k}</dt>
                  <dd className="font-mono text-[12px] font-bold tabular-nums text-slate-700">
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {type === 'all' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="font-mono text-[11.5px] text-slate-500">
            {rows
              .map((r) => `${r.weight}%×${r.raw.toFixed(2)}`)
              .join('  +  ')}
          </span>
          <span className="text-[12.5px] font-extrabold text-slate-700">
            = {Number(person.score ?? 0).toFixed(2)}
            <span className="ml-2 font-normal text-slate-400">
              → {((person.deduction_ratio ?? 0) * 100).toFixed(1)}% deduction
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
