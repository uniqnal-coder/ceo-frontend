import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../utils/toast'
import { api } from '../api/client'

const COLOR_OPTS = [
  { key: 'emerald', label: 'Green', chip: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  { key: 'violet', label: 'Violet', chip: 'bg-violet-100 text-violet-700 ring-violet-200' },
  { key: 'sky', label: 'Sky', chip: 'bg-sky-100 text-sky-700 ring-sky-200' },
  { key: 'amber', label: 'Amber', chip: 'bg-amber-100 text-amber-800 ring-amber-200' },
  { key: 'rose', label: 'Rose', chip: 'bg-rose-100 text-rose-700 ring-rose-200' },
  { key: 'indigo', label: 'Indigo', chip: 'bg-indigo-100 text-indigo-700 ring-indigo-200' },
  { key: 'teal', label: 'Teal', chip: 'bg-teal-100 text-teal-700 ring-teal-200' },
  { key: 'slate', label: 'Slate', chip: 'bg-slate-100 text-slate-600 ring-slate-200' },
]

const chipOf = (color) =>
  COLOR_OPTS.find((c) => c.key === color)?.chip || COLOR_OPTS[COLOR_OPTS.length - 1].chip

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [color, setColor] = useState('emerald')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('emerald')
  const [busyId, setBusyId] = useState(null)

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const data = await api.get('/api/hr-roles')
      setRoles(data.roles || [])
    } catch (err) {
      setError(err.message)
      if (!silent) setRoles([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const activeCount = useMemo(() => roles.filter((r) => r.active !== false).length, [roles])

  const addRole = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const created = await api.post('/api/hr-roles', { name: trimmed, color })
      setName('')
      setColor('emerald')
      setRoles((prev) => [...prev, { ...created, staff_count: created.staff_count || 0 }])
      toast.success('Role added')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (role) => {
    setEditId(role.id)
    setEditName(role.name)
    setEditColor(role.color || 'emerald')
  }

  const saveEdit = async () => {
    if (!editId) return
    setSaving(true)
    try {
      const updated = await api.patch(`/api/hr-roles/${editId}`, {
        name: editName.trim(),
        color: editColor,
      })
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editId
            ? { ...r, ...updated, staff_count: updated.staff_count ?? r.staff_count }
            : r
        )
      )
      toast.success('Role updated')
      setEditId(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (role) => {
    if (busyId) return
    const next = role.active === false
    const previous = role.active
    // Flip UI immediately — don't wait for the network round-trip.
    setRoles((prev) =>
      prev.map((r) => (r.id === role.id ? { ...r, active: next } : r))
    )
    setBusyId(role.id)
    try {
      await api.patch(`/api/hr-roles/${role.id}`, { active: next })
    } catch (err) {
      setRoles((prev) =>
        prev.map((r) => (r.id === role.id ? { ...r, active: previous } : r))
      )
      toast.error(err.message || 'Could not update role')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (role) => {
    if (!confirm(`Delete role “${role.name}”?`)) return
    const snapshot = roles
    setRoles((prev) => prev.filter((r) => r.id !== role.id))
    try {
      await api.del(`/api/hr-roles/${role.id}`)
      toast.success('Role deleted')
    } catch (err) {
      setRoles(snapshot)
      toast.error(err.message)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-slate-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <i className="fas fa-user-tag text-[15px]" />
            </span>
            Roles
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-slate-500">
            Create job titles for Add Staff. Use Show / Hide to control which roles appear in the dropdown.
          </p>
        </div>
        <Link
          to="/staff"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Open Add Staff →
        </Link>
      </div>

      {/* Composer */}
      <form
        onSubmit={addRole}
        className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-brand-soft/40 to-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Add a role</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[11px] font-semibold text-slate-400">Role name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lab Supervisor"
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-[14px] outline-none focus:border-brand"
              maxLength={80}
            />
          </label>
          <div>
            <span className="mb-1 block text-[11px] font-semibold text-slate-400">Color</span>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_OPTS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.key)}
                  className={`h-8 w-8 rounded-full ring-2 transition ${
                    color === c.key ? 'ring-brand scale-110' : 'ring-transparent opacity-80 hover:opacity-100'
                  } ${c.chip.split(' ')[0]}`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="h-11 rounded-xl bg-brand px-5 text-[13.5px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Add role'}
          </button>
        </div>
      </form>

      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-slate-400">
          {loading ? 'Loading…' : `${activeCount} active · ${roles.length} total`}
        </p>
        <button
          type="button"
          onClick={load}
          className="text-[12px] font-bold text-brand hover:underline"
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>
      )}

      {!loading && roles.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <i className="fas fa-user-tag mb-3 text-2xl text-slate-300" />
          <p className="text-[13px] text-slate-400">No roles yet — add your first one above</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => {
          const editing = editId === role.id
          const visible = role.active !== false
          return (
            <div
              key={role.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                visible ? 'border-slate-200' : 'border-dashed border-slate-200 bg-slate-50/60'
              }`}
            >
              {editing ? (
                <div className="space-y-3">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[14px] font-semibold outline-none focus:border-brand"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_OPTS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setEditColor(c.key)}
                        className={`h-7 w-7 rounded-full ring-2 ${
                          editColor === c.key ? 'ring-brand' : 'ring-transparent'
                        } ${c.chip.split(' ')[0]}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={saving || !editName.trim()}
                      className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-extrabold ring-1 ring-inset ${chipOf(role.color)} ${
                            visible ? '' : 'opacity-60'
                          }`}
                        >
                          {role.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            visible
                              ? 'bg-brand-soft text-brand'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {visible ? 'Shown' : 'Hidden'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12px] text-slate-400">
                        {role.staff_count || 0} staff using this role
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        title="Edit name or color"
                        onClick={() => startEdit(role)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-white hover:text-brand"
                      >
                        <i className="fas fa-pen text-[11px]" />
                      </button>
                      <button
                        type="button"
                        title="Delete role"
                        onClick={() => remove(role)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <i className="fas fa-trash text-[11px]" />
                      </button>
                    </div>
                  </div>

                  {/* Clear Show / Hide control for Add Staff dropdown */}
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-slate-700">
                        {visible ? 'Shown in Add Staff' : 'Hidden from Add Staff'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {visible
                          ? 'Staff can be assigned this role'
                          : 'Not in the Role dropdown until you show it again'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={visible}
                      aria-busy={busyId === role.id}
                      disabled={busyId === role.id}
                      aria-label={visible ? 'Hide role from Add Staff' : 'Show role in Add Staff'}
                      onClick={() => toggleActive(role)}
                      className={`relative h-8 w-[3.25rem] shrink-0 rounded-full transition disabled:opacity-70 ${
                        visible ? 'bg-brand' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-extrabold shadow transition ${
                          visible ? 'translate-x-[1.35rem] text-brand' : 'translate-x-0 text-slate-400'
                        }`}
                      >
                        {busyId === role.id ? '…' : visible ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
