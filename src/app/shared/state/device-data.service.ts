import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';
import { deleteDatabase } from './history-database';
import { WorkoutStore } from './workout-store.service';

/** Where a tab clearing this device tells the app's other open tabs. */
export const DEVICE_CHANNEL = 'loop-workouts-device';
const CLEARED = 'cleared';

/** This device's own choices, which signing out keeps: the settings, and its clock's offset. */
const DEVICE_KEYS = ['settings', 'clock-offset'];

/**
 * Left in sessionStorage by signing out (or deleting the account), for the Account tab to say
 * so once it's reloaded: what happened, `signed-out` or `deleted`.
 */
export const SIGNED_OUT_NOTE = 'signed-out';

export type LeftAccount = 'signed-out' | 'deleted';

/**
 * Everything the app keeps on this device, as a whole: Clear this device (SYN-9) removes it,
 * e.g. on a shared computer, and starts the app again empty. It's started with the app, so
 * every open tab hears when another clears the device.
 */
@Service()
export class DeviceDataService {
    private readonly workouts = inject(WorkoutStore);
    private readonly document = inject(DOCUMENT);
    private readonly channel =
        typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DEVICE_CHANNEL);

    constructor() {
        // Another tab cleared the device: what this one has in memory would be saved back
        // the next time anything changed, so drop it and start again empty too
        this.channel?.addEventListener('message', (event: MessageEvent) => {
            if (event.data === CLEARED) {
                this.workouts.stop();
                this.reload();
            }
        });
        inject(DestroyRef).onDestroy(() => this.channel?.close());
    }

    /**
     * Removes the workouts, history, exercises, notes, plan, deletions and settings from this
     * device, then reloads the app, and the app's other open tabs. A workout going is
     * dropped, not logged: logging it as the page unloads would put it straight back in the
     * history. Signing out or deleting the account (`leaving`) keeps this device's settings,
     * and leaves a note for the Account tab to say it's done.
     */
    async clear({ leaving }: { leaving?: LeftAccount } = {}) {
        const signingOut = leaving !== undefined;
        this.workouts.stop();
        const kept = signingOut
            ? DEVICE_KEYS.flatMap((key) => {
                  const value = localStorage.getItem(key);
                  return value === null ? [] : [[key, value] as const];
              })
            : [];
        // Storage is cleared, and the history's deletion asked for, in this same task, so
        // it's all done before another tab hears this and reloads
        this.channel?.postMessage(CLEARED);
        localStorage.clear();
        sessionStorage.clear();
        for (const [key, value] of kept) {
            localStorage.setItem(key, value);
        }
        if (signingOut) {
            sessionStorage.setItem(SIGNED_OUT_NOTE, leaving);
        }
        await deleteDatabase();
        this.reload();
    }

    /** Starts the app again, with nothing in memory from before. */
    protected reload() {
        this.document.location.reload();
    }
}
