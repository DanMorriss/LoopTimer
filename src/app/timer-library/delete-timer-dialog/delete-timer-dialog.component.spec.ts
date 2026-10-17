import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Timer } from '../../models/timer';
import { DeleteTimerDialogComponent } from './delete-timer-dialog.component';

const timer: Timer = {
    id: 1,
    title: 'Sprints',
    timerMinutes: 0,
    timerSeconds: 30,
    restMinutes: 0,
    restSeconds: 10,
    repeats: 3,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false,
};

describe('DeleteTimerDialogComponent', () => {
    let fixture: ComponentFixture<DeleteTimerDialogComponent>;
    let cancelled: jasmine.Spy;
    let confirmed: jasmine.Spy;

    function create(forTimer: Timer) {
        fixture = TestBed.createComponent(DeleteTimerDialogComponent);
        fixture.componentRef.setInput('timer', forTimer);
        cancelled = jasmine.createSpy('cancelled');
        confirmed = jasmine.createSpy('confirmed');
        fixture.componentInstance.cancelled.subscribe(cancelled);
        fixture.componentInstance.confirmed.subscribe(confirmed);
        fixture.detectChanges();
    }

    const el = (selector: string): HTMLElement => fixture.nativeElement.querySelector(selector);

    beforeEach(() => TestBed.configureTestingModule({ imports: [DeleteTimerDialogComponent] }));

    it('is a labelled modal dialog naming the timer', () => {
        create(timer);

        const dialog = el('[role="dialog"]');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(el('#' + dialog.getAttribute('aria-labelledby')).textContent).toContain(
            'Delete timer?'
        );
        expect(el('#' + dialog.getAttribute('aria-describedby')).textContent).toContain(
            '"Sprints"'
        );
    });

    it('describes an untitled timer without empty quotes', () => {
        create({ ...timer, title: '  ' });

        expect(el('.confirm-dialog__description').textContent).toContain(
            'This will remove this timer'
        );
    });

    it('confirms from the Delete button', () => {
        create(timer);

        el('.confirm-dialog__button--delete').click();

        expect(confirmed).toHaveBeenCalledTimes(1);
        expect(cancelled).not.toHaveBeenCalled();
    });

    it('cancels from the Cancel button, the backdrop, or Escape', () => {
        create(timer);

        el('.confirm-dialog__button--cancel').click();
        el('.confirm-overlay').click();
        el('.confirm-dialog__button--cancel').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );

        expect(cancelled).toHaveBeenCalledTimes(3);
        expect(confirmed).not.toHaveBeenCalled();
    });

    it('does not cancel when clicking inside the dialog', () => {
        create(timer);

        el('.confirm-dialog').click();

        expect(cancelled).not.toHaveBeenCalled();
    });
});
