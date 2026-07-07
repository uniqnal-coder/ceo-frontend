import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Sidebar groups mirror the SchoolOS control-center reference. Every entry
// routes to a real page in the app so nothing is a dead link.
const navGroups = [
  {
    title: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true },
      { to: '/staff', label: 'HR Management', icon: 'fa-users-gear' },
      { to: '/biometry', label: 'Staff Attendance', icon: 'fa-fingerprint', sub: 'Camera & Biometry' },
      { to: '/students', label: 'Student Management', icon: 'fa-user-graduate' },
      { to: '/attendance', label: 'Attendance Monitor', icon: 'fa-user-check' },
      { to: '/tasks', label: 'Daily Tasks', icon: 'fa-list-check' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/evaluations', label: 'Reports', icon: 'fa-chart-line' },
      { to: '/salary', label: 'Rewards & Faults', icon: 'fa-award' },
      { to: '/fees', label: 'Finance Management', icon: 'fa-file-invoice-dollar' },
      { to: '/feedback', label: 'Feedback', icon: 'fa-comments' },
    ],
  },
];

const breadcrumb = [
  { to: '/staff', label: 'HR' },
  { to: '/students', label: 'Students' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/evaluations', label: 'Reports' },
  { to: '/salary', label: 'Rewards & Faults' },
  { to: '/fees', label: 'Finance' },
];

const allItems = navGroups.flatMap((g) => g.items);

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const current = allItems.find((i) =>
    i.end ? location.pathname === i.to : location.pathname.startsWith(i.to),
  );
  const isDashboard = location.pathname === '/';

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg text-white shadow-sm">
            <i className="fas fa-graduation-cap" />
          </span>
          <div className="leading-tight">
            <h1 className="text-[15px] font-extrabold tracking-tight text-slate-800">
              SCHOOL <span className="text-brand">AUTO</span> CEO
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">
              SchoolOS AI
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                          isActive
                            ? 'bg-brand-soft text-brand'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs transition ${
                              isActive
                                ? 'bg-brand text-white'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                            }`}
                          >
                            <i className={`fas ${item.icon}`} />
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block truncate">{item.label}</span>
                            {item.sub && (
                              <span className="block text-[10px] font-normal text-slate-400">{item.sub}</span>
                            )}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-800">
                {user?.name || user?.email || 'School CEO'}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {user?.role === 'admin' ? 'Super Administrator' : user?.role || 'Member'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            >
              <i className="fas fa-arrow-right-from-bracket" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-extrabold uppercase tracking-tight text-slate-800 sm:text-[17px]">
              {isDashboard ? 'School Auto CEO — Full Management Control Center' : current?.label || 'Dashboard'}
            </h2>
            <nav className="mt-0.5 hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 xl:flex">
              {breadcrumb.map((l, i) => (
                <span key={l.to} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-300">·</span>}
                  <Link to={l.to} className="transition hover:text-brand">
                    {l.label}
                  </Link>
                </span>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 sm:flex">
              <i className="far fa-calendar text-slate-400" />
              {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </span>
            <span className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 md:flex">
              <i className="fas fa-code-branch text-slate-400" />
              All Branches
              <i className="fas fa-chevron-down text-[9px] text-slate-400" />
            </span>
            <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50">
              <i className="far fa-bell" />
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                3
              </span>
            </button>
            <Link
              to="/tasks"
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <i className="fas fa-bolt" />
              <span className="hidden sm:inline">Quick Action</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        <footer className="flex items-center justify-between gap-3 bg-navy px-4 py-2.5 text-[11px] text-slate-300 sm:px-6">
          <span className="truncate">
            <i className="far fa-clock mr-1.5" />
            Last updated: {new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          <span className="hidden truncate sm:inline">
            © {new Date().getFullYear()} School Auto CEO. All rights reserved.
          </span>
        </footer>
      </div>
    </div>
  );
}
