import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { Deletion } from '../../models/sync';
import { allSteps, Workout } from '../../models/workout';
import { ExerciseStore } from '../state/exercise-store.service';
import { HistoryStore } from '../state/history-store.service';
import { savedHistory } from '../testing/history-database';
import { SettingsStore } from '../state/settings-store.service';
import { WorkoutStore } from '../state/workout-store.service';
import { makeWorkout } from '../testing/make-workout';
import { BACKUP_VERSION, BackupFile, MAX_BACKUP_BYTES } from './backup-file';
import { BackupService, ImportResult } from './backup.service';

function makeEntry(startedAt: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    return {
        id: `${startedAt}-workout-1`,
        workoutId: 'workout-1',
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

const backupOf = (workouts: Workout[], history: HistoryEntry[], deleted: Deletion[] = []) =>
    new Blob([
        JSON.stringify({
            app: 'Loop Workouts',
            version: 4,
            exportedAt: 1,
            workouts,
            history,
            deleted,
        }),
    ]);

/** What's here before the import, saved as the app would have saved it. */
function savedHere(workouts: Workout[], history: HistoryEntry[] = []) {
    localStorage.setItem('workouts', JSON.stringify(workouts));
    localStorage.setItem('history', JSON.stringify(history));
}

const result = (counts: Partial<ImportResult & { ok: true }>): ImportResult => ({
    ok: true,
    workoutsAdded: 0,
    workoutsUpdated: 0,
    entriesAdded: 0,
    entriesUpdated: 0,
    exercisesAdded: 0,
    exercisesUpdated: 0,
    removed: 0,
    skipped: 0,
    ...counts,
});

describe('BackupService', () => {
    let backup: BackupService;
    const workouts = () => TestBed.inject(WorkoutStore);
    const history = () => TestBed.inject(HistoryStore);

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
    });
    afterEach(() => localStorage.clear());

    // The stores read what's saved when they're made, so tests save first, then start
    const start = () => (backup = TestBed.inject(BackupService));

    describe('export', () => {
        it('downloads everything as a dated JSON file, deletions included', async () => {
            start();
            workouts().addWorkout({ title: 'Legs', blocks: makeWorkout().blocks, repeats: 3 });
            const gone = workouts().addWorkout({
                title: 'Gone',
                blocks: makeWorkout().blocks,
                repeats: 1,
            });
            workouts().deleteWorkout(gone.id);
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

            const name = await backup.export();

            expect(name).toMatch(/^loop-workouts-\d{4}-\d{2}-\d{2}\.json$/);
            expect(click).toHaveBeenCalledTimes(1);
            const link = click.mock.contexts[0] as HTMLAnchorElement;
            expect(link.download).toBe(name);
            expect(link.href).toBe('blob:backup');
            const file: BackupFile = JSON.parse(await blob!.text());
            expect(file.app).toBe('Loop Workouts');
            expect(file.version).toBe(BACKUP_VERSION);
            expect(file.libraryOrder).toEqual(workouts().libraryOrder());
            expect(file.workouts).toEqual(workouts().workouts());
            expect(file.history).toEqual(history().entries());
            expect(file.deleted).toEqual([
                { kind: 'workout', id: gone.id, deletedAt: expect.any(Number) },
            ]);
            expect(file.settings.weightUnit).toBe('lb');
        });
    });

    describe('import', () => {
        it('adds workouts and history entries that are new, keeping their ids, and saves them', async () => {
            start();
            const legs = makeWorkout({ id: 'legs', title: 'Legs' });

            expect(await backup.import(backupOf([legs], [makeEntry(1_000_000)]))).toEqual(
                result({ workoutsAdded: 1, entriesAdded: 1 })
            );
            expect(workouts().workouts()).toEqual([legs]);
            expect(history().entries()).toEqual([makeEntry(1_000_000)]);
            expect(JSON.parse(localStorage.getItem('workouts')!)).toEqual([legs]);
            expect(await savedHistory()).toHaveLength(1);
        });

        it('takes the library order from the file if a workout was moved there more recently', async () => {
            savedHere([makeWorkout({ id: 'a' }), makeWorkout({ id: 'b' })]);
            localStorage.setItem('library-moved-at', '100');
            start();
            const file = (updatedAt: number) =>
                new Blob([
                    JSON.stringify({
                        app: 'Loop Workouts',
                        version: BACKUP_VERSION,
                        workouts: [makeWorkout({ id: 'c' })],
                        libraryOrder: { ids: ['c', 'b', 'a'], updatedAt },
                    }),
                ]);
            const ids = () =>
                workouts()
                    .workouts()
                    .map((workout) => workout.id);

            await backup.import(file(50));
            expect(ids()).toEqual(['a', 'b', 'c']);

            await backup.import(file(200));
            expect(ids()).toEqual(['c', 'b', 'a']);
        });

        it('takes the most recent change to each workout and history entry', async () => {
            savedHere(
                [
                    makeWorkout({ id: 'a', title: 'Old here', updatedAt: 100 }),
                    makeWorkout({ id: 'b', title: 'New here', updatedAt: 300 }),
                ],
                [makeEntry(1_000_000, { updatedAt: 100 })]
            );
            start();

            const imported = await backup.import(
                backupOf(
                    [
                        makeWorkout({ id: 'a', title: 'New there', updatedAt: 200 }),
                        makeWorkout({ id: 'b', title: 'Old there', updatedAt: 200 }),
                    ],
                    [makeEntry(1_000_000, { note: 'felt strong', updatedAt: 200 })]
                )
            );

            expect(imported).toEqual(result({ workoutsUpdated: 1, entriesUpdated: 1 }));
            expect(
                workouts()
                    .workouts()
                    .map((t) => t.title)
            ).toEqual(['New there', 'New here']);
            expect(history().entries()[0].note).toBe('felt strong');
        });

        it('deletes what was deleted there, unless it has changed here since', async () => {
            savedHere(
                [
                    makeWorkout({ id: 'a', updatedAt: 100 }),
                    makeWorkout({ id: 'b', updatedAt: 500 }),
                ],
                [makeEntry(1_000_000, { updatedAt: 100 })]
            );
            start();

            const imported = await backup.import(
                backupOf(
                    [],
                    [],
                    [
                        { kind: 'workout', id: 'a', deletedAt: 200 },
                        { kind: 'workout', id: 'b', deletedAt: 200 },
                        { kind: 'history', id: '1000000-workout-1', deletedAt: 200 },
                    ]
                )
            );

            expect(imported).toEqual(result({ removed: 2 }));
            expect(
                workouts()
                    .workouts()
                    .map((t) => t.id)
            ).toEqual(['b']);
            expect(history().entries()).toEqual([]);
        });

        it("doesn't bring back a workout deleted here", async () => {
            start();
            history().record(makeEntry(1_000_000));
            history().delete('1000000-workout-1');

            expect(await backup.import(backupOf([], [makeEntry(1_000_000)]))).toEqual(result({}));
            expect(history().entries()).toEqual([]);
        });

        it('adds nothing when everything is already here', async () => {
            const legs = makeWorkout({ id: 'legs', title: 'Legs' });
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
                    app: 'Loop Workouts',
                    version: 4,
                    exportedAt: 1,
                    workouts: [],
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
            workouts().addWorkout({ title: 'Legs', blocks: makeWorkout().blocks, repeats: 3 });

            expect(await backup.import(new Blob(['{"app":"Other"}']))).toEqual({
                ok: false,
                problem: 'not-a-backup',
            });
            expect(workouts().workouts()).toHaveLength(1);
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
        // Workouts were called timers then
        const v1Backup = (oldWorkouts: unknown[], oldHistory: unknown[]) =>
            new Blob([
                JSON.stringify({
                    app: 'Loop Workouts',
                    version: 1,
                    exportedAt: 1,
                    timers: oldWorkouts,
                    history: oldHistory,
                }),
            ]);
        const v1Workout = (id: number, title: string, repeats = 3) => {
            const { id: _id, updatedAt: _at, ...workout } = makeWorkout({ title, repeats });
            return { ...workout, id };
        };

        it('matches workouts on what they are, since their ids were only per device', async () => {
            start();
            const here = workouts().addWorkout({
                title: 'Legs',
                blocks: makeWorkout().blocks,
                repeats: 3,
            });

            const imported = await backup.import(
                v1Backup([v1Workout(9, 'Legs'), v1Workout(1, 'Arms')], [])
            );

            expect(imported).toEqual(result({ workoutsAdded: 1 }));
            expect(
                workouts()
                    .workouts()
                    .map((t) => t.title)
            ).toEqual(['Legs', 'Arms']);
            expect(workouts().workouts()[0]).toEqual(here);
            expect(workouts().workouts()[1].id).toMatch(/^[0-9a-f-]{36}$/);
        });

        it('keeps a workout changed since the backup, and adds the backup one alongside', async () => {
            start();
            workouts().addWorkout({ title: 'Legs', blocks: makeWorkout().blocks, repeats: 5 });

            await backup.import(v1Backup([v1Workout(1, 'Legs', 3)], []));

            expect(
                workouts()
                    .workouts()
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

            expect(imported).toEqual(result({ entriesAdded: 1 }));
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
                    app: 'Loop Workouts',
                    version: 5,
                    exportedAt: 1,
                    workouts: [],
                    history: [],
                    exercises: [],
                    exerciseNotes: [],
                    hiddenExercises: [],
                    deleted: [],
                    ...contents,
                }),
            ]);

        it('exports your own exercises, your notes, what is hidden and your equipment', async () => {
            start();
            const exercises = TestBed.inject(ExerciseStore);
            const mine = exercises.addOwn('Sled push', 'reps');
            exercises.setNote('builtin:back-squat', 'Pause at the bottom');
            exercises.setHidden('builtin:plank', true);
            TestBed.inject(SettingsStore).update({ myEquipment: ['band'] });
            let blob: Blob | undefined;
            vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
                blob = b as Blob;
                return 'blob:backup';
            });
            vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

            await backup.export();

            const file: BackupFile = JSON.parse(await blob!.text());
            expect(file.exercises).toEqual([mine]);
            expect(file.exerciseNotes).toEqual([
                {
                    id: 'builtin:back-squat',
                    text: 'Pause at the bottom',
                    updatedAt: expect.any(Number),
                },
            ]);
            expect(file.hiddenExercises).toEqual([
                { id: 'builtin:plank', updatedAt: expect.any(Number) },
            ]);
            expect(file.settings.myEquipment).toEqual(['band']);
        });

        it('hides the exercises hidden in the file', async () => {
            start();

            await backup.import(
                fileOf({ hiddenExercises: [{ id: 'builtin:plank', updatedAt: 1 }] })
            );

            expect(TestBed.inject(ExerciseStore).isHidden('builtin:plank')).toBe(true);
        });

        it('adds your own exercises and notes, and links workouts to them', async () => {
            start();
            const sled = {
                ...TestBed.inject(ExerciseStore).addOwn('x', 'reps'),
                id: 'sled',
                name: 'Sled push',
            };
            const workout = makeWorkout({
                id: 'legs',
                steps: [{ kind: 'reps', reps: 3, name: 'Sled push', exerciseId: 'sled' }],
            });

            const imported = await backup.import(
                fileOf({
                    workouts: [workout],
                    exercises: [sled],
                    exerciseNotes: [{ id: 'sled', text: 'Low and fast', updatedAt: 1 }],
                })
            );

            const exercises = TestBed.inject(ExerciseStore);
            expect(imported).toEqual(result({ workoutsAdded: 1, exercisesAdded: 1 }));
            expect(exercises.byId('sled')?.name).toBe('Sled push');
            expect(exercises.noteFor('sled')).toBe('Low and fast');
            expect(allSteps(workouts().workouts()[0])[0].exerciseId).toBe('sled');
        });

        it('takes an exercise of your own made on both devices to be the one here', async () => {
            start();
            const exercises = TestBed.inject(ExerciseStore);
            const here = exercises.addOwn('Sled push', 'reps');
            const there = { ...here, id: 'sled-there', name: 'sled  push' };
            const workout = makeWorkout({
                id: 'legs',
                steps: [{ kind: 'reps', reps: 3, name: 'Sled', exerciseId: 'sled-there' }],
            });
            const entry = makeEntry(1_000_000, {
                sets: [{ round: 0, step: 0, name: 'Sled', reps: 3, exerciseId: 'sled-there' }],
            });

            const imported = await backup.import(
                fileOf({
                    workouts: [workout],
                    history: [entry],
                    exercises: [there],
                    exerciseNotes: [{ id: 'sled-there', text: 'Low and fast', updatedAt: 1 }],
                    hiddenExercises: [{ id: 'sled-there', updatedAt: 1 }],
                })
            );

            expect(imported).toEqual(result({ workoutsAdded: 1, entriesAdded: 1 }));
            expect(exercises.own()).toEqual([here]);
            expect(exercises.noteFor(here.id)).toBe('Low and fast');
            expect(exercises.isHidden(here.id)).toBe(true);
            expect(allSteps(workouts().workouts()[0])[0].exerciseId).toBe(here.id);
            expect(history().entries()[0].sets![0].exerciseId).toBe(here.id);
        });

        it('links the steps and sets of a backup from before exercises, by name', async () => {
            start();

            await backup.import(
                fileOf({
                    version: 2,
                    workouts: undefined,
                    timers: [
                        makeWorkout({
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
            expect(allSteps(workouts().workouts()[0])[0].exerciseId).toBe('builtin:back-squat');
            expect(history().entries()[0].sets![0].exerciseId).toBe(crawl!.id);
        });

        it('brings in a plan written by hand, linking its steps by name, and only once', async () => {
            start();
            const plan = new Blob([
                JSON.stringify({
                    app: 'Loop Workouts',
                    version: BACKUP_VERSION,
                    workouts: [
                        {
                            title: 'Legs',
                            repeats: 3,
                            steps: [
                                { kind: 'reps', reps: 8, name: 'Back squat', weight: 60 },
                                { kind: 'work', seconds: 30, name: 'Sled push' },
                            ],
                        },
                    ],
                    exercises: [{ name: 'Sled push', measuredBy: 'timed', mainMuscles: ['quads'] }],
                }),
            ]);

            const first = await backup.import(plan);
            const again = await backup.import(plan);

            const exercises = TestBed.inject(ExerciseStore);
            const sled = exercises.finder.find('Sled push')!;
            expect(first).toEqual(result({ workoutsAdded: 1, exercisesAdded: 1 }));
            expect(again).toEqual(result({}));
            expect(exercises.own()).toEqual([
                expect.objectContaining({ name: 'Sled push', mainMuscles: ['quads'] }),
            ]);
            expect(workouts().workouts()).toHaveLength(1);
            expect(allSteps(workouts().workouts()[0]).map((s) => s.exerciseId)).toEqual([
                'builtin:back-squat',
                sled.id,
            ]);
        });

        it('links a step anew when its exercise is neither here nor in the file', async () => {
            start();

            await backup.import(
                fileOf({
                    workouts: [
                        makeWorkout({
                            id: 'legs',
                            steps: [
                                { kind: 'reps', reps: 10, name: 'Push-ups', exerciseId: 'gone' },
                            ],
                        }),
                    ],
                })
            );

            expect(allSteps(workouts().workouts()[0])[0].exerciseId).toBe('builtin:push-up');
        });
    });
});
