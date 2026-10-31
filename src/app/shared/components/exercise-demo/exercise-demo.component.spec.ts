import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISES } from '../../../models/built-in-exercises';
import { Exercise } from '../../../models/exercise';
import { ExerciseStore } from '../../state/exercise-store.service';
import { fakeReducedMotion } from '../../testing/fake-reduced-motion';
import { ExerciseDemoComponent } from './exercise-demo.component';

describe('ExerciseDemoComponent', () => {
    let fixture: ComponentFixture<ExerciseDemoComponent>;

    const builtIn = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id)!;
    const el = (): HTMLElement => fixture.nativeElement;
    const toggle = () => el().querySelector<HTMLButtonElement>('.demo__toggle');
    /** Where the figure's parts are placed now, to tell whether it moved. */
    const drawing = () =>
        Array.from(el().querySelectorAll('g[transform]'))
            .map((part) => part.getAttribute('transform'))
            .join(' ');
    const frames = (count: number) =>
        new Promise<void>((resolve) => {
            const next = (left: number) =>
                left === 0 ? resolve() : requestAnimationFrame(() => next(left - 1));
            next(count);
        });

    async function create(exercise: Exercise) {
        await TestBed.inject(ExerciseStore).loadMotion();
        fixture = TestBed.createComponent(ExerciseDemoComponent);
        fixture.componentRef.setInput('exercise', exercise);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    it('shows nothing for your own exercise, which has no demo', async () => {
        fakeReducedMotion(false);
        await create({
            ...builtIn('builtin:deadlift'),
            id: 'my-deadlift',
            description: '',
            steps: [],
            tips: [],
            updatedAt: 0,
        });

        expect(el().querySelector('app-exercise-figure')).toBeNull();
        expect(toggle()).toBeNull();
    });

    it("plays the exercise's figure, shading its main muscles, until paused", async () => {
        fakeReducedMotion(false);
        await create(builtIn('builtin:back-squat'));

        expect(el().querySelector('app-exercise-figure')?.getAttribute('aria-hidden')).toBe('true');
        // Its quads and glutes as main, and its hamstrings, adductors and lower back as supporting
        expect(el().querySelectorAll('.figure__muscle--main').length).toBeGreaterThan(0);
        expect(el().querySelectorAll('.figure__muscle--supporting').length).toBeGreaterThan(0);
        expect(toggle()?.textContent?.trim()).toBe('Pause');
        expect(toggle()?.getAttribute('aria-label')).toBe('Pause the demo');

        const before = drawing();
        await frames(40);
        fixture.detectChanges();
        expect(drawing()).not.toBe(before);

        toggle()!.click();
        fixture.detectChanges();
        expect(toggle()?.textContent?.trim()).toBe('Play');
        expect(toggle()?.getAttribute('aria-label')).toBe('Play the demo');
        const paused = drawing();
        await frames(20);
        fixture.detectChanges();
        expect(drawing()).toBe(paused);
    });

    it('shows its key positions still, labelled, with reduced motion', async () => {
        fakeReducedMotion(true);
        await create(builtIn('builtin:push-up'));

        const labels = Array.from(el().querySelectorAll('.demo__label')).map((label) =>
            label.textContent?.trim()
        );
        expect(labels).toEqual(['Top', 'Bottom']);
        expect(el().querySelectorAll('app-exercise-figure')).toHaveLength(2);
        expect(el().querySelector('.demo__stills')?.getAttribute('aria-hidden')).toBe('true');
        expect(toggle()).toBeNull();
    });

    it('shows a hold, such as a plank, still, with nothing to pause', async () => {
        fakeReducedMotion(false);
        await create(builtIn('builtin:plank'));

        const labels = Array.from(el().querySelectorAll('.demo__label')).map((label) =>
            label.textContent?.trim()
        );
        expect(labels).toEqual(['Hold']);
        expect(toggle()).toBeNull();
    });

    it('starts playing when reduced motion is turned off', async () => {
        const reduced = fakeReducedMotion(true);
        await create(builtIn('builtin:lateral-raise'));

        reduced.set(false);
        fixture.detectChanges();

        expect(el().querySelector('.demo__stills')).toBeNull();
        expect(toggle()).not.toBeNull();
    });
});
