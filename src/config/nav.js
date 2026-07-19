// Single source of truth for navigation. Consumed by the Sidebar (grouped
// rendering) and the Header (active page title / breadcrumb lookup).
// Every entry maps to an existing route — no dead links.
export const navGroups = [
  {
    title: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true }],
  },
  {
    title: 'Management',
    items: [
      { to: '/students', label: 'Student Management', short: 'Students', icon: 'fa-user-graduate' },
      { to: '/staff', label: 'HR Management', short: 'Staff', icon: 'fa-people-group' },
      { to: '/fees', label: 'Finance Management', short: 'Finance', icon: 'fa-file-invoice-dollar' },
      { to: '/salary', label: 'Rewards & Faults', short: 'Salary', icon: 'fa-trophy' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/attendance', label: 'Attendance Monitor', short: 'Attendance', icon: 'fa-user-check' },
      { to: '/biometry', label: 'Staff Attendance', short: 'Biometry', icon: 'fa-fingerprint' },
      { to: '/tasks', label: 'Daily Tasks', short: 'Tasks', icon: 'fa-clipboard-check' },
      { to: '/evaluations', label: 'Reports', short: 'Reports', icon: 'fa-chart-column' },
    ],
  },
  {
    title: 'Engagement',
    items: [{ to: '/feedback', label: 'Feedback', short: 'Feedback', icon: 'fa-comments' }],
  },
]

export const navItems = navGroups.flatMap((g) => g.items)

export function findActiveItem(pathname) {
  return navItems.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
}
