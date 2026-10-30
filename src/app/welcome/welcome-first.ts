import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_STORAGE_KEY } from '../account/account-client';
import { HistoryStore } from '../shared/state/history-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/**
 * Set once the welcome screen's been answered on this device (NAV-3): signed in, or going on
 * as a guest. Signing out and clearing the device remove it, so it's asked again.
 */
export const WELCOMED_KEY = 'welcomed';

/**
 * Home opens the welcome screen instead (NAV-3) on a device that's new to the app: not signed
 * in, not welcomed yet, and with nothing saved. A device already in use before the welcome
 * screen came in (a guest with workouts or history) counts as welcomed.
 */
export const welcomeFirst: CanActivateFn = async () => {
    if (localStorage.getItem(AUTH_STORAGE_KEY) !== null || localStorage.getItem(WELCOMED_KEY)) {
        return true;
    }
    const history = inject(HistoryStore);
    const workouts = inject(WorkoutStore);
    const router = inject(Router);
    await history.ready;
    if (workouts.workouts().length > 0 || history.entries().length > 0) {
        localStorage.setItem(WELCOMED_KEY, 'guest');
        return true;
    }
    return router.createUrlTree(['/welcome']);
};
