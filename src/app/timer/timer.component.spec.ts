import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';
import { TimerComponent } from './timer.component';

function makeTimer(overrides: Partial<Timer> = {}): Timer {
    return {
        id: 1,
        title: 'Intervals',
        timerMinutes: 0,
        timerSeconds: 3,
        restMinutes: 0,
        restSeconds: 2,
        repeats: 2,
        isTimerActive: false,
        isRestActive: false,
        isComplete: false,
        ...overrides,
    };
}

describe('TimerComponent', () => {
    beforeEach(() => {
        // A fake clock that only moves when the test advances it (Date.now included)
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: TimerComponent;
    let fixture: ComponentFixture<TimerComponent>;
    let store: TimerStore;

    beforeEach(async () => {
        sessionStorage.clear();
        await TestBed.configureTestingModule({
            imports: [TimerComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        store = TestBed.inject(TimerStore);
    });

    afterEach(() => sessionStorage.clear());

    function start(timer: Timer) {
        store.setActiveTimer(timer);
        fixture = TestBed.createComponent(TimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    /** Advance the fake clock and re-render. */
    function advance(ms: number) {
        vi.advanceTimersByTime(ms);
        fixture.detectChanges();
    }

    function text(): string {
        return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
    }

    it('points to the library and runs no countdown when there is no active timer', async () => {
        fixture = TestBed.createComponent(TimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.isTimerActive()).toBe(false);
        expect(component.isRestActive()).toBe(false);
        expect(text()).toContain('No timer selected');
        expect(fixture.nativeElement.querySelector('.timer-ring')).toBeNull();
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
        expect(link.getAttribute('href')).toBe('/library');
        fixture.destroy();
    });

    describe('work phase', () => {
        it('starts with the work time showing, zero-padded', async () => {
            start(makeTimer({ timerMinutes: 1, timerSeconds: 5 }));

            expect(component.isTimerActive()).toBe(true);
            expect(text()).toContain('01:05');
            fixture.destroy();
        });

        it('counts down one second per tick', async () => {
            start(makeTimer());

            advance(1000);
            expect(text()).toContain('00:02');

            advance(1000);
            expect(text()).toContain('00:01');
            fixture.destroy();
        });

        it('rolls minutes over into 59 seconds', async () => {
            start(makeTimer({ timerMinutes: 1, timerSeconds: 0 }));

            advance(1000);

            expect(text()).toContain('00:59');
            fixture.destroy();
        });

        it('reports progress through the work phase', async () => {
            start(makeTimer({ timerSeconds: 4 }));
            expect(component.progress()).toBe(0);

            advance(2000);

            expect(component.progress()).toBe(0.5);
            fixture.destroy();
        });
    });

    describe('rest phase', () => {
        it('switches to rest exactly when the work time runs out', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2 }));

            advance(2999);
            expect(component.isTimerActive()).toBe(true);

            advance(1);
            expect(component.isTimerActive()).toBe(false);
            expect(component.isRestActive()).toBe(true);
            expect(text()).toContain('Rest');
            expect(text()).toContain('00:02');
            fixture.destroy();
        });

        it('starts the next round exactly when the rest time runs out', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));

            advance(3000 + 2000);

            expect(component.isRestActive()).toBe(false);
            expect(component.isTimerActive()).toBe(true);
            expect(component.repeats()).toBe(1);
            expect(text()).toContain('00:03');
            fixture.destroy();
        });

        it('skips rest entirely when the rest time is zero', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 0, repeats: 2 }));

            advance(3000);

            expect(component.isRestActive()).toBe(false);
            expect(component.isTimerActive()).toBe(true);
            expect(component.repeats()).toBe(1);
            expect(text()).toContain('00:03');
            fixture.destroy();
        });
    });

    describe('finishing', () => {
        it('finishes right after the last work phase, with no trailing rest', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 1 }));

            advance(3000);

            expect(component.isComplete()).toBe(true);
            expect(component.isRestActive()).toBe(false);
            expect(component.progress()).toBe(1);
            expect(text()).toContain("You're finished!");
            fixture.destroy();
        });

        it('takes exactly work + rest + work for two rounds', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));

            advance(3000 + 2000 + 3000 - 1);
            expect(component.isComplete()).toBe(false);

            advance(1);
            expect(component.isComplete()).toBe(true);
            fixture.destroy();
        });

        it('stops counting once finished', async () => {
            start(makeTimer({ timerSeconds: 1, repeats: 1 }));

            advance(1000);
            advance(10000);

            expect(component.isComplete()).toBe(true);
            expect(component.isTimerActive()).toBe(false);
            expect(component.isRestActive()).toBe(false);
            fixture.destroy();
        });
    });

    describe('repeats display', () => {
        it('shows one marker per remaining round', async () => {
            start(makeTimer({ repeats: 3 }));

            const markers = fixture.nativeElement.querySelectorAll('.rubik-spray-paint-regular');
            expect(markers).toHaveLength(3);
            fixture.destroy();
        });

        it('says "Last one!" during the final work phase', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 0, repeats: 2 }));
            expect(text()).not.toContain('Last one!');

            advance(3000);

            expect(text()).toContain('Last one!');
            fixture.destroy();
        });
    });

    it('restarts from the beginning when a different timer is made active', async () => {
        start(makeTimer({ timerSeconds: 10 }));
        advance(4000);

        store.setActiveTimer(makeTimer({ id: 2, title: 'Second', timerSeconds: 20 }));
        fixture.detectChanges();

        expect(text()).toContain('Second');
        expect(text()).toContain('00:20');
        advance(1000);
        expect(text()).toContain('00:19');
        fixture.destroy();
    });

    it('shows only the work phase when a different timer is made active during rest', async () => {
        start(makeTimer({ timerSeconds: 3, restSeconds: 5 }));
        advance(3000);
        expect(component.isRestActive()).toBe(true);

        store.setActiveTimer(makeTimer({ id: 2, title: 'Second', timerSeconds: 20 }));
        fixture.detectChanges();

        expect(component.isTimerActive()).toBe(true);
        expect(component.isRestActive()).toBe(false);
        expect(text()).not.toContain('Rest');
        expect(fixture.nativeElement.querySelector('.timer-ring').classList).not.toContain(
            'timer-ring--rest'
        );
        fixture.destroy();
    });

    it('picks the active timer back up after a page refresh', async () => {
        // Simulate a refresh: the timer was saved and made active in a previous page load
        localStorage.setItem(
            'timers',
            JSON.stringify([makeTimer({ id: 7, title: 'Saved', timerSeconds: 30 })])
        );
        sessionStorage.setItem('activeTimerId', '7');
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [TimerComponent],
            providers: [provideRouter([])],
        });

        fixture = TestBed.createComponent(TimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(text()).toContain('Saved');
        expect(text()).toContain('00:30');
        advance(1000);
        expect(text()).toContain('00:29');
        fixture.destroy();
        localStorage.clear();
    });

    it('resumes where it was, not from the start, after a page refresh', async () => {
        // Started 42s ago in a previous page load: 30s work done, 10s rest done, 2s into round 2
        localStorage.setItem(
            'timers',
            JSON.stringify([makeTimer({ id: 7, timerSeconds: 30, restSeconds: 10, repeats: 3 })])
        );
        sessionStorage.setItem('activeTimerId', '7');
        sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 42000));
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [TimerComponent],
            providers: [provideRouter([])],
        });

        fixture = TestBed.createComponent(TimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.isTimerActive()).toBe(true);
        expect(component.repeats()).toBe(2);
        expect(text()).toContain('00:28');
        fixture.destroy();
        localStorage.clear();
    });

    describe('when the browser delays or skips ticks (background tab, locked phone)', () => {
        it('shows the right time as soon as the page is visible again', async () => {
            start(makeTimer({ timerSeconds: 30, restSeconds: 10, repeats: 3 }));
            advance(1000);
            expect(text()).toContain('00:29');

            // 45 seconds pass with no ticks at all, as when a tab is frozen in the background
            const later = Date.now() + 45000;
            vi.spyOn(Date, 'now').mockReturnValue(later);
            document.dispatchEvent(new Event('visibilitychange'));
            fixture.detectChanges();

            // 46s in: 30s work + 10s rest done, 6s into round 2
            expect(component.isTimerActive()).toBe(true);
            expect(component.repeats()).toBe(2);
            expect(text()).toContain('00:24');
            fixture.destroy();
        });

        it('still finishes on time if ticks arrive late', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 })); // 8s in total
            const startedAt = Date.now();

            // A single late tick, well after the whole workout should have ended
            vi.spyOn(Date, 'now').mockReturnValue(startedAt + 20000);
            advance(250);

            expect(component.isComplete()).toBe(true);
            expect(text()).toContain("You're finished!");
            fixture.destroy();
        });
    });

    describe('screen reader announcements', () => {
        const liveRegion = () => fixture.nativeElement.querySelector('[aria-live]') as HTMLElement;
        const said = () => liveRegion().textContent?.trim();

        it('uses a polite live region', async () => {
            start(makeTimer());

            expect(liveRegion().getAttribute('aria-live')).toBe('polite');
            expect(liveRegion().getAttribute('aria-atomic')).toBe('true');
            fixture.destroy();
        });

        it('announces each phase as it starts, then the finish', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 3 }));
            expect(said()).toBe('Work, round 1 of 3');

            advance(3000);
            expect(said()).toBe('Rest');

            advance(2000);
            expect(said()).toBe('Work, round 2 of 3');

            advance(5000);
            expect(said()).toBe('Work, last round');

            advance(3000);
            expect(said()).toBe('Finished');
            fixture.destroy();
        });

        it('does not change between seconds, so the countdown is not read out', async () => {
            start(makeTimer({ timerSeconds: 5 }));
            const textNode = liveRegion().firstChild;
            const before = said();

            advance(1000);
            advance(1000);

            expect(said()).toBe(before);
            expect(liveRegion().firstChild).toBe(textNode);
            fixture.destroy();
        });

        it('says "round 1 of 1" rather than "last round" for a single-round timer', async () => {
            start(makeTimer({ repeats: 1 }));

            expect(said()).toBe('Work, round 1 of 1');
            fixture.destroy();
        });
    });

    describe('progress ring', () => {
        const ring = () => fixture.nativeElement.querySelector('.timer-ring') as HTMLElement;
        const sweeps = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll('.timer-ring__sweep')
            ) as HTMLElement[];

        it('keeps the same sweep animation for the whole phase', async () => {
            start(makeTimer({ timerSeconds: 4, restSeconds: 2 }));
            const first = sweeps()[0];

            advance(3000);

            expect(sweeps()).toHaveLength(1);
            expect(sweeps()[0]).toBe(first);
            fixture.destroy();
        });

        it('starts a fresh sweep, mirrored for rest, when the phase changes', async () => {
            start(makeTimer({ timerSeconds: 4, restSeconds: 2 }));
            const workSweep = sweeps()[0];
            expect(ring().classList).toContain('timer-ring--work');

            advance(4000);

            expect(sweeps()).toHaveLength(1);
            expect(sweeps()[0]).not.toBe(workSweep);
            expect(ring().classList).toContain('timer-ring--rest');
            fixture.destroy();
        });

        it('splits the phase between the two halves of the ring', async () => {
            start(makeTimer({ timerSeconds: 10 }));
            const style = sweeps()[0].style;

            expect(style.getPropertyValue('--half-duration')).toBe('5000ms');
            expect(style.getPropertyValue('--first-half-delay')).toBe('0ms');
            expect(style.getPropertyValue('--second-half-delay')).toBe('5000ms');
            fixture.destroy();
        });

        it('starts part-way round when resuming after a refresh', async () => {
            // 3.5s into a 10s work phase
            localStorage.setItem(
                'timers',
                JSON.stringify([makeTimer({ id: 7, timerSeconds: 10 })])
            );
            sessionStorage.setItem('activeTimerId', '7');
            sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 3500));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [TimerComponent],
                providers: [provideRouter([])],
            });
            fixture = TestBed.createComponent(TimerComponent);
            fixture.detectChanges();

            const style = sweeps()[0].style;
            expect(style.getPropertyValue('--first-half-delay')).toBe('-3500ms');
            expect(style.getPropertyValue('--second-half-delay')).toBe('1500ms');
            fixture.destroy();
            localStorage.clear();
        });

        it('has no sweep once finished', async () => {
            start(makeTimer({ timerSeconds: 1, repeats: 1 }));

            advance(1000);

            expect(sweeps()).toHaveLength(0);
            fixture.destroy();
        });

        it('reports progress to screen readers', async () => {
            start(makeTimer({ timerSeconds: 4 }));
            expect(ring().getAttribute('role')).toBe('progressbar');
            expect(ring().getAttribute('aria-valuenow')).toBe('0');

            advance(1000);

            expect(ring().getAttribute('aria-valuenow')).toBe('25');
            fixture.destroy();
        });
    });

    it('stops its intervals when destroyed', async () => {
        start(makeTimer());
        advance(1000);

        fixture.destroy();

        expect(vi.getTimerCount()).toBe(0);
    });
});
