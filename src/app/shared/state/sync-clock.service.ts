import { Service } from '@angular/core';

const STORAGE_KEY = 'clock-offset';

/**
 * The time changes are dated by. "The most recent change wins" a merge, so a device whose
 * clock is off would win (or lose) every change; once sync has heard the server's time, this
 * keeps how far the device's clock is from it, and gives the server's time (see
 * docs/features/backup-and-sync.md, Sync). Until then, it's the device's own.
 */
@Service()
export class SyncClock {
    private offset = readOffset();

    /**
     * Now, in ms since the epoch, by the server's clock once it's known: for a change to a
     * record, at least just `after` the change it replaces, as that may have been dated by a
     * clock that was ahead, and a change must win over the one before it.
     */
    now(after = 0): number {
        return Math.max(Date.now() + this.offset, after + 1);
    }

    /**
     * The server said it was `serverNow` in reply to a request sent at `sentAt` and answered
     * at `receivedAt` (both by this device's clock): taken to be halfway between.
     */
    heard(serverNow: number, sentAt: number, receivedAt: number) {
        this.offset = Math.round(serverNow - (sentAt + receivedAt) / 2);
        localStorage.setItem(STORAGE_KEY, String(this.offset));
    }
}

function readOffset(): number {
    const offset = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(offset) ? offset : 0;
}
