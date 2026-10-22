import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { ExercisePickerComponent } from './exercise-picker.component';

@Component({
    imports: [ExercisePickerComponent],
    template: `
        <app-exercise-picker
            inputId="name"
            [(value)]="name"
            [(exerciseId)]="exerciseId"
            placeholder="e.g. Push-ups"
        />
    `,
})
class HostComponent {
    readonly name = signal('');
    readonly exerciseId = signal('');
}

describe('ExercisePickerComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(async () => {
        localStorage.clear();
        localStorage.setItem('data-version', '3');
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });
    afterEach(() => localStorage.clear());

    const box = () => fixture.nativeElement.querySelector('[role="combobox"]') as HTMLInputElement;
    const list = () => fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    const options = () =>
        Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')) as HTMLElement[];
    /** Each option as it reads, e.g. "Push-up, Also called Press-up", leaving out its icon. */
    const optionText = () =>
        options().map((option) => {
            const copy = option.cloneNode(true) as HTMLElement;
            copy.querySelectorAll('mat-icon').forEach((icon) => icon.remove());
            return copy.textContent!.replace(/\s+/g, ' ').trim();
        });

    async function type(text: string) {
        box().value = text;
        box().dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function press(key: string) {
        const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
        box().dispatchEvent(event);
        fixture.detectChanges();
        await fixture.whenStable();
        return event;
    }

    it('is a combobox with its list closed to begin with', () => {
        expect(box().id).toBe('name');
        expect(box().placeholder).toBe('e.g. Push-ups');
        expect(box().getAttribute('aria-expanded')).toBe('false');
        expect(box().getAttribute('aria-controls')).toBe(list().id);
        expect(list().hidden).toBe(true);
    });

    it('lists the exercises that match as you type, with the other name that matched', async () => {
        await type('press-up');

        expect(box().getAttribute('aria-expanded')).toBe('true');
        expect(list().hidden).toBe(false);
        expect(optionText()[0]).toBe('Push-up, Also called Press-up');
        expect(host.name()).toBe('press-up');
    });

    it('offers to make an exercise when none has the name typed', async () => {
        await type('  Sled   drag');

        expect(optionText().at(-1)).toBe('Make "Sled drag", A new exercise of your own');
    });

    it("doesn't offer to make one that's already there", async () => {
        await type('push-ups');

        expect(optionText().some((text) => text.includes('Make'))).toBe(false);
    });

    it('marks your own exercises', async () => {
        TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');

        await type('sled');

        expect(optionText()[0]).toBe('Sled push, Your own');
    });

    it('moves through the list with the arrow keys, and Enter picks one', async () => {
        await type('push-up');

        await press('ArrowDown');
        expect(box().getAttribute('aria-activedescendant')).toBe(options()[0].id);
        expect(options()[0].getAttribute('aria-selected')).toBe('true');
        await press('ArrowDown');
        await press('ArrowUp');
        const enter = await press('Enter');

        // Picked rather than submitting the form
        expect(enter.defaultPrevented).toBe(true);
        expect(host.name()).toBe('Push-up');
        expect(host.exerciseId()).toBe('builtin:push-up');
        expect(box().getAttribute('aria-expanded')).toBe('false');
    });

    it('wraps around from the top of the list to the bottom', async () => {
        await type('push-up');
        await press('ArrowDown');

        await press('ArrowUp');

        expect(box().getAttribute('aria-activedescendant')).toBe(options().at(-1)!.id);
    });

    it('lets Enter through to the form when no option is chosen', async () => {
        await type('push-up');

        expect((await press('Enter')).defaultPrevented).toBe(false);
    });

    it('picks an exercise by clicking it', async () => {
        await type('dead');

        options()
            .find((option) => option.textContent!.trim() === 'Deadlift')!
            .click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(host.name()).toBe('Deadlift');
        expect(host.exerciseId()).toBe('builtin:deadlift');
    });

    it('keeps the name tidied when making a new exercise, with no link yet', async () => {
        await type('Sled   drag ');

        options().at(-1)!.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(host.name()).toBe('Sled drag');
        expect(host.exerciseId()).toBe('');
    });

    it('drops the link when the name is typed over', async () => {
        host.name.set('Push-up');
        host.exerciseId.set('builtin:push-up');
        fixture.detectChanges();
        await fixture.whenStable();

        await type('Push-up on knees');

        expect(host.exerciseId()).toBe('');
    });

    it('closes on Escape, without Escape reaching anything around it', async () => {
        await type('squat');
        const outside = vi.fn();
        fixture.nativeElement.addEventListener('keydown', outside);

        await press('Escape');

        expect(list().hidden).toBe(true);
        expect(outside).not.toHaveBeenCalled();
        // Arrow down opens it again
        await press('ArrowDown');
        expect(list().hidden).toBe(false);
    });

    it('closes when focus leaves the box', async () => {
        await type('squat');

        box().dispatchEvent(new Event('blur'));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(list().hidden).toBe(true);
    });
});
