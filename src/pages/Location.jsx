import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LiveMap from '../components/LiveMap'
import LocationChangeRequests from '../components/LocationChangeRequests'
import LocationAssignments from '../components/LocationAssignments'
import { api } from '../api/client'
import { toast } from '../utils/toast'

// Location — where the team is while their shift is open. Positions are only
// recorded between check-in and check-out; nothing is tracked outside that
// window, and the map says so plainly.

const todayISO = () => new Date().toISOString().slice(0, 10)
const REFRESH_MS = 15000

const clock = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'

function ago(seconds) {
  if (seconds == null) return '—'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  return `${Math.round(seconds / 3600)}h ago`
}

const metres = (m) => (m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`)

const minutes = (s) =>
  s == null ? null : s < 60 ? `${s}s` : `${Math.round(s / 60)}m`

function statusOf(p) {
  if (p.no_signal) return { label: 'No signal', cls: 'bg-slate-100 text-slate-500' }
  if (p.is_mock) return { label: 'Mock GPS', cls: 'bg-red-100 text-red-700' }
  if (p.stale) return { label: 'Stale', cls: 'bg-slate-100 text-slate-500' }
  if (p.inside_geofence === false) return { label: 'Outside', cls: 'bg-amber-100 text-amber-700' }
  return { label: 'On site', cls: 'bg-emerald-100 text-emerald-700' }
}

function Kpi({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-800',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-[22px] font-extrabold ${tones[tone]}`}>{value}</div>
    </div>
  )
}

function PunchVerdict({ label, at, distance, outside, late }) {
  if (!at) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[12.5px] font-bold text-slate-400">
        {label} — not recorded
      </div>
    )
  }
  const tone = outside
    ? 'border-amber-200 bg-amber-50'
    : outside === false
      ? 'border-emerald-200 bg-emerald-50'
      : 'border-slate-200 bg-white'
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-extrabold text-slate-700">
          {label} · {clock(at)}
        </span>
        <div className="flex gap-1">
          {outside === true && (
            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
              Out of location
            </span>
          )}
          {outside === false && (
            <span className="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
              Onsite
            </span>
          )}
          {late && (
            <span className="rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
              Late
            </span>
          )}
        </div>
      </div>
      <p className="mt-0.5 text-[11.5px] text-slate-500">
        {distance == null
          ? 'No position recorded with this punch'
          : `${metres(distance)} from their registered location`}
      </p>
    </div>
  )
}

