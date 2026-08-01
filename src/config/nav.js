// Single source of truth for navigation. Consumed by the Sidebar (grouped
// rendering) and the Header (active page title / breadcrumb lookup).
// Every entry maps to an existing route — no dead links.
export const navGroups = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: 'fa-gauge-high', end: true },
      { to: '/attendance', label: 'Check-in & Location', short: 'Check-in', icon: 'fa-location-dot' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: '/reports', label: 'Reports', short: 'Reports', icon: 'fa-chart-column' },
      { to: '/tasks-tracking', label: 'Tasks Tracking', short: 'Tracking', icon: 'fa-list-check' },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/staff', label: 'Teachers & Staff', short: 'People', icon: 'fa-users' },
      { to: '/archive', label: 'Archive', short: 'Archive', icon: 'fa-box-archive' },
    ],
  },
  {
    title: 'Teachers',
    items: [
      { to: '/teacher-subjects', label: 'Subjects', short: 'Subjects', icon: 'fa-book-open' },
    ],
  },
  {
    title: 'Staff',
    items: [
      { to: '/staff-roles', label: 'Staff Roles', short: 'Roles', icon: 'fa-briefcase' },
    ],
  },
  {
    title: 'Tasks',
    items: [
      { to: '/tasks', label: 'Add Task', short: 'Tasks', icon: 'fa-clipboard-check' },
      { to: '/auto-task', label: 'Assign Task', short: 'Assign', icon: 'fa-wand-magic-sparkles' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/biometry', label: 'Fingerprints', short: 'Biometry', icon: 'fa-fingerprint' },
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
  const matches = navItems.filter((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
  return matches.sort((a, b) => b.to.length - a.to.length)[0]
}
