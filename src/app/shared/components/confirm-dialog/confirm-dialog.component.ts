import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';

/**
 * Asks the user to confirm something that can't be undone, such as a delete. The content
 * is the description. Focus is trapped inside while it's open, starting on Cancel.
 */
@Component({
    selector: 'app-confirm-dialog',
    imports: [CdkTrapFocus],
    styleUrl: './confirm-dialog.component.scss',
    template: `
        <div
            class="confirm-overlay"
            role="presentation"
            (click)="cancelled.emit()"
            (keydown.escape)="cancelled.emit()"
        >
            <div
                class="confirm-dialog"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
                (click)="$event.stopPropagation()"
            >
                <p id="confirm-dialog-title" class="confirm-dialog__title">{{ title() }}</p>
                <p id="confirm-dialog-description" class="confirm-dialog__description">
                    <ng-content />
                </p>
                <div class="confirm-dialog__actions">
                    <button
                        type="button"
                        class="btn-pill confirm-dialog__button confirm-dialog__button--cancel"
                        (click)="cancelled.emit()"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        class="btn-pill btn-pill--danger confirm-dialog__button confirm-dialog__button--delete"
                        (click)="confirmed.emit()"
                    >
                        {{ confirmLabel() }}
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class ConfirmDialogComponent {
    /** The question, e.g. "Delete workout?". */
    readonly title = input.required<string>();
    readonly confirmLabel = input('Delete');
    readonly cancelled = output<void>();
    readonly confirmed = output<void>();
}
