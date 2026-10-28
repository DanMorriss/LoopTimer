import { TestBed } from '@angular/core/testing';
import { SyncClock } from './sync-clock.service';

describe('SyncClock', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    });
    afterEach(() => localStorage.clear());

    it("is the device's own clock until it's heard the server's", () => {
        expect(TestBed.inject(SyncClock).now()).toBe(1_000_000);
    });

    it("goes by the server's clock once it's heard it, and remembers how far off it is", () => {
        // Asked at 999,000 and answered at 1,001,000: the server said 1,060,000 halfway
        TestBed.inject(SyncClock).heard(1_060_000, 999_000, 1_001_000);
        expect(TestBed.inject(SyncClock).now()).toBe(1_060_000);

        TestBed.resetTestingModule();
        expect(TestBed.inject(SyncClock).now()).toBe(1_060_000);
    });

    it('dates a change just after the one it replaces, if that was dated ahead', () => {
        const clock = TestBed.inject(SyncClock);

        expect(clock.now(2_000_000)).toBe(2_000_001);
        expect(clock.now(500)).toBe(1_000_000);
    });
});
