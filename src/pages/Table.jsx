import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { toast } from '../utils/toast'

// Table (Jadol) — upload the timetable image teachers and staff see in the
// StudyNal app's Profile → Data → Table section.
export default function Table() {
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/timetable')
      setCurrent(res?.url ? res : null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pickImage = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Only images can be uploaded')
    if (f.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const clearPick = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.put('/api/timetable', fd)
      toast.success('Timetable image published — it is now visible in the app')
      clearPick()
      setCurrent(res?.url ? res : null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Remove the timetable image? Teachers will no longer see a table in the app.')) return
    setRemoving(true)
    try {
      await api.del('/api/timetable')
      toast.success('Timetable image removed')
      setCurrent(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5">
        <h2 className="text-[20px] font-extrabold text-slate-800">🗓️ Table</h2>
        <p className="text-[13px] text-slate-500">
          Upload the schedule table (jadol) image — teachers and staff see it in the StudyNal app.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Uploader */}
        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-[14px] font-extrabold text-slate-700">
            {current ? 'Replace the table image' : 'Upload the table image'}
          </h3>

          {preview ? (
            <div className="relative mb-4 inline-block">
              <img src={preview} alt="new timetable" className="max-h-72 rounded-xl border border-slate-200" />
              <button
                type="button"
                onClick={clearPick}
                title="Remove selection"
                className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white shadow hover:bg-rose-600"
              >
                <i className="fas fa-xmark" />
              </button>
            </div>
          ) : (
            <label className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-[12.5px] font-bold text-slate-500 transition hover:border-brand hover:text-brand">
              <i className="fas fa-image text-[22px]" />
              Choose the timetable image (JPEG, PNG, WEBP — max 5 MB)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = '' }}
              />
            </label>
          )}

          <button
            type="submit"
            disabled={!file || saving}
            className="w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {saving ? 'Publishing…' : '📤 Publish to the app'}
          </button>
        </form>

        {/* Current image */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-extrabold text-slate-700">Currently in the app</h3>
            {current && (
              <button
                type="button"
                onClick={remove}
                disabled={removing}
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-rose-500 transition hover:bg-rose-50 disabled:opacity-60"
              >
                <i className="fas fa-trash-can mr-1.5" />
                {removing ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>

          {loading ? (
            <p className="py-10 text-center text-[13px] text-slate-400">Loading…</p>
          ) : current ? (
            <div>
              <img src={current.url} alt="current timetable" className="w-full rounded-xl border border-slate-200" />
              {current.updated_at && (
                <p className="mt-2 text-[11.5px] text-slate-400">
                  Updated {new Date(current.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <p className="py-10 text-center text-[13px] text-slate-400">
              No table image yet — upload one to show it in the app.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
