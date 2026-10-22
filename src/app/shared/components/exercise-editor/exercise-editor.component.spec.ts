import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISES } from '../../../models/built-in-exercises';
import { Exercise } from '../../../models/exercise';
import { reps } from '../../testing/make-workout';
import { ExerciseStore } from '../../state/exercise-store.service';
import { WorkoutStore } from '../../state/workout-store.service';
import { ExerciseEditorComponent } from './exercise-editor.component';

@Component({
    imports: [ExerciseEditorComponent],
    template: `
        <app-exercise-editor
            [exercise]="exercise()"
            (closed)="closed = closed + 1"
            (saved)="saved.push($event)"
        />
    `,
})
class HostComponent {
    readonly exercise = signal<Exercise>(BUILT_IN_EXERCISES[0]);
    closed = 0;
    saved: Exercise[] = [];
}

describe('ExerciseEditorComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let exercises: ExerciseStore;

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        exercises = TestBed.inject(ExerciseStore);
    });
    afterEach(() => localStorage.clear());

    async function open(exercise: Exercise) {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        host.exercise.set(exercise);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    function el<T extends HTMLElement>(selector: string): T {
        return fixture.nativeElement.querySelector(selector) as T;
    }

    const button = (name: string, nth = 0) =>
        (
            Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
        ).filter((b) => b.textContent!.replace(/check/, '').trim() === name)[nth];

    async function fill(selector: string, value: string) {
        const field = el<HTMLInputElement | HTMLTextAreaElement>(selector);
        field.value = value;
        field.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function save() {
        el<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true }));
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('is a modal dialog named after what it edits', async () => {
        await open(exercises.addOwn('Sled push', 'reps'));

        const dialog = el('[role="dialog"]');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(el(`#${dialog.getAttribute('aria-labelledby')}`).textContent!.trim()).toBe(
            'Edit exercise'
        );
    });

    describe('a built-in exercise', () => {
        const plank = BUILT_IN_EXERCISES.find((e) => e.id === 'builtin:plank')!;

        it('shows its description, and only the note can be changed', async () => {
            await open(plank);

            expect(el('#exercise-editor-title').textContent!.trim()).toBe('Plank');
            expect(el('.editor__description').textContent!.trim()).toBe(plank.description);
            expect(el('#exercise-editor-name')).toBeNull();
            expect(el('app-body-map')).toBeNull();
            expect(el('#exercise-editor-note')).not.toBeNull();
        });

        it('saves your note on it', async () => {
            await open(plank);

            await fill('#exercise-editor-note', '  Squeeze your glutes ');
            await save();

            expect(exercises.noteFor('builtin:plank')).toBe('Squeeze your glutes');
            expect(host.saved).toEqual([plank]);
        });

        it('starts from your note, and removes it when emptied', async () => {
            exercises.setNote('builtin:plank', 'Old note');
            await open(plank);
            expect(el<HTMLTextAreaElement>('#exercise-editor-note').value).toBe('Old note');

            await fill('#exercise-editor-note', '');
            await save();

            expect(exercises.noteFor('builtin:plank')).toBeUndefined();
        });
    });

    describe('your own exercise', () => {
        it('saves its new name and details, and renames the steps that are it', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            const workouts = TestBed.inject(WorkoutStore);
            workouts.addWorkout({ title: '', steps: [reps(10, 'Sled push')], repeats: 1 });
            await open(mine);

            await fill('#exercise-editor-name', 'Sled drag');
            el<HTMLInputElement>('input[type="radio"][value="timed"]').click();
            await fill('#exercise-editor-description', 'Pulled backwards.');
            button('Machine').click();
            button('Quads').click();
            button('Glutes', 1).click();
            fixture.detectChanges();
            await fixture.whenStable();
            await save();

            const saved = exercises.byId(mine.id);
            expect(saved).toEqual(
                expect.objectContaining({
                    name: 'Sled drag',
                    measuredBy: 'timed',
                    description: 'Pulled backwards.',
                    equipment: ['machine'],
                    mainMuscles: ['quads'],
                    supportingMuscles: ['glutes'],
                })
            );
            expect(host.saved).toEqual([saved]);
            expect(workouts.workouts()[0].steps[0].name).toBe('Sled drag');
        });

        it('marks the muscles picked, main or supporting but not both, and shades them', async () => {
            await open(exercises.addOwn('Sled push', 'reps'));

            button('Quads').click();
            fixture.detectChanges();
            await fixture.whenStable();
            expect(button('Quads').getAttribute('aria-pressed')).toBe('true');
            expect(el('.body-map__label--main').textContent!.trim()).toBe('Quads');

            // Supporting instead takes it out of main
            button('Quads', 1).click();
            fixture.detectChanges();
            await fixture.whenStable();
            expect(button('Quads').getAttribute('aria-pressed')).toBe('false');
            expect(button('Quads', 1).getAttribute('aria-pressed')).toBe('true');
            expect(el('.body-map__label--supporting').textContent!.trim()).toBe('Quads');
        });

        it("won't save a name another exercise has, and says so", async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(mine);

            await fill('#exercise-editor-name', 'bench press');
            await save();

            expect(el('#exercise-editor-name-error').textContent!.trim()).toBe(
                'There\'s already an exercise called "bench press"'
            );
            expect(el('#exercise-editor-name').getAttribute('aria-invalid')).toBe('true');
            expect(document.activeElement).toBe(el('#exercise-editor-name'));
            expect(exercises.byId(mine.id)?.name).toBe('Sled push');
            expect(host.saved).toEqual([]);
        });

        it('needs a name', async () => {
            await open(exercises.addOwn('Sled push', 'reps'));

            await fill('#exercise-editor-name', '   ');

            expect(el('#exercise-editor-name-error').textContent!.trim()).toBe('Give it a name');
        });
    });

    it('closes without saving on Cancel or Escape', async () => {
        await open(BUILT_IN_EXERCISES[0]);
        await fill('#exercise-editor-note', 'Not kept');

        button('Cancel').click();
        el('.editor-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(host.closed).toBe(2);
        expect(exercises.noteFor(BUILT_IN_EXERCISES[0].id)).toBeUndefined();
    });
});
