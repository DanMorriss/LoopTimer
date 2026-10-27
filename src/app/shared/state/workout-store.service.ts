import { computed, inject, Service, signal } from '@angular/core';
import {
    hasWork,
    MAX_REPS,
    MAX_STEP_SECONDS,
    MAX_TIME_LIMIT_SECONDS,
    Step,
    UNTIL_STOPPED,
    Workout,
    WorkoutFields,
} from '../../models/workout';
import { MAX_WEIGHT_KG } from '../../models/weight';
import { isLoggedSet, isTimedSet, RepSet } from '../../models/history';
import { Deletion, inOrder, LibraryOrder, mergeRecords, newId } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { ExerciseStore } from './exercise-store.service';
import { linkSteps } from '../../models/exercise-links';
import { LEGACY_WORKOUT_IDS_KEY, migrateSavedData, renameActiveRunKeys } from './migrate';

@Service()
export class WorkoutStore {
    private readonly deletions = inject(DeletionStore);
    private readonly exercises = inject(ExerciseStore);
    private _workouts = signal<Workout[]>([]);
    private _movedAt = signal(readMovedAt());
    private _activeWorkout = signal<Workout | null>(null);
    private _activeWorkoutStartedAt = signal<number | null>(null);
    private _activeWorkoutPausedAt = signal<number | null>(null);
    private _activeRunStartedAt = signal<number | null>(null);
    private _activeRepStepsDone = signal(0);
    private _activeRepMs = signal(0);
    private _activeSets = signal<RepSet[]>([]);

    readonly workouts = computed(() => this._workouts());
    /** The library's order, to sync with other copies (see `mergeLibraryOrder()`). */
    readonly libraryOrder = computed<LibraryOrder>(() => ({
        ids: this._workouts().map((workout) => workout.id),
        updatedAt: this._movedAt(),
    }));
    readonly activeWorkout = computed(() => this._activeWorkout());
    /** When the active workout was started, in ms since the epoch. Moves forward on resume. */
    readonly activeWorkoutStartedAt = computed(() => this._activeWorkoutStartedAt());
    /** When the active workout was paused, in ms since the epoch, or null while it runs. */
    readonly activeWorkoutPausedAt = computed(() => this._activeWorkoutPausedAt());
    readonly isPaused = computed(() => this._activeWorkoutPausedAt() !== null);
    /**
     * When the current run really began, in ms since the epoch. Unlike `activeWorkoutStartedAt`
     * it doesn't move on resume, so it identifies the run and dates it in the history.
     */
    readonly activeRunStartedAt = computed(() => this._activeRunStartedAt());
    /** How many rep steps of the current run have been done, across all its rounds. */
    readonly activeRepStepsDone = computed(() => this._activeRepStepsDone());
    /**
     * Time spent on rep steps done so far, in ms. Done takes it off the countdown's clock
     * (see `finishRepStep()`), so the history adds it back to the time spent.
     */
    readonly activeRepMs = computed(() => this._activeRepMs());
    /**
     * The sets of rep steps done so far in the current run, in order. Its timed sets are
     * worked out from the clock (see `ActiveRunService.sets`).
     */
    readonly activeSets = computed(() => this._activeSets());

    constructor() {
        renameActiveRunKeys();
        this._workouts.set(this.loadWorkouts());
        this._activeWorkout.set(this.loadActiveWorkout());
        if (this._activeWorkout()) {
            const startedAt = this.loadActiveWorkoutStartedAt();
            this._activeWorkoutStartedAt.set(startedAt);
            this._activeWorkoutPausedAt.set(this.loadActiveWorkoutPausedAt(startedAt));
            // Runs from before this was saved fall back to the (possibly resumed) start time
            const runStart = Number(sessionStorage.getItem('activeRunStartedAt'));
            this._activeRunStartedAt.set(
                Number.isFinite(runStart) && runStart > 0 && runStart <= startedAt
                    ? runStart
                    : startedAt
            );
            this._activeRepStepsDone.set(readCount(sessionStorage.getItem('activeRepStepsDone')));
            this._activeRepMs.set(readCount(sessionStorage.getItem('activeRepMs')));
            this._activeSets.set(readSets(sessionStorage.getItem('activeSets')));
        }
    }

