import { Component, computed, input } from '@angular/core';

/**
 * A time such as "00:41" in the display face, with each digit in a cell of the same width,
 * like a digital clock. Audiowide's digits differ a lot (a "1" is under half as wide as a
 * "0") and it has no tabular digits, so without the cells the countdown would shrink and
 * re-centre every second. Screen readers get the time as one piece of text.
 */
@Component({
    selector: 'app-clock-digits',
    template: `
        <span class="sr-only">{{ time() }}</span>
        <span class="clock" aria-hidden="true">
            @for (char of chars(); track $index) {
                <span [class]="isDigit(char) ? 'clock__digit' : 'clock__mark'">{{ char }}</span>
            }
        </span>
    `,
    styles: `
        .clock {
            white-space: nowrap;
        }

        // Wide enough for Audiowide's widest digit (0) without the space either side of it,
        // which the cell gives every digit, centred in it
        .clock__digit {
            display: inline-block;
            width: 0.86em;
            text-align: center;
        }
    `,
})
export class ClockDigitsComponent {
    /** e.g. "00:41" or "1:05:00". */
    readonly time = input.required<string>();

    protected readonly chars = computed(() => [...this.time()]);

    protected isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }
}
