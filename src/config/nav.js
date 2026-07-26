// Single source of truth for navigation. Consumed by the Sidebar (grouped
// rendering) and the Header (active page title / breadcrumb lookup).
// Every entry maps to an existing route — no dead links.
export const navGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true },
      { to: '/today', label: "Today's Board", short: 'Today', icon: 'fa-calendar-day' },
    ],
  },
  {
    title: 'Management',
    items: [
      { to: '/staff', label: 'HR Management', short: 'Staff', icon: 'fa-people-group' },
      { to: '/salary', label: 'Rewards & Faults', short: 'Salary', icon: 'fa-trophy' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/biometry', label: 'Staff Attendance', short: 'Biometry', icon: 'fa-fingerprint' },
      { to: '/tasks', label: 'Task', short: 'Task', icon: 'fa-clipboard-check' },
      { to: '/auto-task', label: 'Auto Task', short: 'Auto', icon: 'fa-wand-magic-sparkles' },
      { to: '/evaluations', label: 'Reports', short: 'Reports', icon: 'fa-chart-column' },
      { to: '/daily-reports', label: 'Daily Reports', short: 'Reports Feed', icon: 'fa-file-lines' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { to: '/announcements', label: 'Announcements', short: 'Announce', icon: 'fa-bullhorn' },
      { to: '/feedback', label: 'Feedback', short: 'Feedback', icon: 'fa-comments' },
    ],
  },
  {
    title: 'System',
    items: [{ to: '/settings', label: 'Settings', short: 'Settings', icon: 'fa-gear' }],
  },
]

export const navItems = navGroups.flatMap((g) => g.items)

export function findActiveItem(pathname) {
  return navItems.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
}