    private loadWorkouts(): Workout[] {
        migrateSavedData();
        const savedWorkouts = localStorage.getItem('workouts');
        if (!savedWorkouts) {
            return [];
        }

        // Corrupted or unexpected data shouldn't stop the app from starting,
        // so drop anything that isn't a usable workout
        try {
            const parsed: unknown = JSON.parse(savedWorkouts);
            return Array.isArray(parsed)
                ? parsed.map((item) => readWorkout(item)).filter((workout) => workout !== null)
                : [];
        } catch {
            return [];
        }
    }

    // The active workout and its start time are remembered per tab, so refreshing
    // the workout page carries on where it was
    private loadActiveWorkout(): Workout | null {
        const savedId = sessionStorage.getItem('activeWorkoutId');
        if (!savedId) {
            return null;
        }
        // A run started before workouts had random ids still has its old number
        return (
            this.findWorkoutById(savedId) ?? this.findWorkoutById(legacyWorkoutId(savedId) ?? '')
        );
    }

    private loadActiveWorkoutStartedAt(): number {
        const savedStart = Number(sessionStorage.getItem('activeWorkoutStartedAt'));
        const now = Date.now();
        // Fall back to starting now if the saved time is missing or impossible
        return Number.isFinite(savedStart) && savedStart > 0 && savedStart <= now
            ? savedStart
            : now;
    }

    // A saved pause only counts if it falls between the start and now; otherwise the workout runs
    private loadActiveWorkoutPausedAt(startedAt: number): number | null {
        const saved = sessionStorage.getItem('activeWorkoutPausedAt');
        const pausedAt = Number(saved);
        return saved !== null && pausedAt >= startedAt && pausedAt <= Date.now() ? pausedAt : null;
    }

    /** Saves a new workout, its named steps linked to exercises (see `linkSteps()`). */
    addWorkout(workout: WorkoutFields): Workout {
        const newWorkout: Workout = {
            ...workout,
            steps: linkSteps(workout.steps, this.exercises.finder),
            id: newId(),
            updatedAt: Date.now(),
        };
        this._workouts.update((workouts) => [...workouts, newWorkout]);
        this.saveWorkouts();
        return newWorkout;
    }

    /**
     * Adds workouts from a version 1 backup, whose ids were only unique on their device, so a
     * workout is matched on what it is instead: one the same as a workout already here (title,
     * steps and rounds) is skipped, and any other is added. Their ids are new ones given when
     * the backup was read (see `upgradeWorkout()`). Returns how many were added.
     */
    importWorkouts(imported: readonly Workout[]): number {
        let added = 0;
        for (const workout of imported) {
            if (this._workouts().some((existing) => sameWorkout(existing, workout))) {
                continue;
            }
            this._workouts.update((workouts) => [...workouts, workout]);
            added++;
        }
        if (added > 0) {
            this.saveWorkouts();
        }
        return added;
    }

