/**
 * The tab bar's tabs, in order. A tab is chosen on its own page, the pages under it, and any
 * pages it `holds` (making a workout, the weekly plan and the ready-made workouts belong to the library, where they're started from, and
 * Settings and the legal pages to Account, which they slide in over).
 */
export const TABS = [
    { path: '/home', label: 'Home', icon: 'home', holds: [] },
    { path: '/exercises', label: 'Exercises', icon: 'fitness_center', holds: [] },
    {
        path: '/library',
        label: 'Library',
        icon: 'view_list',
        holds: ['/setup', '/plan', '/ready-made'],
    },
    { path: '/history', label: 'History', icon: 'history', holds: [] },
    {
        path: '/account',
        label: 'Account',
        icon: 'account_circle',
        holds: ['/settings', '/privacy', '/terms'],
    },
] as const;

export type Tab = (typeof TABS)[number];
