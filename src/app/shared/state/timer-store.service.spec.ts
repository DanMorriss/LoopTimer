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
