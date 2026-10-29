import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';
import { deleteDatabase } from './history-database';
import { WorkoutStore } from './workout-store.service';

/** Where a tab clearing this device tells the app's other open tabs. */
export const DEVICE_CHANNEL = 'loop-workouts-device';
const CLEARED = 'cleared';

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
     * Removes the workouts, history, exercises, notes, deletions and settings from this
     * device, then reloads the app, and the app's other open tabs. A workout going is
     * dropped, not logged: logging it as the page unloads would put it straight back in the
     * history.
     */
    async clear() {
        this.workouts.stop();
        // Storage is cleared, and the history's deletion asked for, in this same task, so
        // it's all done before another tab hears this and reloads
        this.channel?.postMessage(CLEARED);
        localStorage.clear();
        sessionStorage.clear();
        await deleteDatabase();
        this.reload();
    }

    /** Starts the app again, with nothing in memory from before. */
    protected reload() {
        this.document.location.reload();
    }
}
