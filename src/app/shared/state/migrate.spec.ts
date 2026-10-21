import { TestBed } from '@angular/core/testing';
import { makeTimer } from '../testing/make-timer';
import { HistoryStore } from './history-store.service';
import { DATA_VERSION, migrateSavedData } from './migrate';
import { TimerStore } from './timer-store.service';

// Data as version 1 of the app saved it: number ids, no dates
function v1Timer(id: number, title: string) {
    const { id: _id, updatedAt: _at, ...timer } = makeTimer({ title });
    return { ...timer, id };
}

const v1Entry = (startedAt: number, timerId: number) => ({
    id: `${startedAt}-${timerId}`,
    timerId,
    title: 'Sprints',
    startedAt,
    endedAt: startedAt + 60_000,
    activeSeconds: 60,
    roundsCompleted: 3,
    totalRounds: 3,
    outcome: 'finished',
});

const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('migrating saved data', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });
    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    function saveVersion1() {
        localStorage.setItem('timers', JSON.stringify([v1Timer(1, 'Legs'), v1Timer(2, 'Arms')]));
        localStorage.setItem(
            'history',
            JSON.stringify([v1Entry(1_000_000, 1), v1Entry(2_000_000, 2), v1Entry(3_000_000, 9)])
        );
        localStorage.setItem('history-deleted', JSON.stringify(['500-1']));
    }

    it('gives timers random ids and a date, and points the history to them', () => {
        saveVersion1();

        migrateSavedData(7000);

        const [legs, arms] = saved('timers');
        expect(legs.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(arms.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(legs.id).not.toBe(arms.id);
        expect([legs.updatedAt, arms.updatedAt]).toEqual([7000, 7000]);
        expect(
            saved('history').map((e: { timerId: string; updatedAt: number }) => [
                e.timerId,
                e.updatedAt,
            ])
        ).toEqual([
            [legs.id, 1_060_000],
            [arms.id, 2_060_000],
            // Its timer was deleted: the old number, as text
            ['9', 3_060_000],
        ]);
    });

    it("keeps each workout's own id, so the same run still matches", () => {
        saveVersion1();

        migrateSavedData(7000);

        expect(saved('history').map((e: { id: string }) => e.id)).toEqual([
            '1000000-1',
            '2000000-2',
            '3000000-9',
        ]);
    });

    it('turns deleted history ids into dated deletions', () => {
        saveVersion1();

        migrateSavedData(7000);

        expect(saved('deleted')).toEqual([{ kind: 'history', id: '500-1', deletedAt: 7000 }]);
        expect(localStorage.getItem('history-deleted')).toBeNull();
    });

    it('runs once: later loads leave the data alone', () => {
        saveVersion1();
        migrateSavedData(7000);
        expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));

        localStorage.setItem('timers', JSON.stringify([v1Timer(5, 'New old')]));
        migrateSavedData(8000);

        expect(saved('timers')[0].id).toBe(5);
    });

    it("leaves data it can't read for the stores to drop", () => {
        localStorage.setItem('timers', '{broken');
        localStorage.setItem('history', '"not a list"');

        migrateSavedData(7000);

        expect(localStorage.getItem('timers')).toBe('{broken');
        expect(localStorage.getItem('history')).toBe('"not a list"');
        expect(localStorage.getItem('data-version')).toBe(String(DATA_VERSION));
    });

    it('happens before the stores load, so they see the new ids', () => {
        saveVersion1();

        const timers = TestBed.inject(TimerStore).timers();
        const history = TestBed.inject(HistoryStore).entries();

        expect(timers.map((t) => t.title)).toEqual(['Legs', 'Arms']);
        expect(history.find((e) => e.id === '1000000-1')?.timerId).toBe(timers[0].id);
    });

    it('still finds a workout in progress by its old number', () => {
        saveVersion1();
        sessionStorage.setItem('activeTimerId', '2');
        sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 1000));

        expect(TestBed.inject(TimerStore).activeTimer()?.title).toBe('Arms');
    });
});
