import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const cards = [
  { to: '/students', icon: '👨‍🎓', title: 'Students', desc: 'Records, departments and stages', color: 'border-blue-500' },
  { to: '/staff', icon: '👨‍🏫', title: 'Staff', desc: 'Profiles, roles and departments', color: 'border-green-500' },
  { to: '/fees', icon: '💰', title: 'Fees', desc: 'Student fee tracking', color: 'border-orange-500' },
  { to: '/tasks', icon: '📋', title: 'Tasks', desc: 'Assignment and status tracking', color: 'border-purple-500' },
  { to: '/attendance', icon: '👥', title: 'Attendance', desc: 'Daily attendance records', color: 'border-cyan-500' },
  { to: '/feedback', icon: '💬', title: 'Feedback', desc: 'Staff feedback notes', color: 'border-pink-500' },
  { to: '/salary', icon: '💵', title: 'Salary', desc: 'Salary records (admin)', color: 'border-emerald-500' },
  { to: '/biometry', icon: '👆', title: 'Biometry', desc: 'Fingerprint enrollment (admin)', color: 'border-indigo-500' },
  { to: '/evaluations', icon: '📊', title: 'Evaluations', desc: 'Performance evaluations (admin)', color: 'border-amber-500' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-100 min-h-full">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-indigo-900 mb-2">
          Welcome{user?.name ? `, ${user.name}` : ''} 👋
        </h1>
        <p className="text-gray-600 mb-8">
          Signed in as <strong>{user?.email}</strong>
          {user?.role ? ` · ${user.role}` : ''}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition p-6 border-t-4 ${card.color} block`}
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{card.title}</h3>
              <p className="text-gray-600 text-sm">{card.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
