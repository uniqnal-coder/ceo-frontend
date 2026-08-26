import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet + OpenStreetMap. Kept imperative on purpose: the map object owns its
// own lifecycle, and React only feeds it data. Markers are div icons so we can
// colour them by state without shipping image assets.

const STYLE_ID = 'live-map-style'
const MAP_CSS = `
.lm-pin{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;
  font:800 11px/1 ui-sans-serif,system-ui;color:#fff;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,.35)}
.lm-in{background:#16a34a}.lm-out{background:#f59e0b}.lm-stale{background:#94a3b8}.lm-fake{background:#dc2626}
.lm-sel{outline:3px solid #2563eb;outline-offset:2px}
.lm-live::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid currentColor;opacity:.6;
  animation:lm-pulse 1.8s ease-out infinite}
@keyframes lm-pulse{0%{transform:scale(.7);opacity:.7}100%{transform:scale(1.5);opacity:0}}
.lm-dot{width:10px;height:10px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(15,23,42,.4)}
.leaflet-container{font:inherit;background:#eef2f7}
`

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = MAP_CSS
  document.head.appendChild(el)
}

const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

function pinClass(p) {
  if (p.is_mock) return 'lm-fake'
  if (p.stale) return 'lm-stale'
  return p.inside_geofence === false ? 'lm-out' : 'lm-in'
}

export default function LiveMap({
  site,
  people = [],
  trail = [],
  selected = null,
  cursor = null,
  onSelect,
  onMapClick,
  height = 560,
}) {
  const host = useRef(null)
  const map = useRef(null)
  const layers = useRef({})
  const fitted = useRef(false)
  // Kept in a ref so the map is never torn down just to swap the handler.
  const clickHandler = useRef(onMapClick)
  useEffect(() => {
    clickHandler.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    ensureStyle()
    if (map.current || !host.current) return
    const m = L.map(host.current, { zoomControl: true, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m)
    m.setView([36.19, 44.0], 12)
    map.current = m
    layers.current = {
      site: L.layerGroup().addTo(m),
      trail: L.layerGroup().addTo(m),
      cursor: L.layerGroup().addTo(m),
      people: L.layerGroup().addTo(m),
    }
    m.on('click', (e) => clickHandler.current?.(e.latlng.lat, e.latlng.lng))
    // The container is often sized by flex after mount.
    setTimeout(() => m.invalidateSize(), 60)
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // The site anchor and its geofence.
  useEffect(() => {
    const g = layers.current.site
    if (!g) return
    g.clearLayers()
    if (!site) return
    L.circle([site.lat, site.lng], {
      radius: site.radius || 200,
      color: '#2563eb',
      weight: 1.5,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
    }).addTo(g)
    L.marker([site.lat, site.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="lm-dot" style="background:#2563eb"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
      interactive: false,
    }).addTo(g)
  }, [site])

  // One marker per person, coloured by where they are right now.
  useEffect(() => {
    const g = layers.current.people
    if (!g) return
    g.clearLayers()
    const pts = []
    for (const p of people) {
      if (p.latitude == null || p.longitude == null) continue
      pts.push([p.latitude, p.longitude])
      const isSel = selected === p.user_id
      const marker = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="position:relative"><div class="lm-pin ${pinClass(p)}${
            isSel ? ' lm-sel' : ''
          }${p.on_shift && !p.stale ? ' lm-live' : ''}">${initials(p.name)}</div></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        zIndexOffset: isSel ? 1000 : 0,
      })
      marker.bindTooltip(
        `<b>${p.name}</b><br>${p.role || ''}${
          p.distance_m != null ? `<br>${p.distance_m} m from site` : ''
        }`,
        { direction: 'top', offset: [0, -18] }
      )
      if (onSelect) marker.on('click', () => onSelect(p.user_id))
      marker.addTo(g)
      if (p.accuracy_m > 40) {
        L.circle([p.latitude, p.longitude], {
          radius: p.accuracy_m,
          color: '#64748b',
          weight: 1,
          opacity: 0.35,
          fillOpacity: 0.05,
        }).addTo(g)
      }
    }
    if (!fitted.current && (pts.length || site)) {
      const all = site ? [...pts, [site.lat, site.lng]] : pts
      if (all.length) {
        map.current?.fitBounds(L.latLngBounds(all).pad(0.25), { maxZoom: 17 })
        fitted.current = true
      }
    }
  }, [people, selected, site, onSelect])

  // The selected person's path for the chosen day.
  useEffect(() => {
    const g = layers.current.trail
    if (!g) return
    g.clearLayers()
    const pts = trail
      .filter((t) => t.latitude != null)
      .map((t) => [t.latitude, t.longitude])
    if (pts.length < 1) return
    L.polyline(pts, { color: '#1d4ed8', weight: 3, opacity: 0.55 }).addTo(g)
    // Direction is easier to read with each fix marked.
    trail.forEach((t, i) => {
      if (t.latitude == null) return
      L.circleMarker([t.latitude, t.longitude], {
        radius: 3,
        color: t.inside_geofence === false ? '#f59e0b' : '#16a34a',
        weight: 1,
        fillOpacity: 0.9,
      })
        .bindTooltip(
          `${new Date(t.recorded_at).toLocaleTimeString()}${
            t.distance_m != null ? ` · ${t.distance_m} m` : ''
          }`,
          { direction: 'top' }
        )
        .addTo(g)
      if (i === 0) {
        L.marker([t.latitude, t.longitude], {
          icon: L.divIcon({
            className: '',
            html: '<div class="lm-dot" style="background:#16a34a;width:14px;height:14px"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
        })
          .bindTooltip('First fix', { direction: 'top' })
          .addTo(g)
      }
    })
    map.current?.fitBounds(L.latLngBounds(pts).pad(0.3), { maxZoom: 18 })
  }, [trail])

  // The scrubber's position, drawn separately so replaying does not refit
  // the map on every step.
  useEffect(() => {
    const g = layers.current.cursor
    if (!g) return
    g.clearLayers()
    const at = cursor != null ? trail[cursor] : null
    if (at?.latitude == null) return
    L.marker([at.latitude, at.longitude], {
      icon: L.divIcon({
        className: '',
        html: '<div class="lm-pin lm-sel" style="background:#1d4ed8">&#9654;</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      zIndexOffset: 2000,
    }).addTo(g)
    map.current?.panTo([at.latitude, at.longitude], { animate: true })
  }, [trail, cursor])

  return <div ref={host} style={{ height, width: '100%' }} className="rounded-2xl" />
}
