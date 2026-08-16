// Attendance — admin view of daily punches: live stats, office location
// (anchors on-site/off-site flags), and a filterable log with selfie
// verification thumbnails.

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '../utils/toast'
import { api } from '../api/client'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'

const ROLE_BADGE = {
  teacher: 'bg-sky-100 text-sky-700',
  staff: 'bg-emerald-100 text-emerald-700',
}

export default function Attendance() {
  const [date, setDate] = useState(todayISO())
  const [overview, setOverview] = useState(null)
  const [office, setOffice] = useState(undefined) // undefined = loading
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('') // '', in, out
  const [siteFilter, setSiteFilter] = useState('') // '', ok, far

  const [selfies, setSelfies] = useState(new Map()) // user_id -> url|null
  const [lightbox, setLightbox] = useState(null) // {url, name, time}

  const load = async () => {
    setLoading(true)
    try {
      const [ov, loc] = await Promise.all([
        api.get(`/api/checkins/overview?date=${date}`),
        api.get('/api/checkins/office-location').catch(() => null),
      ])
      setOverview(ov)
      setOffice(loc)
    } catch (e) {
      toast.error(e.message || 'Could not load attendance')
      setOverview({ checkins: [], people: [] })
      setOffice(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [date]) // eslint-disable-line react-hooks/exhaustive-deps

  // Selfie thumbnails (signed URLs) for verified punches on this day.
  useEffect(() => {
    let live = true
    const withSelfie = (overview?.checkins || []).filter((c) => c.selfie_verified)
    ;(async () => {
      for (const c of withSelfie) {
        if (selfies.has(`${c.user_id}|${date}`)) continue
        try {
          const r = await api.get(`/api/checkins/selfie/${c.user_id}?date=${date}`)
          if (!live) return
          setSelfies((prev) => new Map(prev).set(`${c.user_id}|${date}`, r?.url || null))
        } catch {
          if (!live) return
          setSelfies((prev) => new Map(prev).set(`${c.user_id}|${date}`, null))
        }
      }
    })()
    return () => { live = false }
  }, [overview, date]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkins = overview?.checkins || []
  const stats = useMemo(() => {
    const onSite = checkins.filter((c) => c.check_in_time && !c.check_out_time).length
    const flagged = checkins.filter((c) => c.within_range === false).length
    const verified = checkins.filter((c) => c.selfie_verified).length
    return {
      total: checkins.length,
      onSite,
      flagged,
      verified,
      people: overview?.people?.length ?? 0,
    }
  }, [checkins, overview])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return checkins
      .filter((c) => {
        const name = c.users?.name || ''
        if (q && !name.toLowerCase().includes(q)) return false
        if (roleFilter && c.users?.role !== roleFilter) return false
        if (typeFilter === 'in' && c.check_out_time) return false
        if (typeFilter === 'out' && !c.check_out_time) return false
        if (siteFilter === 'ok' && c.within_range !== true) return false
        if (siteFilter === 'far' && c.within_range !== false) return false
        return true
      })
      .sort((a, b) => String(b.check_in_time || '').localeCompare(String(a.check_in_time || '')))
  }, [checkins, search, roleFilter, typeFilter, siteFilter])

  // People with no punch that day (absent list under the table).
  const absent = useMemo(() => {
    const punched = new Set(checkins.map((c) => c.user_id))
    return (overview?.people || []).filter((p) => !punched.has(p.id))
  }, [checkins, overview])

  return (
    <div className="mx-auto max-w-6xl p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">
            <i className="fas fa-user-check mr-2 text-brand" />
            Attendance
          </h2>
          <p className="text-[13px] text-slate-500">
            Daily punches with GPS and selfie verification. On-site = within the office radius.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={load}
            className="rounded-xl bg-brand px-4 py-2 text-[12.5px] font-extrabold text-white shadow-sm hover:opacity-90"
          >
            <i className="fas fa-rotate mr-1.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Check-ins', stats.total, 'text-slate-800', 'bg-slate-50'],
          ['Currently on site', stats.onSite, 'text-emerald-600', 'bg-emerald-50'],
          ['Off-site flags', stats.flagged, 'text-rose-600', 'bg-rose-50'],
          ['Selfie verified', stats.verified, 'text-[#2563eb]', 'bg-[#eff6ff]'],
          ['Expected staff', stats.people, 'text-slate-600', 'bg-slate-50'],
        ].map(([label, value, tone, soft]) => (
          <div key={label} className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${soft}`}>
            <p className={`text-[22px] font-extrabold leading-none ${tone}`}>{value}</p>
            <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <OfficeLocationCard office={office} onChanged={load} />

      {/* Log */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Attendance log</p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <i className="fas fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-slate-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-brand"
            />
          </div>
          {[
            [roleFilter, setRoleFilter, [['', 'All roles'], ['teacher', 'Teachers'], ['staff', 'Staff']]],
            [typeFilter, setTypeFilter, [['', 'In & out'], ['in', 'Still in'], ['out', 'Checked out']]],
            [siteFilter, setSiteFilter, [['', 'All locations'], ['ok', 'On site'], ['far', 'Off site']]],
          ].map(([value, setter, options], i) => (
            <select
              key={i}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-semibold text-slate-600 outline-none focus:border-brand"
            >
              {options.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          ))}
        </div>

        {loading ? (
          <p className="py-10 text-center text-[13px] text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-slate-400">No check-ins match for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10.5px] uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2">Selfie</th>
                  <th className="px-2 py-2">Employee</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Location</th>
                  <th className="px-2 py-2">In</th>
                  <th className="px-2 py-2">Out</th>
                  <th className="px-2 py-2">Distance</th>
                  <th className="px-2 py-2">Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const name = c.users?.name || '—'
                  const url = selfies.get(`${c.user_id}|${date}`)
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-2 py-2">
                        {c.selfie_verified && url ? (
                          <img
                            src={url}
                            alt={name}
                            onClick={() => setLightbox({ url, name, time: fmtTime(c.check_in_time) })}
                            className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400">
                            {c.selfie_verified ? '…' : '—'}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span className="font-extrabold text-slate-700">{name}</span>
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${ROLE_BADGE[c.users?.role] || 'bg-slate-100 text-slate-500'}`}>
                          {c.users?.role || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {c.check_out_time ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-violet-600">Checked out</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-600">On shift</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        {c.within_range === true && (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-600">On site</span>
                        )}
                        {c.within_range === false && (
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-rose-600">Off site</span>
                        )}
                        {c.within_range == null && <span className="text-[11px] text-slate-300">—</span>}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11.5px] text-slate-600">{fmtTime(c.check_in_time)}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11.5px] text-slate-600">{fmtTime(c.check_out_time)}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11.5px] text-slate-500">
                        {c.distance_m != null ? `${c.distance_m.toLocaleString()} m` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-[11px] text-slate-400">
                        {c.latitude != null ? `${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && absent.length > 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
              No punch this day ({absent.length})
            </p>
            <p className="text-[12.5px] text-slate-500">{absent.map((p) => p.name).join(' · ')}</p>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="text-center">
            <img src={lightbox.url} alt={lightbox.name} className="max-h-[75vh] max-w-[90vw] rounded-2xl" />
            <p className="mt-3 font-mono text-[12.5px] text-white">{lightbox.name} — {lightbox.time}</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- Office location: anchors the on-site / off-site flags ---- */
function OfficeLocationCard({ office, onChanged }) {
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [radius, setRadius] = useState('200')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const clearTimer = useRef(null)

  useEffect(() => {
    if (office) {
      setLat(String(office.lat))
      setLng(String(office.lng))
      setRadius(String(office.radius))
    }
  }, [office])

  const save = async () => {
    const la = Number(lat)
    const ln = Number(lng)
    const r = Number(radius)
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return toast.error('Enter valid coordinates')
    if (!Number.isFinite(r) || r < 10) return toast.error('Radius must be at least 10 m')
    setSaving(true)
    try {
      await api.put('/api/checkins/office-location', { lat: la, lng: ln, radius: r })
      toast.success('Office location saved')
      onChanged()
    } catch (e) {
      toast.error(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('This browser has no location access')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
        toast.success('Coordinates filled from this device — press Save to apply')
      },
      () => {
        setLocating(false)
        toast.error('Could not read this device’s location')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const clear = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      clearTimeout(clearTimer.current)
      clearTimer.current = setTimeout(() => setConfirmClear(false), 4000)
      return
    }
    setConfirmClear(false)
    try {
      await api.del('/api/checkins/office-location')
      toast.success('Office location cleared')
      onChanged()
    } catch (e) {
      toast.error(e.message || 'Clear failed')
    }
  }

  const field = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-[12.5px] outline-none focus:border-brand'
  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Office location</p>
        {office === undefined ? null : office ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-600">
            <i className="fas fa-check mr-1" />
            Set · {new Date(office.savedAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-600">
            Not set — punches can't be flagged on/off site
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto_auto_auto]">
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold text-slate-400">Latitude</span>
          <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="36.19110" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold text-slate-400">Longitude</span>
          <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="44.00900" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-bold text-slate-400">Radius (m)</span>
          <input type="number" min="10" step="10" value={radius} onChange={(e) => setRadius(e.target.value)} className={field} />
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="self-end rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <i className="fas fa-location-crosshairs mr-1.5" />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="self-end rounded-xl bg-brand px-5 py-2.5 text-[12.5px] font-extrabold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={!office}
          className={`self-end rounded-xl px-4 py-2.5 text-[12.5px] font-extrabold transition disabled:opacity-30 ${
            confirmClear ? 'bg-rose-600 text-white' : 'border border-rose-200 bg-white text-rose-500 hover:bg-rose-50'
          }`}
        >
          {confirmClear ? 'Confirm?' : 'Clear'}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Check-ins farther than the radius from this point are flagged <span className="font-bold text-rose-500">off site</span>.
        Tip: press "Use my location" while standing at the school, then Save.
      </p>
    </div>
  )
}
