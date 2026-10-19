import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from '../models/history';
import { HistoryStore } from '../shared/state/history-store.service';
import { describeRounds, formatDuration } from './history-format';
import { HistoryComponent } from './history.component';

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
        TestBed.configureTestingModule({
            providers: [provideRouter([{ path: 'history', component: HistoryComponent }])],
        });
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
    /** A button by its accessible name, e.g. "Undo" or "Options for Sprints at 11:00 AM". */
    const button = (name: string) =>
        Array.from(document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
            (b) => {
                // Icon fonts put the icon's name in the text ("delete"), so leave <mat-icon> out
                const label =
                    b.getAttribute('aria-label') ??
                    Array.from(b.childNodes)
                        .filter((node) => node.nodeName !== 'MAT-ICON')
                        .map((node) => node.textContent)
                        .join('');
                // Times use a narrow no-break space ("11:00\u202FAM"), so compare with spaces collapsed
                return label.replace(/\s+/g, ' ').trim() === name;
            }
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

    /** Opens an entry's ⋮ menu and picks an item, e.g. "Delete". */
    function choose(entry: string, item: string) {
        button(`Options for ${entry}`).click();
        fixture.detectChanges();
        button(item).click();
        fixture.detectChanges();
    }

    it('deletes a workout from its menu, then offers to undo, with focus on Undo', () => {
        create(
            makeEntry({ title: 'Sprints' }),
            makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' })
        );

        choose('Sprints at 11:00 AM', 'Delete');

        expect(text('.entry__title')).toEqual(['Plank']);
        expect(history.entries()).toHaveLength(1);
        expect(text('[role="status"]')).toEqual(['Deleted Sprints. Undo']);
        expect(document.activeElement).toBe(button('Undo'));
    });

    it('puts a deleted workout back on Undo, note and all, and focus back on its menu', () => {
        create(makeEntry({ title: 'Sprints', note: 'Felt strong' }));
        choose('Sprints at 11:00 AM', 'Delete');

        button('Undo').click();
        fixture.detectChanges();

        expect(text('.entry__title')).toEqual(['Sprints']);
        expect(text('.entry__note')).toEqual(['Note: Felt strong']);
        expect(text('[role="status"]')).toEqual(['']);
        expect(document.activeElement).toBe(button('Options for Sprints at 11:00 AM'));
    });

    describe('the options menu', () => {
        const menuButton = () => button('Options for Sprints at 11:00 AM');
        const items = () => text('.menu__item');

        it('opens from the ⋮ button, which says whether it is open', () => {
            create(makeEntry());
            expect(menuButton().getAttribute('aria-expanded')).toBe('false');
            expect(items()).toEqual([]);

            menuButton().click();
            fixture.detectChanges();

            expect(menuButton().getAttribute('aria-expanded')).toBe('true');
            expect(items()).toEqual(['edit_note Add note', 'delete Delete']);
        });

        it('offers to edit or remove a note once there is one', () => {
            create(makeEntry({ note: 'Felt strong' }));

            menuButton().click();
            fixture.detectChanges();

            expect(items()).toEqual([
                'edit_note Edit note',
                'backspace Remove note',
                'delete Delete',
            ]);
        });

        it('keeps one menu open at a time, and closes on a click elsewhere', () => {
            create(makeEntry(), makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' }));
            menuButton().click();
            fixture.detectChanges();

            button('Options for Plank at 10:00 AM').click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.menu')).toHaveLength(1);
            expect(menuButton().getAttribute('aria-expanded')).toBe('false');

            document.body.click();
            fixture.detectChanges();
            expect(fixture.nativeElement.querySelectorAll('.menu')).toHaveLength(0);
        });

        it('closes on Escape, with focus back on its button', async () => {
            create(makeEntry());
            menuButton().click();
            fixture.detectChanges();

            button('Delete').dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
            );
            fixture.detectChanges();
            await fixture.whenStable();

            expect(items()).toEqual([]);
            expect(document.activeElement).toBe(menuButton());
        });
    });

    describe('notes', () => {
        const noteBox = () =>
            fixture.nativeElement.querySelector('.entry input') as HTMLInputElement;

        function type(value: string) {
            noteBox().value = value;
            noteBox().dispatchEvent(new Event('input'));
            fixture.detectChanges();
        }

        async function save() {
            button('Save').click();
            fixture.detectChanges();
            await fixture.whenStable();
        }

        it('adds a note from the menu: the box opens with focus, and saves under the entry', async () => {
            create(makeEntry());
            choose('Sprints at 11:00 AM', 'Add note');
            await fixture.whenStable();

            expect(document.activeElement).toBe(noteBox());
            expect(noteBox().getAttribute('aria-describedby')).toMatch(/^entry-title-/);
            type('  Felt strong  ');
            await save();

            expect(history.entries()[0].note).toBe('Felt strong');
            expect(text('.entry__note')).toEqual(['Note: Felt strong']);
            expect(noteBox()).toBeNull();
            expect(document.activeElement).toBe(button('Options for Sprints at 11:00 AM'));
        });

        it('edits a note, starting from what it says', async () => {
            create(makeEntry({ note: 'Felt strong' }));
            choose('Sprints at 11:00 AM', 'Edit note');

            expect(noteBox().value).toBe('Felt strong');
            type('Knee sore');
            await save();

            expect(history.entries()[0].note).toBe('Knee sore');
        });

        it('keeps the note as it was on Cancel or Escape', async () => {
            create(makeEntry({ note: 'Felt strong' }));
            choose('Sprints at 11:00 AM', 'Edit note');
            type('Changed my mind');

            button('Cancel').click();
            fixture.detectChanges();
            expect(history.entries()[0].note).toBe('Felt strong');
            expect(noteBox()).toBeNull();

            choose('Sprints at 11:00 AM', 'Edit note');
            expect(noteBox().value).toBe('Felt strong');
            noteBox().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            fixture.detectChanges();
            expect(noteBox()).toBeNull();
        });

        it('removes a note from the menu, as does saving an empty one', async () => {
            create(makeEntry({ note: 'Felt strong' }));
            choose('Sprints at 11:00 AM', 'Remove note');

            expect(history.entries()[0].note).toBeUndefined();
            expect(text('.entry__note')).toEqual([]);

            choose('Sprints at 11:00 AM', 'Add note');
            type('Short-lived');
            await save();
            choose('Sprints at 11:00 AM', 'Edit note');
            type('   ');
            await save();
            expect(history.entries()[0].note).toBeUndefined();
        });

        it('keeps notes short', async () => {
            create(makeEntry());
            choose('Sprints at 11:00 AM', 'Add note');

            expect(noteBox().getAttribute('maxlength')).toBe('120');
        });
    });

    describe('arriving from the finished screen', () => {
        const run = makeEntry({ title: 'Sprints' });

        async function arrive(url: string) {
            [run, makeEntry({ startedAt: NOW - 2 * HOUR, title: 'Plank' })].forEach((entry) =>
                history.record(entry)
            );
            const harness = await RouterTestingHarness.create();
            await harness.navigateByUrl(url, HistoryComponent);
            await new Promise((resolve) => setTimeout(resolve));
            harness.detectChanges();
            return harness.routeNativeElement!;
        }

        it('highlights the run, and focuses it', async () => {
            const page = await arrive(`/history?run=${run.id}`);

            const highlighted = page.querySelectorAll('.entry--highlighted');
            expect(highlighted).toHaveLength(1);
            expect(highlighted[0].textContent).toContain('Sprints');
            expect(document.activeElement).toBe(highlighted[0]);
            expect(page.querySelector('.entry input')).toBeNull();
        });

        it("opens the run's note box, ready to type", async () => {
            const page = await arrive(`/history?note=${run.id}`);

            expect(page.querySelector('.entry--highlighted input')).not.toBeNull();
            expect(document.activeElement).toBe(page.querySelector('.entry--highlighted input'));
        });

        it('ignores a run that is not in the history', async () => {
            const page = await arrive('/history?note=nope');

            expect(page.querySelectorAll('.entry--highlighted')).toHaveLength(0);
            expect(page.querySelector('.entry input')).toBeNull();
        });
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
