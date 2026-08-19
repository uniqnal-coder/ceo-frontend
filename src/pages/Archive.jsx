import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

function EmptyCell() {
  return <span className="text-slate-300">—</span>
}

export default function Archive() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [working, setWorking] = useState(false)

  // Two-tap confirm (native confirm() is blocked in some webviews).
  const [confirmKey, setConfirmKey] = useState(null)
  const confirmTimer = useRef(null)
  const armConfirm = (key) => {
    setConfirmKey(key)
    clearTimeout(confirmTimer.current)
    confirmTimer.current = setTimeout(() => setConfirmKey(null), 4000)
  }

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const allSelected = staff.length > 0 && staff.every((m) => selected.has(m.id))
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(staff.map((m) => m.id)))

  const fetchArchived = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/api/staff?status=Archived')
      setStaff(toArray(data))
    } catch (err) {
      setError(err.message)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArchived()
  }, [])

  const handleRestore = async (member) => {
    const key = `restore:${member.id}`
    if (confirmKey !== key) return armConfirm(key)
    setConfirmKey(null)
    try {
      await api.post(`/api/staff/${member.id}/restore`)
      toast.success(`${member.name} restored`)
      setSelected(new Set())
      fetchArchived()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handlePermanentDelete = async (member) => {
    const key = `delete:${member.id}`
    if (confirmKey !== key) return armConfirm(key)
    setConfirmKey(null)
    try {
      await api.del(`/api/staff/${member.id}/permanent`)
      toast.success(`${member.name} permanently deleted`)
      setSelected(new Set())
      fetchArchived()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const bulk = async (action) => {
    const key = `bulk:${action}`
    if (confirmKey !== key) return armConfirm(key)
    setConfirmKey(null)
    const targets = staff.filter((m) => selected.has(m.id))
    if (!targets.length) return
    setWorking(true)
    let ok = 0
    const failed = []
    for (const m of targets) {
      try {
        if (action === 'restore') await api.post(`/api/staff/${m.id}/restore`)
        else await api.del(`/api/staff/${m.id}/permanent`)
        ok += 1
      } catch {
        failed.push(m.name)
      }
    }
    setWorking(false)
    setSelected(new Set())
    if (ok) toast.success(`${ok} ${action === 'restore' ? 'restored' : 'permanently deleted'}`)
    if (failed.length) toast.error(`Failed for: ${failed.join(', ')}`)
    fetchArchived()
  }

  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold text-slate-800">
            <i className="fas fa-box-archive text-slate-500" />
            Archive
          </h2>
          <p className="text-[13px] text-slate-500">
            Archived staff cannot log in or appear on attendance. Restore them, or delete permanently.
          </p>
        </div>
        <Link
          to="/staff"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          ← Active staff
        </Link>
      </div>

      {loading && <p className="py-10 text-center text-slate-400">Loading archive…</p>}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>
      )}

      {!loading && staff.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <i className="fas fa-box-archive mb-3 text-2xl text-slate-300" />
          <p className="text-[13px] text-slate-400">No archived staff yet</p>
        </div>
      )}

      {!loading && staff.length > 0 && (
        <>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50"
          >
            <i className={`fas ${allSelected ? 'fa-square-minus' : 'fa-square-check'} mr-1.5`} />
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-[12px] font-bold text-slate-400">{selected.size} selected</span>
              <button
                type="button"
                disabled={working}
                onClick={() => bulk('restore')}
                className={`rounded-xl px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm transition disabled:opacity-40 ${
                  confirmKey === 'bulk:restore' ? 'bg-emerald-700' : 'bg-brand hover:bg-brand-dark'
                }`}
              >
                <i className="fas fa-rotate-left mr-1.5" />
                {confirmKey === 'bulk:restore' ? `Confirm restore ${selected.size}?` : `Restore selected`}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => bulk('delete')}
                className={`rounded-xl px-4 py-2 text-[12.5px] font-extrabold transition disabled:opacity-40 ${
                  confirmKey === 'bulk:delete'
                    ? 'bg-rose-600 text-white'
                    : 'border border-rose-200 bg-white text-rose-500 hover:bg-rose-50'
                }`}
              >
                <i className="fas fa-trash mr-1.5" />
                {confirmKey === 'bulk:delete' ? `Confirm delete ${selected.size} forever?` : `Delete selected forever`}
              </button>
            </>
          )}
          {working && <span className="text-[12px] font-bold text-slate-400">Working…</span>}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-[#2563eb]"
                  />
                </th>
                <th className="px-3 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Archived</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {staff.map((m) => (
                <tr key={m.id} className={`hover:bg-slate-50/60 ${selected.has(m.id) ? 'bg-[#eff6ff]/60' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleOne(m.id)}
                      className="h-4 w-4 cursor-pointer accent-[#2563eb]"
                    />
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-700">{m.name}</td>
                  <td className="px-3 py-3 text-slate-500">{m.role || <EmptyCell />}</td>
                  <td className="px-3 py-3 text-slate-500">{m.department || <EmptyCell />}</td>
                  <td className="px-3 py-3 text-slate-500">{m.email || <EmptyCell />}</td>
                  <td className="px-3 py-3 text-[12px] text-slate-400">
                    {m.archived_at
                      ? new Date(m.archived_at).toLocaleDateString('en-GB')
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-brand-dark"
                      >
                        <i className="fas fa-rotate-left" />
                        {confirmKey === `restore:${m.id}` ? 'Confirm?' : 'Restore'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(m)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[11.5px] font-semibold text-danger hover:bg-red-100"
                      >
                        <i className="fas fa-trash" />
                        {confirmKey === `delete:${m.id}` ? 'Confirm?' : 'Delete forever'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