export default function LocationPage() {
  const [date, setDate] = useState(todayISO())
  const [live, setLive] = useState(true)
  const [data, setData] = useState({ people: [], no_signal: [], site: null })
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [radius, setRadius] = useState(200)
  const [savingRadius, setSavingRadius] = useState(false)
  // The live refresh must not overwrite a radius the admin is still typing.
  const radiusEdited = useRef(false)
  const playing = useRef(null)

  const isToday = date === todayISO()

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/location/live?date=${date}`)
      setData(res || { people: [], no_signal: [], site: null })
      if (res?.site?.radius && !radiusEdited.current) setRadius(res.site.radius)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Only today moves; past days are settled history.
  useEffect(() => {
    if (!live || !isToday) return
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [live, isToday, load])

  const openPerson = async (userId) => {
    if (selected === userId) {
      setSelected(null)
      setHistory(null)
      setCursor(null)
      return
    }
    setSelected(userId)
    setCursor(null)
    try {
      setHistory(await api.get(`/api/location/history?user_id=${userId}&date=${date}`))
    } catch (e) {
      toast.error(e.message)
      setHistory(null)
    }
  }

  // Replay the day at ~6 steps a second.
  const togglePlay = () => {
    if (playing.current) {
      clearInterval(playing.current)
      playing.current = null
      setCursor((c) => c)
      return
    }
    const n = history?.trail?.length || 0
    if (!n) return
    setCursor(0)
    playing.current = setInterval(() => {
      setCursor((c) => {
        const next = (c ?? 0) + 1
        if (next >= n) {
          clearInterval(playing.current)
          playing.current = null
          return n - 1
        }
        return next
      })
    }, 160)
  }
  useEffect(() => () => playing.current && clearInterval(playing.current), [])

  const saveGeofence = async (lat, lng) => {
    try {
      await api.put('/api/checkins/office-location', { lat, lng, radius: Number(radius) || 200 })
      toast.success('Geofence moved')
      setPlacing(false)
      radiusEdited.current = false
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  /** Resize the geofence where it stands, without having to re-place it. */
  const saveRadius = async () => {
    const next = Number(radius)
    if (!Number.isFinite(next) || next < 10) return toast.error('Radius must be at least 10 m')
    setSavingRadius(true)
    try {
      await api.put('/api/checkins/office-location', { radius: next })
      toast.success(`Geofence radius set to ${next} m`)
      radiusEdited.current = false
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingRadius(false)
    }
  }

  const everyone = useMemo(
    () => [...(data.people || []), ...(data.no_signal || [])],
    [data]
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return everyone.filter((p) => {
      if (q && !`${p.name} ${p.role || ''}`.toLowerCase().includes(q)) return false
      if (filter === 'inside') return p.inside_geofence === true && !p.stale
      if (filter === 'outside') return p.inside_geofence === false
      if (filter === 'issues') return p.no_signal || p.stale || p.is_mock
      return true
    })
  }, [everyone, query, filter])

  const stats = useMemo(() => {
    const people = data.people || []
    return {
      shift: people.filter((p) => p.on_shift).length + (data.no_signal?.length || 0),
      inside: people.filter((p) => p.inside_geofence === true && !p.stale).length,
      outside: people.filter((p) => p.inside_geofence === false).length,
      quiet: (data.no_signal?.length || 0) + people.filter((p) => p.stale).length,
      mock: people.filter((p) => p.is_mock).length,
    }
  }, [data])

  const trail = history?.trail || []
  const radiusChanged =
    data.site != null && Number(radius) > 0 && Number(radius) !== Number(data.site.radius)

  return (
    <div className="mx-auto max-w-[1400px] p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">📍 Location</h2>
          <p className="text-[13px] text-slate-500">
            Live positions while a shift is open — recording starts at check-in and stops at check-out.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => {
              setDate(e.target.value)
              setSelected(null)
              setHistory(null)
            }}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none focus:border-brand"
          />
          <button
            onClick={() => setLive((v) => !v)}
            disabled={!isToday}
            className={`h-10 rounded-xl px-4 text-[13px] font-bold transition ${
              live && isToday
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            } disabled:opacity-50`}
          >
            {live && isToday ? '● Live' : 'Paused'}
          </button>
          <button
            onClick={load}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="On shift" value={stats.shift} />
        <Kpi label="On site" value={stats.inside} tone="green" />
        <Kpi label="Outside fence" value={stats.outside} tone="amber" />
        <Kpi label="No signal" value={stats.quiet} />
        <Kpi label="Mock GPS" value={stats.mock} tone={stats.mock ? 'red' : 'slate'} />
      </div>

      <div className="mb-4 space-y-4">
        <LocationAssignments onChange={load} office={data.site} />
        <LocationChangeRequests onChange={load} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* People */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or role…"
            className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none focus:border-brand"
          />
          <div className="mb-2 flex gap-1.5">
            {[
              ['all', 'All'],
              ['inside', 'On site'],
              ['outside', 'Outside'],
              ['issues', 'Issues'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition ${
                  filter === k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
            {loading && <p className="py-8 text-center text-[13px] text-slate-400">Loading…</p>}
            {!loading && !shown.length && (
              <p className="py-8 text-center text-[13px] font-bold text-slate-400">
                Nobody reported a position on this day.
              </p>
            )}
            {shown.map((p) => {
              const s = statusOf(p)
              return (
                <button
                  key={p.user_id}
                  onClick={() => !p.no_signal && openPerson(p.user_id)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selected === p.user_id
                      ? 'border-brand bg-blue-50/60'
                      : 'border-slate-100 hover:bg-slate-50'
                  } ${p.no_signal ? 'cursor-default opacity-70' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-bold text-slate-700">{p.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{p.role || '—'}</span>
                    <span>
                      {p.no_signal ? 'never reported' : `${metres(p.distance_m)} · ${ago(p.age_seconds)}`}
                    </span>
                  </div>
                  {(p.punch_out_of_location || p.punch_late || p.location_off_seconds) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.punch_out_of_location && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                          Out of location
                        </span>
                      )}
                      {p.punch_late && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                          Late
                        </span>
                      )}
                      {p.location_off_seconds ? (
                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          GPS off {minutes(p.location_off_seconds)}
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Map + detail */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> On site
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Outside
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" /> Stale
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" /> Geofence
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400">Radius</span>
                  <input
                    type="number"
                    value={radius}
                    min={10}
                    onChange={(e) => {
                      radiusEdited.current = true
                      setRadius(e.target.value)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && radiusChanged && saveRadius()}
                    className="h-8 w-20 rounded-lg border border-slate-200 px-2 text-[12px] font-bold text-slate-600 outline-none focus:border-brand"
                    title="Geofence radius in metres"
                  />
                </label>
                {radiusChanged && (
                  <button
                    onClick={saveRadius}
                    disabled={savingRadius}
                    className="h-8 rounded-lg bg-emerald-600 px-3 text-[12px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {savingRadius ? 'Saving…' : 'Save'}
                  </button>
                )}
                <button
                  onClick={() => setPlacing((v) => !v)}
                  className={`h-8 rounded-lg px-3 text-[12px] font-bold ${
                    placing ? 'bg-brand text-white' : 'border border-slate-200 text-slate-600'
                  }`}
                >
                  {placing ? 'Click the map…' : 'Move geofence'}
                </button>
              </div>
            </div>
            <LiveMap
              // Draw the radius being typed, so its size can be judged before saving.
              site={
                data.site
                  ? { ...data.site, radius: Number(radius) || data.site.radius }
                  : null
              }
              people={data.people || []}
              trail={trail}
              selected={selected}
              cursor={cursor}
              onSelect={openPerson}
              onMapClick={placing ? saveGeofence : undefined}
            />
          </div>

          {history && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-800">
                    {history.user?.name} — {history.date}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    Shift {clock(history.punch?.check_in_time)} → {clock(history.punch?.check_out_time)}
                  </p>
                </div>
                <button
                  onClick={togglePlay}
                  disabled={!trail.length}
                  className="h-9 rounded-xl bg-slate-800 px-4 text-[12.5px] font-bold text-white disabled:opacity-40"
                >
                  {playing.current ? 'Stop' : '▶ Replay day'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <Kpi label="Fixes" value={history.summary.pings} />
                <Kpi label="Distance" value={metres(history.summary.distance_m)} />
                <Kpi label="On site" value={`${history.summary.inside_minutes}m`} tone="green" />
                <Kpi label="Off site" value={`${history.summary.outside_minutes}m`} tone="amber" />
                <Kpi
                  label="Breaches"
                  value={history.summary.breaches}
                  tone={history.summary.breaches ? 'amber' : 'slate'}
                />
                <Kpi label="Farthest" value={metres(history.summary.farthest_m)} />
              </div>

              {trail.length > 1 && (
                <div className="mt-4">
                  <input
                    type="range"
                    min={0}
                    max={trail.length - 1}
                    value={cursor ?? trail.length - 1}
                    onChange={(e) => setCursor(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>{clock(trail[0]?.recorded_at)}</span>
                    <span className="text-slate-700">
                      {clock(trail[cursor ?? trail.length - 1]?.recorded_at)} ·{' '}
                      {metres(trail[cursor ?? trail.length - 1]?.distance_m)} from site
                    </span>
                    <span>{clock(trail[trail.length - 1]?.recorded_at)}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <PunchVerdict
                  label="Check-in"
                  at={history.punch?.check_in_time}
                  distance={history.punch?.baseline_distance_m}
                  outside={history.punch?.out_of_location}
                  late={history.punch?.is_late}
                />
                <PunchVerdict
                  label="Check-out"
                  at={history.punch?.check_out_time}
                  distance={history.punch?.checkout_distance_m}
                  outside={history.punch?.checkout_out_of_location}
                />
              </div>

              {!!history.outages?.length && (
                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5">
                  <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Location services switched off
                  </h4>
                  <ul className="space-y-0.5">
                    {history.outages.map((o, i) => (
                      <li key={i} className="text-[12.5px] text-slate-600">
                        <span className="font-bold">{clock(o.started_at)}</span> →{' '}
                        <span className="font-bold">{clock(o.ended_at)}</span>{' '}
                        <span className="text-slate-400">
                          ({minutes(o.seconds) || 'still off'})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {history.summary.mock_pings > 0 && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] font-bold text-red-700">
                  ⚠ {history.summary.mock_pings} position(s) came from a mock-location app.
                </p>
              )}

              <div className="mt-4">
                <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Geofence events
                </h4>
                {!history.events.length ? (
                  <p className="text-[12.5px] text-slate-400">Stayed inside the fence all day.</p>
                ) : (
                  <ul className="space-y-1">
                    {history.events.map((e, i) => (
                      <li key={i} className="flex items-center gap-2 text-[12.5px]">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            e.type === 'left'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {e.type === 'left' ? 'Left site' : 'Back on site'}
                        </span>
                        <span className="font-bold text-slate-600">{clock(e.at)}</span>
                        <span className="text-slate-400">{metres(e.distance_m)} away</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
