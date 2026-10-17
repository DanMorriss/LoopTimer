import { TestBed } from '@angular/core/testing';
import { Timer } from '../../models/timer';
import { TimerStore } from './timer-store.service';

function makeTimer(overrides: Partial<Omit<Timer, 'id'>> = {}): Omit<Timer, 'id'> {
  return {
    title: 'Intervals',
    timerMinutes: 0,
    timerSeconds: 30,
    restMinutes: 0,
    restSeconds: 10,
    repeats: 3,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
    ...overrides
  };
}

function savedTimers(): Timer[] {
  return JSON.parse(localStorage.getItem('timers') ?? '[]');
}

describe('TimerStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  const createStore = () => TestBed.inject(TimerStore);

  describe('loading', () => {
    it('starts empty when nothing is saved', () => {
      expect(createStore().timers()).toEqual([]);
    });

    it('loads timers saved in localStorage', () => {
      const saved: Timer[] = [{ ...makeTimer({ title: 'Saved' }), id: 4 }];
      localStorage.setItem('timers', JSON.stringify(saved));

      expect(createStore().timers()).toEqual(saved);
    });

    it('starts empty instead of crashing when saved data is corrupted', () => {
      localStorage.setItem('timers', '{not valid json');

      expect(createStore().timers()).toEqual([]);
    });

    it('starts empty when saved data is not a list', () => {
      localStorage.setItem('timers', JSON.stringify({ title: 'oops' }));

      expect(createStore().timers()).toEqual([]);
    });

    it('keeps valid saved timers and drops broken ones', () => {
      const valid: Timer = { ...makeTimer(), id: 1 };
      const broken = [
        null,
        'text',
        { id: 2 },
        { ...makeTimer(), id: 0 },
        { ...makeTimer(), id: 3, title: 42 },
        { ...makeTimer(), id: 4, repeats: 0 },
        { ...makeTimer(), id: 5, timerSeconds: 60 },
        { ...makeTimer(), id: 6, restSeconds: -1 },
        { ...makeTimer(), id: 7, timerMinutes: 1.5 },
        { ...makeTimer(), id: 8, timerMinutes: 0, timerSeconds: 0 }
      ];
      localStorage.setItem('timers', JSON.stringify([valid, ...broken]));

      expect(createStore().timers()).toEqual([valid]);
    });
  });

  describe('active timer across page loads', () => {
    beforeEach(() => sessionStorage.clear());
    afterEach(() => sessionStorage.clear());

    it('remembers the active timer for this tab', () => {
      const store = createStore();
      const timer = store.addTimer(makeTimer());

      store.setActiveTimer(timer);

      expect(sessionStorage.getItem('activeTimerId')).toBe(String(timer.id));
    });

    it('restores the active timer when the app loads', () => {
      const saved: Timer = { ...makeTimer({ title: 'Saved' }), id: 3 };
      localStorage.setItem('timers', JSON.stringify([saved]));
      sessionStorage.setItem('activeTimerId', '3');

      expect(createStore().activeTimer()).toEqual(saved);
    });

    it('has no active timer when the remembered one no longer exists', () => {
      sessionStorage.setItem('activeTimerId', '3');

      expect(createStore().activeTimer()).toBeNull();
      expect(createStore().activeTimerStartedAt()).toBeNull();
    });

    it('records and remembers when the active timer was started', () => {
      const now = 1_700_000_000_000;
      spyOn(Date, 'now').and.returnValue(now);
      const store = createStore();
      const timer = store.addTimer(makeTimer());

      store.setActiveTimer(timer);

      expect(store.activeTimerStartedAt()).toBe(now);
      expect(sessionStorage.getItem('activeTimerStartedAt')).toBe(String(now));
    });

    it('restarts the clock when a timer is started again', () => {
      const dateNow = spyOn(Date, 'now').and.returnValue(1000);
      const store = createStore();
      const timer = store.addTimer(makeTimer());
      store.setActiveTimer(timer);

      dateNow.and.returnValue(5000);
      store.setActiveTimer(timer);

      expect(store.activeTimerStartedAt()).toBe(5000);
    });

    it('restores the start time when the app loads', () => {
      localStorage.setItem('timers', JSON.stringify([{ ...makeTimer(), id: 3 }]));
      sessionStorage.setItem('activeTimerId', '3');
      sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 42_000));

      const startedAt = createStore().activeTimerStartedAt()!;

      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(42_000);
      expect(Date.now() - startedAt).toBeLessThan(43_000);
    });

    for (const [label, saved] of [['missing', null], ['not a number', 'soon'], ['in the future', String(2_000_000_060_000)]] as const) {
      it(`starts the restored timer now when the saved start time is ${label}`, () => {
        spyOn(Date, 'now').and.returnValue(2_000_000_000_000);
        localStorage.setItem('timers', JSON.stringify([{ ...makeTimer(), id: 3 }]));
        sessionStorage.setItem('activeTimerId', '3');
        if (saved !== null) {
          sessionStorage.setItem('activeTimerStartedAt', saved);
        }

        expect(createStore().activeTimerStartedAt()).toBe(2_000_000_000_000);
      });
    }
  });

  describe('addTimer', () => {
    it('gives the first timer id 1 and saves it', () => {
      const store = createStore();

      const timer = store.addTimer(makeTimer());

      expect(timer.id).toBe(1);
      expect(store.timers()).toEqual([timer]);
      expect(savedTimers()).toEqual([timer]);
    });

    it('gives each new timer the next id after the highest existing one', () => {
      const store = createStore();
      store.addTimer(makeTimer());
      const second = store.addTimer(makeTimer());
      store.deleteTimer(1);

      const third = store.addTimer(makeTimer());

      expect(second.id).toBe(2);
      expect(third.id).toBe(3);
    });
  });

  describe('updateTimer', () => {
    it('replaces the timer, keeps its id, and saves', () => {
      const store = createStore();
      const original = store.addTimer(makeTimer({ title: 'Before' }));

      const updated = store.updateTimer(original.id, makeTimer({ title: 'After', repeats: 8 }));

      expect(updated).toEqual({ ...makeTimer({ title: 'After', repeats: 8 }), id: original.id });
      expect(store.timers()).toEqual([updated!]);
      expect(savedTimers()).toEqual([updated!]);
    });

    it('returns null and changes nothing when the timer does not exist', () => {
      const store = createStore();
      const existing = store.addTimer(makeTimer());

      expect(store.updateTimer(99, makeTimer({ title: 'Ghost' }))).toBeNull();
      expect(store.timers()).toEqual([existing]);
    });
  });

  describe('deleteTimer', () => {
    it('removes only the matching timer and saves', () => {
      const store = createStore();
      const keep = store.addTimer(makeTimer({ title: 'Keep' }));
      const remove = store.addTimer(makeTimer({ title: 'Remove' }));

      store.deleteTimer(remove.id);

      expect(store.timers()).toEqual([keep]);
      expect(savedTimers()).toEqual([keep]);
    });
  });

  describe('findTimerById', () => {
    it('returns the matching timer, or null when there is none', () => {
      const store = createStore();
      const timer = store.addTimer(makeTimer());

      expect(store.findTimerById(timer.id)).toEqual(timer);
      expect(store.findTimerById(42)).toBeNull();
    });
  });

  describe('setActiveTimer', () => {
    it('sets the active timer, which starts out empty', () => {
      const store = createStore();
      const timer = store.addTimer(makeTimer());
      expect(store.activeTimer()).toBeNull();

      store.setActiveTimer(timer);

      expect(store.activeTimer()).toEqual(timer);
    });
  });
});
