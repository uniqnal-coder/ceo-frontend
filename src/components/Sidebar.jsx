import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { navGroups } from '../config/nav'

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth()

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-[#103055] to-[#06182e] text-slate-300 transition-all duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 px-4 py-5 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-xl text-white shadow-md shadow-black/20">
            <i className="fas fa-school" />
          </span>
          <div className={`leading-none ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="text-[16px] font-extrabold leading-tight tracking-tight text-brand-light">HRNAL</h1>
            <p className="text-[16px] font-extrabold leading-tight tracking-tight text-white">SchoolOS</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p
                className={`mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 ${
                  collapsed ? 'lg:hidden' : ''
                }`}
              >
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                          collapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${
                          isActive
                            ? 'bg-brand/20 text-white'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-light ${collapsed ? 'lg:hidden' : ''}`} />
                          )}
                          <i
                            className={`fas ${item.icon} w-5 shrink-0 text-center text-[15px] ${
                              isActive ? 'text-brand-light' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggleCollapse}
          className="mx-3 mb-2 hidden items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-[12px] font-medium text-slate-400 transition hover:bg-white/5 hover:text-white lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`fas ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
          <span className={collapsed ? 'lg:hidden' : ''}>Collapse</span>
        </button>

        {/* Profile */}
        <div className="border-t border-white/10 p-3">
          <div className={`flex items-center gap-3 rounded-xl bg-white/5 p-2.5 ${collapsed ? 'lg:justify-center lg:bg-transparent lg:p-0' : ''}`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-light to-brand text-sm font-bold text-white ring-2 ring-white/10">
              {(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}
            </span>
            <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-[13px] font-semibold text-white">{user?.name || 'School CEO'}</p>
              <p className="truncate text-[11px] text-slate-400">
                {user?.role === 'admin' ? 'Super Administrator' : user?.role || 'Member'}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-brand-light">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-light" />
                Online
              </p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-500/15 hover:text-red-400 ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              <i className="fas fa-arrow-right-from-bracket" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
