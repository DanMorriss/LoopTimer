import { Component, input } from '@angular/core';

/** A round as a dot: done, the one in progress, or still to go. */
export type RoundDot = 'done' | 'current' | 'left';

/** The rounds as a row of dots, under "round 2 of 5": the same count as a picture. */
@Component({
    selector: 'app-round-dots',
    template: `
        <div class="round-dots" aria-hidden="true">
            @for (dot of dots(); track $index) {
                <span class="round-dot" [class]="'round-dot--' + dot"></span>
            }
        </div>
    `,
    styleUrl: './round-dots.component.scss',
})
export class RoundDotsComponent {
    readonly dots = input.required<readonly RoundDot[]>();
}
