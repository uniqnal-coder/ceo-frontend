import { useEffect, useState } from 'react'
import { api, toArray } from '../api/client'
import { toast } from '../utils/toast'

// Table (Jadol) — every teacher has their own schedule image: select the
// teacher first, then upload. The teacher sees it in the StudyNal app.
export default function Table() {
  const [teachers, setTeachers] = useState([])
  const [teacher, setTeacher] = useState('')
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const loadTeachers = async () => {
    try {
      setTeachers(toArray(await api.get('/api/timetable/teachers')))
    } catch (e) {
      toast.error(e.message)
    }
  }
  useEffect(() => { loadTeachers() }, [])

  const loadCurrent = async (id) => {
    if (!id) return setCurrent(null)
    setLoading(true)
    try {
      const res = await api.get(`/api/timetable/teacher/${id}`)
      setCurrent(res?.url ? res : null)
    } catch (e) {
      toast.error(e.message)
      setCurrent(null)
    } finally {
      setLoading(false)
    }
  }

  const pick = (id) => {
    setTeacher(id)
    clearPick()
    loadCurrent(id)
  }

  const pickImage = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Only images can be uploaded')
    if (f.size > 5 * 1024 * 1024) return toast.error('Image must be under 5 MB')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const clearPick = () => {
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p)
      return null
    })
    setFile(null)
  }

  const save = async () => {
    if (!teacher) return toast.error('Select the teacher first')
    if (!file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.put(`/api/timetable/teacher/${teacher}`, fd)
      toast.success('Table published — the teacher sees it in the app')
      clearPick()
      setCurrent(res?.url ? res : null)
      loadTeachers()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!teacher) return
    if (!window.confirm("Remove this teacher's table image?")) return
    setRemoving(true)
    try {
      await api.del(`/api/timetable/teacher/${teacher}`)
      toast.success('Table image removed')
      setCurrent(null)
      loadTeachers()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setRemoving(false)
    }
  }

  const selected = teachers.find((t) => t.user_id === teacher)

  return (
    <div className="mx-auto max-w-5xl p-5">
      <div className="mb-5">
        <h2 className="text-[20px] font-extrabold text-slate-800">🗓️ Table</h2>
        <p className="text-[13px] text-slate-500">
          Each teacher has their own schedule (jadol) — select the teacher, then upload their table image.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Uploader */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Teacher
            </span>
            <select
              value={teacher}
              onChange={(e) => pick(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] font-bold text-slate-700 outline-none focus:border-brand"
            >
              <option value="">Choose a teacher…</option>
              {teachers.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.name}{t.subject ? ` — ${t.subject}` : ''}{t.path ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </label>

          {!teacher ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-[13px] font-bold text-slate-400">
              Select the teacher first, then you can upload the photo.
            </p>
          ) : preview ? (
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
              Choose the table image for {selected?.name} (JPEG, PNG, WEBP — max 5 MB)
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { pickImage(e.target.files?.[0]); e.target.value = '' }}
              />
            </label>
          )}

          <button
            type="button"
            onClick={save}
            disabled={!teacher || !file || saving}
            className="w-full rounded-xl bg-brand py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            <i className="fas fa-upload mr-1.5" />
            {saving ? 'Publishing…' : 'Publish to the app'}
          </button>
        </div>

        {/* Current image + overview */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-slate-700">
                {selected ? `Current table — ${selected.name}` : 'Current table'}
              </h3>
              {current && teacher && (
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
            {!teacher ? (
              <p className="py-10 text-center text-[13px] text-slate-400">Pick a teacher to see their table.</p>
            ) : loading ? (
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
                No table for this teacher yet — upload one to show it in the app.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-[14px] font-extrabold text-slate-700">Teachers with a table</h3>
            {teachers.filter((t) => t.path).length === 0 ? (
              <p className="py-6 text-center text-[13px] text-slate-400">No teacher tables uploaded yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {teachers.filter((t) => t.path).map((t) => (
                  <li key={t.user_id}>
                    <button
                      type="button"
                      onClick={() => pick(t.user_id)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-[13px] transition hover:border-brand"
                    >
                      <span className="font-bold text-slate-700">{t.name}</span>
                      <span className="text-[11.5px] text-slate-400">
                        {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