    /**
     * Merges workouts from another copy (a version 2 backup), by id: the most recent change to
     * each wins, and a deletion there removes a workout here that hasn't changed since. A workout
     * deleted here doesn't come back unless it changed there after.
     */
    mergeWorkouts(workouts: readonly Workout[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'workout',
            this._workouts(),
            workouts,
            (id) => this.deletions.deletedAt('workout', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._workouts.set(result.records);
            this.saveWorkouts();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    deleteWorkout(workoutId: string) {
        const updatedWorkoutList = this._workouts().filter((workout) => workout.id !== workoutId);
        this._workouts.set(updatedWorkoutList);
        this.saveWorkouts();
        this.deletions.add({ kind: 'workout', id: workoutId, deletedAt: Date.now() });
    }

    /** Puts a deleted workout back where it was in the library, e.g. on Undo. */
    restoreWorkout(workout: Workout, index: number) {
        if (this.findWorkoutById(workout.id)) {
            return;
        }
        this.deletions.remove('workout', workout.id);
        this._workouts.update((workouts) => [
            ...workouts.slice(0, index),
            workout,
            ...workouts.slice(index),
        ]);
        this.saveWorkouts();
    }

    /** Moves a workout to another place in the library, e.g. dragged there. */
    moveWorkout(from: number, to: number) {
        const workouts = [...this._workouts()];
        const outside = (i: number) => i < 0 || i >= workouts.length;
        if (from === to || outside(from) || outside(to)) {
            return;
        }
        const [moved] = workouts.splice(from, 1);
        workouts.splice(to, 0, moved);
        this._workouts.set(workouts);
        this.saveWorkouts();
        this.saveMovedAt(Date.now());
    }

    /**
     * Takes another copy's library order if a workout was moved there more recently than here:
     * the workouts it lists go in its order, and any others after them. Returns whether the
     * order here changed.
     */
    mergeLibraryOrder(order: LibraryOrder): boolean {
        if (order.updatedAt <= this._movedAt()) {
            return false;
        }
        this.saveMovedAt(order.updatedAt);
        const workouts = inOrder(this._workouts(), order.ids);
        if (workouts.every((workout, i) => workout === this._workouts()[i])) {
            return false;
        }
        this._workouts.set(workouts);
        this.saveWorkouts();
        return true;
    }

    findWorkoutById(workoutId: string): Workout | null {
        return this._workouts().find((workout) => workout.id === workoutId) ?? null;
    }

    updateWorkout(workoutId: string, workoutUpdate: WorkoutFields): Workout | null {
        const existingWorkout = this.findWorkoutById(workoutId);
        if (!existingWorkout) {
            return null;
        }

        const updatedWorkout: Workout = {
            ...workoutUpdate,
            steps: linkSteps(workoutUpdate.steps, this.exercises.finder),
            id: workoutId,
            updatedAt: Date.now(),
        };

        this._workouts.update((workouts) =>
            workouts.map((workout) => (workout.id === workoutId ? updatedWorkout : workout))
        );
        this.saveWorkouts();
        return updatedWorkout;
    }

    /**
     * An exercise of your own has been renamed (EXR-3): the steps linked to it take its new
     * name, in every saved workout and the one running.
     */
    renameExerciseSteps(exerciseId: string, name: string) {
        const renamed = (workout: Workout): Workout => {
            if (
                !workout.steps.some((step) => step.exerciseId === exerciseId && step.name !== name)
            ) {
                return workout;
            }
            const steps = workout.steps.map((step) =>
                step.exerciseId === exerciseId ? { ...step, name } : step
            );
            return { ...workout, steps, updatedAt: Date.now() };
        };
        const workouts = this._workouts().map(renamed);
        if (workouts.some((workout, i) => workout !== this._workouts()[i])) {
            this._workouts.set(workouts);
            this.saveWorkouts();
        }
        const active = this._activeWorkout();
        if (active) {
            this._activeWorkout.set(renamed(active));
        }
    }

    /** Makes `workout` the active workout and starts it from the beginning. */
    setActiveWorkout(workout: Workout) {
        const startedAt = Date.now();
        this._activeWorkout.set(workout);
        this._activeWorkoutStartedAt.set(startedAt);
        sessionStorage.setItem('activeWorkoutId', String(workout.id));
        sessionStorage.setItem('activeWorkoutStartedAt', String(startedAt));
        this._activeWorkoutPausedAt.set(null);
        this._activeRunStartedAt.set(startedAt);
        sessionStorage.setItem('activeRunStartedAt', String(startedAt));
        sessionStorage.removeItem('activeWorkoutPausedAt');
        this.clearRepSteps();
    }

    /**
     * Done on a rep step: the workout moves on to the next step. `waitedMs` is how long the
     * clock ran on past the rep step while it was being done; the start time moves forward
     * by that much, so the countdown picks up exactly where the rep step began. `set` is
     * what was done, logged for the history.
     */
    finishRepStep(waitedMs: number, set: RepSet) {
        const startedAt = this._activeWorkoutStartedAt();
        if (!this._activeWorkout() || startedAt === null) {
            return;
        }
        // Done straight from a pause carries on running
        this.resume();
        const waited = Math.max(0, Math.round(waitedMs));
        const movedStart = this._activeWorkoutStartedAt()! + waited;
        this._activeWorkoutStartedAt.set(movedStart);
        this._activeRepStepsDone.update((done) => done + 1);
        this._activeRepMs.update((ms) => ms + waited);
        sessionStorage.setItem('activeWorkoutStartedAt', String(movedStart));
        sessionStorage.setItem('activeRepStepsDone', String(this._activeRepStepsDone()));
        sessionStorage.setItem('activeRepMs', String(this._activeRepMs()));
        this._activeSets.update((sets) => [...sets, set]);
        sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
    }

    /** Adds a set without moving the workout on, e.g. the one time ran out in. */
    addActiveSet(set: RepSet) {
        if (!this._activeWorkout()) {
            return;
        }
        this._activeSets.update((sets) => [...sets, set]);
        sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
    }

    /** Corrects a set already done, e.g. its reps or weight changed on the summary. */
    updateActiveSet(index: number, set: RepSet) {
        if (!this._activeSets()[index]) {
            return;
        }
        this._activeSets.update((sets) =>
            sets.map((existing, i) => (i === index ? set : existing))
        );
        sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
    }

    private clearRepSteps() {
        this._activeRepStepsDone.set(0);
        this._activeRepMs.set(0);
        this._activeSets.set([]);
        sessionStorage.removeItem('activeRepStepsDone');
        sessionStorage.removeItem('activeRepMs');
        sessionStorage.removeItem('activeSets');
    }

    /**
     * Replaces one step of the running workout, e.g. its reps or weight changed mid-workout,
     * and of the saved workout too, so it starts from there next time.
     */
    updateActiveStep(stepIndex: number, step: Step) {
        const workout = this._activeWorkout();
        if (!workout || !workout.steps[stepIndex]) {
            return;
        }
        const updated: Workout = {
            ...workout,
            steps: workout.steps.map((existing, i) => (i === stepIndex ? step : existing)),
            updatedAt: Date.now(),
        };
        this._activeWorkout.set(updated);
        if (this.findWorkoutById(workout.id)) {
            this._workouts.update((workouts) =>
                workouts.map((t) => (t.id === workout.id ? updated : t))
            );
            this.saveWorkouts();
        }
    }

    /** Freezes the active workout where it is. Does nothing if it's already paused. */
    pause() {
        if (!this._activeWorkout() || this.isPaused()) {
            return;
        }
        const pausedAt = Date.now();
        this._activeWorkoutPausedAt.set(pausedAt);
        sessionStorage.setItem('activeWorkoutPausedAt', String(pausedAt));
    }

    /**
     * Carries on from where the workout was paused. The start time moves forward by the
     * time spent paused, so the elapsed time picks up exactly where it stopped.
     */
    resume() {
        const pausedAt = this._activeWorkoutPausedAt();
        const startedAt = this._activeWorkoutStartedAt();
        if (pausedAt === null || startedAt === null) {
            return;
        }
        const resumedStart = startedAt + (Date.now() - pausedAt);
        this._activeWorkoutStartedAt.set(resumedStart);
        this._activeWorkoutPausedAt.set(null);
        sessionStorage.setItem('activeWorkoutStartedAt', String(resumedStart));
        sessionStorage.removeItem('activeWorkoutPausedAt');
    }

    /** Ends the active workout, leaving no workout selected. */
    stop() {
        this._activeWorkout.set(null);
        this._activeWorkoutStartedAt.set(null);
        this._activeWorkoutPausedAt.set(null);
        this._activeRunStartedAt.set(null);
        sessionStorage.removeItem('activeWorkoutId');
        sessionStorage.removeItem('activeWorkoutStartedAt');
        sessionStorage.removeItem('activeWorkoutPausedAt');
        sessionStorage.removeItem('activeRunStartedAt');
        this.clearRepSteps();
    }

    private saveWorkouts() {
        localStorage.setItem('workouts', JSON.stringify(this._workouts()));
    }

    private saveMovedAt(movedAt: number) {
        this._movedAt.set(movedAt);
        localStorage.setItem('library-moved-at', String(movedAt));
    }
}

/** When a workout was last moved in the library, or 0 if none has been (or it's broken). */
function readMovedAt(): number {
    const movedAt = Number(localStorage.getItem('library-moved-at'));
    return isWholeNumber(movedAt, 0) ? movedAt : 0;
}

function isWholeNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** The saved sets of the run in progress; anything broken is dropped. */
function readSets(saved: string | null): RepSet[] {
    try {
        const parsed: unknown = JSON.parse(saved ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((set): set is RepSet => isLoggedSet(set) && !isTimedSet(set))
            : [];
    } catch {
        return [];
    }
}

/** A saved count, e.g. rep steps done; anything missing or broken counts as 0. */
function readCount(saved: string | null): number {
    const count = Number(saved);
    return isWholeNumber(count, 0) ? count : 0;
}

function isStep(value: unknown): value is Step {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const step = value as Record<string, unknown>;
    if (
        typeof step['name'] !== 'string' ||
        (step['exerciseId'] !== undefined && typeof step['exerciseId'] !== 'string')
    ) {
        return false;
    }
    if (step['kind'] === 'reps') {
        const weight = step['weight'];
        return (
            isWholeNumber(step['reps'], 1, MAX_REPS) &&
            (weight === undefined ||
                (typeof weight === 'number' && weight > 0 && weight <= MAX_WEIGHT_KG))
        );
    }
    return (
        (step['kind'] === 'work' || step['kind'] === 'rest') &&
        isWholeNumber(step['seconds'], 1, MAX_STEP_SECONDS)
    );
}

/** Just the step's own fields, leaving out anything else that was saved with it. */
function copyStep(step: Step): Step {
    const link = step.exerciseId === undefined ? {} : { exerciseId: step.exerciseId };
    return step.kind === 'reps'
        ? {
              kind: step.kind,
              reps: step.reps,
              name: step.name,
              ...(step.weight === undefined ? {} : { weight: step.weight }),
              ...link,
          }
        : { kind: step.kind, seconds: step.seconds, name: step.name, ...link };
}

/** Whether two workouts are the same apart from their ids. */
function sameWorkout(a: Workout, b: Workout): boolean {
    // By what the steps are, not the exercises they happen to be linked to
    const steps = (workout: Workout) =>
        JSON.stringify(workout.steps.map((step) => ({ ...copyStep(step), exerciseId: undefined })));
    return (
        a.title === b.title &&
        a.repeats === b.repeats &&
        a.timeLimitSeconds === b.timeLimitSeconds &&
        steps(a) === steps(b)
    );
}

/**
 * Reads one saved workout, from this device or a backup, or returns null if it isn't usable.
 * Workouts saved before steps existed (a single work and rest time) become a work step and,
 * if there was any rest, a rest step, which runs exactly as before.
 */
export function readWorkout(value: unknown): Workout | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const saved = value as Record<string, unknown>;
    // 0 is UNTIL_STOPPED
    if (
        typeof saved['id'] !== 'string' ||
        saved['id'] === '' ||
        typeof saved['title'] !== 'string' ||
        !isWholeNumber(saved['repeats'], 0)
    ) {
        return null;
    }
    const steps = Array.isArray(saved['steps']) ? saved['steps'] : stepsFromWorkAndRest(saved);
    if (!steps?.every((step) => isStep(step)) || !hasWork(steps)) {
        return null;
    }
    // A time limit runs as many rounds as fit, so it only goes with UNTIL_STOPPED
    const limit = saved['timeLimitSeconds'];
    const timeLimit =
        saved['repeats'] === UNTIL_STOPPED &&
        isWholeNumber(limit, 1) &&
        (limit as number) <= MAX_TIME_LIMIT_SECONDS
            ? { timeLimitSeconds: limit as number }
            : {};
    return {
        id: saved['id'],
        title: saved['title'],
        steps: steps.map(copyStep),
        repeats: saved['repeats'] as number,
        ...timeLimit,
        // Missing only if saved oddly: older than any real change, so any other copy wins
        updatedAt: isWholeNumber(saved['updatedAt'], 0) ? (saved['updatedAt'] as number) : 0,
    };
}

/** The new id of a workout saved before ids were random, from its old number. */
function legacyWorkoutId(oldId: string): string | undefined {
    try {
        const ids: unknown = JSON.parse(localStorage.getItem(LEGACY_WORKOUT_IDS_KEY) ?? '{}');
        const id =
            typeof ids === 'object' && ids !== null
                ? (ids as Record<string, unknown>)[oldId]
                : undefined;
        return typeof id === 'string' ? id : undefined;
    } catch {
        return undefined;
    }
}

/**
 * The steps for a workout saved in the old format, from when it was a timer of one work and one
 * rest time, or null if it isn't one.
 */
function stepsFromWorkAndRest(saved: Record<string, unknown>): Step[] | null {
    if (
        !isWholeNumber(saved['timerMinutes'], 0, 99) ||
        !isWholeNumber(saved['timerSeconds'], 0, 59) ||
        !isWholeNumber(saved['restMinutes'], 0, 99) ||
        !isWholeNumber(saved['restSeconds'], 0, 59)
    ) {
        return null;
    }
    const work = (saved['timerMinutes'] as number) * 60 + (saved['timerSeconds'] as number);
    const rest = (saved['restMinutes'] as number) * 60 + (saved['restSeconds'] as number);
    const steps: Step[] = [{ kind: 'work', seconds: work, name: '' }];
    if (rest > 0) {
        steps.push({ kind: 'rest', seconds: rest, name: '' });
    }
    return steps;
}
