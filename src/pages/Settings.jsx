import { useState } from 'react'
import { toast } from '../utils/toast'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/auth/change-password', { newPassword: password })
      toast.success('Password updated — use it on your next login')
      setPassword('')
      setConfirm('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-5">
      <div className="mb-5">
        <h2 className="text-[20px] font-extrabold text-slate-800">⚙️ Settings</h2>
        <p className="text-[13px] text-slate-500">Manage your admin account.</p>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[13px] font-bold text-slate-700">Account</p>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-[16px] font-extrabold text-brand">
            {(user?.name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-800">{user?.name || 'Administrator'}</p>
            <p className="text-[12.5px] text-slate-500">{user?.email}</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-600">
            {user?.role || 'admin'}
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-[13px] font-bold text-slate-700">Change password</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          required
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] outline-none focus:border-brand"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          required
          className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13.5px] outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-5 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
