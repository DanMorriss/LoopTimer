import { makeWorkout } from '../shared/testing/make-workout';
import {
    changedSince,
    CopyHere,
    keyOf,
    markOf,
    readPulled,
    recordsHere,
    ServerRecord,
} from './sync-records';

function copyHere(overrides: Partial<CopyHere> = {}): CopyHere {
    return {
        workouts: [],
        history: [],
        exercises: [],
        exerciseNotes: [],
        hiddenExercises: [],
        libraryOrder: { ids: [], updatedAt: 0 },
        deleted: [],
        ...overrides,
    };
}

describe('recordsHere', () => {
    it('gives each record and deletion here as the server keeps it', () => {
        const workout = makeWorkout({ id: 'w1', updatedAt: 5 });
        const records = recordsHere(
            copyHere({
                workouts: [workout],
                exerciseNotes: [{ id: 'builtin:plank', text: 'Squeeze', updatedAt: 6 }],
                libraryOrder: { ids: ['w1'], updatedAt: 7 },
                deleted: [{ kind: 'history', id: 'run-1', deletedAt: 8 }],
            })
        );

        expect(records).toEqual([
            {
                kind: 'workout',
                id: 'w1',
                updated_at: 5,
                deleted_at: null,
                data: workout,
                version: 7,
            },
            {
                kind: 'exercise-note',
                id: 'builtin:plank',
                updated_at: 6,
                deleted_at: null,
                data: { id: 'builtin:plank', text: 'Squeeze', updatedAt: 6 },
                version: 7,
            },
            {
                kind: 'library-order',
                id: 'library',
                updated_at: 7,
                deleted_at: null,
                data: { id: 'library', ids: ['w1'], updatedAt: 7 },
                version: 7,
            },
            {
                kind: 'history',
                id: 'run-1',
                updated_at: 8,
                deleted_at: 8,
                data: null,
                version: 7,
            },
        ]);
    });

    it("leaves out the library's order if nothing's been moved", () => {
        expect(recordsHere(copyHere())).toEqual([]);
    });
});

describe('changedSince', () => {
    const record = (updatedAt: number, deletedAt: number | null = null): ServerRecord => ({
        kind: 'workout',
        id: 'w1',
        updated_at: updatedAt,
        deleted_at: deletedAt,
        data: null,
        version: 7,
    });

    it("gives the records whose change hasn't been sent or fetched", () => {
        const seen = { [keyOf(record(5))]: markOf(record(5)) };

        expect(changedSince([record(5)], seen)).toEqual([]);
        expect(changedSince([record(6)], seen)).toEqual([record(6)]);
        // A deletion at the same time is another change
        expect(changedSince([record(5, 5)], seen)).toEqual([record(5, 5)]);
        expect(changedSince([record(5)], {})).toEqual([record(5)]);
    });
});

describe('readPulled', () => {
    const row = (fields: Partial<ServerRecord> & { seq: number }) => ({
        kind: 'workout',
        id: 'w1',
        updated_at: 5,
        deleted_at: null,
        data: makeWorkout({ id: 'w1', updatedAt: 5 }),
        version: 7,
        ...fields,
    });

    it('reads records and deletions to merge, dated as the server has them', () => {
        const page = readPulled([
            row({ seq: 1, updated_at: 9 }),
            row({ seq: 2, kind: 'history', id: 'run-1', deleted_at: 3, updated_at: 3, data: null }),
            row({
                seq: 3,
                kind: 'library-order',
                id: 'library',
                updated_at: 4,
                data: { id: 'library', ids: ['w1'], updatedAt: 99 },
            }),
        ]);

        expect(page.copy.workouts.map((w) => [w.id, w.updatedAt])).toEqual([['w1', 9]]);
        expect(page.copy.deleted).toEqual([{ kind: 'history', id: 'run-1', deletedAt: 3 }]);
        expect(page.copy.libraryOrder).toEqual({ ids: ['w1'], updatedAt: 4 });
        expect(page.read.map(keyOf)).toEqual([
            'workout:w1',
            'history:run-1',
            'library-order:library',
        ]);
        expect(page.lastSeq).toBe(3);
        expect(page.tooNewAt).toBeNull();
    });

    it("leaves out what isn't usable, but moves past it", () => {
        const page = readPulled([
            row({ seq: 1, data: { title: 'No steps' } }),
            row({ seq: 2, data: makeWorkout({ id: 'another-id' }) }),
            row({ seq: 3, kind: 'settings' as ServerRecord['kind'] }),
            row({ seq: 4, kind: 'library-order', deleted_at: 4, data: null }),
            'not a record',
        ]);

        expect(page.read).toEqual([]);
        expect(page.copy.workouts).toEqual([]);
        expect(page.lastSeq).toBe(4);
    });

    it('leaves what a newer version of the app wrote, saying where it is', () => {
        const page = readPulled([row({ seq: 1 }), row({ seq: 2, id: 'w2', version: 8 })]);

        expect(page.read.map(keyOf)).toEqual(['workout:w1']);
        expect(page.tooNewAt).toBe(2);
        expect(page.lastSeq).toBe(2);
    });
});
