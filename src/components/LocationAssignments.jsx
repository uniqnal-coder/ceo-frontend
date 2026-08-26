import { useCallback, useEffect, useMemo, useState } from 'react'
import LiveMap from './LiveMap'
import { api, toArray } from '../api/client'
import { toast } from '../utils/toast'

// Sites and temporary assignments. A baseline says where someone normally
// works; an assignment sends a whole role to another site for a date range,
// and becomes the fence their punches are judged against for those days.

const todayISO = () => new Date().toISOString().slice(0, 10)
const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—')

export default function LocationAssignments({ onChange, office }) {
  const [sites, setSites] = useState([])
  const [rows, setRows] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPast, setShowPast] = useState(false)
  const [busy, setBusy] = useState(false)
  const [addingSite, setAddingSite] = useState(false)

  // new assignment
  const [siteId, setSiteId] = useState('')
  const [title, setTitle] = useState('')
  const [scope, setScope] = useState('group')
  const [roleName, setRoleName] = useState('')
  const [startsOn, setStartsOn] = useState(todayISO())
  const [endsOn, setEndsOn] = useState(todayISO())

  // new site — the point comes from clicking the map
  const [siteName, setSiteName] = useState('')
  const [picked, setPicked] = useState(null)
  const [siteRadius, setSiteRadius] = useState(100)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([
        api.get('/api/location/sites'),
        api.get('/api/location/assignments'),
      ])
      setSites(toArray(s))
      setRows(toArray(a))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api
      .get('/api/role-categories?app_role=staff')
      .then((d) => setRoles(toArray(d).filter((r) => r.active !== false)))
      .catch(() => {})
  }, [load])

  const createSite = async () => {
    if (!siteName.trim()) return toast.error('Give the site a name')
    if (!picked) return toast.error('Click the map to place the site')
    setBusy(true)
    try {
      const created = await api.post('/api/location/sites', {
        name: siteName.trim(),
        latitude: picked.lat,
        longitude: picked.lng,
        radius_m: Number(siteRadius) || 100,
      })
      toast.success(`${created.name} added`)
      setSiteName(''); setPicked(null); setSiteRadius(100)
      setAddingSite(false)
      setSiteId(created.id)
      load()
      onChange?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  /** Two taps to remove, matching the pattern used elsewhere. */
  const removeSite = async (site) => {
    if (removing !== site.id) {
      setRemoving(site.id)
      setTimeout(() => setRemoving((v) => (v === site.id ? null : v)), 4000)
      return
    }
    setRemoving(null)
    setBusy(true)
    try {
      const res = await api.del(`/api/location/sites/${site.id}`)
      toast.success(res?.message || 'Site removed')
      if (siteId === site.id) setSiteId('')
      load()
      onChange?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const createAssignment = async () => {
    if (!siteId) return toast.error('Choose a site')
    if (scope === 'group' && !roleName) return toast.error('Choose a staff role')
    if (endsOn < startsOn) return toast.error('The end date cannot be before the start')
    setBusy(true)
    try {
      await api.post('/api/location/assignments', {
        site_id: siteId,
        title: title.trim(),
        scope,
        role_name: scope === 'group' ? roleName : undefined,
        starts_on: startsOn,
        ends_on: endsOn,
      })
      toast.success('Assignment created')
      setTitle('')
      load()
      onChange?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (row) => {
    setBusy(true)
    try {
      await api.del(`/api/location/assignments/${row.id}`)
      toast.success('Assignment cancelled')
      load()
      onChange?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Open the picker on a place the admin recognises rather than mid-ocean.
  const mapCenter = useMemo(() => {
    if (picked) return [picked.lat, picked.lng]
    if (sites.length) return [Number(sites[0].latitude), Number(sites[0].longitude)]
    if (office) return [office.lat, office.lng]
    return undefined
    // Only the first resolution matters — the map keeps its own view after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites, office])

  const today = todayISO()
  const shown = useMemo(
    () => rows.filter((r) => (showPast ? true : !r.cancelled_at && r.ends_on >= today)),
    [rows, showPast, today]
  )
  const activeCount = rows.filter((r) => r.active).length

  const field =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-brand'
  const label = 'mb-1 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-800">
            Sites &amp; assignments
            {activeCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {activeCount} active
              </span>
            )}
          </h3>
          <p className="text-[12px] text-slate-500">
            Send a role to another site for a period. While it runs, their punches are
            measured there instead of their own registered spot.
          </p>
        </div>
        <button
          onClick={() => setShowPast((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-bold text-slate-500 hover:bg-slate-50"
        >
          {showPast ? 'Current only' : `All (${rows.length})`}
        </button>
      </div>

      {/* new assignment */}
      <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className={label}>Site</span>
            <select className={field} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Choose a site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.radius_m} m
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>Who goes</span>
            <select
              className={field}
              value={scope === 'everyone' ? 'everyone' : roleName}
              onChange={(e) => {
                if (e.target.value === 'everyone') { setScope('everyone'); setRoleName('') }
                else { setScope('group'); setRoleName(e.target.value) }
              }}
            >
              <option value="">Choose a role…</option>
              <option value="everyone">Everyone</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>From</span>
            <input type="date" className={field} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div>
            <span className={label}>To</span>
            <input type="date" className={field} value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <span className={label}>Reason (optional)</span>
            <input
              className={field}
              placeholder="e.g. Branch cover week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <button
            onClick={createAssignment}
            disabled={busy}
            className="h-9 rounded-lg bg-brand px-4 text-[13px] font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: '#2563eb' }}
          >
            Assign
          </button>
          <button
            onClick={() => setAddingSite((v) => !v)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
          >
            {addingSite ? 'Cancel' : '+ New site'}
          </button>
        </div>

        {addingSite && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <div className="mb-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <span className={label}>Site name</span>
                <input className={field} placeholder="Training Centre" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
              </div>
              <div>
                <span className={label}>Radius (m)</span>
                <input className={field} type="number" min={10} value={siteRadius} onChange={(e) => setSiteRadius(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button
                  onClick={createSite}
                  disabled={busy || !picked}
                  className="h-9 w-full rounded-lg bg-slate-800 px-3 text-[12.5px] font-bold text-white disabled:opacity-40"
                >
                  Add site
                </button>
              </div>
            </div>

            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-slate-500">
                {picked
                  ? 'Click again to move it.'
                  : 'Click the map to place the site.'}
              </span>
              {picked && (
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11.5px] font-bold text-slate-600">
                  {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
                </span>
              )}
            </div>
            <LiveMap
              site={picked ? { lat: picked.lat, lng: picked.lng, radius: Number(siteRadius) || 100 } : null}
              people={[]}
              center={mapCenter}
              zoom={picked ? 17 : 14}
              onMapClick={(lat, lng) => setPicked({ lat, lng })}
              height={300}
            />
          </div>
        )}

        {/* existing sites */}
        {!!sites.length && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <span className={label}>Saved sites</span>
            <div className="flex flex-wrap gap-1.5">
              {sites.map((st) => (
                <span
                  key={st.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-[12px] font-bold text-slate-600"
                >
                  {st.name}
                  <span className="font-mono text-[10.5px] font-normal text-slate-400">{st.radius_m} m</span>
                  <button
                    onClick={() => removeSite(st)}
                    disabled={busy}
                    title="Remove this site"
                    className={`rounded px-1.5 py-0.5 text-[10.5px] font-extrabold transition disabled:opacity-40 ${
                      removing === st.id
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500'
                    }`}
                  >
                    {removing === st.id ? 'Confirm?' : '\u00d7'}
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading && <p className="py-5 text-center text-[13px] text-slate-400">Loading…</p>}
      {!loading && !shown.length && (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] font-bold text-slate-400">
          {showPast ? 'No assignments yet.' : 'Nobody is assigned elsewhere right now.'}
        </p>
      )}

      <div className="space-y-2">
        {shown.map((r) => {
          const past = r.ends_on < today
          return (
            <div
              key={r.id}
              className={`rounded-xl border px-3.5 py-2.5 ${
                r.active ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100'
              } ${r.cancelled_at ? 'opacity-55' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-bold text-slate-700">
                      {r.location_sites?.name || 'site removed'}
                    </span>
                    {r.active && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        active now
                      </span>
                    )}
                    {r.cancelled_at && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        cancelled
                      </span>
                    )}
                    {past && !r.cancelled_at && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                        finished
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-slate-500">
                    {r.scope === 'everyone' ? 'Everyone' : r.role_name}
                    {r.title ? ` · ${r.title}` : ''} · {day(r.starts_on)} → {day(r.ends_on)}
                  </p>
                </div>
                {!r.cancelled_at && !past && (
                  <button
                    onClick={() => cancel(r)}
                    disabled={busy}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-[12px] font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
