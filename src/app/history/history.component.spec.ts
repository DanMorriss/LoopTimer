import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HistoryEntry } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';
import { describeRounds, formatDuration, HistoryComponent } from './history.component';

// Midday on Sunday 18 October 2026, so "today" and "yesterday" can't flip mid-test
const NOW = new Date(2026, 9, 18, 12, 0).getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    const startedAt = overrides.startedAt ?? NOW - HOUR;
    return {
        id: `${startedAt}-1`,
        timerId: 1,
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 600_000,
        activeSeconds: 600,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

describe('HistoryComponent', () => {
    let fixture: ComponentFixture<HistoryComponent>;
    let history: HistoryStore;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        history = TestBed.inject(HistoryStore);
    });
    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
    });

    function create(...entries: HistoryEntry[]) {
        entries.forEach((entry) => history.record(entry));
        fixture = TestBed.createComponent(HistoryComponent);
        fixture.detectChanges();
    }

    const text = (selector: string) =>
        Array.from(fixture.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>).map(
            (el) => el.textContent!.replace(/\s+/g, ' ').trim()
        );
    const button = (name: string) =>
        Array.from(
            fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
        ).find(
            // Times use a narrow no-break space ("11:00\u202FAM"), so compare with spaces collapsed
            (b) =>
                (b.getAttribute('aria-label') ?? b.textContent!).replace(/\s+/g, ' ').trim() ===
                name
        )!;

    it('says there are no workouts yet, and links to the library', () => {
        create();

        expect(fixture.nativeElement.textContent).toContain('No workouts yet');
        expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/library');
    });

    it('groups workouts by day, newest first: Today, Yesterday, then the date', () => {
        create(
            makeEntry({ startedAt: NOW - 3 * DAY, title: 'Older' }),
            makeEntry({ startedAt: NOW - HOUR, title: 'This morning' }),
            makeEntry({ startedAt: NOW - DAY, title: 'Yesterday lunch' }),
            makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Earlier today' })
        );

        expect(text('.history__day-label')).toEqual(['Today', 'Yesterday', 'Thursday 15 October']);
        expect(text('.entry__title')).toEqual([
            'This morning',
            'Earlier today',
            'Yesterday lunch',
            'Older',
        ]);
    });

    it('shows when each one started, how long it ran, and the rounds', () => {
        create(
            makeEntry({
                activeSeconds: 754,
                roundsCompleted: 2,
                totalRounds: 5,
                outcome: 'stopped',
            })
        );

        expect(text('.entry__detail')).toEqual(['11:00 AM · 12:34 · 2 of 5 rounds · stopped']);
    });

    it('names an untitled timer', () => {
        create(makeEntry({ title: '  ' }));

        expect(text('.entry__title')).toEqual(['Untitled timer']);
    });

    it('sums up the last seven days', () => {
        create(
            makeEntry({ startedAt: NOW - HOUR, activeSeconds: 1800 }),
            makeEntry({ startedAt: NOW - 6 * DAY, activeSeconds: 2000 }),
            makeEntry({ startedAt: NOW - 8 * DAY, activeSeconds: 9999 })
        );

        expect(text('.history__summary')).toEqual(['Last 7 days: 2 workouts · 1:03:20']);
    });

    it('deletes a workout, then offers to undo, with focus on Undo', () => {
        create(
            makeEntry({ title: 'Sprints' }),
            makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' })
        );

        button('Delete Sprints at 11:00 AM').click();
        fixture.detectChanges();

        expect(text('.entry__title')).toEqual(['Plank']);
        expect(history.entries()).toHaveLength(1);
        expect(text('[role="status"]')).toEqual(['Deleted Sprints. Undo']);
        expect(document.activeElement).toBe(button('Undo'));
    });

    it('puts a deleted workout back on Undo, and focus back on it', () => {
        create(makeEntry({ title: 'Sprints' }));
        button('Delete Sprints at 11:00 AM').click();
        fixture.detectChanges();

        button('Undo').click();
        fixture.detectChanges();

        expect(text('.entry__title')).toEqual(['Sprints']);
        expect(text('[role="status"]')).toEqual(['']);
        expect(document.activeElement).toBe(button('Delete Sprints at 11:00 AM'));
    });

    describe('formatDuration', () => {
        it('shows minutes and seconds, and hours when there are any', () => {
            expect(formatDuration(5)).toBe('0:05');
            expect(formatDuration(754)).toBe('12:34');
            expect(formatDuration(3725)).toBe('1:02:05');
        });
    });

    describe('describeRounds', () => {
        it('says how many rounds, and whether it was stopped or ran until stopped', () => {
            expect(describeRounds(makeEntry({ roundsCompleted: 1, totalRounds: 1 }))).toBe(
                '1 round'
            );
            expect(describeRounds(makeEntry({ roundsCompleted: 3, totalRounds: 3 }))).toBe(
                '3 rounds'
            );
            expect(
                describeRounds(
                    makeEntry({ roundsCompleted: 2, totalRounds: 5, outcome: 'stopped' })
                )
            ).toBe('2 of 5 rounds · stopped');
            expect(
                describeRounds(
                    makeEntry({ roundsCompleted: 12, totalRounds: 0, outcome: 'stopped' })
                )
            ).toBe('12 rounds · until stopped');
        });
    });
});
