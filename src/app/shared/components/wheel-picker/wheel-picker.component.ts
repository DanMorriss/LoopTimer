import {
    afterRenderEffect,
    Component,
    computed,
    ElementRef,
    input,
    model,
    viewChild,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { injectPrefersReducedMotion } from '../../reduced-motion';

export interface WheelPickerOption {
    value: number;
    label: string;
}

/** How far a mouse has to move (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

/**
 * An iPhone-style wheel picker. Scroll, swipe or drag the list and the number that settles
 * in the middle is selected; clicking a number selects it too. For keyboard and screen
 * reader users it's a spin button (Up/Down, Page Up/Down, Home/End).
 *
 * Works with Signal Forms: bind it with `[formField]`.
 */
@Component({
    selector: 'app-wheel-picker',
    templateUrl: './wheel-picker.component.html',
    styleUrl: './wheel-picker.component.scss',
})
export class WheelPickerComponent implements FormValueControl<number> {
    readonly value = model(0);
    readonly options = input.required<readonly WheelPickerOption[]>();
    /** id of the element that labels this picker. */
    readonly labelledBy = input<string>();

    private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
    private readonly reducedMotion = injectPrefersReducedMotion();

    protected readonly selectedIndex = computed(() =>
        Math.max(
            0,
            this.options().findIndex((option) => option.value === this.value())
        )
    );
    protected readonly valueText = computed(() => this.options()[this.selectedIndex()]?.label);
    protected readonly lowest = computed(() => this.options()[0]?.value);
    protected readonly highest = computed(() => this.options().at(-1)?.value);

    /** How the next scroll to the selected value should move: jump, or glide for user actions. */
    private nextScroll: ScrollBehavior = 'instant';
    private drag: {
        pointerId: number;
        startY: number;
        startScroll: number;
        dragging: boolean;
    } | null = null;
    private settleTimer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        // Keep the wheel showing the value, whether it changed here or from the form
        afterRenderEffect(() => {
            const index = this.selectedIndex();
            const viewport = this.viewport().nativeElement;
            const behavior = this.nextScroll;
            this.nextScroll = 'instant';
            if (this.indexAtScroll() !== index) {
                viewport.scrollTo({ top: index * this.rowHeight(), behavior });
            }
        });
    }

    focus(options?: FocusOptions) {
        this.viewport().nativeElement.focus(options);
    }

    protected onScroll() {
        // Browsers without the scrollend event: settle once scrolling has paused
        if (!('onscrollend' in window)) {
            clearTimeout(this.settleTimer);
            this.settleTimer = setTimeout(() => this.settle(), 120);
        }
    }

    /** Scrolling has stopped: select whatever is in the middle. */
    protected settle() {
        if (this.drag?.dragging) {
            return;
        }
        const option = this.options()[this.indexAtScroll()];
        if (option && option.value !== this.value()) {
            this.value.set(option.value);
        }
    }

    protected onItemClick(index: number) {
        this.selectIndex(index);
    }

    protected onKeydown(event: KeyboardEvent) {
        const last = this.options().length - 1;
        const current = this.selectedIndex();
        const target = {
            ArrowUp: current - 1,
            ArrowDown: current + 1,
            PageUp: current - 5,
            PageDown: current + 5,
            Home: 0,
            End: last,
        }[event.key];
        if (target === undefined) {
            return;
        }
        event.preventDefault();
        this.selectIndex(Math.min(last, Math.max(0, target)));
    }

    // Mouse dragging. Touch and pens already scroll natively, so only the mouse needs this.
    protected onPointerDown(event: PointerEvent) {
        if (event.pointerType !== 'mouse' || event.button !== 0) {
            return;
        }
        this.drag = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startScroll: this.viewport().nativeElement.scrollTop,
            dragging: false,
        };
    }

    protected onPointerMove(event: PointerEvent) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const viewport = this.viewport().nativeElement;
        const moved = event.clientY - drag.startY;
        if (!drag.dragging && Math.abs(moved) > DRAG_THRESHOLD) {
            // Only capture once it's a real drag, so a plain click still reaches the number
            drag.dragging = true;
            viewport.setPointerCapture(event.pointerId);
            viewport.classList.add('wheel-picker__viewport--dragging');
        }
        if (drag.dragging) {
            viewport.scrollTop = drag.startScroll - moved;
        }
    }

    protected onPointerUp(event: PointerEvent) {
        const drag = this.drag;
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        this.drag = null;
        if (drag.dragging) {
            const viewport = this.viewport().nativeElement;
            viewport.classList.remove('wheel-picker__viewport--dragging');
            viewport.releasePointerCapture(event.pointerId);
            this.selectIndex(this.indexAtScroll());
        }
    }

    private selectIndex(index: number) {
        const option = this.options()[index];
        if (!option) {
            return;
        }
        const behavior: ScrollBehavior = this.reducedMotion() ? 'instant' : 'smooth';
        if (option.value !== this.value()) {
            this.nextScroll = behavior;
            this.value.set(option.value);
        } else {
            // Same value, but the wheel may sit between rows (e.g. after a drag): snap back
            this.viewport().nativeElement.scrollTo({ top: index * this.rowHeight(), behavior });
        }
    }

    private rowHeight(): number {
        return (
            this.viewport().nativeElement.querySelector<HTMLElement>('.wheel-picker__item')
                ?.offsetHeight || 1
        );
    }

    private indexAtScroll(): number {
        const index = Math.round(this.viewport().nativeElement.scrollTop / this.rowHeight());
        return Math.min(this.options().length - 1, Math.max(0, index));
    }
}
