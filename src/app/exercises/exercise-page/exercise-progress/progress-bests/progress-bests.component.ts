import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { BestLine, dateFormatFor } from '../../../progress-format';

/** An exercise's personal bests (PRG-4), two to a row, each with when it was set. */
@Component({
    selector: 'app-progress-bests',
    imports: [DatePipe],
    templateUrl: './progress-bests.component.html',
    styleUrl: './progress-bests.component.scss',
})
export class ProgressBestsComponent {
    readonly bests = input.required<readonly BestLine[]>();

    protected readonly dateFormat = dateFormatFor;
}
