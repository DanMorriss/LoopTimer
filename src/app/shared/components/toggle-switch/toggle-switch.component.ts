import {
    afterNextRender,
    Component,
    ElementRef,
    inject,
    Injector,
    input,
    model,
    viewChild,
} from '@angular/core';
import { project, VelocityTracker } from '../../gesture';
import { injectPrefersReducedMotion } from '../../reduced-motion';
import { criticallyDampedSpring } from '../../spring';

/** How far (px) a press moves sideways before it's dragging the knob rather than a tap. */
const DRAG_THRESHOLD = 5;

/**
 * An on/off switch in the app's style. It says On or Off, so the state never relies on colour.
 * A tap flips it; the knob can also be dragged across, as on an iPhone, and where it's let
 * go (and which way it was flicked) decides.
 */
@Component({
    selector: 'app-toggle-switch',
    template: `
        <button
            type="button"
            role="switch"
            class="toggle-switch"
            [class.toggle-switch--on]="checked()"
            [attr.aria-checked]="checked()"
            [attr.aria-labelledby]="labelledBy()"
            [attr.aria-describedby]="describedBy()"
            [disabled]="disabled()"
            (click)="onClick()"
            (pointerdown)="press($event)"
            (pointermove)="drag($event)"
            (pointerup)="letGo($event)"
            (pointercancel)="letGo($event)"
        >
            <span class="toggle-switch__track" aria-hidden="true">
                <span #knob class="toggle-switch__knob"></span>
            </span>
            <span class="toggle-switch__state" aria-hidden="true">{{
                checked() ? 'On' : 'Off'
            }}</span>
        </button>
    `,
    styleUrl: './toggle-switch.component.scss',
})
export class ToggleSwitchComponent {
    readonly checked = model(false);
    /** id of the element that labels this switch. */
    readonly labelledBy = input<string>();
    /** id of an element with more detail, read after the label. */
    readonly describedBy = input<string>();
    readonly disabled = input(false);

    private readonly knob = viewChild.required<ElementRef<HTMLElement>>('knob');
    private readonly injector = inject(Injector);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private dragging: {
        pointerId: number;
        startX: number;
        /** Where the knob was (px from off) when pressed, and how far it can go. */
        from: number;
        travel: number;
        x: number;
        moved: boolean;
        tracker: VelocityTracker;
    } | null = null;
    /** The press dragged the knob, so the click that ends it doesn't flip it again. */
    private dragged = false;

    protected onClick() {
        if (this.dragged) {
            return;
        }
        this.checked.set(!this.checked());
    }

    protected press(event: PointerEvent) {
        this.dragged = false;
        // Browsers still send pointer events to a disabled button, just not its click
        if (this.disabled() || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }
        const knob = this.knob().nativeElement;
        const track = knob.parentElement!;
        // From the knob's place when off to its place when on
        const travel = track.clientWidth - knob.offsetWidth - 2 * knob.offsetLeft;
        const from = this.checked() ? travel : 0;
        // Caught on the spring from a drag: it stops where it is, and its own transition takes
        // it on from there (to wherever a tap's flip sends it), unless a drag takes it first
        const springs = this.springs(knob);
        if (springs.length) {
            const x = this.knobX(knob, travel);
            springs.forEach((animation) => animation.cancel());
            knob.style.transform = `translate(${x}px, -50%)`;
            knob.style.transition = '';
            requestAnimationFrame(() => {
                if (!this.dragging?.moved) {
                    knob.style.transform = '';
                }
            });
        }
        this.dragging = {
            pointerId: event.pointerId,
            startX: event.clientX,
            from,
            travel,
            x: from,
            moved: false,
            tracker: new VelocityTracker(),
        };
    }

    protected drag(event: PointerEvent) {
        const dragging = this.dragging;
        if (!dragging || event.pointerId !== dragging.pointerId) {
            return;
        }
        const dx = event.clientX - dragging.startX;
        const knob = this.knob().nativeElement;
        if (!dragging.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD) {
                return;
            }
            dragging.moved = true;
            (event.currentTarget as Element).setPointerCapture(event.pointerId);
            // Taken from where it is on screen now (still moving from a tap, say), rather
            // than from where that move was going
            dragging.from = this.knobX(knob, dragging.travel);
            this.springs(knob).forEach((animation) => animation.cancel());
            knob.style.transition = 'none';
        }
        // Follows the finger, within the track
        dragging.x = Math.min(
            dragging.travel,
            Math.max(0, dragging.from + event.clientX - dragging.startX)
        );
        dragging.tracker.add(dragging.x, event.timeStamp);
        knob.style.transform = `translate(${dragging.x}px, -50%)`;
    }

    /** The spring a drag let go of, if it's still running (not the knob's own transitions). */
    private springs(knob: HTMLElement): Animation[] {
        return knob.getAnimations().filter((animation) => !(animation instanceof CSSTransition));
    }

    /** Where the knob is on screen now (px from off), mid-move included. */
    private knobX(knob: HTMLElement, travel: number): number {
        // Its transform moves it across from where it sits when off (and centres it upright)
        const x = new DOMMatrix(getComputedStyle(knob).transform).m41;
        return Math.min(travel, Math.max(0, x));
    }

    protected letGo(event: PointerEvent) {
        const dragging = this.dragging;
        if (!dragging || event.pointerId !== dragging.pointerId) {
            return;
        }
        this.dragging = null;
        if (!dragging.moved) {
            return;
        }
        // Swallows the click this pointerup sends next, if it sends one: a touch that moved
        // sends none, so it's dropped straight after, leaving the next Space or tap alone
        this.dragged = event.type === 'pointerup';
        setTimeout(() => (this.dragged = false));
        // Where a flick would carry it decides, not just where it was let go
        const velocity = dragging.tracker.velocity(event.timeStamp);
        const on = dragging.x + project(velocity, 0.99) > dragging.travel / 2;
        this.checked.set(on);
        // Once the switch shows its new state, the knob springs there from where it was let
        // go, carrying on at the finger's speed so there's no seam where the drag ends
        afterNextRender(
            () => {
                const knob = this.knob().nativeElement;
                knob.style.transform = '';
                const to = on ? dragging.travel : 0;
                const distance = to - dragging.x;
                if (Math.abs(distance) < 0.5 || this.reducedMotion()) {
                    knob.style.transition = '';
                    return;
                }
                // Its own transition stays off while the spring has it, so the two don't race
                const spring = knob.animate(
                    [
                        { transform: `translate(${dragging.x}px, -50%)` },
                        { transform: `translate(${to}px, -50%)` },
                    ],
                    criticallyDampedSpring(0.3, { velocity: velocity / distance })
                );
                spring.finished.then(() => (knob.style.transition = '')).catch(() => undefined);
            },
            { injector: this.injector }
        );
    }
}
