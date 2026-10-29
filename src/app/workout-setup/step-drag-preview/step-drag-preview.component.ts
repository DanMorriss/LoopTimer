import { Component, input } from '@angular/core';
import { StepKind, stepKindName } from '../../models/workout';

/**
 * What follows the pointer while a step (or a heading) is dragged in Create: a compact card
 * of its kind, name and time, as the wheels don't copy well.
 */
@Component({
    selector: 'app-step-drag-preview',
    templateUrl: './step-drag-preview.component.html',
    styleUrl: './step-drag-preview.component.scss',
    host: {
        '[class.rest]': "kind() === 'rest'",
        '[class.reps]': "kind() === 'reps'",
        '[class.heading]': "kind() === 'heading'",
    },
})
export class StepDragPreviewComponent {
    /** A superset's own row is never dragged (it moves with its steps), but has a name. */
    readonly kind = input.required<StepKind | 'heading' | 'superset'>();
    readonly name = input('');
    /** e.g. "00:30", or "10 reps". */
    readonly time = input('');

    protected kindName(kind: StepKind | 'heading' | 'superset'): string {
        return kind === 'heading'
            ? 'Heading'
            : kind === 'superset'
              ? 'Superset'
              : stepKindName(kind);
    }
}
