import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Timer, UNTIL_STOPPED } from '../models/timer';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { TimerStore } from '../shared/state/timer-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { AlarmService } from '../shared/alarms/alarm.service';
import { ActiveRunService } from '../shared/run/active-run.service';
import { KeepAwakeService } from '../shared/run/keep-awake.service';
import { contrastRatio } from '../shared/testing/contrast';
import { FakeAudioContext, provideFakeAudioContext } from '../shared/testing/fake-audio-context';
import {
    makeTimer as baseTimer,
    reps,
    rest,
    SimpleTimer,
    work,
} from '../shared/testing/make-timer';
import { TimerComponent } from './timer.component';

// 3s work, 2s rest, 2 rounds unless a test says otherwise
const makeTimer = (overrides: Partial<SimpleTimer> = {}) =>
    baseTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2, ...overrides });

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
    let audio: FakeAudioContext;

    beforeEach(async () => {
        sessionStorage.clear();
        audio = new FakeAudioContext();
        await TestBed.configureTestingModule({
            imports: [TimerComponent],
            providers: [provideRouter([]), provideFakeAudioContext(audio)],
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

    describe('rounds display', () => {
        const dots = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll('.round-dot') as NodeListOf<Element>
            ).map((dot) => dot.className.match(/round-dot--(\w+)/)![1]);
        /** The visible round line; the screen reader announcement has its own copy. */
        const status = () =>
            (
                fixture.nativeElement.querySelector('.timer-status') as HTMLElement
            ).textContent!.trim();

        it('says which round it is on, with a dot per round', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 0, repeats: 4 }));
            expect(text()).toContain('round 1 of 4');
            expect(dots()).toEqual(['current', 'left', 'left', 'left']);

            advance(3000);

            expect(text()).toContain('round 2 of 4');
            expect(dots()).toEqual(['done', 'current', 'left', 'left']);
            fixture.destroy();
        });

        it('hides the dots from screen readers, which hear the round in the announcements', () => {
            start(makeTimer({ repeats: 3 }));

            const row = fixture.nativeElement.querySelector('.round-dots') as HTMLElement;
            expect(row.getAttribute('aria-hidden')).toBe('true');
            fixture.destroy();
        });

        it('says "Last one!" instead of the count in the final round', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));
            expect(status()).not.toContain('Last one!');

            advance(5000);

            expect(status()).toContain('Last one!');
            expect(status()).not.toContain('round 2 of 2');
            expect(dots()).toEqual(['done', 'current']);
            fixture.destroy();
        });

        it('shows no rounds for a single-round timer', () => {
            start(makeTimer({ repeats: 1 }));

            expect(status()).toBe('');
            expect(dots()).toEqual([]);
            fixture.destroy();
        });

        it('leaves out the dots when there are too many rounds to fit in a row', () => {
            start(makeTimer({ repeats: 16 }));

            expect(text()).toContain('round 1 of 16');
            expect(dots()).toEqual([]);
            fixture.destroy();
        });

        it('clears the rounds once the workout is finished', () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 0, repeats: 2 }));

            advance(6000);

            expect(component.isComplete()).toBe(true);
            expect(text()).not.toContain('Last one!');
            expect(dots()).toEqual([]);
            fixture.destroy();
        });
    });

    it('restarts from the beginning when a different timer is made active', async () => {
        start(makeTimer({ timerSeconds: 10 }));
        advance(4000);

        store.setActiveTimer(makeTimer({ id: 'timer-2', title: 'Second', timerSeconds: 20 }));
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

        store.setActiveTimer(makeTimer({ id: 'timer-2', title: 'Second', timerSeconds: 20 }));
        fixture.detectChanges();

        expect(component.isTimerActive()).toBe(true);
        expect(component.isRestActive()).toBe(false);
        expect(fixture.nativeElement.querySelector('.timer-face').textContent).not.toContain(
            'Rest'
        );
        expect(fixture.nativeElement.querySelector('.timer-ring').classList).not.toContain(
            'timer-ring--rest'
        );
        fixture.destroy();
    });

    it('picks the active timer back up after a page refresh', async () => {
        // Simulate a refresh: the timer was saved and made active in a previous page load
        localStorage.setItem(
            'timers',
            JSON.stringify([makeTimer({ id: 'timer-7', title: 'Saved', timerSeconds: 30 })])
        );
        sessionStorage.setItem('activeTimerId', 'timer-7');
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [TimerComponent],
            providers: [provideRouter([]), provideFakeAudioContext(audio)],
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
            JSON.stringify([
                makeTimer({ id: 'timer-7', timerSeconds: 30, restSeconds: 10, repeats: 3 }),
            ])
        );
        sessionStorage.setItem('activeTimerId', 'timer-7');
        sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 42000));
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [TimerComponent],
            providers: [provideRouter([]), provideFakeAudioContext(audio)],
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
            expect(said()).toBe('Timed, round 1 of 3');

            advance(3000);
            expect(said()).toBe('Rest');

            advance(2000);
            expect(said()).toBe('Timed, round 2 of 3');

            advance(5000);
            expect(said()).toBe('Timed, last round');

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

            expect(said()).toBe('Timed, round 1 of 1');
            fixture.destroy();
        });
    });

    describe('colours', () => {
        // Read the colours as the browser renders them, so a change to the styles can't
        // quietly make a phase hard to see again
        function colours() {
            const el = fixture.nativeElement as HTMLElement;
            const ring = el.querySelector('.timer-ring') as HTMLElement;
            const fill = el.querySelector('.timer-ring__fill') as HTMLElement;
            const face = el.querySelector('.timer-face') as HTMLElement;
            return {
                track: getComputedStyle(ring).backgroundColor,
                fill: getComputedStyle(fill).backgroundColor,
                flash: getComputedStyle(face, '::before').backgroundColor,
                text: getComputedStyle(face).color,
            };
        }

        for (const [phase, elapsedMs] of [
            ['work', 0],
            ['rest', 3000],
        ] as const) {
            it(`makes the ${phase} progress stand out from the track (at least 3:1)`, () => {
                start(makeTimer({ timerSeconds: 3, restSeconds: 2 }));
                advance(elapsedMs);
                const { track, fill } = colours();

                expect(contrastRatio(fill, track)).toBeGreaterThanOrEqual(3);
                fixture.destroy();
            });

            it(`keeps the countdown readable on the ${phase} flash colour (at least 4.5:1)`, () => {
                start(makeTimer({ timerSeconds: 3, restSeconds: 2 }));
                advance(elapsedMs);
                const { flash, text } = colours();

                expect(contrastRatio(text, flash)).toBeGreaterThanOrEqual(4.5);
                fixture.destroy();
            });
        }
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
                JSON.stringify([makeTimer({ id: 'timer-7', timerSeconds: 10 })])
            );
            sessionStorage.setItem('activeTimerId', 'timer-7');
            sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 3500));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [TimerComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
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

    describe('pause, resume and stop', () => {
        const buttons = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll('.timer-controls button')
            ) as HTMLButtonElement[];
        // The controls are icons, so they're found by their accessible name
        const button = (label: string) =>
            buttons().find((b) => b.getAttribute('aria-label') === label);
        const ring = () => fixture.nativeElement.querySelector('.timer-ring') as HTMLElement;

        function press(label: string) {
            const target = button(label);
            expect(target, `expected a ${label} button`).toBeDefined();
            target!.click();
            fixture.detectChanges();
        }

        it('offers Pause and Stop while running', () => {
            start(makeTimer());

            expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual(['Pause', 'Stop']);
            fixture.destroy();
        });

        it('captions the icon buttons with their names, hidden from screen readers', () => {
            start(makeTimer());
            const captions = Array.from(
                fixture.nativeElement.querySelectorAll('.timer-control__caption')
            ) as HTMLElement[];

            expect(captions.map((c) => c.textContent?.trim())).toEqual(['Pause', 'Stop']);
            expect(captions.every((c) => c.getAttribute('aria-hidden') === 'true')).toBe(true);

            press('Pause');

            expect(captions[0].textContent?.trim()).toBe('Resume');
            fixture.destroy();
        });

        it('holds the countdown still while paused', () => {
            start(makeTimer({ timerSeconds: 10 }));
            advance(3000);

            press('Pause');
            advance(5000);

            expect(text()).toContain('00:07');
            expect(text()).toContain('Paused');
            expect(component.isPaused()).toBe(true);
            fixture.destroy();
        });

        it('does not move on to rest while paused, however long it waits', () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2 }));
            press('Pause');

            advance(60000);

            expect(component.isTimerActive()).toBe(true);
            expect(component.isRestActive()).toBe(false);
            fixture.destroy();
        });

        it('carries on from where it was paused when resumed', () => {
            start(makeTimer({ timerSeconds: 10 }));
            advance(3000);
            press('Pause');
            advance(5000);

            press('Resume');
            expect(text()).toContain('00:07');
            expect(text()).not.toContain('Paused');

            advance(1000);
            expect(text()).toContain('00:06');
            fixture.destroy();
        });

        it('freezes the ring sweep and the flash while paused, without restarting them', () => {
            start(makeTimer({ timerSeconds: 10 }));
            const sweep = fixture.nativeElement.querySelector('.timer-ring__sweep');
            const fill = () =>
                fixture.nativeElement.querySelector('.timer-ring__fill') as HTMLElement;
            const face = () => fixture.nativeElement.querySelector('.timer-face') as HTMLElement;

            press('Pause');
            expect(ring().classList).toContain('timer-ring--paused');
            expect(getComputedStyle(fill()).animationPlayState).toBe('paused');
            expect(getComputedStyle(face(), '::before').animationPlayState).toBe('paused');

            press('Resume');
            expect(ring().classList).not.toContain('timer-ring--paused');
            expect(getComputedStyle(fill()).animationPlayState).toBe('running');
            expect(fixture.nativeElement.querySelector('.timer-ring__sweep')).toBe(sweep);
            fixture.destroy();
        });

        it('tells screen readers it has paused, then which phase it is back in', () => {
            start(makeTimer({ repeats: 3 }));
            const said = () =>
                (
                    fixture.nativeElement.querySelector('[aria-live]') as HTMLElement
                ).textContent?.trim();

            press('Pause');
            expect(said()).toBe('Paused');

            press('Resume');
            expect(said()).toBe('Timed, round 1 of 3');
            fixture.destroy();
        });

        it('stays paused at the same point after a page refresh', () => {
            localStorage.setItem(
                'timers',
                JSON.stringify([makeTimer({ id: 'timer-7', timerSeconds: 30 })])
            );
            sessionStorage.setItem('activeTimerId', 'timer-7');
            sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 60000));
            // Paused 4s in, a minute ago
            sessionStorage.setItem('activeTimerPausedAt', String(Date.now() - 56000));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [TimerComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(TimerComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            expect(text()).toContain('00:26');
            expect(button('Resume')).toBeDefined();
            fixture.destroy();
            localStorage.clear();
        });

        it('ends the workout and goes back to the library when stopped', async () => {
            start(makeTimer());
            const router = TestBed.inject(Router);
            const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

            press('Stop');

            expect(store.activeTimer()).toBeNull();
            expect(navigate).toHaveBeenCalledWith(['/library']);
            fixture.destroy();
        });

        it('hides the controls once finished', () => {
            start(makeTimer({ timerSeconds: 1, repeats: 1 }));

            advance(1000);

            expect(buttons()).toHaveLength(0);
            fixture.destroy();
        });

        describe('with the space bar', () => {
            /** Presses Space on `target`; returns whether the browser's default (scrolling, clicking) was stopped. */
            function pressSpace(target: Element = document.body, init: KeyboardEventInit = {}) {
                const event = new KeyboardEvent('keydown', {
                    key: ' ',
                    code: 'Space',
                    bubbles: true,
                    cancelable: true,
                    ...init,
                });
                target.dispatchEvent(event);
                fixture.detectChanges();
                return event.defaultPrevented;
            }

            it('pauses, then resumes, and stops the page scrolling', () => {
                start(makeTimer({ timerSeconds: 10 }));

                expect(pressSpace()).toBe(true);
                expect(component.isPaused()).toBe(true);

                pressSpace();
                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('says so to screen readers on the Pause button', () => {
                start(makeTimer());

                expect(button('Pause')!.getAttribute('aria-keyshortcuts')).toBe('Space');
                // Shown to sighted keyboard users too; screen readers already have the above
                const key = fixture.nativeElement.querySelector('kbd') as HTMLElement;
                expect(key.textContent).toBe('Space');
                expect(key.getAttribute('aria-hidden')).toBe('true');
                fixture.destroy();
            });

            it('leaves Space alone on a focused button, which Space presses anyway', () => {
                start(makeTimer());

                expect(pressSpace(button('Stop')!)).toBe(false);
                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('ignores a held-down Space, so it does not flicker between pause and resume', () => {
                start(makeTimer());
                pressSpace();

                pressSpace(document.body, { repeat: true });

                expect(component.isPaused()).toBe(true);
                fixture.destroy();
            });

            it('ignores Space with Shift, Ctrl, Alt or Cmd held', () => {
                start(makeTimer());

                pressSpace(document.body, { shiftKey: true });
                pressSpace(document.body, { ctrlKey: true });

                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('does nothing once finished', () => {
                start(makeTimer({ timerSeconds: 1, repeats: 1 }));
                advance(1000);

                expect(pressSpace()).toBe(false);
                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('does nothing when no timer is selected', () => {
                fixture = TestBed.createComponent(TimerComponent);
                component = fixture.componentInstance;
                fixture.detectChanges();

                expect(pressSpace()).toBe(false);
                fixture.destroy();
            });
        });
    });

    describe('history', () => {
        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        const entries = () => TestBed.inject(HistoryStore).entries();

        async function pressStop() {
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            const stop = Array.from(
                fixture.nativeElement.querySelectorAll(
                    '.timer-controls button'
                ) as NodeListOf<HTMLElement>
            ).find((b) => b.getAttribute('aria-label') === 'Stop')!;
            stop.click();
            await fixture.whenStable();
        }

        it('logs a finished workout, with its full time and rounds', () => {
            const startedAt = Date.now();
            start(
                makeTimer({
                    id: 'timer-4',
                    title: 'Sprints',
                    timerSeconds: 3,
                    restSeconds: 2,
                    repeats: 2,
                })
            );

            advance(8000);

            expect(entries()).toEqual([
                {
                    id: `${startedAt}-timer-4`,
                    timerId: 'timer-4',
                    title: 'Sprints',
                    startedAt,
                    endedAt: startedAt + 8000,
                    activeSeconds: 8,
                    roundsCompleted: 2,
                    totalRounds: 2,
                    outcome: 'finished',
                    updatedAt: expect.any(Number),
                },
            ]);
            fixture.destroy();
        });

        describe('the finished screen', () => {
            const finish = () => {
                const startedAt = Date.now();
                start(makeTimer({ id: 'timer-4', timerSeconds: 1, restSeconds: 0, repeats: 1 }));
                advance(1000);
                return `${startedAt}-timer-4`;
            };
            const finishButton = (name: string) =>
                Array.from(
                    fixture.nativeElement.querySelectorAll('.timer-finish button, .timer-finish a')
                ).find((b) => (b as HTMLElement).textContent!.includes(name)) as HTMLElement;

            it('offers a note as the main button, then the history and the library', () => {
                finish();

                expect(finishButton('Add a note').classList).toContain('btn-main');
                expect(finishButton('View history')).toBeDefined();
                expect(finishButton('Library').getAttribute('href')).toBe('/library');
                expect(fixture.nativeElement.querySelector('.timer-controls')).toBeNull();
                fixture.destroy();
            });

            it('opens this run in the history with its note box, or just highlighted', async () => {
                const run = finish();
                const navigate = vi
                    .spyOn(TestBed.inject(Router), 'navigate')
                    .mockResolvedValue(true);

                finishButton('Add a note').click();
                await fixture.whenStable();
                expect(navigate).toHaveBeenLastCalledWith(['/history'], {
                    queryParams: { note: run },
                });
                expect(entries().map((entry) => entry.id)).toEqual([run]);

                finishButton('View history').click();
                await fixture.whenStable();
                expect(navigate).toHaveBeenLastCalledWith(['/history'], {
                    queryParams: { run },
                });
                fixture.destroy();
            });
        });

        it('logs it once, even if the finished screen is shown again', () => {
            start(makeTimer({ timerSeconds: 1, repeats: 1 }));
            advance(1000);
            fixture.destroy();

            fixture = TestBed.createComponent(TimerComponent);
            fixture.detectChanges();
            advance(1000);

            expect(entries()).toHaveLength(1);
            fixture.destroy();
        });

        describe('the run carries on away from the timer page', () => {
            /** The clock moving on with the timer page closed: no page to re-render. */
            function advanceElsewhere(ms: number) {
                vi.advanceTimersByTime(ms);
                TestBed.tick();
            }

            it('keeps going on another page, with its alarms, and logs nothing yet', () => {
                start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 5 }));
                TestBed.inject(AlarmService).unlock();
                advance(6000);

                fixture.destroy();
                TestBed.tick();

                expect(entries()).toEqual([]);
                expect(audio.scheduledNotes()).not.toEqual([]);
                expect(TestBed.inject(ActiveRunService).state()?.round).toBe(1);
            });

            it('logs the finish while on another page', () => {
                const startedAt = Date.now();
                start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));
                fixture.destroy();

                advanceElsewhere(8000);

                expect(entries()).toEqual([
                    expect.objectContaining({
                        endedAt: startedAt + 8000,
                        roundsCompleted: 2,
                        outcome: 'finished',
                    }),
                ]);
            });

            it('logs it as stopped when another timer is started in its place', () => {
                start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 5 }));
                advance(6000); // round 2 has begun
                fixture.destroy();

                TestBed.inject(ActiveRunService).start(makeTimer({ id: 'timer-2', title: 'Next' }));

                expect(entries()).toEqual([
                    expect.objectContaining({
                        activeSeconds: 6,
                        roundsCompleted: 1,
                        totalRounds: 5,
                        outcome: 'stopped',
                    }),
                ]);
                expect(store.activeTimer()?.title).toBe('Next');
            });

            it('leaves no trace of a run replaced before its first step was done', () => {
                start(makeTimer({ timerSeconds: 3 }));
                advance(2000);

                TestBed.inject(ActiveRunService).start(makeTimer({ id: 'timer-2' }));

                expect(entries()).toEqual([]);
                fixture.destroy();
            });

            it('logs it on closing the tab or refreshing', () => {
                start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 5 }));
                advance(6000);

                window.dispatchEvent(new Event('pagehide'));

                expect(entries()).toEqual([expect.objectContaining({ outcome: 'stopped' })]);
                fixture.destroy();
            });

            it('updates that entry, rather than adding another, if the run carries on and finishes', () => {
                start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));
                advance(4000);
                window.dispatchEvent(new Event('pagehide'));
                expect(entries()).toEqual([expect.objectContaining({ outcome: 'stopped' })]);

                advance(4000);

                expect(entries()).toEqual([
                    expect.objectContaining({ outcome: 'finished', roundsCompleted: 2 }),
                ]);
                fixture.destroy();
            });

            it('keeps a finished run finished when the tab closes', () => {
                start(makeTimer({ timerSeconds: 1, repeats: 1 }));
                advance(1000);

                window.dispatchEvent(new Event('pagehide'));

                expect(entries()).toEqual([expect.objectContaining({ outcome: 'finished' })]);
                fixture.destroy();
            });
        });

        it('dates the finish when it happened, even if the page only notices later', () => {
            const startedAt = Date.now();
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 }));

            // One late tick, long after the 8 second workout ended
            vi.spyOn(Date, 'now').mockReturnValue(startedAt + 60_000);
            advance(250);

            expect(entries()[0].endedAt).toBe(startedAt + 8000);
            fixture.destroy();
        });

        it('logs a stopped workout with the rounds done and the time spent, not counting pauses', async () => {
            const startedAt = Date.now();
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 5 }));
            advance(6000); // round 2 has begun
            store.pause();
            advance(30_000);
            store.resume();
            advance(1000);

            await pressStop();

            expect(entries()).toEqual([
                expect.objectContaining({
                    startedAt,
                    endedAt: startedAt + 37_000,
                    activeSeconds: 7,
                    roundsCompleted: 1,
                    totalRounds: 5,
                    outcome: 'stopped',
                }),
            ]);
        });

        it('logs a timer that runs until stopped with no total', async () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: UNTIL_STOPPED }));
            advance(12_000);

            await pressStop();

            expect(entries()[0]).toEqual(
                expect.objectContaining({ roundsCompleted: 2, totalRounds: 0, outcome: 'stopped' })
            );
        });

        it('leaves no trace of a workout stopped before its first step is done', async () => {
            start(makeTimer({ timerSeconds: 3 }));
            advance(2000);

            await pressStop();

            expect(entries()).toEqual([]);
        });
    });

    describe('several steps', () => {
        // Squats 3s, Plank 2s, rest 2s; 2 rounds
        const circuit = () =>
            makeTimer({ steps: [work(3, 'Squats'), work(2, 'Plank'), rest(2)], repeats: 2 });
        const face = () =>
            (fixture.nativeElement.querySelector('.timer-face') as HTMLElement)
                .textContent!.replace(/\s+/g, ' ')
                .trim();
        const next = () =>
            fixture.nativeElement
                .querySelector('.timer-next')
                ?.textContent?.replace(/\s+/g, ' ')
                .trim();
        const said = () =>
            (fixture.nativeElement.querySelector('[aria-live]') as HTMLElement).textContent?.trim();

        it("shows the step's name, its time, and which step of the round it is", () => {
            start(circuit());

            expect(face()).toBe('Squats 00:03 step 1 of 3');

            advance(3000);
            expect(face()).toBe('Plank 00:02 step 2 of 3');

            advance(2000);
            expect(face()).toBe('Rest 00:02 step 3 of 3');
            fixture.destroy();
        });

        it('says what is up next, and "finish" before the end', () => {
            start(circuit());
            expect(next()).toBe('Next: Plank · 00:02');

            advance(3000);
            expect(next()).toBe('Next: Rest · 00:02');

            advance(4000); // round 2
            expect(next()).toBe('Next: Plank · 00:02');

            advance(3000); // Plank, the last work of the last round: its rest is skipped
            expect(next()).toBe('Next: finish');
            fixture.destroy();
        });

        it('announces each step by name and number, and each round as it starts', () => {
            start(circuit());
            expect(said()).toBe('Squats, step 1 of 3, round 1 of 2');

            advance(3000);
            expect(said()).toBe('Plank, step 2 of 3');

            advance(2000);
            expect(said()).toBe('Rest, step 3 of 3');

            advance(2000);
            expect(said()).toBe('Squats, step 1 of 3, last round');
            fixture.destroy();
        });

        it('starts a fresh ring sweep for each step, even back-to-back work', () => {
            start(circuit());
            const first = fixture.nativeElement.querySelector('.timer-ring__sweep');

            advance(3000);

            const second = fixture.nativeElement.querySelector('.timer-ring__sweep');
            expect(second).not.toBe(first);
            expect(second.style.getPropertyValue('--half-duration')).toBe('1000ms');
            fixture.destroy();
        });

        it('finishes after the last work step of the last round', () => {
            start(circuit());

            advance(7000 + 5000);

            expect(component.isComplete()).toBe(true);
            fixture.destroy();
        });

        it('keeps a plain work-and-rest timer free of step numbers', () => {
            start(makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 3 }));

            expect(face()).toBe('Timed 00:03');
            expect(said()).toBe('Timed, round 1 of 3');
            fixture.destroy();
        });
    });

    describe('until stopped', () => {
        // 3s work, 2s rest, round after round
        const forever = () =>
            makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: UNTIL_STOPPED });
        const said = () =>
            (fixture.nativeElement.querySelector('[aria-live]') as HTMLElement).textContent?.trim();

        it('shows which round it is on, of ∞, instead of the rounds left', () => {
            start(forever());
            advance(5000 * 6);

            expect(text()).toContain('round 7 of ∞');
            expect(fixture.nativeElement.querySelectorAll('.round-dot')).toHaveLength(0);
            expect(text()).not.toContain('Last one!');
            fixture.destroy();
        });

        it('tells screen readers "until stopped" rather than reading out the symbol', () => {
            start(forever());

            const status = fixture.nativeElement.querySelector('.timer-status') as HTMLElement;
            expect(status.querySelector('[aria-hidden="true"]')?.textContent).toBe('∞');
            expect(status.querySelector('.sr-only')?.textContent).toBe('until stopped');
            fixture.destroy();
        });

        it('announces the round number with no total', () => {
            start(forever());
            expect(said()).toBe('Timed, round 1');

            advance(5000);
            expect(said()).toBe('Timed, round 2');
            fixture.destroy();
        });

        it('keeps going, and never finishes on its own', () => {
            start(forever());

            advance(60 * 60 * 1000);

            expect(component.isComplete()).toBe(false);
            expect(text()).toContain('round 721 of ∞');
            expect(fixture.nativeElement.querySelectorAll('.timer-controls button')).toHaveLength(
                2
            );
            fixture.destroy();
        });

        it('books alarms in batches, and tops them up halfway through each one', () => {
            start(forever());
            TestBed.inject(AlarmService).unlock();
            fixture.detectChanges();
            // Rounds 0-99: the last work alarm is round 99, 99 x 5s in
            expect(audio.scheduledNotes()).toContain('880@495');
            expect(audio.scheduledNotes()).not.toContain('880@500');

            // Into round 50: rounds 50-149 are booked
            advance(50 * 5000 + 1000);

            expect(audio.scheduledNotes()).toContain('880@745');
            expect(audio.scheduledNotes()).not.toContain('880@750');
            fixture.destroy();
        });
    });

    describe('alarms', () => {
        // 3s work, 2s rest, 2 rounds: work at 0s, rest at 3s, work at 5s, finish at 8s
        const timer = () => makeTimer({ timerSeconds: 3, restSeconds: 2, repeats: 2 });
        const WORK_AT = (s: number) => [`880@${s}`, `880@${s + 0.25}`];
        const REST_AT = (s: number) => [`440@${s}`];
        const FINISH_AT = (s: number) => [`523.25@${s}`, `659.25@${s + 0.2}`, `783.99@${s + 0.4}`];
        const prompt = () =>
            fixture.nativeElement.querySelector('.sound-prompt') as HTMLButtonElement | null;

        function unlockSound() {
            TestBed.inject(AlarmService).unlock();
            fixture.detectChanges();
        }

        it('asks for a tap when the browser is blocking sound, and hides once it is on', () => {
            start(timer());
            expect(prompt()?.textContent?.trim()).toBe('Tap to turn on sound');

            prompt()!.click();
            fixture.detectChanges();

            expect(prompt()).toBeNull();
            fixture.destroy();
        });

        describe('with sound turned off in settings', () => {
            beforeEach(() => localStorage.clear());
            afterEach(() => localStorage.clear());

            it('does not ask for a tap to turn on sound', () => {
                TestBed.inject(SettingsStore).update({ sound: false });
                start(timer());

                expect(prompt()).toBeNull();
                fixture.destroy();
            });

            it('silences the alarms already booked', () => {
                start(timer());
                unlockSound();
                advance(1000);

                TestBed.inject(SettingsStore).update({ sound: false });
                fixture.detectChanges();

                expect(audio.scheduledNotes()).toEqual([]);
                fixture.destroy();
            });

            it('books them again when sound is turned back on', () => {
                const settings = TestBed.inject(SettingsStore);
                settings.update({ sound: false });
                start(timer());
                unlockSound();

                settings.update({ sound: true });
                fixture.detectChanges();

                expect(audio.scheduledNotes()).toContain('440@3');
                fixture.destroy();
            });
        });

        it('hands the whole workout to the audio clock once sound is on', () => {
            start(timer());

            unlockSound();

            expect(audio.scheduledNotes()).toEqual([
                ...WORK_AT(0),
                ...REST_AT(3),
                ...WORK_AT(5),
                ...FINISH_AT(8),
            ]);
            fixture.destroy();
        });

        it('silences the alarms while paused, and reschedules the rest on resume', () => {
            start(timer());
            unlockSound();
            advance(1500);
            const button = (label: string) =>
                Array.from(fixture.nativeElement.querySelectorAll('.timer-controls button')).find(
                    (b) => (b as HTMLElement).getAttribute('aria-label') === label
                ) as HTMLElement;

            button('Pause').click();
            fixture.detectChanges();
            expect(audio.scheduledNotes()).toEqual([]);

            advance(10000);
            button('Resume').click();
            fixture.detectChanges();

            // Resumed 11.5s after starting (on the audio clock), 1.5s into the workout
            expect(audio.scheduledNotes()).toEqual([
                ...REST_AT(13),
                ...WORK_AT(15),
                ...FINISH_AT(18),
            ]);
            fixture.destroy();
        });

        it("doesn't repeat a step's alarm when paused just after it, then resumed", () => {
            start(timer());
            unlockSound();
            advance(3500);
            const button = (label: string) =>
                Array.from(fixture.nativeElement.querySelectorAll('.timer-controls button')).find(
                    (b) => (b as HTMLElement).getAttribute('aria-label') === label
                ) as HTMLElement;

            // Half a second into rest, which has beeped
            button('Pause').click();
            fixture.detectChanges();
            advance(10000);
            button('Resume').click();
            fixture.detectChanges();

            // Resumed 13.5s after starting (on the audio clock), with no rest beep again
            expect(audio.scheduledNotes()).toEqual([...WORK_AT(15), ...FINISH_AT(18)]);
            fixture.destroy();
        });

        it('skips the alarms already past after a page refresh', () => {
            localStorage.setItem('timers', JSON.stringify([{ ...timer(), id: 'timer-7' }]));
            sessionStorage.setItem('activeTimerId', 'timer-7');
            sessionStorage.setItem('activeTimerStartedAt', String(Date.now() - 4500));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [TimerComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(TimerComponent);
            fixture.detectChanges();

            unlockSound();

            expect(audio.scheduledNotes()).toEqual([...WORK_AT(0.5), ...FINISH_AT(3.5)]);
            fixture.destroy();
            localStorage.clear();
        });

        it('silences the alarms on Stop', async () => {
            start(timer());
            unlockSound();
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            (fixture.nativeElement.querySelector('[aria-label="Stop"]') as HTMLElement).click();
            fixture.detectChanges();

            expect(audio.scheduledNotes()).toEqual([]);
            fixture.destroy();
        });

        it('vibrates as each phase starts, once each', () => {
            const vibrate = vi.spyOn(TestBed.inject(AlarmService), 'vibrate');
            start(timer());
            expect(vibrate.mock.calls).toEqual([['work']]);

            advance(3000);
            advance(1000);
            expect(vibrate.mock.calls).toEqual([['work'], ['rest']]);

            advance(1000);
            advance(3000);
            expect(vibrate.mock.calls).toEqual([['work'], ['rest'], ['work'], ['finish']]);
            fixture.destroy();
        });

        it('does not vibrate for phases missed while the tab was in the background', () => {
            const vibrate = vi.spyOn(TestBed.inject(AlarmService), 'vibrate');
            start(timer());
            vibrate.mockClear();

            // One late tick, 4.5s in: the rest started 1.5s ago
            vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 4500);
            document.dispatchEvent(new Event('visibilitychange'));
            fixture.detectChanges();

            expect(vibrate).not.toHaveBeenCalled();
            fixture.destroy();
        });
    });

    describe('keeping the screen on', () => {
        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        const held = () => {
            const hold = vi.spyOn(TestBed.inject(KeepAwakeService), 'hold');
            return () => hold.mock.calls.at(-1)?.[0];
        };

        it('holds the screen on while the run is going, and lets go when paused or finished', () => {
            const lastHold = held();
            start(makeTimer({ timerSeconds: 1, restSeconds: 0, repeats: 1 }));
            expect(lastHold()).toBe(true);

            store.pause();
            TestBed.tick();
            expect(lastHold()).toBe(false);

            store.resume();
            TestBed.tick();
            expect(lastHold()).toBe(true);

            advance(1000);
            expect(component.isComplete()).toBe(true);
            expect(lastHold()).toBe(false);
            fixture.destroy();
        });

        it('leaves the screen alone when the setting is off', () => {
            TestBed.inject(SettingsStore).update({ keepScreenOn: false });
            const lastHold = held();

            start(makeTimer());

            expect(lastHold() ?? false).toBe(false);
            fixture.destroy();
        });
    });

    it('ticks only while the run is going: not paused, stopped or finished', () => {
        start(makeTimer({ timerSeconds: 1, restSeconds: 0, repeats: 1 }));
        expect(vi.getTimerCount()).toBe(1);

        store.pause();
        TestBed.tick();
        expect(vi.getTimerCount()).toBe(0);

        store.resume();
        TestBed.tick();
        advance(1000);
        expect(component.isComplete()).toBe(true);
        expect(vi.getTimerCount()).toBe(0);
        fixture.destroy();
    });

    describe('rep steps', () => {
        // 3s work, 20 push-ups, 2s rest; 2 rounds
        const circuit = () =>
            makeTimer({ steps: [work(3), reps(20, 'Push-ups'), rest(2)], repeats: 2 });
        const mainButton = () =>
            fixture.nativeElement.querySelector('.timer-control--main button') as HTMLButtonElement;
        const ring = () => fixture.nativeElement.querySelector('.timer-ring') as HTMLElement;
        const said = () =>
            (fixture.nativeElement.querySelector('[aria-live]') as HTMLElement).textContent?.trim();
        const entries = () => TestBed.inject(HistoryStore).entries();

        function pressDone() {
            expect(mainButton().getAttribute('aria-label')).toBe('Done');
            mainButton().click();
            fixture.detectChanges();
        }

        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        it('shows your note on the exercise with its step, and says it', () => {
            TestBed.inject(ExerciseStore).setNote('builtin:push-up', 'Elbows in');
            start(
                makeTimer({
                    steps: [
                        work(3),
                        { ...reps(20, 'Push-ups'), exerciseId: 'builtin:push-up' },
                        rest(2),
                    ],
                    repeats: 2,
                })
            );
            const note = () =>
                fixture.nativeElement.querySelector('.timer-note') as HTMLElement | null;
            // The timed step is no exercise of yours, so has no note
            expect(note()).toBeNull();

            advance(3000);

            expect(note()!.querySelector('span')!.textContent!.trim()).toBe('Your note: Elbows in');
            expect(said()).toBe('Push-ups, 20 reps, your note: Elbows in, step 2 of 3');
            pressDone();
            expect(note()).toBeNull();
        });

        it('shows the reps and waits, however long it takes', () => {
            start(circuit());
            advance(3000);

            expect(component.isRepsActive()).toBe(true);
            expect(text()).toContain('Push-ups');
            expect(text()).toContain('20 reps');
            expect(ring().classList).toContain('timer-ring--reps');
            expect(ring().getAttribute('aria-valuetext')).toBe('Waiting for Done');

            advance(10 * 60 * 1000);

            expect(component.isRepsActive()).toBe(true);
            fixture.destroy();
        });

        it('swaps Pause for Done, keeping Stop', () => {
            start(circuit());
            expect(mainButton().getAttribute('aria-label')).toBe('Pause');

            advance(3000);

            expect(mainButton().getAttribute('aria-label')).toBe('Done');
            expect(mainButton().getAttribute('aria-keyshortcuts')).toBe('Space');
            expect(text()).toContain('Done');
            expect(fixture.nativeElement.querySelector('[aria-label="Stop"]')).not.toBeNull();
            fixture.destroy();
        });

        it('moves on to the next step, from its full time, on Done', () => {
            start(circuit());
            advance(3000 + 45_000); // 45s of push-ups

            pressDone();

            expect(component.isRestActive()).toBe(true);
            expect(text()).toContain('00:02');
            advance(2000);
            expect(component.isTimerActive()).toBe(true);
            expect(component.roundNumber()).toBe(2);
            fixture.destroy();
        });

        describe('changing the reps or weight mid-workout', () => {
            const changeButton = () =>
                fixture.nativeElement.querySelector('.timer-change') as HTMLButtonElement | null;
            const wheel = (label: string) =>
                fixture.nativeElement.querySelector(
                    `app-wheel-picker:has([aria-labelledby="timer-change-${label}"])`
                ) as HTMLElement;
            function choose(label: 'reps' | 'weight', value: string) {
                (wheel(label).querySelector(`[data-value="${value}"]`) as HTMLElement).click();
                fixture.detectChanges();
            }
            /** Starts the circuit as saved in the library, so changes can be saved to it. */
            function startSaved() {
                start(store.addTimer(circuit()));
            }

            it('offers it only on a rep step, opening the reps and weight wheels', () => {
                startSaved();
                expect(changeButton()).toBeNull();

                advance(3000);
                expect(changeButton()!.getAttribute('aria-expanded')).toBe('false');
                changeButton()!.click();
                fixture.detectChanges();

                expect(changeButton()!.getAttribute('aria-expanded')).toBe('true');
                expect(wheel('reps')).not.toBeNull();
                expect(
                    wheel('weight')
                        .querySelector('[role="spinbutton"]')!
                        .getAttribute('aria-valuetext')
                ).toBe('none');
                expect(text()).toContain('Weight (kg)');
                fixture.destroy();
            });

            it('changes this set, the rest of the workout, and the saved timer', () => {
                startSaved();
                advance(3000);
                changeButton()!.click();
                fixture.detectChanges();

                choose('reps', '15');
                choose('weight', '22.5');

                expect(text()).toContain('15 reps');
                expect(text()).toContain('22.5 kg');
                expect(store.timers()[0].steps[1]).toEqual({
                    kind: 'reps',
                    reps: 15,
                    name: 'Push-ups',
                    weight: 22.5,
                    // Still the same exercise, linked by its name when it was saved
                    exerciseId: 'builtin:push-up',
                });

                // Done closes the wheels; round 2's set starts from the new numbers
                pressDone();
                expect(fixture.nativeElement.querySelector('#timer-change-panel')).toBeNull();
                advance(2000 + 3000);
                expect(text()).toContain('15 reps');
                expect(text()).toContain('22.5 kg');
                expect(changeButton()!.getAttribute('aria-expanded')).toBe('false');
                fixture.destroy();
            });

            it('takes the weight off again at –', () => {
                start(
                    store.addTimer(
                        makeTimer({ steps: [{ kind: 'reps', reps: 5, name: '', weight: 40 }] })
                    )
                );
                changeButton()!.click();
                fixture.detectChanges();

                choose('weight', '0');

                expect(store.timers()[0].steps[0]).toEqual({ kind: 'reps', reps: 5, name: '' });
                expect(fixture.nativeElement.querySelector('.timer-face__weight')).toBeNull();
                fixture.destroy();
            });

            it('picks the weight in lb when chosen in settings, saving it in kg', () => {
                TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
                startSaved();
                advance(3000);
                changeButton()!.click();
                fixture.detectChanges();

                choose('weight', '135');

                expect(text()).toContain('135 lb');
                expect((store.timers()[0].steps[1] as { weight?: number }).weight).toBe(61.235);
                fixture.destroy();
            });

            it('leaves Space to a focused wheel, rather than pressing Done', () => {
                startSaved();
                advance(3000);
                changeButton()!.click();
                fixture.detectChanges();

                wheel('reps')
                    .querySelector('[role="spinbutton"]')!
                    .dispatchEvent(
                        new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
                    );
                fixture.detectChanges();

                expect(component.isRepsActive()).toBe(true);
                fixture.destroy();
            });
        });

        it('logs each set in the history, with any changes made to it', () => {
            start(store.addTimer(circuit()));
            advance(3000);
            pressDone(); // round 1: 20 push-ups
            advance(2000 + 3000);
            component['setReps'](15);
            component['setWeight'](10);
            fixture.detectChanges();
            pressDone(); // round 2: 15 at 10 kg, then finished

            expect(entries()[0].sets).toEqual([
                { round: 0, step: 1, name: 'Push-ups', reps: 20, exerciseId: 'builtin:push-up' },
                {
                    round: 1,
                    step: 1,
                    name: 'Push-ups',
                    reps: 15,
                    weight: 10,
                    exerciseId: 'builtin:push-up',
                },
            ]);
            fixture.destroy();
        });

        it('logs no sets for a workout without rep steps', () => {
            start(makeTimer({ steps: [work(3)], repeats: 1 }));
            advance(3000);

            expect(entries()[0].sets).toBeUndefined();
            fixture.destroy();
        });

        it('takes Space as Done', () => {
            start(circuit());
            advance(3000);

            document.body.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: ' ',
                    code: 'Space',
                    bubbles: true,
                    cancelable: true,
                })
            );
            fixture.detectChanges();

            expect(component.isRestActive()).toBe(true);
            expect(component.isPaused()).toBe(false);
            fixture.destroy();
        });

        it('says what is next, and announces the rep step', () => {
            start(circuit());
            expect(text()).toContain('Next: Push-ups · 20 reps');

            advance(3000);

            expect(text()).toContain('Next: Rest · 00:02');
            expect(said()).toBe('Push-ups, 20 reps, step 2 of 3');
            fixture.destroy();
        });

        it('shows, says and reads out the weight, in the unit chosen in settings', () => {
            const squats = () =>
                makeTimer({
                    steps: [work(3), { kind: 'reps', reps: 10, name: 'Squats', weight: 61.235 }],
                    repeats: 2,
                });
            start(squats());
            expect(text()).toContain('Next: Squats · 10 reps @ 61 kg');

            advance(3000);
            expect(fixture.nativeElement.querySelector('.timer-face__weight').textContent).toBe(
                '61 kg'
            );
            expect(said()).toBe('Squats, 10 reps at 61 kg, step 2 of 2');

            TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
            fixture.detectChanges();
            expect(text()).toContain('135 lb');
            fixture.destroy();
        });

        it('shows no weight for a rep step without one', () => {
            start(circuit());
            advance(3000);

            expect(fixture.nativeElement.querySelector('.timer-face__weight')).toBeNull();
            fixture.destroy();
        });

        it('finishes after Done on the last round, counting the time spent on reps', () => {
            const startedAt = Date.now();
            start(circuit());
            advance(3000 + 30_000);
            pressDone(); // round 1: 30s of push-ups
            advance(2000 + 3000 + 20_000);
            pressDone(); // round 2: 20s of push-ups; its rest is skipped

            expect(component.isComplete()).toBe(true);
            expect(entries()).toEqual([
                expect.objectContaining({
                    endedAt: startedAt + 58_000,
                    activeSeconds: 58, // 8s of countdown and 50s of push-ups
                    roundsCompleted: 2,
                    outcome: 'finished',
                    updatedAt: expect.any(Number),
                }),
            ]);
            fixture.destroy();
        });

        it('counts the reps in progress when stopped mid-set', async () => {
            start(circuit());
            advance(3000 + 30_000);
            pressDone();
            advance(2000 + 3000 + 10_000); // 10s into round 2's push-ups
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            (fixture.nativeElement.querySelector('[aria-label="Stop"]') as HTMLElement).click();
            await fixture.whenStable();

            expect(entries()[0]).toEqual(
                expect.objectContaining({
                    activeSeconds: 48,
                    roundsCompleted: 1,
                    outcome: 'stopped',
                })
            );
        });

        it('books no alarms past a rep step, then picks up from the next step on Done', () => {
            start(circuit());
            TestBed.inject(AlarmService).unlock();
            fixture.detectChanges();

            // Work at 0s, then the rep step's work beep at 3s, and nothing after
            expect(audio.scheduledNotes()).toEqual(['880@0', '880@0.25', '880@3', '880@3.25']);

            advance(3000 + 10_000);
            pressDone();

            // The rest starts now, 13s in, then round 2's work and rep step
            expect(audio.scheduledNotes()).toEqual([
                '440@13',
                '880@15',
                '880@15.25',
                '880@18',
                '880@18.25',
            ]);
            fixture.destroy();
        });

        it('carries on from the same place after a refresh', () => {
            // Saved, so the refreshed page can find it again
            start(store.addTimer(circuit()));
            advance(3000 + 30_000);
            pressDone();
            fixture.destroy();

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [TimerComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(TimerComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            advance(2000 + 3000);

            expect(component.isRepsActive()).toBe(true);
            expect(component.roundNumber()).toBe(2);
            fixture.destroy();
        });
    });
});
