import { useEffect, useMemo, useState } from 'react'
import { toast } from '../utils/toast'
import { api, toArray } from '../api/client'

const AUDIENCES = [
  { key: 'all', label: 'Everyone', icon: 'fa-users' },
  { key: 'teachers', label: 'Teachers', icon: 'fa-person-chalkboard' },
  { key: 'staff', label: 'Staff', icon: 'fa-user-tie' },
]

const TYPES = [
  { key: 'general', label: 'General', color: '#1e5ef7' },
  { key: 'alert', label: 'Important', color: '#f97316' },
  { key: 'attendance', label: 'Attendance', color: '#18a957' },
  { key: 'task', label: 'Lessons / Tasks', color: '#7c5cdf' },
]

export default function Announcements() {
  const [audience, setAudience] = useState('all')
  const [type, setType] = useState('general')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null) // File
  const [preview, setPreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(null)
  // History is filter-first: nothing listed until a search/filter is used.
  const [histQ, setHistQ] = useState('')
  const [histType, setHistType] = useState('')

  const loadSent = async () => {
    try {
      setSent(toArray(await api.get('/api/notifications/sent')))
    } catch {
      setSent([])
    }
  }

  useEffect(() => {
    loadSent()
  }, [])

  // Group identical broadcasts (same title+message sent within a minute).
  const grouped = useMemo(() => {
    if (!sent) return null
    const groups = []
    for (const n of sent) {
      const last = groups[groups.length - 1]
      if (
        last &&
        last.title === n.title &&
        last.message === n.message &&
        Math.abs(new Date(last.created_at) - new Date(n.created_at)) < 60000
      ) {
        last.count += 1
      } else {
        groups.push({ ...n, count: 1 })
      }
    }
    return groups
  }, [sent])

  const histActive = !!(histQ.trim() || histType)
  const shownHistory = useMemo(() => {
    if (!grouped || !histActive) return []
    const q = histQ.trim().toLowerCase()
    return grouped
      .filter((g) => {
        if (histType && histType !== 'all' && g.type !== histType) return false
        if (q && !`${g.title} ${g.message}`.toLowerCase().includes(q)) return false
        return true
      })
      .slice(0, 30)
  }, [grouped, histQ, histType, histActive])

  const pickImage = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Only images can be attached')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB')
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }
  const clearImage = () => {
    if (preview) URL.revokeObjectURL(preview)
    setImage(null)
    setPreview(null)
  }

  const send = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    setSending(true)
    try {
      let res
      if (image) {
        const fd = new FormData()
        fd.append('audience', audience)
        fd.append('type', type)
        fd.append('title', title.trim())
        fd.append('message', message.trim())
        fd.append('image', image)
        res = await api.post('/api/notifications/broadcast', fd)
      } else {
        res = await api.post('/api/notifications/broadcast', {
          audience,
          type,
          title: title.trim(),
          message: message.trim(),
        })
      }
      toast.success(`Announcement sent to ${res.sent} ${res.sent === 1 ? 'person' : 'people'}`)
      if (res.imageDropped) {
        toast.error('Image was not saved — the image_url column is missing (run the migration)')
      }
      setTitle('')
      setMessage('')
      clearImage()
      loadSent()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5">
        <h2 className="text-[20px] font-extrabold text-slate-800">📣 Announcements</h2>
        <p className="text-[13px] text-slate-500">
          Send a notification to the mobile apps — it appears instantly on teachers' and staff phones.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Composer */}
        <form onSubmit={send} className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Send to</span>
              <span className="relative block">
                <i className={`fas ${AUDIENCES.find((a) => a.key === audience)?.icon || 'fa-users'} pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[13px] text-brand`} />
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-[13px] font-bold text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a.key} value={a.key}>{a.label}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-slate-400" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</span>
              <span className="relative block">
                <span
                  className="pointer-events-none absolute top-1/2 left-3.5 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: (TYPES.find((t) => t.key === type) || TYPES[0]).color }}
                />
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-[13px] font-bold text-slate-700 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
                  {TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <i className="fas fa-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] text-slate-400" />
              </span>
            </label>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. School Holiday"
            required
            maxLength={120}
            className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] outline-none focus:border-brand"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message — e.g. School will be closed on 25 May."
            required
            rows={4}
            maxLength={600}
            className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] outline-none focus:border-brand"
          />
          <div className="mb-4">
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="attachment" className="max-h-40 rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={clearImage}
                  title="Remove image"
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white shadow hover:bg-rose-600"
                >
                  <i className="fas fa-xmark" />
                </button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-[12.5px] font-bold text-slate-500 transition hover:border-brand hover:text-brand">
                <i className="fas fa-image" />
                Attach image (optional)
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = '' }}
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {sending ? 'Sending…' : `📤 Send to ${AUDIENCES.find((a) => a.key === audience).label}`}
          </button>
        </form>

        {/* History */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[13px] font-bold text-slate-700">Sent announcements</p>
          <div className="mb-3 flex gap-2">
            <span className="relative min-w-0 flex-1">
              <i className="fas fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[11px] text-slate-300" />
              <input
                value={histQ}
                onChange={(e) => setHistQ(e.target.value)}
                placeholder="Search title or message…"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-[12.5px] outline-none focus:border-brand"
              />
            </span>
            <select
              value={histType}
              onChange={(e) => setHistType(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] font-bold text-slate-600 outline-none focus:border-brand"
            >
              <option value="">Category…</option>
              <option value="all">All</option>
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            {histActive && (
              <button
                type="button"
                onClick={() => { setHistQ(''); setHistType('') }}
                title="Clear"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-500 hover:bg-slate-50"
              >
                <i className="fas fa-rotate-left" />
              </button>
            )}
          </div>
          {grouped === null && <p className="py-6 text-center text-[12.5px] text-slate-400">Loading…</p>}
          {grouped?.length === 0 && (
            <p className="py-6 text-center text-[12.5px] text-slate-400">Nothing sent yet.</p>
          )}
          {grouped?.length > 0 && !histActive && (
            <div className="py-8 text-center">
              <span className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[16px] text-brand">
                <i className="fas fa-magnifying-glass" />
              </span>
              <p className="text-[12.5px] font-bold text-slate-600">Search or pick a category to see history</p>
              <p className="mt-0.5 text-[11.5px] text-slate-400">{grouped.length} announcement{grouped.length === 1 ? '' : 's'} sent so far</p>
            </div>
          )}
          {histActive && shownHistory.length === 0 && grouped?.length > 0 && (
            <p className="py-6 text-center text-[12.5px] text-slate-400">No announcements match.</p>
          )}
          {histActive && shownHistory.length > 0 && (
            <p className="mb-2 text-[10.5px] font-bold text-slate-400">{shownHistory.length} of {grouped.length}</p>
          )}
          <div className="space-y-3">
            {shownHistory.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[12.5px] font-bold text-slate-700">{g.title}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{
                      backgroundColor: (TYPES.find((t) => t.key === g.type) || TYPES[0]).color,
                    }}
                  >
                    {g.count} sent
                  </span>
                </div>
                {g.image_url && (
                  <img src={g.image_url} alt="" className="mt-1 mb-1 max-h-24 rounded-lg border border-slate-200 object-cover" />
                )}
                <p className="line-clamp-2 text-[11.5px] text-slate-500">{g.message}</p>
                <p className="mt-1 text-[10.5px] text-slate-400">
                  {new Date(g.created_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
