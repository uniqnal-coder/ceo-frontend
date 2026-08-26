import { useEffect, useState } from 'react'
import LiveMap from './LiveMap'
import { api } from '../api/client'
import { toast } from '../utils/toast'

// View Location — where a person registered their primary GPS point, the
// selfie they registered it with, and the geofence their check-ins are
// measured against.

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '—')

export default function BaselineLocationDialog({ user, onClose, onReset }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api.get(`/api/baseline/${user.id}`)
        if (alive) setData(res)
      } catch (e) {
        toast.error(e.message)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user.id])

  const reset = async () => {
    if (!confirmReset) return setConfirmReset(true)
    setResetting(true)
    try {
      const res = await api.del(`/api/baseline/${user.id}`)
      toast.success(res?.message || 'Location reset')
      onReset?.()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setResetting(false)
    }
  }

  const baseline = data?.baseline

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-extrabold text-slate-800">
              📍 {user.name || user.email}
            </h3>
            <p className="text-[12.5px] text-slate-500">
              Where this person registered their primary location.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        {loading && <p className="py-10 text-center text-[13px] text-slate-400">Loading…</p>}

        {!loading && !baseline && (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-[13px] font-bold text-slate-400">
            This person has not registered a location yet. Their app asks for a
            selfie and GPS at the next check-in.
          </p>
        )}

        {!loading && baseline && (
          <>
            <div className="mb-4 grid gap-4 sm:grid-cols-[150px_1fr]">
              <div>
                {baseline.selfie_url ? (
                  <img
                    src={baseline.selfie_url}
                    alt="registration selfie"
                    className="h-[150px] w-[150px] rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="grid h-[150px] w-[150px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[12px] font-bold text-slate-400">
                    No selfie
                  </div>
                )}
              </div>
              <dl className="space-y-2 text-[13px]">
                <Row label="Registered" value={when(baseline.registered_at)} />
                <Row
                  label="Coordinates"
                  value={`${baseline.latitude.toFixed(5)}, ${baseline.longitude.toFixed(5)}`}
                />
                <Row label="Allowed radius" value={`${baseline.radius_m} m`} />
                <Row
                  label="Times changed"
                  value={baseline.version > 1 ? `${baseline.version - 1}×` : 'never'}
                />
                {data.request && (
                  <Row
                    label="Last request"
                    value={`${data.request.status}${data.request.reason ? ` — ${data.request.reason}` : ''}`}
                  />
                )}
              </dl>
            </div>

            <LiveMap
              site={{
                lat: baseline.latitude,
                lng: baseline.longitude,
                radius: baseline.radius_m,
              }}
              people={[
                {
                  user_id: user.id,
                  name: user.name || user.email,
                  latitude: baseline.latitude,
                  longitude: baseline.longitude,
                  inside_geofence: true,
                },
              ]}
              height={300}
            />
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-500 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={reset}
            disabled={!baseline || resetting}
            className={`rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-40 ${
              confirmReset ? 'bg-rose-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {resetting
              ? 'Resetting…'
              : confirmReset
                ? 'Confirm reset'
                : 'Reset Location'}
          </button>
        </div>
        {confirmReset && !resetting && (
          <p className="mt-2 text-right text-[11.5px] text-slate-400">
            The app will ask for a fresh selfie and GPS at their next check-in.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-50 pb-1.5">
      <dt className="font-bold text-slate-400">{label}</dt>
      <dd className="text-right font-bold text-slate-700">{value}</dd>
    </div>
  )
}
