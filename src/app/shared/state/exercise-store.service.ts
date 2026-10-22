import { computed, inject, Service, signal } from '@angular/core';
import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import {
    EquipmentNeed,
    Exercise,
    ExerciseNote,
    MAX_EXERCISE_NOTE_LENGTH,
    MeasuredBy,
    MUSCLE_LABELS,
    MuscleGroup,
    OwnExercise,
    OwnExerciseDetails,
} from '../../models/exercise';
import { ExerciseFinder, findByName } from '../../models/exercise-links';
import { Deletion, mergeRecords, newId } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { migrateSavedData } from './migrate';

export const EXERCISES_KEY = 'exercises';
export const EXERCISE_NOTES_KEY = 'exercise-notes';

/**
 * Every exercise: the built-in ones (EXR-6) and your own (EXR-9), saved in the browser, and
 * your notes on any of them (EXR-10).
 */
@Service()
export class ExerciseStore {
    private readonly deletions = inject(DeletionStore);
    private readonly _own = signal<OwnExercise[]>(loadList(EXERCISES_KEY, readOwnExercise));
    private readonly _notes = signal<ExerciseNote[]>(
        loadList(EXERCISE_NOTES_KEY, readExerciseNote)
    );

    /** Your own exercises, oldest first. */
    readonly own = computed(() => this._own());
    /** The built-in exercises, then your own. */
    readonly exercises = computed<readonly Exercise[]>(() => [
        ...BUILT_IN_EXERCISES,
        ...this._own(),
    ]);
    readonly notes = computed(() => this._notes());

    /** For linking steps and sets by name: finds an exercise, or makes one of your own. */
    readonly finder: ExerciseFinder = {
        find: (name) => findByName(name, this.exercises()),
        byId: (id) => this.byId(id),
        create: (name, measuredBy) => this.addOwn(name, measuredBy),
    };

    byId(id: string): Exercise | undefined {
        return this.exercises().find((exercise) => exercise.id === id);
    }

    /**
     * Whether `name` is already another exercise's, as names are matched (see `findByName()`),
     * other names of built-in ones included. `exceptId` is the exercise being renamed.
     */
    nameTaken(name: string, exceptId?: string): boolean {
        const found = findByName(name, this.exercises());
        return found !== undefined && found.id !== exceptId;
    }

    /**
     * Changes the details of an exercise of your own (EXR-3, EXR-9), tidied: the name's
     * spaces, the description trimmed, and a muscle in both lists kept as main only. Returns
     * the exercise as saved, or null if it isn't one of yours or its new name is taken.
     */
    updateOwn(id: string, details: OwnExerciseDetails): OwnExercise | null {
        const existing = this._own().find((exercise) => exercise.id === id);
        const name = details.name.trim().replace(/\s+/g, ' ');
        if (!existing || name === '' || this.nameTaken(name, id)) {
            return null;
        }
        const updated: OwnExercise = {
            ...existing,
            name,
            measuredBy: details.measuredBy,
            equipment: [...details.equipment],
            mainMuscles: [...details.mainMuscles],
            supportingMuscles: details.supportingMuscles.filter(
                (muscle) => !details.mainMuscles.includes(muscle)
            ),
            description: details.description.trim(),
            updatedAt: Date.now(),
        };
        this._own.update((own) => own.map((exercise) => (exercise.id === id ? updated : exercise)));
        this.saveOwn();
        return updated;
    }

    /** Makes an exercise of your own with just a name and how it's measured, and saves it. */
    addOwn(name: string, measuredBy: MeasuredBy): OwnExercise {
        const exercise: OwnExercise = {
            id: newId(),
            updatedAt: Date.now(),
            name: name.trim().replace(/\s+/g, ' '),
            otherNames: [],
            equipment: [],
            measuredBy,
            mainMuscles: [],
            supportingMuscles: [],
            description: '',
            steps: [],
            tips: [],
        };
        this._own.update((own) => [...own, exercise]);
        this.saveOwn();
        return exercise;
    }

    /** Your note on an exercise, or undefined if there isn't one. */
    noteFor(exerciseId: string): string | undefined {
        return this._notes().find((note) => note.id === exerciseId)?.text;
    }

