import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true },
  { to: '/students', label: 'Student Management', icon: 'fa-user-graduate' },
  { to: '/staff', label: 'HR Management', icon: 'fa-chalkboard-user' },
  { to: '/attendance', label: 'Attendance Monitor', icon: 'fa-user-check', sub: 'Camera & Biometry' },
  { to: '/tasks', label: 'Daily Tasks', icon: 'fa-list-check' },
  { to: '/fees', label: 'Finance Management', icon: 'fa-file-invoice-dollar' },
  { to: '/salary', label: 'Rewards & Faults', icon: 'fa-award' },
  { to: '/feedback', label: 'Feedback', icon: 'fa-comments' },
  { to: '/biometry', label: 'Biometry Devices', icon: 'fa-fingerprint' },
  { to: '/evaluations', label: 'Evaluations', icon: 'fa-chart-line' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const current = navItems.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-950 text-slate-300">
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15 text-lg text-green-400">
            <i className="fas fa-graduation-cap" />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-extrabold tracking-wide text-white">CEO SCHOOL</h1>
            <p className="text-[11px] uppercase tracking-widest text-slate-500">Management System</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive
                        ? 'bg-green-500/15 font-semibold text-green-400'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`
                  }
                >
                  <i className={`fas ${item.icon} w-4 text-center`} />
                  <span className="min-w-0">
                    <span className="block truncate leading-tight">{item.label}</span>
                    {item.sub && (
                      <span className="block text-[10px] leading-tight text-slate-500">({item.sub})</span>
                    )}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 font-bold text-green-400">
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name || user?.email || 'User'}</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {user?.role === 'admin' ? 'Super Administrator' : user?.role || 'Member'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-slate-700 py-2 text-sm font-medium text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
          >
            <i className="fas fa-arrow-right-from-bracket mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3.5">
          <h2 className="truncate text-lg font-extrabold uppercase tracking-wide text-gray-800">
            {current?.end ? 'CEO School – Full Management Control Center' : current?.label || 'Dashboard'}
          </h2>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 sm:flex">
              <i className="far fa-calendar text-gray-400" />
              {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
            <Link
              to="/tasks"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              <i className="fas fa-bolt mr-2" />
              Quick Action
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        <footer className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-6 py-2 text-[11px] text-slate-500">
          <span>CEO SCHOOL v2.0.0 — Full Management Control System</span>
          <span>© {new Date().getFullYear()} CEO School. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
}
