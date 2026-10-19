import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';

/**
 * Keeps the screen from dimming and locking while held, with the Screen Wake Lock API,
 * where the browser has it (Safari 16.4 and later, Chrome, Edge, Firefox).
 *
 * The browser lets go of the lock whenever the page is hidden, so it's asked for again
 * each time the page comes back while still held.
 */
@Service()
export class KeepAwakeService {
    private readonly document = inject(DOCUMENT);
    private readonly wakeLock = this.document.defaultView?.navigator.wakeLock;
    private sentinel: WakeLockSentinel | null = null;
    private held = false;

    readonly supported = !!this.wakeLock;

    constructor() {
        const onVisible = () => {
            if (this.held && this.document.visibilityState === 'visible') {
                void this.acquire();
            }
        };
        this.document.addEventListener('visibilitychange', onVisible);
        inject(DestroyRef).onDestroy(() => {
            this.document.removeEventListener('visibilitychange', onVisible);
            this.release();
        });
    }

    /** Holds the screen on, or lets it lock again. Holding it twice is the same as once. */
    hold(on: boolean) {
        if (on === this.held) {
            return;
        }
        this.held = on;
        if (on) {
            void this.acquire();
        } else {
            this.release();
        }
    }

    private async acquire() {
        if (!this.wakeLock || this.sentinel || this.document.visibilityState !== 'visible') {
            return;
        }
        try {
            const sentinel = await this.wakeLock.request('screen');
            // Let go while it was being asked for
            if (!this.held) {
                void sentinel.release();
                return;
            }
            this.sentinel = sentinel;
            sentinel.addEventListener('release', () => {
                if (this.sentinel === sentinel) {
                    this.sentinel = null;
                }
            });
        } catch {
            // Refused, e.g. low battery or not allowed here; the screen just locks as usual
        }
    }

    private release() {
        const sentinel = this.sentinel;
        this.sentinel = null;
        void sentinel?.release();
    }
}
