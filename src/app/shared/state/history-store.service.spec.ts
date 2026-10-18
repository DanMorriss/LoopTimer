import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { HistoryStore, MAX_HISTORY } from './history-store.service';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    const startedAt = overrides.startedAt ?? 1_000_000;
    return {
        id: `${startedAt}-1`,
        timerId: 1,
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 60_000,
        activeSeconds: 60,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

const saved = (): HistoryEntry[] => JSON.parse(localStorage.getItem('history') ?? '[]');

describe('HistoryStore', () => {
    beforeEach(() => localStorage.clear());
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

    it('records each run only once', () => {
        const store = createStore();

        store.record(makeEntry());
        store.record(makeEntry({ activeSeconds: 99 }));

        expect(store.entries()).toHaveLength(1);
    });

    it(`keeps only the newest ${MAX_HISTORY}`, () => {
        const store = createStore();
        for (let i = 1; i <= MAX_HISTORY + 1; i++) {
            store.record(makeEntry({ startedAt: i * 1000 }));
        }

        expect(store.entries()).toHaveLength(MAX_HISTORY);
        expect(store.entries().at(-1)?.startedAt).toBe(2000);
    });

    it('deletes an entry, and can record it again (for undo)', () => {
        const store = createStore();
        const entry = makeEntry();
        store.record(entry);

        store.delete(entry.id);
        expect(store.entries()).toEqual([]);
        expect(saved()).toEqual([]);

        store.record(entry);
        expect(store.entries()).toEqual([entry]);
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
            { ...makeEntry(), timerId: 0 },
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
