import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { findActiveItem } from '../config/nav'

export default function Header({ onOpenMobile }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const active = findActiveItem(location.pathname)
  const isDashboard = location.pathname === '/'
  const title = isDashboard ? 'Dashboard' : active?.label || 'Dashboard'
  const initial = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase()
  const today = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <header className="z-30 flex min-h-[72px] items-center gap-4 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 lg:px-8">
      {/* Left: mobile menu + title/breadcrumb */}
      <button
        onClick={onOpenMobile}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <i className="fas fa-bars" />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-[18px] font-bold leading-tight tracking-tight text-slate-800">{title}</h1>
        <nav className="mt-1 hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:flex" aria-label="Breadcrumb">
          <span>Home</span>
          <i className="fas fa-chevron-right text-[8px]" />
          <span className="text-slate-600">{title}</span>
        </nav>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <label className="relative hidden md:block">
          <i className="fas fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            className="h-9 w-44 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-700 transition focus:w-60 focus:border-brand focus:bg-white focus:outline-none lg:w-56"
          />
        </label>

        {/* Date */}
        <span className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 sm:flex">
          <i className="far fa-calendar text-slate-400" />
          {today}
        </span>

        {/* Notifications */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label="Notifications"
        >
          <i className="far fa-bell" />
        </button>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-slate-100"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-brand text-xs font-bold text-white">
              {initial}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[120px] truncate text-[12px] font-semibold text-slate-700">
                {user?.name || user?.email || 'User'}
              </span>
              <span className="block text-[10px] text-slate-400">
                {user?.role === 'admin' ? 'Administrator' : user?.role || 'Member'}
              </span>
            </span>
            <i className="fas fa-chevron-down hidden text-[9px] text-slate-400 sm:block" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-[13px] font-semibold text-slate-800">{user?.name || 'User'}</p>
                  <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  <i className="fas fa-arrow-right-from-bracket w-4 text-center" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
