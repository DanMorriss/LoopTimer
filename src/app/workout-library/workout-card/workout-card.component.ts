import {
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { repStepsPerRound, roundSeconds, runsUntilStopped, Workout } from '../../models/workout';
import { formatTime } from '../../shared/format-time';
import { project, rubberband, VelocityTracker } from '../../shared/gesture';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { criticallyDampedSpring } from '../../shared/spring';

/**
 * One workout in the library list: pressing it starts the workout. It can also be swiped to
 * the left to delete it, or held (or right-clicked) for its options, which the ⋮ button opens
 * too, for keyboards, screen readers and anyone who doesn't know the gestures. The library
 * decides which card's options are open (one at a time); the card shows that and reports
 * what the user does.
 */
@Component({
    selector: 'li[appWorkoutCard]',
    imports: [MatIconModule],
    templateUrl: './workout-card.component.html',
    styleUrl: './workout-card.component.scss',
    host: {
        class: 'workout-card',
        '[class.workout-card--menu-open]': 'menuOpen()',
    },
})
export class WorkoutCardComponent {
    readonly workout = input.required<Workout>();
    /** Whether this card's options are open. */
    readonly menuOpen = input(false);

    readonly started = output<void>();
    readonly menuToggled = output<void>();
    readonly menuClosed = output<void>();
    readonly editRequested = output<void>();
    readonly deleteRequested = output<void>();

    protected readonly title = computed(() => this.workout().title.trim());
    /** Used in accessible names, e.g. "Start Sprints" or "Start workout". */
    protected readonly name = computed(() => this.title() || 'workout');
    /**
     * A one-line summary: its exercises, the steps' names in order, e.g. "Squats, Bench press
     * + 1 more". With no step named, "01:05 - 00:20" for one work step (and maybe one rest),
     * as workouts have always shown, or "5 steps · 02:15" with the length of a round. Rep steps
     * take as long as they take, so a round with some is "4 steps · 01:30 + reps", or
     * "2 steps · reps" with no timed steps at all.
     */
    protected readonly summary = computed(() => {
        const steps = this.workout().steps;
        const namedExercises: string[] = [];
        for (const step of steps) {
            if (step.kind === 'rest') continue;
            const name = step.name.trim();
            if (name && !namedExercises.includes(name)) {
                namedExercises.push(name);
            }
        }
        if (namedExercises.length > 0) {
            const preview = namedExercises.slice(0, 2);
            const remainder = namedExercises.length - preview.length;
            const text =
                remainder > 0 ? `${preview.join(', ')} + ${remainder} more` : preview.join(', ');
            return { text, spoken: text };
        }

        const [first, second] = steps;
        if (steps.length <= 2 && first.kind === 'work' && (!second || second.kind === 'rest')) {
            const work = clock(first.seconds);
            const rest = clock(second?.kind === 'rest' ? second.seconds : 0);
            return { text: `${work} - ${rest}`, spoken: `Timed ${work}, rest ${rest}` };
        }
        const count = steps.length === 1 ? '1 step' : `${steps.length} steps`;
        const seconds = roundSeconds(this.workout());
        const round = clock(seconds);
        if (repStepsPerRound(this.workout()) === 0) {
            return { text: `${count} · ${round}`, spoken: `${count}, ${round} a round` };
        }
        return seconds > 0
            ? { text: `${count} · ${round} + reps`, spoken: `${count}, ${round} a round plus reps` }
            : { text: `${count} · reps`, spoken: `${count}, all reps` };
    });
    /** How long it goes on: "x 4" rounds, "x ∞" until stopped, or "in 20:00" for a time limit. */
    protected readonly rounds = computed(() => {
        const { repeats, timeLimitSeconds } = this.workout();
        if (timeLimitSeconds !== undefined) {
            return `in ${clock(timeLimitSeconds)}`;
        }
        return runsUntilStopped(this.workout()) ? 'x ∞' : `x ${repeats}`;
    });
    protected readonly spokenRounds = computed(() => {
        const { repeats, timeLimitSeconds } = this.workout();
        if (timeLimitSeconds !== undefined) {
            return `as many rounds as possible in ${clock(timeLimitSeconds)}`;
        }
        return runsUntilStopped(this.workout())
            ? 'repeated until stopped'
            : `repeated ${repeats} times`;
    });
    // Gestures on the card, as on an iPhone list. A tap starts the workout. A swipe to the
    // left follows the finger, showing Delete behind; let go, and where the flick would carry
    // it decides: past halfway it carries on off the card and deletes (with Undo), otherwise
    // it springs back, from the finger's speed either way. Holding still on it opens its
    // options. Up and down is left to the page, which scrolls.

    private readonly face = viewChild.required<ElementRef<HTMLElement>>('face');
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private gesture: {
        pointerId: number;
        startX: number;
        startY: number;
        startOffset: number;
        offset: number;
        /** Which way it's going, once it has moved far enough to tell. */
        axis: 'x' | 'y' | null;
        tracker: VelocityTracker;
    } | null = null;
    private holdTimer: ReturnType<typeof setTimeout> | undefined;
    /** The press was a swipe or a hold, so the click that ends it doesn't start the workout. */
    private swallowClick = false;

    constructor() {
        inject(DestroyRef).onDestroy(() => clearTimeout(this.holdTimer));
    }

    protected start(event: Event) {
        if (this.swallowClick) {
            this.swallowClick = false;
            event.preventDefault();
            // Nor does it reach the library, which would close the options a hold just opened
            event.stopPropagation();
            return;
        }
        this.started.emit();
    }

    /** A hold (or a right-click) opens the options, as the ⋮ button does. */
    protected openMenuFromHold(event: Event) {
        if ((event.target as Element).closest('.workout-card__menu-wrap')) {
            return;
        }
        event.preventDefault();
        if (!this.menuOpen()) {
            this.menuToggled.emit();
        }
    }

    protected press(event: PointerEvent) {
        const target = event.target as Element;
        if (
            (event.pointerType === 'mouse' && event.button !== 0) ||
            target.closest('.workout-card__menu-wrap')
        ) {
            return;
        }
        this.swallowClick = false;
        // Where it is on screen now, mid-spring included, and stop it there
        const offset = new DOMMatrix(getComputedStyle(this.face().nativeElement).transform).m41;
        this.host.nativeElement.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        this.moveTo(offset);
        const tracker = new VelocityTracker();
        tracker.add(offset, event.timeStamp);
        this.gesture = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startOffset: offset,
            offset,
            axis: null,
            tracker,
        };
        // Held still for half a second: its options. iPhones don't send a contextmenu event
        // for a long press, so this does it.
        clearTimeout(this.holdTimer);
        this.holdTimer = setTimeout(() => {
            if (this.gesture && !this.gesture.axis) {
                this.gesture = null;
                this.swallowClick = true;
                navigator.vibrate?.(10);
                if (!this.menuOpen()) {
                    this.menuToggled.emit();
                }
            }
        }, HOLD_MS);
    }

    protected move(event: PointerEvent) {
        const gesture = this.gesture;
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        if (!gesture.axis) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < DIRECTION_THRESHOLD) {
                return;
            }
            clearTimeout(this.holdTimer);
            gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
            if (gesture.axis === 'y') {
                // The page scrolls; nothing more for the card to do
                this.gesture = null;
                return;
            }
            this.swallowClick = true;
            (event.currentTarget as Element).setPointerCapture(event.pointerId);
        }
        const width = this.width();
        const pulled = gesture.startOffset + dx;
        // Left follows the finger; right, where there's nothing to show, resists
        const offset = pulled > 0 ? rubberband(pulled, width) : pulled;
        const wasPast = gesture.offset < -width / 2;
        gesture.offset = offset;
        gesture.tracker.add(offset, event.timeStamp);
        this.moveTo(offset);
        // A tick as it crosses the point where letting go would delete it
        if (wasPast !== offset < -width / 2) {
            navigator.vibrate?.(8);
        }
    }

    protected async release(event: PointerEvent) {
        const gesture = this.gesture;
        clearTimeout(this.holdTimer);
        if (!gesture || event.pointerId !== gesture.pointerId) {
            return;
        }
        this.gesture = null;
        if (gesture.axis !== 'x') {
            return;
        }
        const velocity = gesture.tracker.velocity(event.timeStamp);
        const width = this.width();
        // Where the flick would come to rest decides, not where the finger let go
        const away = gesture.offset + project(velocity) < -width / 2;
        await this.springTo(away ? -width : 0, gesture.offset, velocity);
        if (away) {
            this.deleteRequested.emit();
        }
    }

    private width(): number {
        return this.host.nativeElement.offsetWidth || 1;
    }

    /** Slides the card `offset` px across, showing as much of Delete behind as it leaves. */
    private moveTo(offset: number) {
        this.face().nativeElement.style.transform = offset ? `translateX(${offset}px)` : '';
        const host = this.host.nativeElement;
        host.style.setProperty('--reveal', `${Math.max(0, -offset)}px`);
        host.classList.toggle('workout-card--past-delete', offset < -this.width() / 2);
    }

    /**
     * Springs the card from `from` to `to` px across, setting off at the finger's `velocity`
     * (px/s), so there's no seam where the swipe lets go. With reduced motion it's just there.
     */
    private async springTo(to: number, from: number, velocity: number) {
        const distance = to - from;
        this.moveTo(to);
        if (this.reducedMotion() || Math.abs(distance) < 1) {
            return;
        }
        // The spring wants speed as a share of the distance left per second
        const { easing, duration } = criticallyDampedSpring(0.3, {
            velocity: velocity / distance,
        });
        const timing = { duration, easing };
        // Delete behind shows as much as the card leaves, all the way along
        this.host.nativeElement
            .querySelector('.workout-card__delete')
            ?.animate([{ clipPath: revealClip(from) }, { clipPath: revealClip(to) }], timing);
        await this.face()
            .nativeElement.animate(
                [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }],
                timing
            )
            .finished.catch(() => undefined);
    }
}

/** How long a press is held, still, before it opens the options. */
const HOLD_MS = 500;

/** How far a press moves (px) before it counts as a swipe or a scroll, and which. */
const DIRECTION_THRESHOLD = 10;

/** The part of Delete behind that a card slid `offset` px across leaves showing. */
function revealClip(offset: number): string {
    return `inset(0 0 0 calc(100% - ${Math.max(0, -offset)}px) round 0.9rem)`;
}

/** e.g. 75 → "01:15" */
function clock(seconds: number): string {
    return formatTime(Math.floor(seconds / 60), seconds % 60);
}
