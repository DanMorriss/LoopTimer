import { TestBed } from '@angular/core/testing';
import { Timer } from '../../models/timer';
import { makeTimer as baseTimer, rest, SimpleTimer, work } from '../testing/make-timer';
import { TimerStore } from './timer-store.service';

// A new timer to add: the shared test timer without its id
function makeTimer(overrides: Partial<SimpleTimer> = {}): Omit<Timer, 'id'> {
    const { id: _id, ...timer } = baseTimer(overrides);
    return timer;
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
                { ...makeTimer(), id: 4, repeats: -1 },
                { ...makeTimer(), id: 5, steps: 'work' },
                { ...makeTimer(), id: 6, steps: [] },
                { ...makeTimer(), id: 7, steps: [rest(10)] },
                { ...makeTimer(), id: 8, steps: [work(0)] },
                { ...makeTimer(), id: 9, steps: [work(30.5)] },
                { ...makeTimer(), id: 10, steps: [work(100 * 60)] },
                { ...makeTimer(), id: 11, steps: [{ kind: 'jump', seconds: 30, name: '' }] },
                { ...makeTimer(), id: 12, steps: [{ kind: 'work', seconds: 30 }] },
            ];
            localStorage.setItem('timers', JSON.stringify([valid, ...broken]));

            expect(createStore().timers()).toEqual([valid]);
        });

        it("keeps each step's kind, length and name, in order", () => {
            const circuit: Timer = {
                ...makeTimer({ steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)] }),
                id: 1,
            };
            localStorage.setItem('timers', JSON.stringify([circuit]));

            expect(createStore().timers()).toEqual([circuit]);
        });

        describe('timers saved before steps', () => {
            const old = (overrides: Record<string, unknown> = {}) => ({
                id: 1,
                title: 'Old',
                timerMinutes: 1,
                timerSeconds: 5,
                restMinutes: 0,
                restSeconds: 20,
                repeats: 4,
                isTimerActive: false,
                isRestActive: false,
                isComplete: false,
                ...overrides,
            });
            const load = (saved: unknown[]) => {
                localStorage.setItem('timers', JSON.stringify(saved));
                return createStore().timers();
            };

            it('become a work step and a rest step', () => {
                expect(load([old()])).toEqual([
                    { id: 1, title: 'Old', steps: [work(65), rest(20)], repeats: 4 },
                ]);
            });

            it('have no rest step when there was no rest', () => {
                expect(load([old({ restSeconds: 0 })])[0].steps).toEqual([work(65)]);
            });

            it('are saved in the new format the next time anything changes', () => {
                const store = (load([old()]), TestBed.inject(TimerStore));

                store.addTimer(makeTimer());

                expect(savedTimers()[0]).toEqual({
                    id: 1,
                    title: 'Old',
                    steps: [work(65), rest(20)],
                    repeats: 4,
                });
            });

            it('are dropped when broken', () => {
                const broken = [
                    old({ timerSeconds: 60 }),
                    old({ restSeconds: -1 }),
                    old({ timerMinutes: 1.5 }),
                    old({ timerMinutes: 0, timerSeconds: 0 }),
                    old({ restMinutes: undefined }),
                ];

                expect(load(broken)).toEqual([]);
            });
        });

        it('keeps a timer that runs until stopped (repeats 0)', () => {
            const untilStopped: Timer = { ...makeTimer(), id: 1, repeats: 0 };
            localStorage.setItem('timers', JSON.stringify([untilStopped]));

            expect(createStore().timers()).toEqual([untilStopped]);
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
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);
            const store = createStore();
            const timer = store.addTimer(makeTimer());

            store.setActiveTimer(timer);

            expect(store.activeTimerStartedAt()).toBe(now);
            expect(sessionStorage.getItem('activeTimerStartedAt')).toBe(String(now));
        });

        it('restarts the clock when a timer is started again', () => {
            const dateNow = vi.spyOn(Date, 'now').mockReturnValue(1000);
            const store = createStore();
            const timer = store.addTimer(makeTimer());
            store.setActiveTimer(timer);

            dateNow.mockReturnValue(5000);
            store.setActiveTimer(timer);

            expect(store.activeTimerStartedAt()).toBe(5000);
        });

        it('restores the start time when the app loads', () => {
            localStorage.setItem('timers', JSON.stringify([{ ...makeTimer(), id: 3 }]));
            sessionStorage.setItem('activeTimerId', '3');
            sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 42000));

            const startedAt = createStore().activeTimerStartedAt()!;

            expect(Date.now() - startedAt).toBeGreaterThanOrEqual(42000);
            expect(Date.now() - startedAt).toBeLessThan(43000);
        });

        for (const [label, saved] of [
            ['missing', null],
            ['not a number', 'soon'],
            ['in the future', String(2000000060000)],
        ] as const) {
            it(`starts the restored timer now when the saved start time is ${label}`, () => {
                vi.spyOn(Date, 'now').mockReturnValue(2000000000000);
                localStorage.setItem('timers', JSON.stringify([{ ...makeTimer(), id: 3 }]));
                sessionStorage.setItem('activeTimerId', '3');
                if (saved !== null) {
                    sessionStorage.setItem('activeTimerStartedAt', saved);
                }

                expect(createStore().activeTimerStartedAt()).toBe(2000000000000);
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

            const updated = store.updateTimer(
                original.id,
                makeTimer({ title: 'After', repeats: 8 })
            );

            expect(updated).toEqual({
                ...makeTimer({ title: 'After', repeats: 8 }),
                id: original.id,
            });
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

    describe('pause, resume and stop', () => {
        beforeEach(() => {
            sessionStorage.clear();
            vi.useFakeTimers({ now: 1_000_000 });
        });
        afterEach(() => {
            vi.useRealTimers();
            sessionStorage.clear();
        });

        function startTimer() {
            const store = createStore();
            store.setActiveTimer(store.addTimer(makeTimer()));
            return store;
        }

        it('records and remembers when the timer was paused', () => {
            const store = startTimer();
            vi.advanceTimersByTime(5000);

            store.pause();

            expect(store.isPaused()).toBe(true);
            expect(store.activeTimerPausedAt()).toBe(1_005_000);
            expect(sessionStorage.getItem('activeTimerPausedAt')).toBe('1005000');
        });

        it('keeps the first pause time if paused twice', () => {
            const store = startTimer();
            store.pause();
            vi.advanceTimersByTime(3000);

            store.pause();

            expect(store.activeTimerPausedAt()).toBe(1_000_000);
        });

        it('does nothing when paused with no active timer', () => {
            const store = createStore();

            store.pause();

            expect(store.isPaused()).toBe(false);
            expect(sessionStorage.getItem('activeTimerPausedAt')).toBeNull();
        });

        it('moves the start time forward by the time spent paused when resumed', () => {
            const store = startTimer();
            vi.advanceTimersByTime(5000);
            store.pause();
            vi.advanceTimersByTime(60000);

            store.resume();

            expect(store.isPaused()).toBe(false);
            // 5s had run before the pause, and still has
            expect(Date.now() - store.activeTimerStartedAt()!).toBe(5000);
            expect(sessionStorage.getItem('activeTimerStartedAt')).toBe(
                String(store.activeTimerStartedAt())
            );
            expect(sessionStorage.getItem('activeTimerPausedAt')).toBeNull();
        });

        it('does nothing when resumed while running', () => {
            const store = startTimer();
            vi.advanceTimersByTime(5000);

            store.resume();

            expect(store.activeTimerStartedAt()).toBe(1_000_000);
        });

        it('starts unpaused when a timer is made active', () => {
            const store = startTimer();
            store.pause();

            store.setActiveTimer(store.addTimer(makeTimer({ title: 'Next' })));

            expect(store.isPaused()).toBe(false);
            expect(sessionStorage.getItem('activeTimerPausedAt')).toBeNull();
        });

        it('stays paused after the app reloads', () => {
            startTimer().pause();
            vi.advanceTimersByTime(30000);
            TestBed.resetTestingModule();

            const store = createStore();

            expect(store.isPaused()).toBe(true);
            expect(store.activeTimerPausedAt()).toBe(1_000_000);
        });

        for (const [label, saved] of [
            ['before the start time', '999999'],
            ['in the future', '9999999999999'],
            ['not a number', 'soon'],
        ]) {
            it(`runs rather than staying paused when the saved pause time is ${label}`, () => {
                startTimer();
                sessionStorage.setItem('activeTimerPausedAt', saved);
                TestBed.resetTestingModule();

                expect(createStore().isPaused()).toBe(false);
            });
        }

        it('clears the active timer, its times and what was saved for the tab when stopped', () => {
            const store = startTimer();
            store.pause();

            store.stop();

            expect(store.activeTimer()).toBeNull();
            expect(store.activeTimerStartedAt()).toBeNull();
            expect(store.isPaused()).toBe(false);
            expect(sessionStorage.getItem('activeTimerId')).toBeNull();
            expect(sessionStorage.getItem('activeTimerStartedAt')).toBeNull();
            expect(sessionStorage.getItem('activeTimerPausedAt')).toBeNull();
        });

        it('keeps the saved timers when stopped', () => {
            const store = startTimer();

            store.stop();

            expect(store.timers()).toHaveLength(1);
            expect(savedTimers()).toHaveLength(1);
        });
    });
});
