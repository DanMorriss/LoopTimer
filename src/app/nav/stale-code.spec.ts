import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationError } from '@angular/router';
import { isStaleCode, reloadOnStaleCode } from './stale-code';

/** A document whose window records where it was sent, with its own session storage. */
function fakeDocument() {
    const stored = new Map<string, string>();
    const assign = vi.fn();
    const document = {
        defaultView: {
            sessionStorage: {
                getItem: (key: string) => stored.get(key) ?? null,
                setItem: (key: string, value: string) => stored.set(key, value),
            },
            location: { assign },
        },
    };
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: document }] });
    return { assign };
}

function fail(url: string, error: unknown) {
    TestBed.runInInjectionContext(() => reloadOnStaleCode(new NavigationError(1, url, error)));
}

describe('isStaleCode', () => {
    it("knows each browser's words for a page's code failing to load", () => {
        expect(isStaleCode(new TypeError('Importing a module script failed.'))).toBe(true);
        expect(
            isStaleCode(new TypeError('Failed to fetch dynamically imported module: /chunk-OLD.js'))
        ).toBe(true);
        expect(isStaleCode(new TypeError('error loading dynamically imported module'))).toBe(true);
        expect(isStaleCode(new TypeError("'text/html' is not a valid JavaScript MIME type."))).toBe(
            true
        );
    });

    it('leaves other errors alone', () => {
        expect(
            isStaleCode(new TypeError("Cannot read properties of undefined (reading 'x')"))
        ).toBe(false);
        expect(isStaleCode(undefined)).toBe(false);
    });
});

describe('reloadOnStaleCode', () => {
    afterEach(() => vi.useRealTimers());

    it('loads the page afresh when its code has gone', () => {
        const { assign } = fakeDocument();

        fail('/history', new TypeError('Importing a module script failed.'));

        expect(assign).toHaveBeenCalledWith('/history');
    });

    it("doesn't reload for other errors", () => {
        const { assign } = fakeDocument();

        fail('/history', new Error('Something else'));

        expect(assign).not.toHaveBeenCalled();
    });

    it("doesn't reload again straight after a reload, so missing code can't loop", () => {
        vi.useFakeTimers();
        const { assign } = fakeDocument();
        const stale = new TypeError('Importing a module script failed.');

        fail('/settings', stale);
        vi.advanceTimersByTime(5_000);
        fail('/settings', stale);
        expect(assign).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(10_000);
        fail('/settings', stale);
        expect(assign).toHaveBeenCalledTimes(2);
    });
});
