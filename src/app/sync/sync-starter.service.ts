import { EnvironmentInjector, inject, Service, signal } from '@angular/core';
import { AUTH_STORAGE_KEY } from '../account/account-client';

/** When this device last synced, in localStorage. */
export const LAST_SYNCED_KEY = 'synced-at';

export interface SyncStatus {
    /** A sync is going. */
    syncing: boolean;
    /** When this device last synced, in ms since the epoch by its own clock, or null. */
    lastSyncedAt: number | null;
    /**
     * Why the last sync didn't finish: offline, or something else went wrong; or 'update' if
     * it did, but some of the account's data is from a newer version of the app.
     */
    problem: 'offline' | 'failed' | 'update' | null;
}

/**
 * Starts sync (SYN-3, SYN-4) once this device is signed in, loading its code (and Supabase's)
 * only then, so neither adds to the app's first load. Holds how sync is going, for the
 * Account tab.
 */
@Service()
export class SyncStarter {
    private readonly injector = inject(EnvironmentInjector);
    private loading: Promise<unknown> | null = null;

    /** How sync is going. Set by `SyncService`. */
    readonly status = signal<SyncStatus>({
        syncing: false,
        lastSyncedAt: readLastSynced(),
        problem: null,
    });

    /** Starts sync if this device is signed in, as it is once the app has opened. */
    startIfSignedIn() {
        if (localStorage.getItem(AUTH_STORAGE_KEY) !== null) {
            this.start();
        }
    }

    /** Loads sync's code and starts it, once: from then on, it follows signing in and out. */
    start() {
        this.loading ??= import('./sync.service')
            .then(({ SyncService }) => this.injector.get(SyncService))
            .catch(() => {
                // Offline with the code not loaded yet: try again next time
                this.loading = null;
            });
    }
}

function readLastSynced(): number | null {
    const at = Number(localStorage.getItem(LAST_SYNCED_KEY));
    return Number.isSafeInteger(at) && at > 0 ? at : null;
}
