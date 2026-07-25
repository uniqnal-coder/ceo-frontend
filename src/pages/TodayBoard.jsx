import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const LATE_AFTER = 8 * 60 + 30 // 08:30

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function TodayBoard() {
  const [date, setDate] = useState(todayISO())
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selfie, setSelfie] = useState(null) // {name, url|null, loading}

  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    api
      .get(`/api/checkins/overview?date=${date}`)
      .then((d) => live && setData(d))
      .catch((err) => live && setError(err.message))
    return () => {
      live = false
    }
  }, [date])

  const rows = useMemo(() => {
    if (!data) return []
    const byUser = {}
    for (const c of data.checkins || []) byUser[c.user_id] = c

    return (data.people || [])
      .filter((p) => roleFilter === 'all' || p.role === roleFilter)
      .map((p) => {
        const punch = byUser[p.id]
        let status = 'absent'
        if (punch?.check_in_time) {
          const t = new Date(punch.check_in_time)
          status = t.getHours() * 60 + t.getMinutes() > LATE_AFTER ? 'late' : 'present'
        }
        return { ...p, punch, status }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data, roleFilter])

  const counts = useMemo(
    () => ({
      present: rows.filter((r) => r.status === 'present').length,
      late: rows.filter((r) => r.status === 'late').length,
      absent: rows.filter((r) => r.status === 'absent').length,
    }),
    [rows]
  )

  const openSelfie = async (row) => {
    setSelfie({ name: row.name, url: null, loading: true })
    try {
      const r = await api.get(`/api/checkins/selfie/${row.id}?date=${date}`)
      setSelfie({ name: row.name, url: r.url, loading: false })
    } catch {
      setSelfie({ name: row.name, url: null, loading: false })
    }
  }

  const fmt = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">📍 Today's Board</h2>
          <p className="text-[13px] text-slate-500">
            Live check-in status for everyone with an app login. Late = after 08:30.
          </p>
        </div>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </div>

      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          ['Present', counts.present, 'bg-emerald-50 text-emerald-600'],
          ['Late', counts.late, 'bg-amber-50 text-amber-600'],
          ['Absent', counts.absent, 'bg-red-50 text-red-500'],
        ].map(([label, n, cls]) => (
          <div key={label} className={`rounded-2xl px-4 py-3 text-center ${cls}`}>
            <p className="text-[11.5px] font-bold">{label}</p>
            <p className="text-[24px] font-extrabold leading-tight">{n}</p>
          </div>
        ))}
      </div>

      {/* Role filter */}
      <div className="mb-4 flex gap-2">
        {[
          ['all', 'Everyone'],
          ['teacher', 'Teachers'],
          ['staff', 'Staff'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRoleFilter(key)}
            className={`rounded-full border px-4 py-1.5 text-[12.5px] font-semibold transition ${
              roleFilter === key
                ? 'border-brand bg-brand text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="py-8 text-center text-[13px] text-red-500">{error}</p>}
      {!data && !error && <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>}
      {data && rows.length === 0 && (
        <p className="py-8 text-center text-[13px] text-slate-400">
          No one has an app login yet — create teachers or staff with emails first.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-2 py-2.5">Role</th>
                <th className="px-2 py-2.5">Check-in</th>
                <th className="px-2 py-2.5">Check-out</th>
                <th className="px-2 py-2.5">Location</th>
                <th className="px-2 py-2.5">Selfie</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{r.name}</td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase ${
                        r.role === 'teacher'
                          ? 'bg-violet-50 text-violet-600'
                          : 'bg-sky-50 text-sky-600'
                      }`}
                    >
                      {r.role}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-emerald-600">{fmt(r.punch?.check_in_time)}</td>
                  <td className="px-2 py-2.5 text-slate-500">{fmt(r.punch?.check_out_time)}</td>
                  <td className="px-2 py-2.5">
                    {r.punch?.latitude != null ? (
                      <a
                        href={`https://maps.google.com/?q=${r.punch.latitude},${r.punch.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11.5px] font-semibold text-sky-600 hover:bg-sky-100"
                        title={`${r.punch.latitude}, ${r.punch.longitude}`}
                      >
                        <i className="fas fa-location-dot" /> Map
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    {r.punch?.selfie_verified ? (
                      <button
                        onClick={() => openSelfie(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11.5px] font-semibold text-violet-600 hover:bg-violet-100"
                      >
                        <i className="fas fa-user-check" /> View
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        r.status === 'present'
                          ? 'bg-emerald-50 text-emerald-600'
                          : r.status === 'late'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {r.status === 'present' ? '✓ Present' : r.status === 'late' ? '⏰ Late' : '✗ Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selfie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setSelfie(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[14px] font-bold text-slate-800">
                🤳 {selfie.name} — {date}
              </p>
              <button
                onClick={() => setSelfie(null)}
                className="rounded-lg px-2 py-0.5 text-[18px] leading-none text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>
            {selfie.loading ? (
              <p className="py-10 text-center text-[13px] text-slate-400">Loading…</p>
            ) : selfie.url ? (
              <img
                src={selfie.url}
                alt="Check-in selfie"
                className="w-full rounded-xl border border-slate-200"
              />
            ) : (
              <p className="py-10 text-center text-[13px] text-slate-400">
                No selfie stored for this day.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
