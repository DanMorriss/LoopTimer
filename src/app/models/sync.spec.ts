import { Deletion, isDeletion, mergeRecords, Synced } from './sync';

interface Note extends Synced {
    text: string;
}

const note = (id: string, text: string, updatedAt: number): Note => ({ id, text, updatedAt });
const neverDeleted = () => undefined;

describe('mergeRecords', () => {
    it('adds records only there, at the end', () => {
        const result = mergeRecords(
            'history',
            [note('a', 'A', 1)],
            [note('b', 'B', 1)],
            neverDeleted,
            []
        );

        expect(result.records).toEqual([note('a', 'A', 1), note('b', 'B', 1)]);
        expect(result.added).toBe(1);
    });

    it('takes the copy changed most recently, and keeps this one on a tie', () => {
        const here = [note('a', 'here', 1), note('b', 'here', 5), note('c', 'here', 3)];
        const there = [note('a', 'there', 2), note('b', 'there', 4), note('c', 'there', 3)];

        const result = mergeRecords('history', here, there, neverDeleted, []);

        expect(result.records.map((n) => n.text)).toEqual(['there', 'here', 'here']);
        expect(result.updated).toBe(1);
    });

    it('takes only the first of a record listed twice there', () => {
        const result = mergeRecords(
            'history',
            [],
            [note('a', 'first', 1), note('a', 'second', 2)],
            neverDeleted,
            []
        );

        expect(result.records).toEqual([note('a', 'first', 1)]);
    });

    it("doesn't bring back a record deleted here, unless it changed there after", () => {
        const deletedHere = (id: string) => (id === 'a' || id === 'b' ? 5 : undefined);

        const result = mergeRecords(
            'history',
            [],
            [note('a', 'old', 4), note('b', 'changed', 6)],
            deletedHere,
            []
        );

        expect(result.records.map((n) => n.id)).toEqual(['b']);
    });

    it('removes a record deleted there since it last changed here', () => {
        const deletions: Deletion[] = [
            { kind: 'history', id: 'a', deletedAt: 5 },
            { kind: 'history', id: 'b', deletedAt: 5 },
            { kind: 'timer', id: 'c', deletedAt: 5 },
        ];

        const result = mergeRecords(
            'history',
            [note('a', 'A', 4), note('b', 'B', 6), note('c', 'C', 1)],
            [],
            neverDeleted,
            deletions
        );

        // b changed after; c's deletion is for a timer, not this kind
        expect(result.records.map((n) => n.id)).toEqual(['b', 'c']);
        expect(result.removed).toBe(1);
        expect(result.deletions).toEqual([deletions[0]]);
    });

    it("keeps a deletion of a record that isn't here, so it carries on, unless it's known", () => {
        const known = (id: string) => (id === 'old' ? 9 : undefined);

        const result = mergeRecords('history', [], [], known, [
            { kind: 'history', id: 'gone', deletedAt: 5 },
            { kind: 'history', id: 'old', deletedAt: 5 },
        ]);

        expect(result.deletions).toEqual([{ kind: 'history', id: 'gone', deletedAt: 5 }]);
        expect(result.removed).toBe(0);
    });
});

describe('isDeletion', () => {
    it('accepts a deletion, and nothing else', () => {
        expect(isDeletion({ kind: 'timer', id: 'a', deletedAt: 1 })).toBe(true);
        for (const value of [
            null,
            'a',
            { kind: 'note', id: 'a', deletedAt: 1 },
            { kind: 'timer', id: '', deletedAt: 1 },
            { kind: 'timer', id: 'a', deletedAt: 0 },
            { kind: 'timer', id: 'a', deletedAt: 1.5 },
        ]) {
            expect(isDeletion(value)).toBe(false);
        }
    });
});
