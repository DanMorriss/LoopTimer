import { TestBed } from '@angular/core/testing';
import { Timer, TimerFields } from '../../models/timer';
import { LoggedSet } from '../../models/history';
import { makeTimer as baseTimer, reps, rest, SimpleTimer, work } from '../testing/make-timer';
import { ExerciseStore } from './exercise-store.service';
import { TimerStore } from './timer-store.service';

// What Done logs in the rep step tests: round 1's push-ups
const SET: LoggedSet = { round: 0, step: 1, name: '', reps: 20 };

// A new timer to add: the shared test timer without its id and date
function makeTimer(overrides: Partial<SimpleTimer> = {}): TimerFields {
    const { id: _id, updatedAt: _updatedAt, ...timer } = baseTimer(overrides);
    return timer;
}

function savedTimers(): Timer[] {
    return JSON.parse(localStorage.getItem('timers') ?? '[]');
}

describe('TimerStore', () => {
    beforeEach(() => {
        localStorage.clear();
        // Saved as this version of the app saves it, so loading isn't converting (see migrate.spec)
        localStorage.setItem('data-version', '3');
    });
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(TimerStore);

    describe('loading', () => {
        it('starts empty when nothing is saved', () => {
            expect(createStore().timers()).toEqual([]);
        });

        it('loads timers saved in localStorage', () => {
            const saved: Timer[] = [
                { ...makeTimer({ title: 'Saved' }), id: 'timer-4', updatedAt: 1 },
            ];
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
            const valid: Timer = { ...makeTimer(), id: 'timer-1', updatedAt: 1 };
            const broken = [
                null,
                'text',
                { id: 'timer-2', updatedAt: 1 },
                { ...makeTimer(), id: '', updatedAt: 1 },
                { ...makeTimer(), id: 'timer-3', updatedAt: 1, title: 42 },
                { ...makeTimer(), id: 'timer-4', updatedAt: 1, repeats: -1 },
                { ...makeTimer(), id: 'timer-5', updatedAt: 1, steps: 'work' },
                { ...makeTimer(), id: 'timer-6', updatedAt: 1, steps: [] },
                { ...makeTimer(), id: 'timer-7', updatedAt: 1, steps: [rest(10)] },
                { ...makeTimer(), id: 'timer-8', updatedAt: 1, steps: [work(0)] },
                { ...makeTimer(), id: 'timer-9', updatedAt: 1, steps: [work(30.5)] },
                { ...makeTimer(), id: 'timer-10', updatedAt: 1, steps: [work(100 * 60)] },
                {
                    ...makeTimer(),
                    id: 'timer-11',
                    updatedAt: 1,
                    steps: [{ kind: 'jump', seconds: 30, name: '' }],
                },
                {
                    ...makeTimer(),
                    id: 'timer-12',
                    updatedAt: 1,
                    steps: [{ kind: 'work', seconds: 30 }],
                },
            ];
            localStorage.setItem('timers', JSON.stringify([valid, ...broken]));

            expect(createStore().timers()).toEqual([valid]);
        });

        it('loads rep steps, and drops timers with broken ones', () => {
            const valid: Timer = {
                ...makeTimer({ steps: [work(30), reps(20, 'Push-ups'), rest(10)] }),
                id: 'timer-1',
                updatedAt: 1,
            };
            const allReps: Timer = {
                ...makeTimer({ steps: [reps(5)] }),
                id: 'timer-2',
                updatedAt: 1,
            };
            const broken = [
                { ...makeTimer(), id: 'timer-3', updatedAt: 1, steps: [reps(0)] },
                { ...makeTimer(), id: 'timer-4', updatedAt: 1, steps: [reps(101)] },
                {
                    ...makeTimer(),
                    id: 'timer-5',
                    updatedAt: 1,
                    steps: [{ kind: 'reps', seconds: 30, name: '' }],
                },
                {
                    ...makeTimer(),
                    id: 'timer-6',
                    updatedAt: 1,
                    steps: [{ kind: 'reps', reps: 2.5, name: '' }],
                },
            ];
            localStorage.setItem('timers', JSON.stringify([valid, allReps, ...broken]));

            expect(createStore().timers()).toEqual([valid, allReps]);
        });

        it("loads a rep step's weight, if it has one, and drops timers with a broken one", () => {
            const weighted: Timer = {
                ...makeTimer({
                    steps: [{ kind: 'reps', reps: 10, name: 'Squats', weight: 20.412 }, reps(5)],
                }),
                id: 'timer-1',
                updatedAt: 1,
            };
            const broken = [0, -5, 300.5, '60'].map((weight, i) => ({
                ...makeTimer(),
                id: i + 2,
                steps: [{ kind: 'reps', reps: 10, name: '', weight }],
            }));
            localStorage.setItem('timers', JSON.stringify([weighted, ...broken]));

            expect(createStore().timers()).toEqual([weighted]);
        });

        it("keeps each step's kind, length and name, in order", () => {
            const circuit: Timer = {
                ...makeTimer({ steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)] }),
                id: 'timer-1',
                updatedAt: 1,
            };
            localStorage.setItem('timers', JSON.stringify([circuit]));

            expect(createStore().timers()).toEqual([circuit]);
        });

        describe('timers saved before steps', () => {
            const old = (overrides: Record<string, unknown> = {}) => ({
                id: 'timer-1',
                updatedAt: 1,
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
                    {
                        id: 'timer-1',
                        updatedAt: 1,
                        title: 'Old',
                        steps: [work(65), rest(20)],
                        repeats: 4,
                    },
                ]);
            });

            it('have no rest step when there was no rest', () => {
                expect(load([old({ restSeconds: 0 })])[0].steps).toEqual([work(65)]);
            });

            it('are saved in the new format the next time anything changes', () => {
                const store = (load([old()]), TestBed.inject(TimerStore));

                store.addTimer(makeTimer());

                expect(savedTimers()[0]).toEqual({
                    id: 'timer-1',
                    updatedAt: 1,
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
            const untilStopped: Timer = { ...makeTimer(), id: 'timer-1', updatedAt: 1, repeats: 0 };
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
            const saved: Timer = { ...makeTimer({ title: 'Saved' }), id: 'timer-3', updatedAt: 1 };
            localStorage.setItem('timers', JSON.stringify([saved]));
            sessionStorage.setItem('activeTimerId', 'timer-3');

            expect(createStore().activeTimer()).toEqual(saved);
        });

        it('has no active timer when the remembered one no longer exists', () => {
            sessionStorage.setItem('activeTimerId', 'timer-3');

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
            localStorage.setItem(
                'timers',
                JSON.stringify([{ ...makeTimer(), id: 'timer-3', updatedAt: 1 }])
            );
            sessionStorage.setItem('activeTimerId', 'timer-3');
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
                localStorage.setItem(
                    'timers',
                    JSON.stringify([{ ...makeTimer(), id: 'timer-3', updatedAt: 1 }])
                );
                sessionStorage.setItem('activeTimerId', 'timer-3');
                if (saved !== null) {
                    sessionStorage.setItem('activeTimerStartedAt', saved);
                }

                expect(createStore().activeTimerStartedAt()).toBe(2000000000000);
            });
        }
    });

    describe('addTimer', () => {
        it('gives a new timer a random id, dates it, and saves it', () => {
            vi.spyOn(Date, 'now').mockReturnValue(5000);
            const store = createStore();

            const timer = store.addTimer(makeTimer());

            expect(timer.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(timer.updatedAt).toBe(5000);
            expect(store.timers()).toEqual([timer]);
            expect(savedTimers()).toEqual([timer]);
        });

        it('never gives two timers the same id', () => {
            const store = createStore();
            const ids = Array.from({ length: 20 }, () => store.addTimer(makeTimer()).id);

            expect(new Set(ids).size).toBe(20);
        });
    });

    describe('linking steps to exercises', () => {
        it('links named work steps by name when a timer is saved, making your own as needed', () => {
            const store = createStore();

            const timer = store.addTimer(
                makeTimer({
                    steps: [
                        reps(10, 'Squats'),
                        rest(60, 'Breathe'),
                        work(30, 'Wall sit hold'),
                        reps(5),
                    ],
                })
            );

            const mine = TestBed.inject(ExerciseStore).own();
            expect(mine.map((e) => [e.name, e.measuredBy])).toEqual([['Wall sit hold', 'timed']]);
            expect(timer.steps.map((s) => s.exerciseId)).toEqual([
                'builtin:back-squat',
                undefined,
                mine[0].id,
                undefined,
            ]);
            expect(savedTimers()[0].steps[0].exerciseId).toBe('builtin:back-squat');
        });

        it('links again when a timer is edited, so a renamed step follows its name', () => {
            const store = createStore();
            const timer = store.addTimer(makeTimer({ steps: [reps(10, 'Squats')] }));

            const updated = store.updateTimer(
                timer.id,
                makeTimer({ steps: [reps(10, 'Push-ups')] })
            );

            expect(updated!.steps[0].exerciseId).toBe('builtin:push-up');
        });

        it('keeps the exercise picked for a step, whatever its name', () => {
            const timer = createStore().addTimer(
                makeTimer({ steps: [{ ...reps(10, 'Squats'), exerciseId: 'builtin:front-squat' }] })
            );

            expect(timer.steps[0].exerciseId).toBe('builtin:front-squat');
        });

        it('gives the steps of a renamed exercise its new name, in every timer and the one running', () => {
            const store = createStore();
            const mine = TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
            const first = store.addTimer(
                makeTimer({ steps: [reps(10, 'sled push'), rest(30), reps(5, 'Squats')] })
            );
            const other = store.addTimer(makeTimer({ steps: [reps(8, 'Push-ups')] }));
            store.setActiveTimer(first);
            vi.spyOn(Date, 'now').mockReturnValue(first.updatedAt + 5);

            store.renameExerciseSteps(mine.id, 'Sled drag');

            const [renamed, untouched] = store.timers();
            expect(renamed.steps.map((s) => s.name)).toEqual(['Sled drag', '', 'Squats']);
            expect(renamed.updatedAt).toBe(first.updatedAt + 5);
            expect(untouched).toEqual(other);
            expect(store.activeTimer()?.steps[0].name).toBe('Sled drag');
            expect(savedTimers()[0].steps[0].name).toBe('Sled drag');
        });

        it("keeps a saved step's link when loading", () => {
            const saved = {
                ...baseTimer({
                    steps: [{ ...reps(10, 'Squats'), exerciseId: 'builtin:back-squat' }],
                }),
            };
            localStorage.setItem('timers', JSON.stringify([saved]));

            expect(createStore().timers()[0].steps[0].exerciseId).toBe('builtin:back-squat');
        });
    });

    describe('updateTimer', () => {
        it('replaces the timer, keeps its id, dates the change, and saves', () => {
            const store = createStore();
            const original = store.addTimer(makeTimer({ title: 'Before' }));
            vi.spyOn(Date, 'now').mockReturnValue(original.updatedAt + 1000);

            const updated = store.updateTimer(
                original.id,
                makeTimer({ title: 'After', repeats: 8 })
            );

            expect(updated).toEqual({
                ...makeTimer({ title: 'After', repeats: 8 }),
                id: original.id,
                updatedAt: original.updatedAt + 1000,
            });
            expect(store.timers()).toEqual([updated!]);
            expect(savedTimers()).toEqual([updated!]);
        });

        it('returns null and changes nothing when the timer does not exist', () => {
            const store = createStore();
            const existing = store.addTimer(makeTimer());

            expect(store.updateTimer('timer-99', makeTimer({ title: 'Ghost' }))).toBeNull();
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

        it('leaves a deletion behind, dated, so it can reach other copies', () => {
            const store = createStore();
            const timer = store.addTimer(makeTimer());
            vi.spyOn(Date, 'now').mockReturnValue(9000);

            store.deleteTimer(timer.id);

            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'timer', id: timer.id, deletedAt: 9000 },
            ]);
        });
    });

    describe('mergeTimers', () => {
        const saved = (overrides: Partial<SimpleTimer>) => baseTimer(overrides);

        it('adds new timers, keeps their ids, and takes the newer of the same timer', () => {
            localStorage.setItem(
                'timers',
                JSON.stringify([
                    saved({ id: 'a', title: 'Old here', updatedAt: 100 }),
                    saved({ id: 'b', title: 'New here', updatedAt: 300 }),
                ])
            );
            const store = createStore();

            const result = store.mergeTimers(
                [
                    saved({ id: 'a', title: 'New there', updatedAt: 200 }),
                    saved({ id: 'b', title: 'Old there', updatedAt: 200 }),
                    saved({ id: 'c', title: 'Only there', updatedAt: 200 }),
                ],
                []
            );

            expect(result).toEqual({ added: 1, updated: 1, removed: 0 });
            expect(store.timers().map((t) => [t.id, t.title])).toEqual([
                ['a', 'New there'],
                ['b', 'New here'],
                ['c', 'Only there'],
            ]);
            expect(savedTimers().map((t) => t.id)).toEqual(['a', 'b', 'c']);
        });

        it('removes a timer deleted there since it changed here, and remembers that', () => {
            localStorage.setItem(
                'timers',
                JSON.stringify([
                    saved({ id: 'a', updatedAt: 100 }),
                    saved({ id: 'b', updatedAt: 500 }),
                ])
            );
            const store = createStore();

            const result = store.mergeTimers(
                [],
                [
                    { kind: 'timer', id: 'a', deletedAt: 200 },
                    { kind: 'timer', id: 'b', deletedAt: 200 },
                ]
            );

            expect(result.removed).toBe(1);
            // b changed here after it was deleted there, so it stays
            expect(store.timers().map((t) => t.id)).toEqual(['b']);
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'timer', id: 'a', deletedAt: 200 },
            ]);
        });

        it("doesn't bring back a timer deleted here, unless it changed there after", () => {
            const store = createStore();
            vi.spyOn(Date, 'now').mockReturnValue(1000);
            const timer = store.addTimer(makeTimer({ title: 'Gone' }));
            vi.spyOn(Date, 'now').mockReturnValue(2000);
            store.deleteTimer(timer.id);

            store.mergeTimers([{ ...timer, updatedAt: 1000 }], []);
            expect(store.timers()).toEqual([]);

            store.mergeTimers([{ ...timer, title: 'Changed', updatedAt: 3000 }], []);
            expect(store.timers().map((t) => t.title)).toEqual(['Changed']);
        });
    });

    describe('findTimerById', () => {
        it('returns the matching timer, or null when there is none', () => {
            const store = createStore();
            const timer = store.addTimer(makeTimer());

            expect(store.findTimerById(timer.id)).toEqual(timer);
            expect(store.findTimerById('timer-42')).toBeNull();
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
            expect(store.activeRunStartedAt()).toBeNull();
            expect(sessionStorage.getItem('activeRunStartedAt')).toBeNull();
            expect(sessionStorage.getItem('activeTimerPausedAt')).toBeNull();
        });

        it('remembers when the run really began, which resuming does not move', () => {
            const store = startTimer();
            vi.advanceTimersByTime(5000);
            store.pause();
            vi.advanceTimersByTime(60000);
            store.resume();

            expect(store.activeRunStartedAt()).toBe(1_000_000);
            expect(store.activeTimerStartedAt()).toBe(1_060_000);
            expect(sessionStorage.getItem('activeRunStartedAt')).toBe('1000000');
        });

        it('restores when the run began after the app reloads', () => {
            startTimer().pause();
            vi.advanceTimersByTime(30000);
            TestBed.resetTestingModule();

            expect(createStore().activeRunStartedAt()).toBe(1_000_000);
        });

        it('falls back to the start time for a run saved before this was remembered', () => {
            startTimer();
            sessionStorage.removeItem('activeRunStartedAt');
            TestBed.resetTestingModule();

            expect(createStore().activeRunStartedAt()).toBe(1_000_000);
        });

        it('keeps the saved timers when stopped', () => {
            const store = startTimer();

            store.stop();

            expect(store.timers()).toHaveLength(1);
            expect(savedTimers()).toHaveLength(1);
        });
    });

    describe('rep steps', () => {
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
            store.setActiveTimer(store.addTimer(makeTimer({ steps: [work(10), reps(20)] })));
            return store;
        }

        it('moves the start on by the time the rep step took, and counts it done', () => {
            const store = startTimer();
            vi.advanceTimersByTime(40_000); // 10s of work, then 30s of push-ups

            store.finishRepStep(30_000, SET);

            expect(store.activeTimerStartedAt()).toBe(1_030_000);
            expect(store.activeRepStepsDone()).toBe(1);
            expect(store.activeRepMs()).toBe(30_000);
            expect(store.activeRunStartedAt()).toBe(1_000_000);
        });

        it('remembers them across a refresh', () => {
            const store = startTimer();
            vi.advanceTimersByTime(40_000);
            store.finishRepStep(30_000, SET);

            TestBed.resetTestingModule();
            const reloaded = createStore();

            expect(reloaded.activeTimerStartedAt()).toBe(1_030_000);
            expect(reloaded.activeRepStepsDone()).toBe(1);
            expect(reloaded.activeRepMs()).toBe(30_000);
            expect(reloaded.activeSets()).toEqual([SET]);
        });

        it('logs each set done, in order', () => {
            const store = startTimer();
            const heavier = { ...SET, round: 1, weight: 62.5 };

            store.finishRepStep(1000, SET);
            store.finishRepStep(1000, heavier);

            expect(store.activeSets()).toEqual([SET, heavier]);
        });

        it('drops broken saved sets after a refresh, keeping the rest', () => {
            startTimer();
            sessionStorage.setItem(
                'activeSets',
                JSON.stringify([SET, { ...SET, reps: 0 }, { ...SET, weight: 'heavy' }])
            );

            TestBed.resetTestingModule();

            expect(createStore().activeSets()).toEqual([SET]);
        });

        it('treats a missing or broken saved count as none done', () => {
            startTimer();
            sessionStorage.setItem('activeRepStepsDone', 'lots');
            sessionStorage.setItem('activeRepMs', '-5');

            TestBed.resetTestingModule();
            const reloaded = createStore();

            expect(reloaded.activeRepStepsDone()).toBe(0);
            expect(reloaded.activeRepMs()).toBe(0);
        });

        it('carries on running when Done is pressed while paused', () => {
            const store = startTimer();
            vi.advanceTimersByTime(15_000);
            store.pause();
            vi.advanceTimersByTime(60_000);

            store.finishRepStep(5_000, SET);

            expect(store.isPaused()).toBe(false);
            // 60s paused, then 5s on the rep step
            expect(store.activeTimerStartedAt()).toBe(1_065_000);
        });

        it('starts again from none done for a new run, or after stopping', () => {
            const store = startTimer();
            store.finishRepStep(1000, SET);

            store.setActiveTimer(store.timers()[0]);
            expect(store.activeRepStepsDone()).toBe(0);
            expect(store.activeRepMs()).toBe(0);

            store.finishRepStep(1000, SET);
            store.stop();
            expect(store.activeRepStepsDone()).toBe(0);
            expect(sessionStorage.getItem('activeRepStepsDone')).toBeNull();
            expect(sessionStorage.getItem('activeRepMs')).toBeNull();
            expect(store.activeSets()).toEqual([]);
            expect(sessionStorage.getItem('activeSets')).toBeNull();
        });

        it('does nothing with no active timer', () => {
            const store = createStore();

            store.finishRepStep(1000, SET);

            expect(store.activeRepStepsDone()).toBe(0);
        });

        it('changes a step of the running timer, and of the saved one', () => {
            const store = startTimer();
            const heavier = { kind: 'reps' as const, reps: 12, name: '', weight: 60 };

            store.updateActiveStep(1, heavier);

            expect(store.activeTimer()!.steps).toEqual([work(10), heavier]);
            expect(store.timers()[0].steps).toEqual([work(10), heavier]);
            expect(JSON.parse(localStorage.getItem('timers')!)[0].steps[1]).toEqual(heavier);
        });

        it('changes only the running timer once the saved one has gone', () => {
            const store = startTimer();
            store.deleteTimer(store.activeTimer()!.id);

            store.updateActiveStep(1, reps(12));

            expect(store.activeTimer()!.steps[1]).toEqual(reps(12));
            expect(store.timers()).toEqual([]);
        });
    });
});
