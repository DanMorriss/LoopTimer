import { DOCUMENT, inject, Service } from '@angular/core';
import { deleteDatabase } from './history-database';
import { WorkoutStore } from './workout-store.service';

/**
 * Everything the app keeps on this device, as a whole: Clear this device (SYN-9) removes it,
 * e.g. on a shared computer, and starts the app again empty.
 */
@Service()
export class DeviceDataService {
    private readonly workouts = inject(WorkoutStore);
    private readonly document = inject(DOCUMENT);

    /**
     * Removes the workouts, history, exercises, notes, deletions and settings from this
     * device, then reloads the app. A workout going is dropped, not logged: logging it as the
     * page unloads would put it straight back in the history.
     */
    async clear() {
        this.workouts.stop();
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
