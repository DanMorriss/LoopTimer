import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';
import { Timer } from '../../models/timer';

/** Asks the user to confirm deleting a timer. Focus is trapped inside while it's open. */
@Component({
    selector: 'app-delete-timer-dialog',
    imports: [CdkTrapFocus],
    styleUrl: './delete-timer-dialog.component.scss',
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
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
                (click)="$event.stopPropagation()"
            >
                <p id="delete-dialog-title" class="confirm-dialog__title">Delete timer?</p>
                <p id="delete-dialog-description" class="confirm-dialog__description">
                    @if (timer().title.trim()) {
                        This will remove "{{ timer().title }}" from your timer library.
                    } @else {
                        This will remove this timer from your timer library.
                    }
                </p>
                <div class="confirm-dialog__actions">
                    <button
                        type="button"
                        class="confirm-dialog__button confirm-dialog__button--cancel"
                        (click)="cancelled.emit()"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        class="confirm-dialog__button confirm-dialog__button--delete"
                        (click)="confirmed.emit()"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `,
})
export class DeleteTimerDialogComponent {
    readonly timer = input.required<Timer>();
    readonly cancelled = output<void>();
    readonly confirmed = output<void>();
}
