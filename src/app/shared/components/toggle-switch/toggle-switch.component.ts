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
        if (!dragging.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD) {
                return;
            }
            dragging.moved = true;
            (event.currentTarget as Element).setPointerCapture(event.pointerId);
        }
        // Follows the finger, within the track
        dragging.x = Math.min(dragging.travel, Math.max(0, dragging.from + dx));
        dragging.tracker.add(dragging.x, event.timeStamp);
        const knob = this.knob().nativeElement;
        knob.style.transition = 'none';
        knob.style.transform = `translate(${dragging.x}px, -50%)`;
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
        // Once the switch shows its new state, the knob springs there from where it was let go
        afterNextRender(
            () => {
                const knob = this.knob().nativeElement;
                knob.style.transition = '';
                knob.style.transform = '';
            },
            { injector: this.injector }
        );
    }
}
