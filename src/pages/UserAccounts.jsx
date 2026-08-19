// User Accounts — one place to manage every login: edit profile,
// block/unblock sign-in, set a new password, delete the account.
// Destructive actions use the in-app two-tap Confirm pattern (native
// confirm() is blocked in some webviews).

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../utils/toast';
import { api, toArray } from '../api/client';

const ROLE_META = {
  admin: { label: 'Admin', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  teacher: { label: 'Teacher', badge: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500' },
  staff: { label: 'Staff', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  student: { label: 'Student', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
};

const AVATAR_BG = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];

const initialsOf = (name, email) => {
  const src = String(name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const avatarBg = (id) => {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
};

const lastSeen = (iso) => {
  if (!iso) return 'Never signed in';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const genPassword = () => {
  // Readable but strong: three word-ish chunks + digits, e.g. "Ruko-Vabi-4821"
  const syll = ['ba', 'ko', 'ru', 'mi', 'ta', 'vi', 'so', 'na', 'ze', 'lu', 'pa', 'de'];
  const pick = () => syll[Math.floor(Math.random() * syll.length)];
  const word = () => (pick() + pick()).replace(/^./, (c) => c.toUpperCase());
  return `${word()}-${word()}-${1000 + Math.floor(Math.random() * 9000)}`;
};

export default function UserAccounts() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' = not chosen yet
  const [statusFilter, setStatusFilter] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  // Two-tap confirm for destructive actions.
  const [confirmKey, setConfirmKey] = useState(null);
  const confirmTimer = useRef(null);
  const armConfirm = (key) => {
    setConfirmKey(key);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmKey(null), 4000);
  };

  const load = async () => {
    try {
      setUsers(toArray(await api.get('/api/users')));
    } catch (e) {
      setUsers([]);
      toast.error(e.message || 'Could not load users');
    }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const list = users || [];
    return {
      total: list.length,
      active: list.filter((u) => !u.blocked && !u.is_archived).length,
      blocked: list.filter((u) => u.blocked).length,
      archived: list.filter((u) => u.is_archived).length,
    };
  }, [users]);

  const hasQuery = !!(q.trim() || roleFilter || statusFilter);
  const shown = useMemo(() => {
    if (!hasQuery) return [];
    const needle = q.trim().toLowerCase();
    return (users || []).filter((u) => {
      if (roleFilter && roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && (u.blocked || u.is_archived)) return false;
      if (statusFilter === 'blocked' && !u.blocked) return false;
      if (needle) {
        const hay = `${u.name || ''} ${u.email || ''} ${u.phone || ''} ${u.id || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [users, q, roleFilter, statusFilter, hasQuery]);
  const clearFilters = () => {
    setQ('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const toggleBlock = async (u) => {
    const key = `block:${u.id}`;
    if (!u.blocked && confirmKey !== key) return armConfirm(key);
    setConfirmKey(null);
    try {
      await api.post(`/api/users/${u.id}/block`, { blocked: !u.blocked });
      toast.success(!u.blocked ? `${u.name || u.email} is blocked from signing in` : `${u.name || u.email} can sign in again`);
      load();
    } catch (e) {
      toast.error(e.message || 'Update failed');
    }
  };

  const removeUser = async (u) => {
    const key = `del:${u.id}`;
    if (confirmKey !== key) return armConfirm(key);
    setConfirmKey(null);
    try {
      const r = await api.del(`/api/users/${u.id}`);
      toast.success(r.message || 'Account deleted');
      load();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-5">
      {/* Heading */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-extrabold text-slate-800">
            <i className="fas fa-user-shield mr-2 text-[#2563eb]" />
            User Accounts
          </h2>
          <p className="text-[12.5px] text-slate-400">
            Every login in one place — edit, block, reset passwords or remove accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-bold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <i className="fas fa-rotate mr-1.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total accounts', stats.total, 'fa-users', 'text-[#2563eb] bg-[#eff6ff]'],
          ['Active', stats.active, 'fa-circle-check', 'text-emerald-600 bg-emerald-50'],
          ['Blocked', stats.blocked, 'fa-ban', 'text-rose-600 bg-rose-50'],
          ['Archived', stats.archived, 'fa-box-archive', 'text-slate-500 bg-slate-100'],
        ].map(([label, value, icon, tone]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-[15px] ${tone}`}>
              <i className={`fas ${icon}`} />
            </span>
            <div>
              <p className="text-[20px] font-extrabold leading-none text-slate-800">{value}</p>
              <p className="mt-1 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters — the list stays empty until one is used */}
      <div className="mb-4 flex flex-wrap items-end gap-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block min-w-[220px] flex-1">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Search</span>
          <span className="relative block">
            <i className="fas fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[12px] text-slate-300" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone or ID…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            />
          </span>
        </label>
        <label className="block min-w-[150px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Role</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-[#2563eb]"
          >
            <option value="">Choose role…</option>
            <option value="all">Everyone · {stats.total}</option>
            {Object.entries(ROLE_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label} · {(users || []).filter((u) => u.role === k).length}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[140px]">
          <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-400">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[12.5px] font-bold text-slate-700 outline-none focus:border-[#2563eb]"
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
        {hasQuery && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
          >
            <i className="fas fa-rotate-left mr-1.5" />
            Clear
          </button>
        )}
        {hasQuery && (
          <span className="h-10 content-center text-[12px] font-bold text-slate-400">
            {shown.length} of {stats.total}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!users ? (
          <p className="py-12 text-center text-[13px] text-slate-400">Loading accounts…</p>
        ) : !hasQuery ? (
          <div className="px-6 py-14 text-center">
            <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[22px] text-[#2563eb]">
              <i className="fas fa-magnifying-glass" />
            </span>
            <p className="text-[15px] font-extrabold text-slate-700">Search or choose a filter to see accounts</p>
            <p className="mt-1 text-[12.5px] text-slate-400">
              {stats.total} accounts on file — search by name, email, phone or ID, or filter by role and status.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] text-slate-400">No accounts match these filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"
            >
              <i className="fas fa-rotate-left mr-1.5" />
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10.5px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">User</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Last sign-in</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const meta = ROLE_META[u.role] || { label: u.role, badge: 'bg-slate-100 text-slate-500' };
                  const self = u.id === me.id;
                  return (
                    <tr key={u.id} className={`border-b border-slate-50 transition hover:bg-slate-50/50 ${u.blocked ? 'bg-rose-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white ${avatarBg(u.id)}`}>
                            {initialsOf(u.name, u.email)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-700">
                              {u.name || '—'}
                              {self && <span className="ml-1.5 rounded-full bg-[#eff6ff] px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#2563eb]">You</span>}
                            </p>
                            <p className="truncate text-[11.5px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {u.blocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-rose-600">
                            <i className="fas fa-ban text-[9px]" /> Blocked
                          </span>
                        ) : u.is_archived ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-500">
                            <i className="fas fa-box-archive text-[9px]" /> Archived
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-500">{lastSeen(u.last_sign_in_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Edit profile"
                            onClick={() => setEditUser(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] text-slate-500 transition hover:border-[#2563eb] hover:text-[#2563eb]"
                          >
                            <i className="fas fa-pen" />
                          </button>
                          <button
                            type="button"
                            title="Set a new password"
                            onClick={() => setPwUser(u)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-[12px] text-slate-500 transition hover:border-amber-500 hover:text-amber-500"
                          >
                            <i className="fas fa-key" />
                          </button>
                          <button
                            type="button"
                            title={self ? 'You cannot block yourself' : u.blocked ? 'Unblock sign-in' : 'Block sign-in'}
                            disabled={self}
                            onClick={() => toggleBlock(u)}
                            className={`flex h-8 items-center justify-center rounded-lg border px-2 text-[12px] font-extrabold transition disabled:opacity-30 ${
                              confirmKey === `block:${u.id}`
                                ? 'border-rose-600 bg-rose-600 text-white'
                                : u.blocked
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-rose-400 hover:text-rose-500'
                            }`}
                          >
                            {confirmKey === `block:${u.id}` ? (
                              <span className="px-1 text-[10.5px]">Confirm?</span>
                            ) : (
                              <i className={`fas ${u.blocked ? 'fa-unlock' : 'fa-ban'}`} />
                            )}
                          </button>
                          <button
                            type="button"
                            title={self ? 'You cannot delete yourself' : 'Delete account'}
                            disabled={self}
                            onClick={() => removeUser(u)}
                            className={`flex h-8 items-center justify-center rounded-lg border px-2 text-[12px] font-extrabold transition disabled:opacity-30 ${
                              confirmKey === `del:${u.id}`
                                ? 'border-rose-600 bg-rose-600 text-white'
                                : 'border-rose-200 bg-white text-rose-500 hover:bg-rose-50'
                            }`}
                          >
                            {confirmKey === `del:${u.id}` ? (
                              <span className="px-1 text-[10.5px]">Confirm?</span>
                            ) : (
                              <i className="fas fa-trash-can" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editUser && (
        <EditUserDialog
          user={editUser}
          self={editUser.id === me.id}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); load(); }}
        />
      )}
      {pwUser && (
        <PasswordDialog
          user={pwUser}
          onClose={() => setPwUser(null)}
          onSaved={() => { setPwUser(null); load(); }}
        />
      )}
    </div>
  );
}

/* ---- Edit profile dialog ---- */
function EditUserDialog({ user, self, onClose, onSaved }) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error('Enter a valid email');
    setSaving(true);
    try {
      const patch = {};
      if (name.trim() !== (user.name || '')) patch.name = name.trim();
      if (email.trim().toLowerCase() !== (user.email || '')) patch.email = email.trim();
      if (phone.trim() !== (user.phone || '')) patch.phone = phone.trim();
      if (role !== user.role) patch.role = role;
      if (!Object.keys(patch).length) { onClose(); return; }
      await api.patch(`/api/users/${user.id}`, patch);
      toast.success(`Saved ${name.trim()}`);
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const field = 'h-10 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 text-[15px] font-extrabold text-slate-800">
          <i className="fas fa-pen mr-2 text-[#2563eb]" />
          Edit account
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-400">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-400">Email (used to sign in)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-400">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-400">Role</span>
            <select
              value={role}
              disabled={self}
              onChange={(e) => setRole(e.target.value)}
              className={`${field} disabled:bg-slate-50 disabled:text-slate-400`}
            >
              {Object.entries(ROLE_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
            {self && <span className="mt-1 block text-[10.5px] text-slate-400">You cannot change your own role.</span>}
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Set password dialog ---- */
function PasswordDialog({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied');
    } catch {
      toast.error('Could not copy — select it manually');
    }
  };

  const save = async () => {
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.post(`/api/users/${user.id}/password`, { password });
      toast.success(`Password set for ${user.name || user.email}`);
      onSaved();
    } catch (e) {
      toast.error(e.message || 'Could not set password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 text-[15px] font-extrabold text-slate-800">
          <i className="fas fa-key mr-2 text-amber-500" />
          Set a new password
        </p>
        <p className="mb-4 text-[12px] text-slate-400">
          For <span className="font-bold text-slate-600">{user.name || user.email}</span>. They must pick their own
          password at the next sign-in.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-10 font-mono text-[13.5px] outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-slate-300 hover:text-slate-500"
            >
              <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPassword(genPassword())}
            className="rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-extrabold text-slate-600 transition hover:bg-slate-50"
            title="Generate a strong password"
          >
            <i className="fas fa-dice mr-1" />
            Generate
          </button>
        </div>
        {password.length > 0 && password.length < 8 && (
          <p className="mt-1.5 text-[11px] font-semibold text-rose-500">Too short — needs {8 - password.length} more character{8 - password.length === 1 ? '' : 's'}.</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-[13px] font-bold text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
          {password.length >= 8 && (
            <button
              type="button"
              onClick={copy}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50"
            >
              <i className="fas fa-copy mr-1.5" />
              Copy
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || password.length < 8}
            className="rounded-xl bg-amber-500 px-6 py-2.5 text-[13px] font-extrabold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Set Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
