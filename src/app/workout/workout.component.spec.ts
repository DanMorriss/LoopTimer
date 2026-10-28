import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Workout, UNTIL_STOPPED } from '../models/workout';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { AlarmService } from '../shared/alarms/alarm.service';
import { ActiveRunService } from '../shared/run/active-run.service';
import { KeepAwakeService } from '../shared/run/keep-awake.service';
import { contrastRatio } from '../shared/testing/contrast';
import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { FakeAudioContext, provideFakeAudioContext } from '../shared/testing/fake-audio-context';
import {
    makeWorkout as baseWorkout,
    reps,
    rest,
    SimpleWorkout,
    work,
} from '../shared/testing/make-workout';
import { WorkoutComponent } from './workout.component';

// 3s work, 2s rest, 2 rounds unless a test says otherwise
const makeWorkout = (overrides: Partial<SimpleWorkout> = {}) =>
    baseWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2, ...overrides });

describe('WorkoutComponent', () => {
    beforeEach(() => {
        // A fake clock that only moves when the test advances it (Date.now included)
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: WorkoutComponent;
    let fixture: ComponentFixture<WorkoutComponent>;
    let store: WorkoutStore;
    let audio: FakeAudioContext;

    beforeEach(async () => {
        sessionStorage.clear();
        audio = new FakeAudioContext();
        await TestBed.configureTestingModule({
            imports: [WorkoutComponent],
            providers: [provideRouter([]), provideFakeAudioContext(audio)],
        }).compileComponents();

        store = TestBed.inject(WorkoutStore);
    });

    afterEach(() => sessionStorage.clear());

    function start(workout: Workout) {
        store.setActiveWorkout(workout);
        fixture = TestBed.createComponent(WorkoutComponent);
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

    /** Ends the run the only way there is: Pause, then End workout over the ring. */
    function endWorkout() {
        // Already paused, e.g. back from the summary
        (
            fixture.nativeElement.querySelector('[aria-label="Pause"]') as HTMLElement | null
        )?.click();
        fixture.detectChanges();
        (fixture.nativeElement.querySelector('.workout-paused__end') as HTMLElement).click();
    }

    it('points to the library and runs no countdown when there is no active workout', async () => {
        fixture = TestBed.createComponent(WorkoutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.isWorkActive()).toBe(false);
        expect(component.isRestActive()).toBe(false);
        expect(text()).toContain('No workout selected');
        expect(fixture.nativeElement.querySelector('.workout-ring')).toBeNull();
        const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
        expect(link.getAttribute('href')).toBe('/library');
        fixture.destroy();
    });

    describe('work phase', () => {
        it('starts with the work time showing, zero-padded', async () => {
            start(makeWorkout({ workMinutes: 1, workSeconds: 5 }));

            expect(component.isWorkActive()).toBe(true);
            expect(text()).toContain('01:05');
            fixture.destroy();
        });

        it('counts down one second per tick', async () => {
            start(makeWorkout());

            advance(1000);
            expect(text()).toContain('00:02');

            advance(1000);
            expect(text()).toContain('00:01');
            fixture.destroy();
        });

        it('rolls minutes over into 59 seconds', async () => {
            start(makeWorkout({ workMinutes: 1, workSeconds: 0 }));

            advance(1000);

            expect(text()).toContain('00:59');
            fixture.destroy();
        });

        it('reports progress through the work phase', async () => {
            start(makeWorkout({ workSeconds: 4 }));
            expect(component.progress()).toBe(0);

            advance(2000);

            expect(component.progress()).toBe(0.5);
            fixture.destroy();
        });
    });

    describe('rest phase', () => {
        it('switches to rest exactly when the work time runs out', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2 }));

            advance(2999);
            expect(component.isWorkActive()).toBe(true);

            advance(1);
            expect(component.isWorkActive()).toBe(false);
            expect(component.isRestActive()).toBe(true);
            expect(text()).toContain('Rest');
            expect(text()).toContain('00:02');
            fixture.destroy();
        });

        it('starts the next round exactly when the rest time runs out', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));

            advance(3000 + 2000);

            expect(component.isRestActive()).toBe(false);
            expect(component.isWorkActive()).toBe(true);
            expect(component.repeats()).toBe(1);
            expect(text()).toContain('00:03');
            fixture.destroy();
        });

        it('skips rest entirely when the rest time is zero', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 0, repeats: 2 }));

            advance(3000);

            expect(component.isRestActive()).toBe(false);
            expect(component.isWorkActive()).toBe(true);
            expect(component.repeats()).toBe(1);
            expect(text()).toContain('00:03');
            fixture.destroy();
        });
    });

    describe('finishing', () => {
        it('finishes right after the last work phase, with no trailing rest', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 1 }));

            advance(3000);

            expect(component.isComplete()).toBe(true);
            expect(component.isRestActive()).toBe(false);
            expect(component.progress()).toBe(1);
            expect(text()).toContain("You're finished!");
            fixture.destroy();
        });

        it('takes exactly work + rest + work for two rounds', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));

            advance(3000 + 2000 + 3000 - 1);
            expect(component.isComplete()).toBe(false);

            advance(1);
            expect(component.isComplete()).toBe(true);
            fixture.destroy();
        });

        it('stops counting once finished', async () => {
            start(makeWorkout({ workSeconds: 1, repeats: 1 }));

            advance(1000);
            advance(10000);

            expect(component.isComplete()).toBe(true);
            expect(component.isWorkActive()).toBe(false);
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
                fixture.nativeElement.querySelector('.workout-status') as HTMLElement
            ).textContent!.trim();

        it('says which round it is on, with a dot per round', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 0, repeats: 4 }));
            expect(text()).toContain('round 1 of 4');
            expect(dots()).toEqual(['current', 'left', 'left', 'left']);

            advance(3000);

            expect(text()).toContain('round 2 of 4');
            expect(dots()).toEqual(['done', 'current', 'left', 'left']);
            fixture.destroy();
        });

        it('hides the dots from screen readers, which hear the round in the announcements', () => {
            start(makeWorkout({ repeats: 3 }));

            const row = fixture.nativeElement.querySelector('.round-dots') as HTMLElement;
            expect(row.getAttribute('aria-hidden')).toBe('true');
            fixture.destroy();
        });

        it('says "Last one!" instead of the count in the final round', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));
            expect(status()).not.toContain('Last one!');

            advance(5000);

            expect(status()).toContain('Last one!');
            expect(status()).not.toContain('round 2 of 2');
            expect(dots()).toEqual(['done', 'current']);
            fixture.destroy();
        });

        it('shows no rounds for a single-round workout, just the time left', () => {
            start(makeWorkout({ repeats: 1 }));

            expect(status()).toBe('00:03 left');
            expect(dots()).toEqual([]);
            fixture.destroy();
        });

        it('counts down the time left of the whole workout, with no rest at the end', () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));
            expect(status()).toContain('00:08 left');

            advance(3000);
            expect(status()).toContain('00:05 left');
            fixture.destroy();
        });

        it('leaves out the time left when rep steps make it unknown', () => {
            start(makeWorkout({ steps: [work(3), reps(10)], repeats: 2 }));

            expect(status()).not.toContain('left');
            fixture.destroy();
        });

        it('leaves out the dots when there are too many rounds to fit in a row', () => {
            start(makeWorkout({ repeats: 16 }));

            expect(text()).toContain('round 1 of 16');
            expect(dots()).toEqual([]);
            fixture.destroy();
        });

        it('clears the rounds once the workout is finished', () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 0, repeats: 2 }));

            advance(6000);

            expect(component.isComplete()).toBe(true);
            expect(text()).not.toContain('Last one!');
            expect(dots()).toEqual([]);
            fixture.destroy();
        });
    });

    it('restarts from the beginning when a different workout is made active', async () => {
        start(makeWorkout({ workSeconds: 10 }));
        advance(4000);

        store.setActiveWorkout(makeWorkout({ id: 'workout-2', title: 'Second', workSeconds: 20 }));
        fixture.detectChanges();

        expect(text()).toContain('Second');
        expect(text()).toContain('00:20');
        advance(1000);
        expect(text()).toContain('00:19');
        fixture.destroy();
    });

    it('shows only the work phase when a different workout is made active during rest', async () => {
        start(makeWorkout({ workSeconds: 3, restSeconds: 5 }));
        advance(3000);
        expect(component.isRestActive()).toBe(true);

        store.setActiveWorkout(makeWorkout({ id: 'workout-2', title: 'Second', workSeconds: 20 }));
        fixture.detectChanges();

        expect(component.isWorkActive()).toBe(true);
        expect(component.isRestActive()).toBe(false);
        expect(fixture.nativeElement.querySelector('.workout-face').textContent).not.toContain(
            'Rest'
        );
        expect(fixture.nativeElement.querySelector('.workout-ring').classList).not.toContain(
            'workout-ring--rest'
        );
        fixture.destroy();
    });

    it('picks the active workout back up after a page refresh', async () => {
        // Simulate a refresh: the workout was saved and made active in a previous page load
        localStorage.setItem(
            'workouts',
            JSON.stringify([makeWorkout({ id: 'workout-7', title: 'Saved', workSeconds: 30 })])
        );
        sessionStorage.setItem('activeWorkoutId', 'workout-7');
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [WorkoutComponent],
            providers: [provideRouter([]), provideFakeAudioContext(audio)],
        });

        fixture = TestBed.createComponent(WorkoutComponent);
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
            'workouts',
            JSON.stringify([
                makeWorkout({ id: 'workout-7', workSeconds: 30, restSeconds: 10, repeats: 3 }),
            ])
        );
        sessionStorage.setItem('activeWorkoutId', 'workout-7');
        sessionStorage.setItem('activeWorkoutStartedAt', String(Date.now() - 42000));
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            imports: [WorkoutComponent],
            providers: [provideRouter([]), provideFakeAudioContext(audio)],
        });

        fixture = TestBed.createComponent(WorkoutComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.isWorkActive()).toBe(true);
        expect(component.repeats()).toBe(2);
        expect(text()).toContain('00:28');
        fixture.destroy();
        localStorage.clear();
    });

    describe('when the browser delays or skips ticks (background tab, locked phone)', () => {
        it('shows the right time as soon as the page is visible again', async () => {
            start(makeWorkout({ workSeconds: 30, restSeconds: 10, repeats: 3 }));
            advance(1000);
            expect(text()).toContain('00:29');

            // 45 seconds pass with no ticks at all, as when a tab is frozen in the background
            const later = Date.now() + 45000;
            vi.spyOn(Date, 'now').mockReturnValue(later);
            document.dispatchEvent(new Event('visibilitychange'));
            fixture.detectChanges();

            // 46s in: 30s work + 10s rest done, 6s into round 2
            expect(component.isWorkActive()).toBe(true);
            expect(component.repeats()).toBe(2);
            expect(text()).toContain('00:24');
            fixture.destroy();
        });

        it('still finishes on time if ticks arrive late', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 })); // 8s in total
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
            start(makeWorkout());

            expect(liveRegion().getAttribute('aria-live')).toBe('polite');
            expect(liveRegion().getAttribute('aria-atomic')).toBe('true');
            fixture.destroy();
        });

        it('announces each phase as it starts, then the finish', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 3 }));
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
            start(makeWorkout({ workSeconds: 5 }));
            const textNode = liveRegion().firstChild;
            const before = said();

            advance(1000);
            advance(1000);

            expect(said()).toBe(before);
            expect(liveRegion().firstChild).toBe(textNode);
            fixture.destroy();
        });

        it('says "round 1 of 1" rather than "last round" for a single-round workout', async () => {
            start(makeWorkout({ repeats: 1 }));

            expect(said()).toBe('Timed, round 1 of 1');
            fixture.destroy();
        });
    });

    describe('colours', () => {
        // Read the colours as the browser renders them, so a change to the styles can't
        // quietly make a phase hard to see again
        function colours() {
            const el = fixture.nativeElement as HTMLElement;
            const ring = el.querySelector('.workout-ring') as HTMLElement;
            const fill = el.querySelector('.workout-ring__fill') as HTMLElement;
            const face = el.querySelector('.workout-face') as HTMLElement;
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
                start(makeWorkout({ workSeconds: 3, restSeconds: 2 }));
                advance(elapsedMs);
                const { track, fill } = colours();

                expect(contrastRatio(fill, track)).toBeGreaterThanOrEqual(3);
                fixture.destroy();
            });

            it(`keeps the countdown readable on the ${phase} flash colour (at least 4.5:1)`, () => {
                start(makeWorkout({ workSeconds: 3, restSeconds: 2 }));
                advance(elapsedMs);
                const { flash, text } = colours();

                expect(contrastRatio(text, flash)).toBeGreaterThanOrEqual(4.5);
                fixture.destroy();
            });
        }
    });

    describe('progress ring', () => {
        const ring = () => fixture.nativeElement.querySelector('.workout-ring') as HTMLElement;
        const progress = () =>
            fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
        const sweeps = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll('.workout-ring__sweep')
            ) as HTMLElement[];

        it('keeps the same sweep animation for the whole phase', async () => {
            start(makeWorkout({ workSeconds: 4, restSeconds: 2 }));
            const first = sweeps()[0];

            advance(3000);

            expect(sweeps()).toHaveLength(1);
            expect(sweeps()[0]).toBe(first);
            fixture.destroy();
        });

        it('starts a fresh sweep, mirrored for rest, when the phase changes', async () => {
            start(makeWorkout({ workSeconds: 4, restSeconds: 2 }));
            const workSweep = sweeps()[0];
            expect(ring().classList).toContain('workout-ring--work');

            advance(4000);

            expect(sweeps()).toHaveLength(1);
            expect(sweeps()[0]).not.toBe(workSweep);
            expect(ring().classList).toContain('workout-ring--rest');
            fixture.destroy();
        });

        it('splits the phase between the two halves of the ring', async () => {
            start(makeWorkout({ workSeconds: 10 }));
            const style = sweeps()[0].style;

            expect(style.getPropertyValue('--half-duration')).toBe('5000ms');
            expect(style.getPropertyValue('--first-half-delay')).toBe('0ms');
            expect(style.getPropertyValue('--second-half-delay')).toBe('5000ms');
            fixture.destroy();
        });

        it('starts part-way round when resuming after a refresh', async () => {
            // 3.5s into a 10s work phase
            localStorage.setItem(
                'workouts',
                JSON.stringify([makeWorkout({ id: 'workout-7', workSeconds: 10 })])
            );
            sessionStorage.setItem('activeWorkoutId', 'workout-7');
            sessionStorage.setItem('activeWorkoutStartedAt', String(Date.now() - 3500));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [WorkoutComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(WorkoutComponent);
            fixture.detectChanges();

            const style = sweeps()[0].style;
            expect(style.getPropertyValue('--first-half-delay')).toBe('-3500ms');
            expect(style.getPropertyValue('--second-half-delay')).toBe('1500ms');
            fixture.destroy();
            localStorage.clear();
        });

        it('has no sweep once finished', async () => {
            start(makeWorkout({ workSeconds: 1, repeats: 1 }));

            advance(1000);

            expect(sweeps()).toHaveLength(0);
            fixture.destroy();
        });

        it('reports progress to screen readers', async () => {
            start(makeWorkout({ workSeconds: 4 }));
            expect(progress().getAttribute('role')).toBe('progressbar');
            expect(progress().getAttribute('aria-valuenow')).toBe('0');

            advance(1000);

            expect(progress().getAttribute('aria-valuenow')).toBe('25');
            fixture.destroy();
        });
    });

    describe('pause, resume and end', () => {
        const buttons = () =>
            Array.from(
                fixture.nativeElement.querySelectorAll(
                    '.workout-controls button, .workout-paused button'
                )
            ) as HTMLButtonElement[];
        // Found by their accessible name: an icon button's label, or a text button's text
        // (less its icon, which is hidden from screen readers)
        const name = (b: HTMLButtonElement) =>
            b.getAttribute('aria-label') ??
            Array.from(b.childNodes)
                .filter((node) => !(node instanceof Element && node.ariaHidden === 'true'))
                .map((node) => node.textContent)
                .join('')
                .trim();
        const button = (label: string) => buttons().find((b) => name(b) === label);
        const ring = () => fixture.nativeElement.querySelector('.workout-ring') as HTMLElement;

        function press(label: string) {
            const target = button(label);
            expect(target, `expected a ${label} button`).toBeDefined();
            target!.click();
            fixture.detectChanges();
        }

        it('offers just Pause while running, so the workout is never ended by mistake', () => {
            start(makeWorkout());

            expect(buttons().map(name)).toEqual(['Pause']);
            fixture.destroy();
        });

        it('captions the icon button with its name, hidden from screen readers', () => {
            start(makeWorkout());
            const caption = fixture.nativeElement.querySelector(
                '.workout-control__caption'
            ) as HTMLElement;

            expect(caption.textContent?.trim()).toBe('Pause');
            expect(caption.getAttribute('aria-hidden')).toBe('true');
            fixture.destroy();
        });

        it('greys out the page and offers Resume and End workout over the ring while paused', () => {
            start(makeWorkout({ workSeconds: 10 }));
            advance(3000);

            press('Pause');

            expect(buttons().map(name)).toEqual(['Resume', 'End workout']);
            expect(fixture.nativeElement.querySelector('.workout-paused').textContent).toContain(
                'Paused · 00:07'
            );
            expect(fixture.nativeElement.querySelector('.workout-page').classList).toContain(
                'workout-page--paused'
            );
            fixture.destroy();
        });

        it('moves focus to Resume on pause, and back to Pause on resume', () => {
            start(makeWorkout({ workSeconds: 10 }));

            press('Pause');
            TestBed.tick();
            expect(document.activeElement).toBe(button('Resume'));

            press('Resume');
            TestBed.tick();
            expect(document.activeElement).toBe(button('Pause'));
            fixture.destroy();
        });

        describe('the button gliding between its places', () => {
            /** Where a button's glide starts from, relative to its own place, or null if none. */
            function glideStart(label: string): { x: number; y: number } | null {
                const animation = button(label)!.getAnimations()[0];
                if (!animation) {
                    return null;
                }
                const [first] = (animation.effect as KeyframeEffect).getKeyframes();
                const [, x, y] = /translate\((-?[\d.e-]+)px, (-?[\d.e-]+)px\)/
                    .exec(String(first['transform']))!
                    .map(Number);
                return { x, y };
            }

            it('glides Resume up into the ring from Pause, and Pause back down from Resume', () => {
                start(makeWorkout({ workSeconds: 10 }));

                press('Pause');
                TestBed.tick();
                // Resume sits in the ring, above where Pause was, so it starts below its place
                expect(glideStart('Resume')!.y).toBeGreaterThan(0);

                // Let it settle, so Pause glides from where Resume came to rest
                button('Resume')!
                    .getAnimations()
                    .forEach((animation) => animation.finish());
                press('Resume');
                TestBed.tick();
                expect(glideStart('Pause')!.y).toBeLessThan(0);
                fixture.destroy();
            });

            it('turns straight round when pressed mid-glide, from where it is on screen', () => {
                start(makeWorkout({ workSeconds: 10 }));

                press('Pause');
                TestBed.tick();
                // Resume has only just left Pause's place, so Pause hardly has to move
                press('Resume');
                TestBed.tick();

                const back = glideStart('Pause')!;
                expect(Math.abs(back.x)).toBeLessThan(2);
                expect(Math.abs(back.y)).toBeLessThan(2);
                fixture.destroy();
            });

            it('glides between Pause and Resume on a rep step too', () => {
                start(makeWorkout({ steps: [reps(10, 'Squats'), work(30)] }));

                press('Pause');
                TestBed.tick();
                expect(glideStart('Resume')).not.toBeNull();

                button('Resume')!
                    .getAnimations()
                    .forEach((animation) => animation.finish());
                press('Resume');
                TestBed.tick();
                expect(glideStart('Pause')).not.toBeNull();
                fixture.destroy();
            });

            it('just swaps them with reduced motion', () => {
                fakeReducedMotion(true);
                start(makeWorkout({ workSeconds: 10 }));

                press('Pause');
                TestBed.tick();
                expect(glideStart('Resume')).toBeNull();

                press('Resume');
                TestBed.tick();
                expect(glideStart('Pause')).toBeNull();
                fixture.destroy();
            });
        });

        it('resumes on Escape', () => {
            start(makeWorkout({ workSeconds: 10 }));
            press('Pause');

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            fixture.detectChanges();

            expect(component.isPaused()).toBe(false);
            fixture.destroy();
        });

        it('holds the countdown still while paused', () => {
            start(makeWorkout({ workSeconds: 10 }));
            advance(3000);

            press('Pause');
            advance(5000);

            expect(text()).toContain('00:07');
            expect(text()).toContain('Paused');
            expect(component.isPaused()).toBe(true);
            fixture.destroy();
        });

        it('does not move on to rest while paused, however long it waits', () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2 }));
            press('Pause');

            advance(60000);

            expect(component.isWorkActive()).toBe(true);
            expect(component.isRestActive()).toBe(false);
            fixture.destroy();
        });

        it('carries on from where it was paused when resumed', () => {
            start(makeWorkout({ workSeconds: 10 }));
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

        it('freezes the ring sweep while paused, without restarting it', () => {
            start(makeWorkout({ workSeconds: 10 }));
            const sweep = fixture.nativeElement.querySelector('.workout-ring__sweep');
            const fill = () =>
                fixture.nativeElement.querySelector('.workout-ring__fill') as HTMLElement;

            press('Pause');
            expect(ring().classList).toContain('workout-ring--paused');
            expect(getComputedStyle(fill()).animationPlayState).toBe('paused');

            press('Resume');
            expect(ring().classList).not.toContain('workout-ring--paused');
            expect(getComputedStyle(fill()).animationPlayState).toBe('running');
            expect(fixture.nativeElement.querySelector('.workout-ring__sweep')).toBe(sweep);
            fixture.destroy();
        });

        it('tells screen readers it has paused, then which phase it is back in', () => {
            start(makeWorkout({ repeats: 3 }));
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
                'workouts',
                JSON.stringify([makeWorkout({ id: 'workout-7', workSeconds: 30 })])
            );
            sessionStorage.setItem('activeWorkoutId', 'workout-7');
            sessionStorage.setItem('activeWorkoutStartedAt', String(Date.now() - 60000));
            // Paused 4s in, a minute ago
            sessionStorage.setItem('activeWorkoutPausedAt', String(Date.now() - 56000));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [WorkoutComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(WorkoutComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();

            expect(text()).toContain('00:26');
            expect(button('Resume')).toBeDefined();
            fixture.destroy();
            localStorage.clear();
        });

        it('opens the summary on End workout, keeping the run, paused, behind it', () => {
            start(makeWorkout());

            press('Pause');
            press('End workout');

            expect(fixture.nativeElement.querySelector('app-workout-summary')).not.toBeNull();
            expect(store.activeWorkout()).not.toBeNull();
            expect(component.isPaused()).toBe(true);
            fixture.destroy();
        });

        it('hides the controls once finished', () => {
            start(makeWorkout({ workSeconds: 1, repeats: 1 }));

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
                start(makeWorkout({ workSeconds: 10 }));

                expect(pressSpace()).toBe(true);
                expect(component.isPaused()).toBe(true);

                pressSpace();
                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('says so to screen readers on the Pause button', () => {
                start(makeWorkout());

                expect(button('Pause')!.getAttribute('aria-keyshortcuts')).toBe('Space');
                // Shown to sighted keyboard users too; screen readers already have the above
                const key = fixture.nativeElement.querySelector('kbd') as HTMLElement;
                expect(key.textContent).toBe('Space');
                expect(key.getAttribute('aria-hidden')).toBe('true');
                fixture.destroy();
            });

            it('leaves Space alone on a focused button, which Space presses anyway', () => {
                start(makeWorkout());

                expect(pressSpace(button('Pause')!)).toBe(false);
                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('ignores a held-down Space, so it does not flicker between pause and resume', () => {
                start(makeWorkout());
                pressSpace();

                pressSpace(document.body, { repeat: true });

                expect(component.isPaused()).toBe(true);
                fixture.destroy();
            });

            it('ignores Space with Shift, Ctrl, Alt or Cmd held', () => {
                start(makeWorkout());

                pressSpace(document.body, { shiftKey: true });
                pressSpace(document.body, { ctrlKey: true });

                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('does nothing once finished', () => {
                start(makeWorkout({ workSeconds: 1, repeats: 1 }));
                advance(1000);

                expect(pressSpace()).toBe(false);
                expect(component.isPaused()).toBe(false);
                fixture.destroy();
            });

            it('does nothing when no workout is selected', () => {
                fixture = TestBed.createComponent(WorkoutComponent);
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
            endWorkout();
            await fixture.whenStable();
        }

        it('logs a finished workout, with its full time and rounds', () => {
            const startedAt = Date.now();
            start(
                makeWorkout({
                    id: 'workout-4',
                    title: 'Sprints',
                    workSeconds: 3,
                    restSeconds: 2,
                    repeats: 2,
                })
            );

            advance(8000);

            expect(entries()).toEqual([
                {
                    id: `${startedAt}-workout-4`,
                    workoutId: 'workout-4',
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

        it('logs it once, even if the summary is shown again', () => {
            start(makeWorkout({ workSeconds: 1, repeats: 1 }));
            advance(1000);
            fixture.destroy();

            fixture = TestBed.createComponent(WorkoutComponent);
            fixture.detectChanges();
            advance(1000);

            expect(entries()).toHaveLength(1);
            fixture.destroy();
        });

        describe('the run carries on away from the workout page', () => {
            /** The clock moving on with the workout page closed: no page to re-render. */
            function advanceElsewhere(ms: number) {
                vi.advanceTimersByTime(ms);
                TestBed.tick();
            }

            it('keeps going on another page, with its alarms, and logs nothing yet', () => {
                start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 5 }));
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
                start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));
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

            it('logs it as stopped when another workout is started in its place', () => {
                start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 5 }));
                advance(6000); // round 2 has begun
                fixture.destroy();

                TestBed.inject(ActiveRunService).start(
                    makeWorkout({ id: 'workout-2', title: 'Next' })
                );

                expect(entries()).toEqual([
                    expect.objectContaining({
                        activeSeconds: 6,
                        roundsCompleted: 1,
                        totalRounds: 5,
                        outcome: 'stopped',
                    }),
                ]);
                expect(store.activeWorkout()?.title).toBe('Next');
            });

            it('leaves no trace of a run replaced before its first step was done', () => {
                start(makeWorkout({ workSeconds: 3 }));
                advance(2000);

                TestBed.inject(ActiveRunService).start(makeWorkout({ id: 'workout-2' }));

                expect(entries()).toEqual([]);
                fixture.destroy();
            });

            it('logs it on closing the tab or refreshing', () => {
                start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 5 }));
                advance(6000);

                window.dispatchEvent(new Event('pagehide'));

                expect(entries()).toEqual([expect.objectContaining({ outcome: 'stopped' })]);
                fixture.destroy();
            });

            it('updates that entry, rather than adding another, if the run carries on and finishes', () => {
                start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));
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
                start(makeWorkout({ workSeconds: 1, repeats: 1 }));
                advance(1000);

                window.dispatchEvent(new Event('pagehide'));

                expect(entries()).toEqual([expect.objectContaining({ outcome: 'finished' })]);
                fixture.destroy();
            });
        });

        it('dates the finish when it happened, even if the page only notices later', () => {
            const startedAt = Date.now();
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));

            // One late tick, long after the 8 second workout ended
            vi.spyOn(Date, 'now').mockReturnValue(startedAt + 60_000);
            advance(250);

            expect(entries()[0].endedAt).toBe(startedAt + 8000);
            fixture.destroy();
        });

        it('logs a stopped workout with the rounds done and the time spent, not counting pauses', async () => {
            const startedAt = Date.now();
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 5 }));
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

        it('logs a workout that runs until stopped with no total', async () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: UNTIL_STOPPED }));
            advance(12_000);

            await pressStop();

            expect(entries()[0]).toEqual(
                expect.objectContaining({ roundsCompleted: 2, totalRounds: 0, outcome: 'stopped' })
            );
        });

        it('leaves no trace of a workout stopped before its first step is done', async () => {
            start(makeWorkout({ workSeconds: 3 }));
            advance(2000);

            await pressStop();

            expect(entries()).toEqual([]);
        });
    });

    describe('several steps', () => {
        // Squats 3s, Plank 2s, rest 2s; 2 rounds
        const circuit = () =>
            makeWorkout({ steps: [work(3, 'Squats'), work(2, 'Plank'), rest(2)], repeats: 2 });
        // As it's read out: the countdown's clock cells are hidden from screen readers, which
        // get the time as one piece of text instead. Each line is read apart from the next.
        const face = () => {
            const copy = fixture.nativeElement.querySelector('.workout-face').cloneNode(true);
            copy.querySelectorAll('[aria-hidden="true"]').forEach((el: Element) => el.remove());
            copy.querySelectorAll('p').forEach((line: Element) => line.append(' '));
            return copy.textContent.replace(/\s+/g, ' ').trim();
        };
        const next = () =>
            fixture.nativeElement
                .querySelector('.workout-next')
                ?.textContent?.replace(/\s+/g, ' ')
                .trim();
        const said = () =>
            (fixture.nativeElement.querySelector('[aria-live]') as HTMLElement).textContent?.trim();

        it("shows the step's name and its time, leaving which step it is to the strip", () => {
            start(circuit());

            expect(face()).toBe('Squats 00:03');

            advance(3000);
            expect(face()).toBe('Plank 00:02');

            advance(2000);
            expect(face()).toBe('Rest 00:02');
            fixture.destroy();
        });

        describe('fitting a long name to the face', () => {
            const label = () =>
                fixture.nativeElement.querySelector(
                    '.workout-face__content:last-child .workout-face__label'
                ) as HTMLElement;
            const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
            const lines = () =>
                Math.round(label().scrollHeight / parseFloat(getComputedStyle(label()).lineHeight));

            it('keeps a short name at full size, on one line', () => {
                start(circuit());
                TestBed.tick();

                expect(label().style.fontSize).toBe('');
                expect(lines()).toBe(1);
                fixture.destroy();
            });

            // How it fits depends on the screen's width and the font: see fit-name.spec.ts
            it('fits a long name in three lines at most, no smaller than 70% of its size', () => {
                start(makeWorkout({ steps: [work(30, 'Single-leg Romanian deadlift'), rest(10)] }));
                TestBed.tick();
                const face = fixture.nativeElement.querySelector('.workout-face');

                expect(size(label())).toBeGreaterThanOrEqual(size(face) * 0.7 - 0.5);
                expect(lines()).toBeLessThanOrEqual(3);
                fixture.destroy();
            });
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
            const first = fixture.nativeElement.querySelector('.workout-ring__sweep');

            advance(3000);

            const second = fixture.nativeElement.querySelector('.workout-ring__sweep');
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

        it("shows the round's steps as a strip in their kinds, done, current and to go", () => {
            start(circuit());
            const strip = () =>
                Array.from(
                    fixture.nativeElement.querySelectorAll(
                        '.step-strip__step'
                    ) as NodeListOf<Element>
                ).map((step) =>
                    ['work|rest|reps', 'done|current|left']
                        .map((kinds) => step.className.match(`step-strip__step--(${kinds})\\b`)![1])
                        .join(' ')
                );
            expect(strip()).toEqual(['work current', 'work left', 'rest left']);
            expect(
                fixture.nativeElement.querySelector('.step-strip').getAttribute('aria-hidden')
            ).toBe('true');

            advance(5000);
            expect(strip()).toEqual(['work done', 'work done', 'rest current']);
            fixture.destroy();
        });

        it("marks each step's kind with an icon, hidden from screen readers", () => {
            start(makeWorkout({ steps: [work(3, 'Squats'), rest(2), reps(10)], repeats: 2 }));
            const icon = () =>
                fixture.nativeElement.querySelector(
                    '.workout-face__content:last-child .workout-face__kind'
                ) as HTMLElement;
            expect(icon().textContent!.trim()).toBe('timer');
            expect(icon().getAttribute('aria-hidden')).toBe('true');

            advance(3000);
            expect(icon().textContent!.trim()).toBe('self_improvement');

            advance(2000);
            expect(icon().textContent!.trim()).toBe('fitness_center');
            fixture.destroy();
        });

        it("shows what's after a rest on the face, under its countdown", () => {
            start(circuit());
            const then = () =>
                fixture.nativeElement.querySelector('.workout-face__then') as HTMLElement | null;
            expect(then()).toBeNull();

            advance(5000);
            expect(then()!.textContent!.replace(/\s+/g, ' ').trim()).toBe('then Squats · 00:03');
            // "Next:" says it to screen readers
            expect(then()!.getAttribute('aria-hidden')).toBe('true');
            fixture.destroy();
        });

        it("pops the countdown on each of a timed step's last 3 seconds", () => {
            start(makeWorkout({ steps: [work(10, 'Squats'), rest(10)], repeats: 2 }));
            const pop = () =>
                fixture.nativeElement.querySelector('.workout-face__pop') as HTMLElement | null;
            advance(6000);
            expect(pop()).toBeNull();

            advance(1000);
            const first = pop();
            expect(first).not.toBeNull();
            advance(1000);
            // A fresh one, so it pops again
            expect(pop()).not.toBe(first);

            // Not rest, which stays calm
            advance(9000);
            expect(pop()).toBeNull();
            fixture.destroy();
        });

        it('keeps a plain work-and-rest workout free of step numbers', () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 3 }));

            // Unnamed work shows just the time (its "Timed" placeholder is invisible and unread)
            expect(face()).toBe('00:03');
            expect(said()).toBe('Timed, round 1 of 3');
            fixture.destroy();
        });
    });

    describe('until stopped', () => {
        // 3s work, 2s rest, round after round
        const forever = () =>
            makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: UNTIL_STOPPED });
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

            const status = fixture.nativeElement.querySelector('.workout-status') as HTMLElement;
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
            expect(fixture.nativeElement.querySelectorAll('.workout-controls button')).toHaveLength(
                1
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

    describe('a time limit', () => {
        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        // 3s work, 2s rest, as many rounds as fit in 1:04: 12 rounds, then the work of the 13th
        const amrap = () => makeWorkout({ workSeconds: 3, restSeconds: 2, timeLimitSeconds: 64 });
        const said = () =>
            (fixture.nativeElement.querySelector('[aria-live]') as HTMLElement).textContent?.trim();
        const summary = () =>
            fixture.nativeElement.querySelector('app-workout-summary') as HTMLElement | null;
        const summaryText = () => summary()?.textContent?.replace(/\s+/g, ' ') ?? '';
        const entries = () => TestBed.inject(HistoryStore).entries();

        it('counts the rounds up, with the time left under them', () => {
            start(amrap());
            advance(12_000);

            expect(text()).toContain('round 3');
            expect(text()).not.toContain('of ∞');
            expect(text()).toContain('00:52 left');
            expect(
                fixture.nativeElement.querySelector('.workout-status__time-left--nearly-up')
            ).toBeNull();

            advance(43_000);
            expect(
                fixture.nativeElement.querySelector('.workout-status__time-left--nearly-up')
            ).not.toBeNull();
            fixture.destroy();
        });

        it('announces the round with the time left as each round starts', () => {
            start(amrap());
            expect(said()).toBe('Timed, round 1, 01:04 left');

            advance(5000);
            expect(said()).toBe('Timed, round 2, 00:59 left');
            fixture.destroy();
        });

        it("stops when time's up, and logs the rounds and steps done as finished", () => {
            start(amrap());
            advance(64_000);

            expect(component.isComplete()).toBe(true);
            expect(summaryText()).toContain("Time's up");
            expect(summaryText()).toContain('12 rounds + 1 in 1:04');
            expect(entries()[0]).toEqual(
                expect.objectContaining({
                    outcome: 'finished',
                    roundsCompleted: 12,
                    totalRounds: 0,
                    timeLimitSeconds: 64,
                    stepsIntoRound: 1,
                    activeSeconds: 64,
                })
            );
            fixture.destroy();
        });

        it('counts time on rep steps towards it', () => {
            start(makeWorkout({ steps: [work(3), reps(10, 'Push-ups')], timeLimitSeconds: 20 }));
            advance(3000);
            // 12s on the push-ups, then Done: 15s gone, so 5s are left
            advance(12_000);
            (fixture.nativeElement.querySelector('.workout-next--done') as HTMLElement).click();
            fixture.detectChanges();
            expect(text()).toContain('00:05 left');

            advance(5000);
            expect(component.isComplete()).toBe(true);
            fixture.destroy();
        });

        it('asks how many reps of the set time ran out in, and logs them', () => {
            start(makeWorkout({ steps: [work(3), reps(10, 'Push-ups')], timeLimitSeconds: 10 }));
            advance(10_000);

            expect(summaryText()).toContain(
                'Time ran out during Push-ups. How many reps did you get?'
            );
            (
                summary()!.querySelector('.summary__last-set [data-value="6"]') as HTMLElement
            ).click();
            fixture.detectChanges();
            const add = Array.from(summary()!.querySelectorAll('button')).find((b) =>
                b.textContent?.includes('Add set')
            )!;
            add.click();
            fixture.detectChanges();

            expect(entries()[0].sets).toEqual([
                expect.objectContaining({ round: 0, step: 1, name: 'Push-ups', reps: 6 }),
            ]);
            expect(summary()!.querySelector('.summary__last-set')).toBeNull();
            // It's still a full round's step short, so the score doesn't count it
            expect(entries()[0].stepsIntoRound).toBe(1);
            fixture.destroy();
        });

        it('calls out the most rounds yet of the same workout and time limit', () => {
            TestBed.inject(HistoryStore).record({
                id: 'earlier',
                workoutId: 'workout-1',
                title: 'Intervals',
                startedAt: Date.now() - 86_400_000,
                endedAt: Date.now() - 86_000_000,
                activeSeconds: 64,
                roundsCompleted: 10,
                totalRounds: 0,
                outcome: 'finished',
                timeLimitSeconds: 64,
                stepsIntoRound: 1,
            });
            start(amrap());
            advance(64_000);

            expect(summaryText()).toContain('Personal bests');
            expect(summaryText()).toContain('Most rounds: 12 rounds + 1');
            fixture.destroy();
        });
    });

    describe('alarms', () => {
        // 3s work, 2s rest, 2 rounds: work at 0s, rest at 3s, work at 5s, finish at 8s
        const workout = () => makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 });
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
            start(workout());
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
                start(workout());

                expect(prompt()).toBeNull();
                fixture.destroy();
            });

            it('silences the alarms already booked', () => {
                start(workout());
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
                start(workout());
                unlockSound();

                settings.update({ sound: true });
                fixture.detectChanges();

                expect(audio.scheduledNotes()).toContain('440@3');
                fixture.destroy();
            });
        });

        it('hands the whole workout to the audio clock once sound is on', () => {
            start(workout());

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
            start(workout());
            unlockSound();
            advance(1500);
            const button = (label: string) =>
                Array.from(
                    fixture.nativeElement.querySelectorAll(
                        '.workout-controls button, .workout-paused button'
                    )
                ).find(
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
            start(workout());
            unlockSound();
            advance(3500);
            const button = (label: string) =>
                Array.from(
                    fixture.nativeElement.querySelectorAll(
                        '.workout-controls button, .workout-paused button'
                    )
                ).find(
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
            localStorage.setItem('workouts', JSON.stringify([{ ...workout(), id: 'workout-7' }]));
            sessionStorage.setItem('activeWorkoutId', 'workout-7');
            sessionStorage.setItem('activeWorkoutStartedAt', String(Date.now() - 4500));
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [WorkoutComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(WorkoutComponent);
            fixture.detectChanges();

            unlockSound();

            expect(audio.scheduledNotes()).toEqual([...WORK_AT(0.5), ...FINISH_AT(3.5)]);
            fixture.destroy();
            localStorage.clear();
        });

        it('silences the alarms on Stop', async () => {
            start(workout());
            unlockSound();
            vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

            endWorkout();
            fixture.detectChanges();

            expect(audio.scheduledNotes()).toEqual([]);
            fixture.destroy();
        });

        it('vibrates as each phase starts, once each', () => {
            const vibrate = vi.spyOn(TestBed.inject(AlarmService), 'vibrate');
            start(workout());
            expect(vibrate.mock.calls).toEqual([['work']]);

            advance(3000);
            advance(1000);
            expect(vibrate.mock.calls).toEqual([['work'], ['rest']]);

            advance(1000);
            advance(3000);
            expect(vibrate.mock.calls).toEqual([['work'], ['rest'], ['work'], ['finish']]);
            fixture.destroy();
        });

        it('rolls on to the next step and vibrates right as its beep is due, after a pause', () => {
            const vibrate = vi.spyOn(TestBed.inject(AlarmService), 'vibrate');
            const run = TestBed.inject(ActiveRunService);
            start(workout());
            // Paused and resumed 1.1s in, between the clock's quarter seconds
            advance(1100);
            run.togglePause();
            fixture.detectChanges();
            advance(400);
            run.togglePause();
            fixture.detectChanges();
            vibrate.mockClear();

            advance(1900);

            // 3s of work done: the rest is on the face and the phone in the beep's tick
            expect(component.isRestActive()).toBe(true);
            expect(vibrate.mock.calls).toEqual([['rest']]);
            fixture.destroy();
        });

        it('does not vibrate for phases missed while the tab was in the background', () => {
            const vibrate = vi.spyOn(TestBed.inject(AlarmService), 'vibrate');
            start(workout());
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
            start(makeWorkout({ workSeconds: 1, restSeconds: 0, repeats: 1 }));
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

            start(makeWorkout());

            expect(lastHold() ?? false).toBe(false);
            fixture.destroy();
        });
    });

    it('ticks only while the run is going: not paused, stopped or finished', () => {
        start(makeWorkout({ workSeconds: 1, restSeconds: 0, repeats: 1 }));
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
            makeWorkout({ steps: [work(3), reps(20, 'Push-ups'), rest(2)], repeats: 2 });
        const mainButton = () =>
            fixture.nativeElement.querySelector(
                '.workout-control--main button'
            ) as HTMLButtonElement;
        const doneButton = () =>
            fixture.nativeElement.querySelector('.workout-next--done') as HTMLButtonElement | null;
        /** What a face wheel is set to, as screen readers hear it. */
        const faceWheel = (which: 'count' | 'weight') =>
            fixture.nativeElement.querySelector(
                `.workout-face__${which} [role="spinbutton"]`
            ) as HTMLElement | null;
        const ring = () => fixture.nativeElement.querySelector('.workout-ring') as HTMLElement;
        const progress = () =>
            fixture.nativeElement.querySelector('[role="progressbar"]') as HTMLElement;
        const said = () =>
            (fixture.nativeElement.querySelector('[aria-live]') as HTMLElement).textContent?.trim();
        const entries = () => TestBed.inject(HistoryStore).entries();

        function pressDone() {
            doneButton()!.click();
            fixture.detectChanges();
        }

        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        it('shows your note on the exercise with its step, and says it', () => {
            TestBed.inject(ExerciseStore).setNote('builtin:push-up', 'Elbows in');
            start(
                makeWorkout({
                    steps: [
                        work(3),
                        { ...reps(20, 'Push-ups'), exerciseId: 'builtin:push-up' },
                        rest(2),
                    ],
                    repeats: 2,
                })
            );
            const note = () =>
                fixture.nativeElement.querySelector('.workout-note') as HTMLElement | null;
            // The timed step is no exercise of yours, so has no note
            expect(note()).toBeNull();

            advance(3000);

            expect(note()!.querySelector('span')!.textContent!.trim()).toBe('Your note: Elbows in');
            expect(said()).toBe('Push-ups, 20 reps, your note: Elbows in, step 2 of 3');
            pressDone();
            expect(note()).toBeNull();
        });

        describe("the exercise's details (RUN-9)", () => {
            const el = (selector: string) =>
                fixture.nativeElement.querySelector(selector) as HTMLElement | null;
            const info = () => el('.workout-face__info') as HTMLButtonElement | null;

            beforeEach(() =>
                start(
                    makeWorkout({
                        steps: [
                            work(3, 'Jog'),
                            { ...reps(20, 'Push-ups'), exerciseId: 'builtin:push-up' },
                        ],
                        repeats: 1,
                    })
                )
            );
            afterEach(() => fixture.destroy());

            it('offers them beside the name of a step that is an exercise', () => {
                // Jog is just a name, not an exercise
                expect(info()).toBeNull();

                advance(3000);

                expect(info()!.getAttribute('aria-label')).toBe('Details of Push-up');
                expect(info()!.closest('.workout-face__name')!.textContent).toContain('Push-ups');
            });

            it('opens them over the workout, which waits under it, and Done goes back', async () => {
                advance(3000);
                info()!.focus();
                info()!.click();
                fixture.detectChanges();

                const dialog = el('app-exercise-details-dialog [role="dialog"]')!;
                expect(dialog.querySelector('.details__title')!.textContent!.trim()).toBe(
                    'Push-up'
                );
                // Nothing to pick another for mid-workout
                expect(dialog.querySelector('.details__pick-another')).toBeNull();
                expect(component.isRepsActive()).toBe(true);

                (dialog.querySelector('.details__done') as HTMLElement).click();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(el('app-exercise-details-dialog')).toBeNull();
                expect(document.activeElement).toBe(info());
            });

            it("leaves Space to the dialog while it's open", () => {
                advance(3000);
                info()!.click();
                fixture.detectChanges();

                // On its title, where focus starts
                el('.details__title')!.dispatchEvent(
                    new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
                );
                fixture.detectChanges();

                // Space would otherwise press Done
                expect(component.isRepsActive()).toBe(true);
            });
        });

        it('shows the reps and waits, however long it takes', () => {
            start(circuit());
            advance(3000);

            expect(component.isRepsActive()).toBe(true);
            expect(text()).toContain('Push-ups');
            expect(text()).toContain('20 reps');
            expect(ring().classList).toContain('workout-ring--reps');
            expect(progress().getAttribute('aria-valuetext')).toBe('Waiting for Done');

            advance(10 * 60 * 1000);

            expect(component.isRepsActive()).toBe(true);
            fixture.destroy();
        });

        it('makes the count the big thing on the face', () => {
            start(circuit());
            advance(3000);

            expect(faceWheel('count')!.getAttribute('aria-valuenow')).toBe('20');
            expect(faceWheel('count')!.getAttribute('aria-labelledby')).toMatch(/^reps-label-/);
            fixture.destroy();
        });

        it('swells Done once as a rep step comes round, but not with reduced motion', () => {
            start(circuit());
            expect(doneButton()).toBeNull();

            advance(3000);
            TestBed.tick();
            expect(doneButton()!.getAnimations().length).toBe(1);
            fixture.destroy();

            fakeReducedMotion(true);
            start(circuit());
            advance(3000);
            TestBed.tick();
            expect(doneButton()!.getAnimations().length).toBe(0);
            fixture.destroy();
        });

        it('fills the ring as Done is pressed, with the next beep and a vibration at once', () => {
            const flash = () =>
                fixture.nativeElement.querySelector('.workout-ring__flash') as HTMLElement;
            start(circuit());
            TestBed.inject(AlarmService).unlock();
            // Between ticks, as a press would be
            advance(3000 + 10_100);
            const vibrate = vi.spyOn(TestBed.inject(AlarmService), 'vibrate');

            pressDone();

            // No tick in between: the rest's beep is booked for now, and the phone vibrates
            expect(flash().getAnimations().length).toBe(1);
            expect(audio.scheduledNotes()[0]).toBe('440@13.1');
            expect(vibrate.mock.calls).toEqual([['rest']]);
            fixture.destroy();

            fakeReducedMotion(true);
            start(circuit());
            advance(3000);
            pressDone();
            expect(flash().getAnimations().length).toBe(0);
            fixture.destroy();
        });

        it('shows the most recent sets for the same exercise, in the history format', () => {
            TestBed.inject(HistoryStore).record({
                id: `${Date.now() - 1000}-legs`,
                workoutId: 'legs',
                title: 'Legs',
                startedAt: Date.now() - 1000,
                endedAt: Date.now(),
                activeSeconds: 90,
                roundsCompleted: 2,
                totalRounds: 2,
                outcome: 'finished',
                sets: [
                    {
                        round: 0,
                        step: 1,
                        name: 'Squats',
                        reps: 10,
                        weight: 60,
                        exerciseId: 'exr:squat',
                    },
                    {
                        round: 1,
                        step: 1,
                        name: 'Squats',
                        reps: 10,
                        weight: 60,
                        exerciseId: 'exr:squat',
                    },
                    {
                        round: 1,
                        step: 1,
                        name: 'Squats',
                        reps: 8,
                        weight: 60,
                        exerciseId: 'exr:squat',
                    },
                ],
            });
            start(
                makeWorkout({
                    steps: [
                        work(3),
                        {
                            kind: 'reps',
                            reps: 12,
                            name: 'Squats',
                            weight: 60,
                            exerciseId: 'exr:squat',
                        },
                        rest(2),
                    ],
                    repeats: 1,
                })
            );
            advance(3000);

            expect(
                fixture.nativeElement.querySelector('.workout-face__last-time')!.textContent
            ).toBe('Last time: 10, 10, 8 @ 60 kg');
            fixture.destroy();
        });

        it("doesn't show this run's own sets as last time, once it's in the history", () => {
            const squats = { name: 'Squats', exerciseId: 'exr:squat' };
            const entry = (id: string, startedAt: number, reps: number) => ({
                id,
                workoutId: 'legs',
                title: 'Legs',
                startedAt,
                endedAt: startedAt + 1000,
                activeSeconds: 1,
                roundsCompleted: 1,
                totalRounds: 1,
                outcome: 'stopped' as const,
                sets: [{ round: 0, step: 1, reps, weight: 60, ...squats }],
            });
            const history = TestBed.inject(HistoryStore);
            history.record(entry('older-legs', Date.now() - 60_000, 10));
            start(
                makeWorkout({
                    steps: [work(3), { kind: 'reps', reps: 12, weight: 60, ...squats }],
                    repeats: 2,
                })
            );
            advance(3000);
            // As when it's ended and taken back up, or the page is refreshed mid-run
            history.record(entry(TestBed.inject(ActiveRunService).runId()!, Date.now(), 12));
            fixture.detectChanges();

            expect(
                fixture.nativeElement.querySelector('.workout-face__last-time')!.textContent
            ).toBe('Last time: 10 reps @ 60 kg');
            fixture.destroy();
        });

        describe('suggested next weight (PRG-5)', () => {
            const squats = { name: 'Squats', exerciseId: 'exr:squat' };
            const nextWeight = () =>
                fixture.nativeElement.querySelector(
                    '.workout-face__next-weight'
                ) as HTMLButtonElement | null;

            function lastTime(...reps: number[]) {
                const startedAt = Date.now() - 60_000;
                TestBed.inject(HistoryStore).record({
                    id: `${startedAt}-legs`,
                    workoutId: 'legs',
                    title: 'Legs',
                    startedAt,
                    endedAt: startedAt + 1000,
                    activeSeconds: 1,
                    roundsCompleted: 1,
                    totalRounds: 1,
                    outcome: 'finished',
                    sets: reps.map((count, round) => ({
                        round,
                        step: 1,
                        reps: count,
                        weight: 60,
                        ...squats,
                    })),
                });
            }

            function startSquats(weight = 60) {
                start(
                    makeWorkout({
                        steps: [work(3), { kind: 'reps', reps: 10, weight, ...squats }],
                        repeats: 2,
                    })
                );
                advance(3000);
            }

            it('suggests a step up when every set hit the reps, and a tap puts it on', () => {
                lastTime(10, 10, 12);
                startSquats();

                expect(nextWeight()!.textContent!.trim()).toBe('arrow_upward Try 62.5 kg');
                nextWeight()!.click();
                fixture.detectChanges();

                expect(TestBed.inject(ActiveRunService).state()?.step).toMatchObject({
                    weight: 62.5,
                });
                expect(nextWeight()).toBeNull();
                fixture.destroy();
            });

            it('goes up 5 lb in lb', () => {
                TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
                lastTime(10, 10);
                startSquats();

                expect(nextWeight()!.textContent).toContain('Try 137.5 lb');
                fixture.destroy();
            });

            it('suggests nothing when a set fell short of the reps', () => {
                lastTime(10, 8);
                startSquats();

                expect(nextWeight()).toBeNull();
                fixture.destroy();
            });

            it("suggests nothing when the step's weight has been changed since", () => {
                lastTime(10, 10);
                startSquats(70);

                expect(nextWeight()).toBeNull();
                fixture.destroy();
            });
        });

        it('makes "Next:" the Done button, keeping Pause as the big one', () => {
            start(circuit());
            expect(doneButton()).toBeNull();
            expect(mainButton().getAttribute('aria-keyshortcuts')).toBe('Space');

            advance(3000);

            expect(doneButton()!.textContent).toContain('Next: Rest · 00:02');
            expect(doneButton()!.getAttribute('aria-label')).toBe('Done. Next: Rest · 00:02');
            expect(doneButton()!.getAttribute('aria-keyshortcuts')).toBe('Space');
            expect(doneButton()!.dataset['next']).toBe('rest');
            expect(mainButton().getAttribute('aria-label')).toBe('Pause');
            expect(mainButton().getAttribute('aria-keyshortcuts')).toBeNull();

            mainButton().click();
            fixture.detectChanges();

            expect(component.isPaused()).toBe(true);
            expect(fixture.nativeElement.querySelector('.workout-paused').textContent).toContain(
                'Paused · 20 reps'
            );
            // Paused, it's only what's next, not a button
            expect(doneButton()).toBeNull();
            expect(text()).toContain('Next: Rest · 00:02');
            fixture.destroy();
        });

        it('says Done finishes the workout on its last step', () => {
            start(makeWorkout({ steps: [reps(10, 'Squats')], repeats: 1 }));

            expect(doneButton()!.getAttribute('aria-label')).toBe('Done. Next: finish');
            fixture.destroy();
        });

        it('moves focus to Pause when Done goes, rather than losing it', async () => {
            start(circuit());
            advance(3000);
            doneButton()!.focus();

            pressDone();
            await fixture.whenStable();

            expect(document.activeElement).toBe(mainButton());
            fixture.destroy();
        });

        it('moves on to the next step, from its full time, on Done', () => {
            start(circuit());
            advance(3000 + 45_000); // 45s of push-ups

            pressDone();

            expect(component.isRestActive()).toBe(true);
            expect(text()).toContain('00:02');
            advance(2000);
            expect(component.isWorkActive()).toBe(true);
            expect(component.roundNumber()).toBe(2);
            fixture.destroy();
        });

        describe('changing the reps or weight mid-workout', () => {
            const wheel = (label: 'reps' | 'weight') =>
                fixture.nativeElement.querySelector(
                    label === 'reps' ? '.workout-face__count' : '.workout-face__weight'
                ) as HTMLElement;
            const value = (label: 'reps' | 'weight') =>
                wheel(label).querySelector('[role="spinbutton"]')!.getAttribute('aria-valuetext');
            function choose(label: 'reps' | 'weight', value: string) {
                (wheel(label).querySelector(`[data-value="${value}"]`) as HTMLElement).click();
                fixture.detectChanges();
            }
            /** Starts the circuit as saved in the library, so changes can be saved to it. */
            function startSaved() {
                start(store.addWorkout(circuit()));
            }

            it('shows the reps and weight on the face as wheels, only on a rep step', () => {
                startSaved();
                expect(wheel('reps')).toBeNull();
                expect(fixture.nativeElement.querySelector('.workout-change')).toBeNull();

                advance(3000);
                expect(value('reps')).toBe('20');
                // No weight yet: a quiet "+" to add one
                expect(value('weight')).toBe('none');
                expect(wheel('weight').classList).toContain('workout-face__weight--none');
                expect(
                    wheel('weight')
                        .querySelector('.wheel-picker__item--selected')!
                        .textContent!.trim()
                ).toBe('+');
                fixture.destroy();
            });

            it('opens a wheel when its number is pressed', () => {
                startSaved();
                advance(3000);

                wheel('reps')
                    .querySelector('[role="spinbutton"]')!
                    .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                fixture.detectChanges();

                expect(wheel('reps').classList).toContain('wheel-picker--open');
                fixture.destroy();
            });

            it('changes this set, the rest of the workout, and the saved workout', () => {
                startSaved();
                advance(3000);

                choose('reps', '15');
                choose('weight', '22.5');

                expect(value('reps')).toBe('15');
                expect(value('weight')).toBe('22.5');
                expect(wheel('weight').classList).not.toContain('workout-face__weight--none');
                expect(store.workouts()[0].steps[1]).toEqual({
                    kind: 'reps',
                    reps: 15,
                    name: 'Push-ups',
                    weight: 22.5,
                    // Still the same exercise, linked by its name when it was saved
                    exerciseId: 'builtin:push-up',
                });

                // Round 2's set starts from the new numbers
                pressDone();
                advance(2000 + 3000);
                expect(value('reps')).toBe('15');
                expect(value('weight')).toBe('22.5');
                fixture.destroy();
            });

            it('takes the weight off again at +', () => {
                start(
                    store.addWorkout(
                        makeWorkout({ steps: [{ kind: 'reps', reps: 5, name: '', weight: 40 }] })
                    )
                );

                choose('weight', '0');

                expect(store.workouts()[0].steps[0]).toEqual({ kind: 'reps', reps: 5, name: '' });
                expect(wheel('weight').classList).toContain('workout-face__weight--none');
                fixture.destroy();
            });

            it('picks the weight in lb when chosen in settings, saving it in kg', () => {
                TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
                startSaved();
                advance(3000);

                choose('weight', '135');

                expect(value('weight')).toBe('135');
                expect(text()).toContain('lb');
                expect((store.workouts()[0].steps[1] as { weight?: number }).weight).toBe(61.235);
                fixture.destroy();
            });

            it('leaves Space to a focused wheel, rather than pressing Done', () => {
                startSaved();
                advance(3000);

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
            start(store.addWorkout(circuit()));
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

        it('logs no sets for a workout of unnamed timed steps', () => {
            start(makeWorkout({ steps: [work(3)], repeats: 1 }));
            advance(3000);

            expect(entries()[0].sets).toBeUndefined();
            fixture.destroy();
        });

        it('logs a timed step of an exercise as a set once it runs to its end', () => {
            // 3s plank, 20 push-ups, 2s rest; 2 rounds
            const planks = makeWorkout({
                steps: [work(3, 'Plank'), reps(20, 'Push-ups'), rest(2)],
                repeats: 2,
            });
            start(store.addWorkout(planks));
            advance(3000);
            pressDone();
            advance(2000 + 3000);
            pressDone();

            const plank = { step: 0, name: 'Plank', seconds: 3, exerciseId: 'builtin:plank' };
            expect(entries()[0].sets).toEqual([
                { round: 0, ...plank },
                { round: 0, step: 1, name: 'Push-ups', reps: 20, exerciseId: 'builtin:push-up' },
                { round: 1, ...plank },
                { round: 1, step: 1, name: 'Push-ups', reps: 20, exerciseId: 'builtin:push-up' },
            ]);
            fixture.destroy();
        });

        it("doesn't log a timed step ended part-way", () => {
            start(store.addWorkout(makeWorkout({ steps: [work(3, 'Plank')], repeats: 2 })));
            advance(4000);
            endWorkout();
            TestBed.tick();

            expect(entries()[0].sets).toEqual([
                { round: 0, step: 0, name: 'Plank', seconds: 3, exerciseId: 'builtin:plank' },
            ]);
            expect(text()).toContain('Plank: 0:03');
            expect(text()).not.toContain('Change reps or weight');
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
                makeWorkout({
                    steps: [work(3), { kind: 'reps', reps: 10, name: 'Squats', weight: 61.235 }],
                    repeats: 2,
                });
            start(squats());
            expect(text()).toContain('Next: Squats · 10 reps @ 61 kg');

            advance(3000);
            expect(faceWheel('weight')!.getAttribute('aria-valuenow')).toBe('61');
            expect(
                fixture.nativeElement.querySelector('.workout-face__weight-unit').textContent
            ).toBe('Weight, kg');
            expect(said()).toBe('Squats, 10 reps at 61 kg, step 2 of 2');

            TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
            fixture.detectChanges();
            expect(faceWheel('weight')!.getAttribute('aria-valuenow')).toBe('135');
            expect(
                fixture.nativeElement.querySelector('.workout-face__weight-unit').textContent
            ).toBe('Weight, lb');
            fixture.destroy();
        });

        it('shows no weight for a rep step without one, just a "+" to add one', () => {
            start(circuit());
            advance(3000);

            expect(faceWheel('weight')!.getAttribute('aria-valuetext')).toBe('none');
            expect(
                fixture.nativeElement.querySelector('.workout-face__weight--none')
            ).not.toBeNull();
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

            endWorkout();
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
            start(store.addWorkout(circuit()));
            advance(3000 + 30_000);
            pressDone();
            fixture.destroy();

            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                imports: [WorkoutComponent],
                providers: [provideRouter([]), provideFakeAudioContext(audio)],
            });
            fixture = TestBed.createComponent(WorkoutComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            advance(2000 + 3000);

            expect(component.isRepsActive()).toBe(true);
            expect(component.roundNumber()).toBe(2);
            fixture.destroy();
        });
    });

    describe('motion', () => {
        const next = () => fixture.nativeElement.querySelector('.workout-next') as HTMLElement;
        const pulsing = () => next().classList.contains('workout-next--soon');
        const faceContent = () =>
            fixture.nativeElement.querySelector('.workout-face__content') as HTMLElement;
        const roundLine = () =>
            fixture.nativeElement.querySelector('.workout-status__round') as HTMLElement;
        const face = () => fixture.nativeElement.querySelector('.workout-face') as HTMLElement;

        it('pulses "Next:" in the last 5 seconds of a step, in the next step\'s colour', () => {
            start(makeWorkout({ workSeconds: 20, restSeconds: 30 }));

            advance(14_000);
            expect(pulsing()).toBe(false);

            advance(1000);
            expect(pulsing()).toBe(true);
            expect(next().dataset['next']).toBe('rest');

            // Rest's own last 5 seconds come long after its first
            advance(5000);
            expect(pulsing()).toBe(false);
            fixture.destroy();
        });

        it('holds the face at a steady tint, pulsing it only with "Next:"', () => {
            start(makeWorkout({ workSeconds: 20, restSeconds: 30 }));
            const faceAnimation = () => getComputedStyle(face(), '::before').animationName;

            advance(14_000);
            expect(faceAnimation()).toBe('none');
            expect(getComputedStyle(face(), '::before').opacity).toBe('0.5');

            advance(1000);
            expect(pulsing()).toBe(true);
            expect(face().classList).toContain('workout-face--soon');
            // Angular prefixes a component's keyframes with its own id
            expect(faceAnimation()).toMatch(/face-tick$/);
            fixture.destroy();
        });

        it('pulses for only the last 3 seconds of a step under 15 seconds', () => {
            start(makeWorkout({ workSeconds: 10, restSeconds: 10 }));

            advance(6000);
            expect(pulsing()).toBe(false);

            advance(1000);
            expect(pulsing()).toBe(true);
            fixture.destroy();
        });

        it('stops pulsing while paused', () => {
            start(makeWorkout({ workSeconds: 10, restSeconds: 10 }));
            advance(8000);

            component.togglePause();
            fixture.detectChanges();

            expect(pulsing()).toBe(false);
            fixture.destroy();
        });

        it('does not pulse on a rep step, where Done is the cue', () => {
            start(makeWorkout({ steps: [reps(10, 'Squats'), work(30)] }));

            advance(60_000);

            expect(pulsing()).toBe(false);
            fixture.destroy();
        });

        it('pulses in the finish colour before the last step', () => {
            start(makeWorkout({ workSeconds: 10, restSeconds: 0, repeats: 1 }));

            advance(8000);

            expect(pulsing()).toBe(true);
            expect(next().dataset['next']).toBe('finish');
            fixture.destroy();
        });

        it("swaps the face's text for each step, not each second, sliding up within a round", () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 2 }));
            const work1 = faceContent();
            const round1 = roundLine();

            advance(1000);
            expect(faceContent()).toBe(work1);

            advance(2000); // on to rest
            expect(faceContent()).not.toBe(work1);
            expect(face().classList).not.toContain('workout-face--new-round');
            expect(roundLine()).toBe(round1);
            fixture.destroy();
        });

        it('slides sideways, round line and all, when a new round starts', () => {
            start(makeWorkout({ workSeconds: 3, restSeconds: 2, repeats: 3 }));
            const round1 = roundLine();
            expect(face().classList).not.toContain('workout-face--new-round');

            advance(5000); // round 2's work

            expect(face().classList).toContain('workout-face--new-round');
            expect(roundLine()).not.toBe(round1);
            expect(roundLine().textContent).toContain('round 2 of 3');
            fixture.destroy();
        });
    });

    describe('the summary', () => {
        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        const entries = () => TestBed.inject(HistoryStore).entries();
        const summary = () =>
            fixture.nativeElement.querySelector('app-workout-summary') as HTMLElement | null;
        const summaryText = () => summary()?.textContent?.replace(/\s+/g, ' ') ?? '';
        /** The time and rounds, e.g. "Time: 0:03". */
        const stats = () =>
            Array.from(summary()!.querySelectorAll('.summary__stat')).map(
                (stat) =>
                    `${stat.querySelector('dt')!.textContent!.trim()}: ${stat.querySelector('dd')!.textContent!.trim()}`
            );
        const summaryButton = (name: string) =>
            Array.from(summary()?.querySelectorAll('button') ?? []).find((b) =>
                b.textContent!.includes(name)
            ) as HTMLButtonElement | undefined;
        function pressInSummary(name: string) {
            const target = summaryButton(name);
            expect(target, `expected a ${name} button`).toBeDefined();
            target!.click();
            fixture.detectChanges();
        }
        // 2s work, then 20 push-ups at 40 kg; 3 rounds
        const circuit = () =>
            makeWorkout({
                steps: [work(2), { kind: 'reps', reps: 20, name: 'Push-ups', weight: 40 } as const],
                repeats: 3,
            });
        /** Starts the circuit as saved in the library, does round 1, and ends it in round 2. */
        function endInRound2() {
            const startedAt = Date.now();
            const saved = store.addWorkout(circuit());
            start(saved);
            advance(2000);
            (fixture.nativeElement.querySelector('.workout-next--done') as HTMLElement).click();
            fixture.detectChanges();
            advance(1000);
            endWorkout();
            fixture.detectChanges();
            return `${startedAt}-${saved.id}`;
        }
        function mockNavigate() {
            return vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        }

        it('calls out a new personal best on the workout summary', () => {
            const history = TestBed.inject(HistoryStore);
            history.record({
                id: 'old-run',
                workoutId: 'old-workout',
                title: 'Old bench',
                startedAt: Date.now() - 10 * 60 * 1000,
                endedAt: Date.now() - 9 * 60 * 1000,
                activeSeconds: 600,
                roundsCompleted: 1,
                totalRounds: 1,
                outcome: 'finished',
                sets: [
                    {
                        round: 0,
                        step: 0,
                        name: 'Bench press',
                        reps: 5,
                        weight: 80,
                        exerciseId: 'builtin:barbell-bench-press',
                    },
                ],
            });

            start(
                makeWorkout({
                    steps: [
                        work(2),
                        {
                            kind: 'reps',
                            reps: 5,
                            name: 'Bench press',
                            weight: 100,
                            exerciseId: 'builtin:barbell-bench-press',
                        } as const,
                    ],
                    repeats: 1,
                })
            );
            advance(2000);
            (fixture.nativeElement.querySelector('.workout-next--done') as HTMLElement).click();
            fixture.detectChanges();

            expect(component.summaryOpen()).toBe(true);
            expect(summaryText()).toContain('Personal bests');
            expect(summaryText()).toContain('Heaviest: 100 kg × 5');
            fixture.destroy();
        });

        /** Benches `weight` × 5 once and opens the summary, after `before` in the history. */
        function benchOnce(weight: number, before: number[]) {
            const bench = { name: 'Bench press', exerciseId: 'builtin:barbell-bench-press' };
            before.forEach((oldWeight, i) =>
                TestBed.inject(HistoryStore).record({
                    id: `old-run-${i}`,
                    workoutId: 'old-workout',
                    title: 'Old bench',
                    startedAt: Date.now() - (i + 10) * 60 * 1000,
                    endedAt: Date.now() - (i + 9) * 60 * 1000,
                    activeSeconds: 60,
                    roundsCompleted: 1,
                    totalRounds: 1,
                    outcome: 'finished',
                    sets: [{ round: 0, step: 0, reps: 5, weight: oldWeight, ...bench }],
                })
            );
            start(
                makeWorkout({
                    steps: [work(2), { kind: 'reps', reps: 5, weight, ...bench } as const],
                    repeats: 1,
                })
            );
            advance(2000);
            (fixture.nativeElement.querySelector('.workout-next--done') as HTMLElement).click();
            fixture.detectChanges();
        }

        it("doesn't call equalling a best a new one", () => {
            benchOnce(80, [80, 70]);

            expect(component.summaryOpen()).toBe(true);
            expect(summaryText()).not.toContain('Personal bests');
            fixture.destroy();
        });

        it("doesn't call the first time doing an exercise a personal best", () => {
            benchOnce(80, []);

            expect(component.summaryOpen()).toBe(true);
            expect(summaryText()).not.toContain('Personal bests');
            fixture.destroy();
        });

        it('sums up a workout ended early, logged as stopped, with focus on its heading', () => {
            endInRound2();
            TestBed.tick();

            const dialog = summary()!.querySelector('[role="dialog"]')!;
            expect(dialog.getAttribute('aria-modal')).toBe('true');
            expect(summaryText()).toContain('Workout ended');
            expect(stats()).toEqual(['Time: 0:03', 'Rounds: 1 of 3 rounds · stopped']);
            expect(summaryText()).toContain('Push-ups: 20 reps @ 40 kg');
            expect(entries()).toEqual([expect.objectContaining({ outcome: 'stopped' })]);
            expect(document.activeElement?.id).toBe('summary-heading');
            fixture.destroy();
        });

        it('goes back to the run, still paused, with Back to workout or Escape', () => {
            endInRound2();

            pressInSummary('Back to workout');
            TestBed.tick();
            expect(summary()).toBeNull();
            expect(component.isPaused()).toBe(true);
            expect(document.activeElement?.getAttribute('aria-label')).toBe('Resume');

            endWorkout();
            fixture.detectChanges();
            summary()!
                .querySelector('[role="dialog"]')!
                .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            fixture.detectChanges();
            expect(summary()).toBeNull();
            expect(component.isPaused()).toBe(true);
            fixture.destroy();
        });

        describe('dragged by its grabber, on a phone', () => {
            const grabber = () => summary()!.querySelector<HTMLElement>('.summary__grabber');
            const sheet = () => summary()!.querySelector<HTMLElement>('.summary')!;
            const offset = () => new DOMMatrix(getComputedStyle(sheet()).transform).m42;

            /** Lets the sheet finish rising in. */
            const settle = () =>
                summary()!
                    .getAnimations({ subtree: true })
                    .forEach((animation) => animation.finish());

            /** Presses the grabber, moves it `dy` px down (negative is up), and maybe lets go. */
            function dragBy(dy: number, letGo = true) {
                const at = (type: string, y: number) =>
                    grabber()!.dispatchEvent(
                        new PointerEvent(type, { pointerId: 1, clientY: y, bubbles: true })
                    );
                at('pointerdown', 100);
                at('pointermove', 100 + dy / 2);
                at('pointermove', 100 + dy);
                if (letGo) {
                    at('pointerup', 100 + dy);
                }
            }

            it('goes back to the run once pulled past halfway down', async () => {
                fakeReducedMotion(true);
                endInRound2();

                dragBy(sheet().offsetHeight * 0.75);
                await vi.waitFor(() => {
                    fixture.detectChanges();
                    expect(summary()).toBeNull();
                });

                expect(component.isPaused()).toBe(true);
            });

            it('follows the finger down, and fades the dimming behind as it goes', () => {
                endInRound2();
                settle();

                dragBy(120, false);

                expect(offset()).toBe(120);
                expect(Number(summary()!.style.getPropertyValue('--dim'))).toBeLessThan(1);
            });

            it('resists being pulled up, more the further it goes', () => {
                endInRound2();
                settle();

                dragBy(-300, false);

                expect(offset()).toBeLessThan(0);
                expect(offset()).toBeGreaterThan(-300);
            });

            it('springs back home when let go above it, from where it was let go', () => {
                endInRound2();
                settle();

                dragBy(-200);

                const [spring] = sheet().getAnimations();
                expect(spring).toBeDefined();
                const [from, to] = (spring.effect as KeyframeEffect).getKeyframes();
                expect(new DOMMatrix(String(from['transform'])).m42).toBeLessThan(0);
                expect(new DOMMatrix(String(to['transform'])).m42).toBe(0);
                expect(summary()).not.toBeNull();
            });

            it('catches it where it is when grabbed as it rises in', () => {
                endInRound2();
                const rising = offset();
                expect(rising).toBeGreaterThan(0);

                dragBy(0, false);

                expect(offset()).toBeCloseTo(rising, -1);
                expect(sheet().getAnimations()).toHaveLength(0);
            });

            it("isn't there for a finished workout, which has nothing to go back to", async () => {
                start(makeWorkout({ workSeconds: 1, restSeconds: 0, repeats: 1 }));
                advance(2000);

                expect(summary()).not.toBeNull();
                expect(grabber()).toBeNull();
            });

            describe('and by its content, scrolled to the top', () => {
                const body = () => summary()!.querySelector<HTMLElement>('.summary__body')!;

                /**
                 * A finger on the stats moving `dy` px down (negative is up), and maybe lifting.
                 * Returns whether each move was kept from scrolling.
                 */
                function swipe(dy: number, lift = true): boolean[] {
                    const target = summary()!.querySelector<HTMLElement>('.summary__stats')!;
                    const fire = (type: string, y: number) => {
                        const touch = new Touch({ identifier: 7, target, clientX: 50, clientY: y });
                        const event = new TouchEvent(type, {
                            touches: type === 'touchend' ? [] : [touch],
                            changedTouches: [touch],
                            bubbles: true,
                            cancelable: true,
                        });
                        target.dispatchEvent(event);
                        return event.defaultPrevented;
                    };
                    fire('touchstart', 100);
                    const prevented = [
                        fire('touchmove', 100 + dy / 2),
                        fire('touchmove', 100 + dy),
                    ];
                    if (lift) {
                        fire('touchend', 100 + dy);
                    }
                    return prevented;
                }

                it('follows a finger moving down, from where it went down', () => {
                    endInRound2();
                    settle();

                    expect(swipe(120, false)).toEqual([true, true]);
                    expect(offset()).toBe(120);
                });

                it('goes back to the run once pulled past halfway down', async () => {
                    fakeReducedMotion(true);
                    endInRound2();

                    swipe(sheet().offsetHeight * 0.75);
                    await vi.waitFor(() => {
                        fixture.detectChanges();
                        expect(summary()).toBeNull();
                    });
                });

                it('leaves a finger moving up to scroll the content', () => {
                    endInRound2();
                    settle();

                    expect(swipe(-120)).toEqual([false, false]);
                    expect(offset()).toBe(0);
                });

                it('leaves a finger moving down to scroll back up, once scrolled down', () => {
                    endInRound2();
                    settle();
                    body().style.flex = 'none';
                    body().style.height = '40px';
                    body().scrollTop = 20;

                    expect(swipe(120)).toEqual([false, false]);
                    expect(offset()).toBe(0);
                });
            });
        });

        it('leaves the run alone on Space while it is open', () => {
            endInRound2();

            document.body.dispatchEvent(
                new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })
            );
            fixture.detectChanges();

            expect(component.isPaused()).toBe(true);
            expect(summary()).not.toBeNull();
            fixture.destroy();
        });

        it('ends the run on Done, and opens it in the history', async () => {
            const run = endInRound2();
            const navigate = mockNavigate();

            pressInSummary('Done');
            await fixture.whenStable();

            expect(store.activeWorkout()).toBeNull();
            expect(navigate).toHaveBeenCalledWith(['/history'], { queryParams: { run } });
            expect(entries()).toHaveLength(1);
            expect(summaryButton('View history')).toBeUndefined();
            fixture.destroy();
        });

        it('opens by itself once finished, with no way back to the workout', async () => {
            start(makeWorkout({ workSeconds: 1, restSeconds: 0, repeats: 1 }));
            advance(1000);

            expect(summaryText()).toContain('Workout finished');
            expect(stats()).toEqual(['Time: 0:01', 'Rounds: 1 round']);
            expect(summaryButton('Back to workout')).toBeUndefined();

            // Escape has nothing to go back to
            summary()!
                .querySelector('[role="dialog"]')!
                .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            fixture.detectChanges();
            expect(summary()).not.toBeNull();

            mockNavigate();
            pressInSummary('Done');
            await fixture.whenStable();
            expect(entries()).toEqual([expect.objectContaining({ outcome: 'finished' })]);
            fixture.destroy();
        });

        it('has nothing to log when ended before the first step was done', () => {
            start(makeWorkout());
            endWorkout();
            fixture.detectChanges();

            expect(summaryText()).toContain('Nothing to log');
            expect(summary()!.querySelector('#summary-note')).toBeNull();
            expect(entries()).toEqual([]);
            fixture.destroy();
        });

        it('saves a note to the run in the history', () => {
            const run = endInRound2();
            const note = summary()!.querySelector('#summary-note') as HTMLInputElement;

            note.value = 'Felt strong';
            note.dispatchEvent(new Event('input'));
            note.dispatchEvent(new Event('change'));
            fixture.detectChanges();

            expect(entries().find((entry) => entry.id === run)?.note).toBe('Felt strong');
            fixture.destroy();
        });

        describe('changing the sets', () => {
            function openChanges() {
                pressInSummary('Change reps or weight');
            }
            function choose(set: number, wheel: 'reps' | 'weight', value: string) {
                const picker = summary()!.querySelector(
                    `app-wheel-picker:has([aria-labelledby="summary-set-${set} summary-${wheel}-${set}"])`
                ) as HTMLElement;
                (picker.querySelector(`[data-value="${value}"]`) as HTMLElement).click();
                fixture.detectChanges();
            }

            it('corrects a set in the history, then asks whether to use it next time', () => {
                const run = endInRound2();
                openChanges();

                choose(0, 'reps', '18');
                choose(0, 'weight', '42.5');

                expect(entries().find((entry) => entry.id === run)?.sets).toEqual([
                    expect.objectContaining({ reps: 18, weight: 42.5 }),
                ]);
                expect(summaryText()).toContain('Use these settings next time?');
                // Not until asked
                expect(store.workouts()[0].steps[1]).toEqual(
                    expect.objectContaining({ reps: 20, weight: 40 })
                );

                pressInSummary('Done changing');
                expect(summaryText()).toContain('Push-ups: 18 reps @ 42.5 kg');
                fixture.destroy();
            });

            it('carries the last set of each step over to the saved workout on Yes', () => {
                endInRound2();
                openChanges();
                choose(0, 'reps', '18');

                pressInSummary('Yes, use next time');

                expect(store.workouts()[0].steps[1]).toEqual(
                    expect.objectContaining({ kind: 'reps', reps: 18, weight: 40 })
                );
                expect(summaryText()).toContain('Saved: next time starts from these.');
                fixture.destroy();
            });

            it('leaves the saved workout alone on No', () => {
                endInRound2();
                openChanges();
                choose(0, 'weight', '0');

                pressInSummary('No, just this time');

                expect(store.workouts()[0].steps[1]).toEqual(
                    expect.objectContaining({ reps: 20, weight: 40 })
                );
                expect(summaryText()).not.toContain('Use these settings next time?');
                fixture.destroy();
            });

            it('keeps the corrections if the run is taken up again and logged later', () => {
                const run = endInRound2();
                openChanges();
                choose(0, 'reps', '12');

                pressInSummary('Back to workout');
                endWorkout();
                fixture.detectChanges();

                expect(entries().find((entry) => entry.id === run)?.sets).toEqual([
                    expect.objectContaining({ reps: 12 }),
                ]);
                fixture.destroy();
            });
        });
    });
});