    /**
     * Sets your note on an exercise, trimmed and cut to MAX_EXERCISE_NOTE_LENGTH. An empty
     * note removes it, leaving a deletion so that reaches other copies too.
     */
    setNote(exerciseId: string, text: string) {
        const trimmed = text.trim().slice(0, MAX_EXERCISE_NOTE_LENGTH);
        const others = this._notes().filter((note) => note.id !== exerciseId);
        if (trimmed) {
            this._notes.set([...others, { id: exerciseId, text: trimmed, updatedAt: Date.now() }]);
            this.deletions.remove('exercise-note', exerciseId);
        } else if (others.length < this._notes().length) {
            this._notes.set(others);
            this.deletions.add({ kind: 'exercise-note', id: exerciseId, deletedAt: Date.now() });
        }
        this.saveNotes();
    }

    /** Merges your own exercises from another copy (a backup), as timers merge. */
    mergeOwn(exercises: readonly OwnExercise[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'exercise',
            this._own(),
            exercises,
            (id) => this.deletions.deletedAt('exercise', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._own.set(result.records);
            this.saveOwn();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    /** Merges notes from another copy, by exercise: the most recent change to each wins. */
    mergeNotes(notes: readonly ExerciseNote[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'exercise-note',
            this._notes(),
            notes,
            (id) => this.deletions.deletedAt('exercise-note', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._notes.set(result.records);
            this.saveNotes();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    private saveOwn() {
        localStorage.setItem(EXERCISES_KEY, JSON.stringify(this._own()));
    }

    private saveNotes() {
        localStorage.setItem(EXERCISE_NOTES_KEY, JSON.stringify(this._notes()));
    }
}

// Corrupted or unexpected data shouldn't stop the app from starting, so drop what isn't usable
function loadList<T>(key: string, read: (value: unknown) => T | null): T[] {
    migrateSavedData();
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.map((item) => read(item)).filter((item) => item !== null)
            : [];
    } catch {
        return [];
    }
}

const isText = (value: unknown): value is string => typeof value === 'string';
const textList = (value: unknown): string[] => (Array.isArray(value) ? value.filter(isText) : []);
const muscles = (value: unknown): MuscleGroup[] =>
    Array.isArray(value)
        ? value.filter((m): m is MuscleGroup => isText(m) && m in MUSCLE_LABELS)
        : [];
const equipment = (value: unknown): EquipmentNeed[] =>
    Array.isArray(value)
        ? value.filter(
              (need): need is EquipmentNeed =>
                  isText(need) || (Array.isArray(need) && need.every(isText))
          )
        : [];

/**
 * Reads one of your own exercises, from this device or a backup, or returns null if it isn't
 * usable: it needs an id (not a built-in one), a name, how it's measured and a date. Lists
 * that are missing or broken are read as empty, and unknown muscles are dropped.
 */
export function readOwnExercise(value: unknown): OwnExercise | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const saved = value as Record<string, unknown>;
    const { id, name, measuredBy, updatedAt } = saved;
    if (
        !isText(id) ||
        id === '' ||
        id.startsWith('builtin:') ||
        !isText(name) ||
        name.trim() === '' ||
        (measuredBy !== 'reps' && measuredBy !== 'timed') ||
        !Number.isInteger(updatedAt) ||
        (updatedAt as number) < 0
    ) {
        return null;
    }
    return {
        id,
        updatedAt: updatedAt as number,
        name,
        otherNames: textList(saved['otherNames']),
        equipment: equipment(saved['equipment']),
        measuredBy,
        mainMuscles: muscles(saved['mainMuscles']),
        supportingMuscles: muscles(saved['supportingMuscles']),
        description: isText(saved['description']) ? saved['description'] : '',
        steps: textList(saved['steps']),
        tips: textList(saved['tips']),
    };
}

/** Reads one note on an exercise, or returns null if it isn't usable. */
export function readExerciseNote(value: unknown): ExerciseNote | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const { id, text, updatedAt } = value as Record<string, unknown>;
    return isText(id) &&
        id !== '' &&
        isText(text) &&
        text.trim() !== '' &&
        Number.isInteger(updatedAt)
        ? { id, text: text.slice(0, MAX_EXERCISE_NOTE_LENGTH), updatedAt: updatedAt as number }
        : null;
}
