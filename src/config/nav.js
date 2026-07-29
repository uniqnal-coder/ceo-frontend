// Single source of truth for navigation. Consumed by the Sidebar (grouped
// rendering) and the Header (active page title / breadcrumb lookup).
// Layout follows the HRnal testing-report notes (Jul 2026).
export const navGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true },
      { to: '/attendance', label: 'Check-in & Location', short: 'Check-in', icon: 'fa-location-dot' },
      { to: '/reports/daily', label: 'Daily Reports', short: 'Daily', icon: 'fa-calendar-day' },
      { to: '/reports/weekly', label: 'Weekly Reports', short: 'Weekly', icon: 'fa-calendar-week' },
      { to: '/reports/monthly', label: 'Monthly Reports', short: 'Monthly', icon: 'fa-calendar' },
    ],
  },
  {
    title: 'HR Management',
    items: [
      { to: '/staff', label: 'Add Staff', short: 'Staff', icon: 'fa-user-plus' },
      { to: '/tasks', label: 'Add Tasks', short: 'Tasks', icon: 'fa-clipboard-check' },
      { to: '/auto-task', label: 'Assign Tasks', short: 'Assign', icon: 'fa-wand-magic-sparkles' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/biometry', label: 'Fingerprints', short: 'Biometry', icon: 'fa-fingerprint' },
      { to: '/daily-reports', label: 'Reports Feed', short: 'Feed', icon: 'fa-file-lines' },
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
  // Prefer the longest matching path so /reports/monthly wins over shorter siblings.
  const matches = navItems.filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
  return matches.sort((a, b) => b.to.length - a.to.length)[0]
}
