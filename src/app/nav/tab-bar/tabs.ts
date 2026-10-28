/**
 * The tab bar's tabs, in order. A tab is chosen on its own page, the pages under it, and any
 * pages it `holds` (making a workout belongs to the library, where it's started from).
 */
export const TABS = [
    { path: '/library', label: 'Library', icon: 'view_list', holds: ['/setup'] },
    { path: '/exercises', label: 'Exercises', icon: 'fitness_center', holds: [] },
    { path: '/history', label: 'History', icon: 'history', holds: [] },
    { path: '/account', label: 'Account', icon: 'account_circle', holds: [] },
    { path: '/settings', label: 'Settings', icon: 'settings', holds: ['/privacy', '/terms'] },
] as const;

export type Tab = (typeof TABS)[number];
