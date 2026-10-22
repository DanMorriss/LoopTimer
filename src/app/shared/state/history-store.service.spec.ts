import { TestBed } from '@angular/core/testing';
import { HistoryEntry, MAX_NOTE_LENGTH } from '../../models/history';
import { HistoryStore, MAX_HISTORY } from './history-store.service';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    const startedAt = overrides.startedAt ?? 1_000_000;
    return {
        id: `${startedAt}-1`,
        workoutId: 'workout-1',
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 60_000,
        updatedAt: NOW,
        activeSeconds: 60,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

const saved = (): HistoryEntry[] => JSON.parse(localStorage.getItem('history') ?? '[]');

// When the tests run: Date.now() for anything the store dates, e.g. a record
const NOW = 5_000_000;

describe('HistoryStore', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
    });
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(HistoryStore);

    it('starts empty', () => {
        expect(createStore().entries()).toEqual([]);
    });

    it('records a workout and saves it', () => {
        const store = createStore();
        const entry = makeEntry();

        store.record(entry);

        expect(store.entries()).toEqual([entry]);
        expect(saved()).toEqual([entry]);
    });

    it('keeps the newest first, whatever order they are recorded in', () => {
        const store = createStore();
        const older = makeEntry({ startedAt: 1_000 });
        const newer = makeEntry({ startedAt: 2_000 });

        store.record(newer);
        store.record(older);

        expect(store.entries()).toEqual([newer, older]);
    });

    it('keeps one entry per run, updated by the latest record of it', () => {
        const store = createStore();

        store.record(makeEntry({ outcome: 'stopped', activeSeconds: 30 }));
        store.record(makeEntry({ outcome: 'finished', activeSeconds: 99 }));

        expect(store.entries()).toEqual([
            expect.objectContaining({ outcome: 'finished', activeSeconds: 99 }),
        ]);
        expect(JSON.parse(localStorage.getItem('history')!)).toHaveLength(1);
    });

    it('keeps a note when the same run is recorded again, e.g. leaving its finished screen', () => {
        const store = createStore();
        store.record(makeEntry());
        store.setNote(makeEntry().id, 'Felt strong');

        store.record(makeEntry({ activeSeconds: 99 }));

        expect(store.entries()[0]).toEqual(
            expect.objectContaining({ activeSeconds: 99, note: 'Felt strong' })
        );
    });

    describe('notes', () => {
        it('saves a note, trimmed, with the entry', () => {
            const store = createStore();
            store.record(makeEntry());

            store.setNote(makeEntry().id, '  Knee sore  ');

            expect(store.entries()[0].note).toBe('Knee sore');
            expect(JSON.parse(localStorage.getItem('history')!)[0].note).toBe('Knee sore');
        });

        it('cuts a note to the longest allowed', () => {
            const store = createStore();
            store.record(makeEntry());

            store.setNote(makeEntry().id, 'x'.repeat(MAX_NOTE_LENGTH + 10));

            expect(store.entries()[0].note).toHaveLength(MAX_NOTE_LENGTH);
        });

        it('removes the note when set to nothing', () => {
            const store = createStore();
            store.record(makeEntry({ note: 'Felt strong' }));

            store.setNote(makeEntry().id, '   ');

            expect('note' in store.entries()[0]).toBe(false);
        });

        it('loads saved notes, and entries saved before notes existed', () => {
            localStorage.setItem(
                'history',
                JSON.stringify([
                    makeEntry({ note: 'Felt strong' }),
                    makeEntry({ startedAt: 5_000 }),
                    makeEntry({ startedAt: 6_000, note: 42 as unknown as string }),
                ])
            );

            // Newest first; the one with a broken note is dropped
            expect(
                createStore()
                    .entries()
                    .map((entry) => entry.note)
            ).toEqual(['Felt strong', undefined]);
        });
    });

    it(`keeps only the newest ${MAX_HISTORY}`, () => {
        const store = createStore();
        for (let i = 1; i <= MAX_HISTORY + 1; i++) {
            store.record(makeEntry({ startedAt: i * 1000 }));
        }

        expect(store.entries()).toHaveLength(MAX_HISTORY);
        expect(store.entries().at(-1)?.startedAt).toBe(2000);
    });

    it('deletes an entry, and can restore it (for undo)', () => {
        const store = createStore();
        const entry = makeEntry();
        store.record(entry);

        store.delete(entry.id);
        expect(store.entries()).toEqual([]);
        expect(saved()).toEqual([]);

        store.restore(entry);
        expect(store.entries()).toEqual([entry]);
        expect(saved()).toEqual([entry]);
    });

    // The run may still be going, and logs itself again when it finishes or the tab closes
    it("doesn't let a deleted entry be recorded again, even after a reload", () => {
        const entry = makeEntry({ outcome: 'stopped' });
        createStore().record(entry);
        createStore().delete(entry.id);

        TestBed.resetTestingModule();
        const store = createStore();
        store.record({ ...entry, outcome: 'finished' });

        expect(store.entries()).toEqual([]);
        expect(saved()).toEqual([]);
    });

    it('records a restored entry again as its run goes on', () => {
        const store = createStore();
        const entry = makeEntry({ outcome: 'stopped' });
        store.record(entry);
        store.delete(entry.id);
        store.restore(entry);

        store.record({ ...entry, outcome: 'finished' });

        expect(store.entries().map((e) => e.outcome)).toEqual(['finished']);
    });

    it('ignores unusable saved deletions', () => {
        localStorage.setItem('deleted', '{broken');
        const store = createStore();

        store.record(makeEntry());

        expect(store.entries()).toHaveLength(1);
    });

    describe('dates for sync', () => {
        it('dates each record and note, as the time it changed', () => {
            const store = createStore();
            store.record({ ...makeEntry(), updatedAt: 1 } as never);
            expect(store.entries()[0].updatedAt).toBe(NOW);

            vi.spyOn(Date, 'now').mockReturnValue(NOW + 500);
            store.setNote(makeEntry().id, 'Felt strong');

            expect(store.entries()[0].updatedAt).toBe(NOW + 500);
            expect(saved()[0].updatedAt).toBe(NOW + 500);
        });

        it('leaves a dated deletion behind, which restoring clears', () => {
            const store = createStore();
            store.record(makeEntry());

            store.delete(makeEntry().id);
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([
                { kind: 'history', id: makeEntry().id, deletedAt: NOW },
            ]);

            store.restore(makeEntry());
            expect(JSON.parse(localStorage.getItem('deleted')!)).toEqual([]);
        });

        it('dates a saved entry with no date by when it ended', () => {
            const { updatedAt: _u, ...undated } = makeEntry();
            localStorage.setItem('history', JSON.stringify([undated]));

            expect(createStore().entries()[0].updatedAt).toBe(makeEntry().endedAt);
        });
    });

    it('loads saved sets, dropping broken ones but keeping the workout', () => {
        const good = { round: 0, step: 1, name: 'Squats', reps: 10, weight: 60 };
        localStorage.setItem(
            'history',
            JSON.stringify([
                makeEntry({ startedAt: 2_000, sets: [good, { ...good, reps: 0 }] }),
                { ...makeEntry({ startedAt: 1_000 }), sets: 'lots' },
            ])
        );

        const [withSets, withBroken] = createStore().entries();

        expect(withSets.sets).toEqual([good]);
        expect(withBroken).toEqual(makeEntry({ startedAt: 1_000 }));
    });

    it('loads saved history, newest first', () => {
        const older = makeEntry({ startedAt: 1_000 });
        const newer = makeEntry({ startedAt: 2_000 });
        localStorage.setItem('history', JSON.stringify([older, newer]));

        expect(createStore().entries()).toEqual([newer, older]);
    });

    it('keeps valid saved entries and drops broken ones', () => {
        const valid = makeEntry();
        const broken = [
            null,
            'text',
            { ...makeEntry(), id: 7 },
            { ...makeEntry(), workoutId: '' },
            { ...makeEntry(), title: null },
            { ...makeEntry(), endedAt: 0 },
            { ...makeEntry(), activeSeconds: -1 },
            { ...makeEntry(), roundsCompleted: 1.5 },
            { ...makeEntry(), outcome: 'abandoned' },
        ];
        localStorage.setItem('history', JSON.stringify([valid, ...broken]));

        expect(createStore().entries()).toEqual([valid]);
    });

    for (const [label, data] of [
        ['corrupted', '{oops'],
        ['not a list', '{"id": "a"}'],
    ]) {
        it(`starts empty when the saved history is ${label}`, () => {
            localStorage.setItem('history', data);

            expect(createStore().entries()).toEqual([]);
        });
    }
});
