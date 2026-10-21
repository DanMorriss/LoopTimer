import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { Deletion } from '../../models/sync';
import { Timer } from '../../models/timer';
import { ExerciseStore } from '../state/exercise-store.service';
import { HistoryStore } from '../state/history-store.service';
import { SettingsStore } from '../state/settings-store.service';
import { TimerStore } from '../state/timer-store.service';
import { makeTimer } from '../testing/make-timer';
import { BackupFile, MAX_BACKUP_BYTES } from './backup-file';
import { BackupService, ImportResult } from './backup.service';

function makeEntry(startedAt: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    return {
        id: `${startedAt}-timer-1`,
        timerId: 'timer-1',
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 60_000,
        updatedAt: startedAt + 60_000,
        activeSeconds: 60,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

const backupOf = (timers: Timer[], history: HistoryEntry[], deleted: Deletion[] = []) =>
    new Blob([
        JSON.stringify({ app: 'LoopTimer', version: 2, exportedAt: 1, timers, history, deleted }),
    ]);

/** What's here before the import, saved as the app would have saved it. */
function savedHere(timers: Timer[], history: HistoryEntry[] = []) {
    localStorage.setItem('timers', JSON.stringify(timers));
    localStorage.setItem('history', JSON.stringify(history));
}

const result = (counts: Partial<ImportResult & { ok: true }>): ImportResult => ({
    ok: true,
    timersAdded: 0,
    timersUpdated: 0,
    workoutsAdded: 0,
    workoutsUpdated: 0,
    exercisesAdded: 0,
    exercisesUpdated: 0,
    removed: 0,
    skipped: 0,
    ...counts,
});

describe('BackupService', () => {
    let backup: BackupService;
    const timers = () => TestBed.inject(TimerStore);
    const history = () => TestBed.inject(HistoryStore);

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '3');
    });
    afterEach(() => localStorage.clear());

    // The stores read what's saved when they're made, so tests save first, then start
    const start = () => (backup = TestBed.inject(BackupService));

    describe('export', () => {
        it('downloads everything as a dated JSON file, deletions included', async () => {
            start();
            timers().addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });
            const gone = timers().addTimer({ title: 'Gone', steps: makeTimer().steps, repeats: 1 });
            timers().deleteTimer(gone.id);
            history().record(makeEntry(1_000_000));
            TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
            let blob: Blob | undefined;
            vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
                blob = b as Blob;
                return 'blob:backup';
            });
            const click = vi
                .spyOn(HTMLAnchorElement.prototype, 'click')
                .mockImplementation(() => {});

            const name = backup.export();

            expect(name).toMatch(/^looptimer-\d{4}-\d{2}-\d{2}\.json$/);
            expect(click).toHaveBeenCalledTimes(1);
            const link = click.mock.contexts[0] as HTMLAnchorElement;
            expect(link.download).toBe(name);
            expect(link.href).toBe('blob:backup');
            const file: BackupFile = JSON.parse(await blob!.text());
            expect(file.app).toBe('LoopTimer');
            expect(file.version).toBe(3);
            expect(file.timers).toEqual(timers().timers());
            expect(file.history).toEqual(history().entries());
            expect(file.deleted).toEqual([
                { kind: 'timer', id: gone.id, deletedAt: expect.any(Number) },
            ]);
            expect(file.settings.weightUnit).toBe('lb');
        });
    });

    describe('import', () => {
        it('adds timers and workouts that are new, keeping their ids, and saves them', async () => {
            start();
            const legs = makeTimer({ id: 'legs', title: 'Legs' });

            expect(await backup.import(backupOf([legs], [makeEntry(1_000_000)]))).toEqual(
                result({ timersAdded: 1, workoutsAdded: 1 })
            );
            expect(timers().timers()).toEqual([legs]);
            expect(history().entries()).toEqual([makeEntry(1_000_000)]);
            expect(JSON.parse(localStorage.getItem('timers')!)).toEqual([legs]);
            expect(JSON.parse(localStorage.getItem('history')!)).toHaveLength(1);
        });

        it('takes the most recent change to each timer and workout', async () => {
            savedHere(
                [
                    makeTimer({ id: 'a', title: 'Old here', updatedAt: 100 }),
                    makeTimer({ id: 'b', title: 'New here', updatedAt: 300 }),
                ],
                [makeEntry(1_000_000, { updatedAt: 100 })]
            );
            start();

            const imported = await backup.import(
                backupOf(
                    [
                        makeTimer({ id: 'a', title: 'New there', updatedAt: 200 }),
                        makeTimer({ id: 'b', title: 'Old there', updatedAt: 200 }),
                    ],
                    [makeEntry(1_000_000, { note: 'felt strong', updatedAt: 200 })]
                )
            );

            expect(imported).toEqual(result({ timersUpdated: 1, workoutsUpdated: 1 }));
            expect(
                timers()
                    .timers()
                    .map((t) => t.title)
            ).toEqual(['New there', 'New here']);
            expect(history().entries()[0].note).toBe('felt strong');
        });

        it('deletes what was deleted there, unless it has changed here since', async () => {
            savedHere(
                [makeTimer({ id: 'a', updatedAt: 100 }), makeTimer({ id: 'b', updatedAt: 500 })],
                [makeEntry(1_000_000, { updatedAt: 100 })]
            );
            start();

            const imported = await backup.import(
                backupOf(
                    [],
                    [],
                    [
                        { kind: 'timer', id: 'a', deletedAt: 200 },
                        { kind: 'timer', id: 'b', deletedAt: 200 },
                        { kind: 'history', id: '1000000-timer-1', deletedAt: 200 },
                    ]
                )
            );

            expect(imported).toEqual(result({ removed: 2 }));
            expect(
                timers()
                    .timers()
                    .map((t) => t.id)
            ).toEqual(['b']);
            expect(history().entries()).toEqual([]);
        });

        it("doesn't bring back a workout deleted here", async () => {
            start();
            history().record(makeEntry(1_000_000));
            history().delete('1000000-timer-1');

            expect(await backup.import(backupOf([], [makeEntry(1_000_000)]))).toEqual(result({}));
            expect(history().entries()).toEqual([]);
        });

        it('adds nothing when everything is already here', async () => {
            const legs = makeTimer({ id: 'legs', title: 'Legs' });
            savedHere([legs], [makeEntry(1_000_000)]);
            start();

            expect(await backup.import(backupOf([legs], [makeEntry(1_000_000)]))).toEqual(
                result({})
            );
        });

        it("leaves this device's settings as they are", async () => {
            start();
            const settings = TestBed.inject(SettingsStore);
            const file = new Blob([
                JSON.stringify({
                    app: 'LoopTimer',
                    version: 2,
                    exportedAt: 1,
                    timers: [],
                    history: [],
                    settings: { theme: 'light', weightUnit: 'lb' },
                }),
            ]);

            await backup.import(file);

            expect(settings.theme()).toBe('dark');
            expect(settings.weightUnit()).toBe('kg');
        });

        it('changes nothing when the file is no good', async () => {
            start();
            timers().addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });

            expect(await backup.import(new Blob(['{"app":"Other"}']))).toEqual({
                ok: false,
                problem: 'not-a-backup',
            });
            expect(timers().timers()).toHaveLength(1);
        });

        it('turns down a file far too big to be a backup, without reading it', async () => {
            start();
            const file = new Blob(['x']);
            Object.defineProperty(file, 'size', { value: MAX_BACKUP_BYTES + 1 });
            const text = vi.spyOn(file, 'text');

            expect(await backup.import(file)).toEqual({ ok: false, problem: 'too-big' });
            expect(text).not.toHaveBeenCalled();
        });
    });

    describe('import from version 1', () => {
        const v1Backup = (oldTimers: unknown[], oldHistory: unknown[]) =>
            new Blob([
                JSON.stringify({
                    app: 'LoopTimer',
                    version: 1,
                    exportedAt: 1,
                    timers: oldTimers,
                    history: oldHistory,
                }),
            ]);
        const v1Timer = (id: number, title: string, repeats = 3) => {
            const { id: _id, updatedAt: _at, ...timer } = makeTimer({ title, repeats });
            return { ...timer, id };
        };

        it('matches timers on what they are, since their ids were only per device', async () => {
            start();
            const here = timers().addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });

            const imported = await backup.import(
                v1Backup([v1Timer(9, 'Legs'), v1Timer(1, 'Arms')], [])
            );

            expect(imported).toEqual(result({ timersAdded: 1 }));
            expect(
                timers()
                    .timers()
                    .map((t) => t.title)
            ).toEqual(['Legs', 'Arms']);
            expect(timers().timers()[0]).toEqual(here);
            expect(timers().timers()[1].id).toMatch(/^[0-9a-f-]{36}$/);
        });

        it('keeps a timer changed since the backup, and adds the backup one alongside', async () => {
            start();
            timers().addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 5 });

            await backup.import(v1Backup([v1Timer(1, 'Legs', 3)], []));

            expect(
                timers()
                    .timers()
                    .map((t) => t.repeats)
            ).toEqual([5, 3]);
        });

        it('leaves workouts already here as they are, notes and all', async () => {
            const { updatedAt: _u, ...old } = makeEntry(1_000_000);
            savedHere([], [makeEntry(1_000_000, { note: 'felt strong' })]);
            start();

            const imported = await backup.import(
                v1Backup(
                    [],
                    [old, { ...old, id: 'other', startedAt: 2_000_000, endedAt: 2_060_000 }]
                )
            );

            expect(imported).toEqual(result({ workoutsAdded: 1 }));
            expect(
                history()
                    .entries()
                    .map((e) => e.note)
            ).toEqual([undefined, 'felt strong']);
        });
    });

    describe('exercises', () => {
        const fileOf = (contents: Record<string, unknown>) =>
            new Blob([
                JSON.stringify({
                    app: 'LoopTimer',
                    version: 3,
                    exportedAt: 1,
                    timers: [],
                    history: [],
                    exercises: [],
                    exerciseNotes: [],
                    deleted: [],
                    ...contents,
                }),
            ]);

        it('exports your own exercises and your notes', async () => {
            start();
            const exercises = TestBed.inject(ExerciseStore);
            const mine = exercises.addOwn('Sled push', 'reps');
            exercises.setNote('builtin:back-squat', 'Pause at the bottom');
            let blob: Blob | undefined;
            vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
                blob = b as Blob;
                return 'blob:backup';
            });
            vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

            backup.export();

            const file: BackupFile = JSON.parse(await blob!.text());
            expect(file.exercises).toEqual([mine]);
            expect(file.exerciseNotes).toEqual([
                {
                    id: 'builtin:back-squat',
                    text: 'Pause at the bottom',
                    updatedAt: expect.any(Number),
                },
            ]);
        });

        it('adds your own exercises and notes, and links timers to them', async () => {
            start();
            const sled = {
                ...TestBed.inject(ExerciseStore).addOwn('x', 'reps'),
                id: 'sled',
                name: 'Sled push',
            };
            const timer = makeTimer({
                id: 'legs',
                steps: [{ kind: 'reps', reps: 3, name: 'Sled push', exerciseId: 'sled' }],
            });

            const imported = await backup.import(
                fileOf({
                    timers: [timer],
                    exercises: [sled],
                    exerciseNotes: [{ id: 'sled', text: 'Low and fast', updatedAt: 1 }],
                })
            );

            const exercises = TestBed.inject(ExerciseStore);
            expect(imported).toEqual(result({ timersAdded: 1, exercisesAdded: 1 }));
            expect(exercises.byId('sled')?.name).toBe('Sled push');
            expect(exercises.noteFor('sled')).toBe('Low and fast');
            expect(timers().timers()[0].steps[0].exerciseId).toBe('sled');
        });

        it('links the steps and sets of a backup from before exercises, by name', async () => {
            start();

            await backup.import(
                fileOf({
                    version: 2,
                    timers: [
                        makeTimer({
                            id: 'legs',
                            steps: [{ kind: 'reps', reps: 10, name: 'Squats' }],
                        }),
                    ],
                    history: [
                        makeEntry(1_000_000, {
                            sets: [{ round: 0, step: 0, name: 'Bear crawl', reps: 10 }],
                        }),
                    ],
                })
            );

            const crawl = TestBed.inject(ExerciseStore).finder.find('Bear crawl');
            expect(timers().timers()[0].steps[0].exerciseId).toBe('builtin:back-squat');
            expect(history().entries()[0].sets![0].exerciseId).toBe(crawl!.id);
        });

        it('links a step anew when its exercise is neither here nor in the file', async () => {
            start();

            await backup.import(
                fileOf({
                    timers: [
                        makeTimer({
                            id: 'legs',
                            steps: [
                                { kind: 'reps', reps: 10, name: 'Push-ups', exerciseId: 'gone' },
                            ],
                        }),
                    ],
                })
            );

            expect(timers().timers()[0].steps[0].exerciseId).toBe('builtin:push-up');
        });
    });
});
