import { TestBed } from '@angular/core/testing';
import { KeepAwakeService } from './keep-awake.service';

/** A stand-in for navigator.wakeLock, recording requests and releases. */
function fakeWakeLock() {
    const sentinels: { released: boolean; releaseByBrowser: () => void }[] = [];
    const wakeLock = {
        request: vi.fn(async () => {
            const listeners: (() => void)[] = [];
            const sentinel = {
                released: false,
                release: vi.fn(async () => {
                    sentinel.released = true;
                }),
                addEventListener: (_: string, listener: () => void) => listeners.push(listener),
                // What the browser does when the page is hidden
                releaseByBrowser: () => {
                    sentinel.released = true;
                    listeners.forEach((listener) => listener());
                },
            };
            sentinels.push(sentinel);
            return sentinel;
        }),
    };
    Object.defineProperty(navigator, 'wakeLock', { value: wakeLock, configurable: true });
    return { wakeLock, sentinels };
}

describe('KeepAwakeService', () => {
    const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'wakeLock');
    afterEach(() => {
        // Back to the browser's own
        delete (navigator as unknown as Record<string, unknown>)['wakeLock'];
        if (original) {
            Object.defineProperty(Navigator.prototype, 'wakeLock', original);
        }
    });

    const settle = () => new Promise((resolve) => setTimeout(resolve));

    it('asks for the screen to stay on while held, once, and lets go when released', async () => {
        const { wakeLock, sentinels } = fakeWakeLock();
        const keepAwake = TestBed.inject(KeepAwakeService);
        expect(keepAwake.supported).toBe(true);

        keepAwake.hold(true);
        keepAwake.hold(true);
        await settle();
        expect(wakeLock.request).toHaveBeenCalledTimes(1);
        expect(wakeLock.request).toHaveBeenCalledWith('screen');

        keepAwake.hold(false);
        expect(sentinels[0].released).toBe(true);
    });

    it('asks again when the page comes back, as the browser lets go while it is hidden', async () => {
        const { wakeLock, sentinels } = fakeWakeLock();
        const keepAwake = TestBed.inject(KeepAwakeService);
        keepAwake.hold(true);
        await settle();

        sentinels[0].releaseByBrowser();
        document.dispatchEvent(new Event('visibilitychange'));
        await settle();

        expect(wakeLock.request).toHaveBeenCalledTimes(2);
    });

    it('lets go of a lock that arrives after it was no longer wanted', async () => {
        const { sentinels } = fakeWakeLock();
        const keepAwake = TestBed.inject(KeepAwakeService);

        keepAwake.hold(true);
        keepAwake.hold(false);
        await settle();

        expect(sentinels[0].released).toBe(true);
    });

    it('carries on quietly if the browser refuses', async () => {
        const { wakeLock } = fakeWakeLock();
        wakeLock.request.mockRejectedValueOnce(new DOMException('Low battery', 'NotAllowedError'));
        const keepAwake = TestBed.inject(KeepAwakeService);

        keepAwake.hold(true);
        await settle();

        expect(wakeLock.request).toHaveBeenCalledTimes(1);
    });

    it('does nothing where the browser has no wake lock', () => {
        Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
        const keepAwake = TestBed.inject(KeepAwakeService);

        expect(keepAwake.supported).toBe(false);
        expect(() => keepAwake.hold(true)).not.toThrow();
    });
});
