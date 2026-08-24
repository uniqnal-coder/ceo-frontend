import { useEffect, useMemo, useState } from 'react'
import { api, toArray } from '../api/client'
import { toast } from '../utils/toast'

// Link — assign employees to a Supervisor. Supervisors review their team's
// tasks daily in the StudyNal app; those reviews land in Reports → Monitor.
export default function Link() {
  const [options, setOptions] = useState({ supervisors: [], employees: [] })
  const [links, setLinks] = useState([])
  const [supervisor, setSupervisor] = useState('')
  const [checked, setChecked] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [opts, lks] = await Promise.all([
        api.get('/api/supervision/options'),
        api.get('/api/supervision/links'),
      ])
      setOptions({ supervisors: opts.supervisors || [], employees: opts.employees || [] })
      setLinks(toArray(lks))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const linkOf = useMemo(
    () => new Map(links.map((l) => [l.supervisor_id, l])),
    [links],
  )

  // Picking a supervisor loads their current team into the checklist (Edit).
  const pick = (id) => {
    setSupervisor(id)
    const existing = linkOf.get(id)
    setChecked(new Set((existing?.employees || []).map((e) => e.user_id)))
  }

  const toggle = (id) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  const reset = () => {
    setSupervisor('')
    setChecked(new Set())
  }

  const connect = async () => {
    if (!supervisor) return toast.error('Pick a supervisor first')
    setSaving(true)
    try {
      await api.put(`/api/supervision/links/${supervisor}`, { employee_ids: [...checked] })
      toast.success(`Connected ${checked.size} employee${checked.size === 1 ? '' : 's'}`)
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const clear = async () => {
    if (!supervisor) return toast.error('Pick a supervisor first')
    if (!window.confirm('Remove every employee from this supervisor?')) return
    setSaving(true)
    try {
      await api.del(`/api/supervision/links/${supervisor}`)
      toast.success('Link cleared')
      setChecked(new Set())
      await load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const initial = (name) => (name || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">🔗 Link</h2>
          <p className="text-[13px] text-slate-500">
            Assign employees to a Supervisor — they review the team&apos;s tasks daily in StudyNal.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-extrabold text-slate-600 hover:border-brand hover:text-brand"
          >
            <i className="fas fa-plus mr-1.5" />
            New
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!supervisor || saving}
            className="rounded-xl border border-rose-100 bg-white px-4 py-2 text-[12.5px] font-extrabold text-rose-500 hover:bg-rose-50 disabled:opacity-50"
          >
            <i className="fas fa-trash-can mr-1.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Assignment form */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Supervisor
            </span>
            <select
              value={supervisor}
              onChange={(e) => pick(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] font-bold text-slate-700 outline-none focus:border-brand"
            >
              <option value="">Choose a supervisor…</option>
              {options.supervisors.map((s) => (
                <option key={s.user_id} value={s.user_id}>{s.name}</option>
              ))}
            </select>
          </label>

          <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Employees
          </span>
          {loading ? (
            <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {options.employees.map((e) => (
                <label
                  key={e.user_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition ${
                    checked.has(e.user_id)
                      ? 'border-brand bg-brand/5'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[13px] font-extrabold text-slate-500">
                    {initial(e.name)}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13.5px] font-bold text-slate-700">{e.name}</span>
                    <span className="block text-[11.5px] text-slate-400">{e.role}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={checked.has(e.user_id)}
                    onChange={() => toggle(e.user_id)}
                    className="h-4.5 w-4.5 accent-brand"
                  />
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={connect}
            disabled={!supervisor || saving}
            className="mt-4 w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            <i className="fas fa-link mr-1.5" />
            {saving ? 'Saving…' : `Connect ${checked.size} employee${checked.size === 1 ? '' : 's'}`}
          </button>
        </div>

        {/* Current links */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[14px] font-extrabold text-slate-700">Current links</p>
          {links.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-slate-400">
              No supervisors linked yet.
            </p>
          ) : (
            <div className="space-y-3">
              {links.map((l) => (
                <button
                  key={l.supervisor_id}
                  type="button"
                  onClick={() => pick(l.supervisor_id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    supervisor === l.supervisor_id
                      ? 'border-brand bg-brand/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13.5px] font-extrabold text-slate-700">{l.supervisor_name}</span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {l.employees.length} employee{l.employees.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {l.employees.map((e) => (
                      <span
                        key={e.user_id}
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11.5px] font-bold text-slate-500"
                      >
                        {e.name}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-[11px] text-slate-400">
            Tap a link to edit it — the checklist loads that supervisor&apos;s team.
          </p>
        </div>
      </div>
    </div>
  )
}
