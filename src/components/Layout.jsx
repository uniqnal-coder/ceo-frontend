import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/students', label: 'Students', icon: '👨‍🎓' },
  { to: '/staff', label: 'Staff', icon: '👨‍🏫' },
  { to: '/fees', label: 'Fees', icon: '💰' },
  { to: '/tasks', label: 'Tasks', icon: '📋' },
  { to: '/attendance', label: 'Attendance', icon: '👥' },
  { to: '/feedback', label: 'Feedback', icon: '💬' },
  { to: '/salary', label: 'Salary', icon: '💵' },
  { to: '/biometry', label: 'Biometry', icon: '👆' },
  { to: '/evaluations', label: 'Evaluations', icon: '📊' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const current = navItems.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-indigo-900 to-blue-900 text-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-indigo-700">
          <h1 className="text-2xl font-bold">🎓 CEO School</h1>
          <p className="text-sm text-indigo-300 mt-2">Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `block w-full text-left px-4 py-3 rounded-lg transition ${
                    isActive ? 'bg-cyan-500 text-white shadow-lg' : 'text-indigo-100 hover:bg-indigo-800'
                  }`
                }
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-indigo-700">
          <div className="bg-indigo-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-indigo-300">Logged in as</p>
            <p className="text-white font-semibold truncate">{user?.email || 'User'}</p>
            <p className="text-xs text-indigo-300">{user?.role || 'Role'}</p>
          </div>
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md px-8 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {current ? `${current.icon} ${current.label}` : '🎓 Dashboard'}
          </h2>
          <span className="text-gray-600">📅 {new Date().toLocaleDateString()}</span>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
