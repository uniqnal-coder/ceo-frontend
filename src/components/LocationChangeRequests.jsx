import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { toast } from '../utils/toast'

// Location change requests — a person can only move their registered primary
// location after an admin accepts. Accepting unlocks re-registration in the
// app; it never moves the point on their behalf.

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—')

const STATUS = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
}

export default function LocationChangeRequests({ onChange }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/baseline/requests')
      setRows(Array.isArray(res) ? res : [])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const decide = async (row, status) => {
    setBusyId(row.id)
    try {
      await api.patch(`/api/baseline/requests/${row.id}`, { status })
      toast.success(
        status === 'accepted'
          ? `${row.name} can now register a new location`
          : `Request rejected — ${row.name} keeps their original location`
      )
      await load()
      onChange?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const pending = rows.filter((r) => r.status === 'pending')
  const shown = showAll ? rows : pending

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-800">
            Location change requests
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </h3>
          <p className="text-[12px] text-slate-500">
            Accepting lets the person capture a new selfie and save a new
            primary location — once.
          </p>
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-500 hover:bg-slate-50"
        >
          {showAll ? 'Pending only' : `All (${rows.length})`}
        </button>
      </div>

      {loading && <p className="py-6 text-center text-[13px] text-slate-400">Loading…</p>}

      {!loading && !shown.length && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-bold text-slate-400">
          {showAll ? 'No requests yet.' : 'No requests waiting for review.'}
        </p>
      )}

      <div className="space-y-2">
        {shown.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-100 px-3.5 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-bold text-slate-700">
                    {r.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[r.status] || ''}`}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-400">
                  {r.role || '—'} · asked {when(r.requested_at)}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-1.5">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => decide(r, 'accepted')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => decide(r, 'rejected')}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
            {r.reason && (
              <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[12.5px] text-slate-600">
                “{r.reason}”
              </p>
            )}
            {r.current_baseline && (
              <p className="mt-1 text-[11px] text-slate-400">
                Currently registered at{' '}
                {Number(r.current_baseline.latitude).toFixed(5)},{' '}
                {Number(r.current_baseline.longitude).toFixed(5)} since{' '}
                {when(r.current_baseline.registered_at)}
              </p>
            )}
            {r.status !== 'pending' && (
              <p className="mt-1 text-[11px] text-slate-400">
                Decided {when(r.decided_at)}
                {r.decision_note ? ` — ${r.decision_note}` : ''}
                {r.status === 'accepted' &&
                  (r.consumed_at ? ' · new location saved' : ' · not used yet')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
