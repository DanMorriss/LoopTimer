import type { Mock } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
    imports: [ConfirmDialogComponent],
    template: `
        <app-confirm-dialog
            [title]="title()"
            [confirmLabel]="confirmLabel()"
            (cancelled)="cancelled()"
            (confirmed)="confirmed()"
        >
            This will remove "Sprints".
        </app-confirm-dialog>
    `,
})
class HostComponent {
    readonly title = signal('Delete timer?');
    readonly confirmLabel = signal('Delete');
    cancelled: Mock = vi.fn().mockName('cancelled');
    confirmed: Mock = vi.fn().mockName('confirmed');
}

describe('ConfirmDialogComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    const el = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector);

    it('is a modal dialog labelled by its question and described by its content', () => {
        const dialog = el('[role="dialog"]');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(el('#' + dialog.getAttribute('aria-labelledby')).textContent).toContain(
            'Delete timer?'
        );
        expect(el('#' + dialog.getAttribute('aria-describedby')).textContent).toContain(
            'This will remove "Sprints".'
        );
    });

    it('labels the confirm button "Delete" unless told otherwise', () => {
        expect(el('.confirm-dialog__button--delete').textContent!.trim()).toBe('Delete');

        host.confirmLabel.set('Remove');
        fixture.detectChanges();

        expect(el('.confirm-dialog__button--delete').textContent!.trim()).toBe('Remove');
    });

    it('confirms from the confirm button', () => {
        el('.confirm-dialog__button--delete').click();

        expect(host.confirmed).toHaveBeenCalledTimes(1);
        expect(host.cancelled).not.toHaveBeenCalled();
    });

    it('cancels from the Cancel button, the backdrop, or Escape', () => {
        el('.confirm-dialog__button--cancel').click();
        el('.confirm-overlay').click();
        el('.confirm-dialog__button--cancel').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );

        expect(host.cancelled).toHaveBeenCalledTimes(3);
        expect(host.confirmed).not.toHaveBeenCalled();
    });

    it('does not cancel when clicking inside the dialog', () => {
        el('.confirm-dialog').click();

        expect(host.cancelled).not.toHaveBeenCalled();
    });
});
