import { TestBed } from '@angular/core/testing';
import { MAX_WORKOUTS_A_DAY } from '../../models/plan';
import { PlanStore } from './plan-store.service';

describe('PlanStore', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    const createStore = () => TestBed.inject(PlanStore);

    it('starts with nothing planned, never changed', () => {
        const store = createStore();

        expect(store.plan()).toEqual({ days: [[], [], [], [], [], [], []], updatedAt: 0 });
        expect(store.hasPlan()).toBe(false);
    });

    it('plans a workout on a day once, dated now, and saves it for next time', () => {
        vi.spyOn(Date, 'now').mockReturnValue(5_000);
        const store = createStore();

        store.add(0, 'legs');
        store.add(0, 'legs');
        store.add(2, 'push');

        expect(store.plan()).toEqual({
            days: [['legs'], [], ['push'], [], [], [], []],
            // Each change after the last, as the sync clock dates them
            updatedAt: 5_001,
        });
        expect(store.hasPlan()).toBe(true);
        TestBed.resetTestingModule();
        expect(createStore().plan().days[2]).toEqual(['push']);
    });

    it('takes a workout off a day, leaving the others', () => {
        const store = createStore();
        store.add(4, 'push');
        store.add(4, 'pull');

        store.remove(4, 'push');

        expect(store.plan().days[4]).toEqual(['pull']);
    });

    it(`plans at most ${MAX_WORKOUTS_A_DAY} workouts on a day`, () => {
        const store = createStore();
        for (let i = 0; i <= MAX_WORKOUTS_A_DAY; i++) {
            store.add(1, `w${i}`);
        }

        expect(store.plan().days[1]).toHaveLength(MAX_WORKOUTS_A_DAY);
    });

    it("takes another copy's plan only if it changed more recently", () => {
        vi.spyOn(Date, 'now').mockReturnValue(5_000);
        const store = createStore();
        store.add(0, 'legs');
        const days = [[], ['push'], [], [], [], [], []];

        expect(store.merge({ days, updatedAt: 4_000 })).toBe(false);
        expect(store.plan().days[0]).toEqual(['legs']);
        expect(store.merge({ days, updatedAt: 6_000 })).toBe(true);
        expect(store.plan()).toEqual({ days, updatedAt: 6_000 });
    });

    it('starts empty from a broken saved plan', () => {
        localStorage.setItem('week-plan', '{"days": "nope"}');

        expect(createStore().plan().updatedAt).toBe(0);
    });
});
