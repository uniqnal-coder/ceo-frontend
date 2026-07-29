import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

const LATE_AFTER = 8 * 60 + 30 // 08:30
const todayISO = () => new Date().toISOString().slice(0, 10)

function fmtTime(iso) {
  return iso
    ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '—'
}

function statusOf(punch) {
  if (!punch?.check_in_time) return 'absent'
  const t = new Date(punch.check_in_time)
  return t.getHours() * 60 + t.getMinutes() > LATE_AFTER ? 'late' : 'present'
}

/**
 * Admin: check-in / check-out / selfie / location for each staff & teacher.
 * - Day board (everyone for a date)
 * - Person history (one user across days)
 */
export default function Attendance() {
  const [params, setParams] = useSearchParams()
  const userId = params.get('user') || ''
  const [date, setDate] = useState(params.get('date') || todayISO())
  const [overview, setOverview] = useState(null)
  const [history, setHistory] = useState(null)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [q, setQ] = useState('')
  const [selfie, setSelfie] = useState(null) // { name, date, url, loading }

  const selected = useMemo(
    () => (overview?.people || []).find((p) => p.id === userId) || null,
    [overview, userId]
  )

  useEffect(() => {
    let live = true
    setError('')
    api
      .get(`/api/checkins/overview?date=${date}`)
      .then((d) => live && setOverview(d))
      .catch((err) => live && setError(err.message))
    return () => {
      live = false
    }
  }, [date])

  useEffect(() => {
    if (!userId) {
      setHistory(null)
      return
    }
    let live = true
    setHistory(null)
    api
      .get(`/api/checkins/user/${userId}?limit=90`)
      .then((d) => live && setHistory(Array.isArray(d) ? d : []))
      .catch((err) => live && setError(err.message))
    return () => {
      live = false
    }
  }, [userId])

  const boardRows = useMemo(() => {
    if (!overview) return []
    const byUser = {}
    for (const c of overview.checkins || []) byUser[c.user_id] = c
    const needle = q.trim().toLowerCase()
    return (overview.people || [])
      .filter((p) => roleFilter === 'all' || p.role === roleFilter)
      .filter((p) => !needle || (p.name || '').toLowerCase().includes(needle))
      .map((p) => {
        const punch = byUser[p.id]
        return { ...p, punch, status: statusOf(punch) }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [overview, roleFilter, q])

  const counts = useMemo(
    () => ({
      present: boardRows.filter((r) => r.status === 'present').length,
      late: boardRows.filter((r) => r.status === 'late').length,
      absent: boardRows.filter((r) => r.status === 'absent').length,
    }),
    [boardRows]
  )

  const openSelfie = async ({ id, name }, day) => {
    setSelfie({ name, date: day, url: null, loading: true })
    try {
      const r = await api.get(`/api/checkins/selfie/${id}?date=${day}`)
      setSelfie({ name, date: day, url: r.url, loading: false })
    } catch {
      setSelfie({ name, date: day, url: null, loading: false })
    }
  }

  const selectUser = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('user', id)
    else next.delete('user')
    next.set('date', date)
    setParams(next)
  }

  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">
            Check-in &amp; Attendance
          </h2>
          <p className="text-[13px] text-slate-500">
            See each person&apos;s check-in, check-out, GPS location, and selfie.
            Late = after 08:30.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => {
              setDate(e.target.value)
              const next = new URLSearchParams(params)
              next.set('date', e.target.value)
              setParams(next)
            }}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </div>
      </div>

      {error && <p className="mb-4 text-center text-[13px] text-red-500">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search people…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                ['all', 'All'],
                ['teacher', 'Teachers'],
                ['staff', 'Staff'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleFilter(key)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    roleFilter === key
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {!overview && !error && (
              <p className="p-4 text-center text-[12.5px] text-slate-400">Loading…</p>
            )}
            {boardRows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectUser(r.id)}
                className={`flex w-full items-center gap-2 border-b border-slate-50 px-3 py-2.5 text-left hover:bg-slate-50 ${
                  userId === r.id ? 'bg-brand/5' : ''
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    r.status === 'present'
                      ? 'bg-emerald-500'
                      : r.status === 'late'
                        ? 'bg-amber-500'
                        : 'bg-slate-300'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-slate-700">
                    {r.name}
                  </span>
                  <span className="text-[10.5px] font-bold uppercase text-slate-400">
                    {r.role}
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {fmtTime(r.punch?.check_in_time)}
                </span>
              </button>
            ))}
            {overview && boardRows.length === 0 && (
              <p className="p-4 text-center text-[12.5px] text-slate-400">No people found.</p>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!userId ? (
            <>
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
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-[13px] font-bold text-slate-700">
                    Everyone on {date}
                  </p>
                  <p className="text-[12px] text-slate-400">
                    Select a person on the left for full history, or use Map / Selfie.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-2.5">Name</th>
                        <th className="px-2 py-2.5">In</th>
                        <th className="px-2 py-2.5">Out</th>
                        <th className="px-2 py-2.5">Location</th>
                        <th className="px-2 py-2.5">Selfie</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boardRows.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50">
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => selectUser(r.id)}
                              className="font-semibold text-brand hover:underline"
                            >
                              {r.name}
                            </button>
                          </td>
                          <td className="px-2 py-2.5 text-emerald-600">
                            {fmtTime(r.punch?.check_in_time)}
                          </td>
                          <td className="px-2 py-2.5 text-slate-500">
                            {fmtTime(r.punch?.check_out_time)}
                          </td>
                          <td className="px-2 py-2.5">
                            {r.punch?.latitude != null ? (
                              <a
                                href={`https://maps.google.com/?q=${r.punch.latitude},${r.punch.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11.5px] font-semibold text-sky-600 hover:bg-sky-100"
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
                                type="button"
                                onClick={() => openSelfie(r, date)}
                                className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11.5px] font-semibold text-violet-600 hover:bg-violet-100"
                              >
                                <i className="fas fa-camera" /> View
                              </button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <StatusPill status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div>
                  <button
                    type="button"
                    onClick={() => selectUser('')}
                    className="mb-1 text-[12px] font-semibold text-slate-400 hover:text-brand"
                  >
                    ← All people
                  </button>
                  <p className="text-[15px] font-extrabold text-slate-800">
                    {selected?.name || 'Staff member'}
                  </p>
                  <p className="text-[12px] capitalize text-slate-400">
                    {selected?.role || '—'} · last 90 days
                  </p>
                </div>
              </div>

              {!history && !error && (
                <p className="py-10 text-center text-[13px] text-slate-400">Loading history…</p>
              )}
              {history && history.length === 0 && (
                <p className="py-10 text-center text-[13px] text-slate-400">
                  No check-ins recorded for this person yet.
                </p>
              )}
              {history && history.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-2 py-2.5">Check-in</th>
                        <th className="px-2 py-2.5">Check-out</th>
                        <th className="px-2 py-2.5">Location</th>
                        <th className="px-2 py-2.5">Selfie</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => {
                        const st = statusOf(h)
                        return (
                          <tr key={h.id || h.date} className="border-b border-slate-50">
                            <td className="px-4 py-2.5 font-semibold text-slate-700">
                              {h.date}
                            </td>
                            <td className="px-2 py-2.5 text-emerald-600">
                              {fmtTime(h.check_in_time)}
                            </td>
                            <td className="px-2 py-2.5 text-slate-500">
                              {fmtTime(h.check_out_time)}
                            </td>
                            <td className="px-2 py-2.5">
                              {h.latitude != null ? (
                                <a
                                  href={`https://maps.google.com/?q=${h.latitude},${h.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11.5px] font-semibold text-sky-600 hover:bg-sky-100"
                                  title={`${h.latitude}, ${h.longitude}`}
                                >
                                  <i className="fas fa-location-dot" /> Map
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5">
                              {h.selfie_verified ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openSelfie(
                                      { id: userId, name: selected?.name || 'Staff' },
                                      h.date
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11.5px] font-semibold text-violet-600 hover:bg-violet-100"
                                >
                                  <i className="fas fa-camera" /> View
                                </button>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <StatusPill status={st} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

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
                {selfie.name} — {selfie.date}
              </p>
              <button
                type="button"
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

function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
        status === 'present'
          ? 'bg-emerald-50 text-emerald-600'
          : status === 'late'
            ? 'bg-amber-50 text-amber-600'
            : 'bg-red-50 text-red-500'
      }`}
    >
      {status === 'present' ? 'Present' : status === 'late' ? 'Late' : 'Absent'}
    </span>
  )
}
