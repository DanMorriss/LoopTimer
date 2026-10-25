import { Component, input } from '@angular/core';
import { StepKind, stepKindName } from '../../models/workout';

/**
 * What follows the pointer while a step is dragged in Create: a compact card of its kind,
 * name and time, as the wheels don't copy well.
 */
@Component({
    selector: 'app-step-drag-preview',
    templateUrl: './step-drag-preview.component.html',
    styleUrl: './step-drag-preview.component.scss',
    host: {
        '[class.rest]': "kind() === 'rest'",
        '[class.reps]': "kind() === 'reps'",
    },
})
export class StepDragPreviewComponent {
    readonly kind = input.required<StepKind>();
    readonly name = input('');
    /** e.g. "00:30", or "10 reps". */
    readonly time = input('');

    protected readonly kindName = stepKindName;
}
