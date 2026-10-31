import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    linkedSignal,
    signal,
} from '@angular/core';
import { Exercise } from '../../../models/exercise';
import { poseAt } from '../../../models/exercise-motion';
import { injectPrefersReducedMotion } from '../../reduced-motion';
import { ExerciseStore } from '../../state/exercise-store.service';
import { ExerciseFigureComponent } from './exercise-figure.component';

/**
 * An exercise's animated demo (EXR-13): a figure doing the exercise, in a loop, with a button
 * to pause it. With reduced motion asked for, its key positions stand side by side instead.
 * Nothing for an exercise without a motion (your own, and built-in ones not done yet).
 */
@Component({
    selector: 'app-exercise-demo',
    imports: [ExerciseFigureComponent],
    templateUrl: './exercise-demo.component.html',
    styleUrl: './exercise-demo.component.scss',
})
export class ExerciseDemoComponent {
    readonly exercise = input.required<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    protected readonly motion = computed(() => this.exercises.motionOf(this.exercise()));
    protected readonly reduced = injectPrefersReducedMotion();
    /** Playing, unless paused with the button. */
    protected readonly playing = signal(true);
    /** Whether any of it is on screen; it stops when scrolled away, to save battery. */
    private readonly onScreen = signal(false);
    /** How far into its loop it is, in milliseconds: from the start for each exercise. */
    private readonly elapsed = linkedSignal({ source: this.motion, computation: () => 0 });
    protected readonly pose = computed(() => {
        const motion = this.motion();
        return motion && poseAt(motion, this.elapsed());
    });

    constructor() {
        void this.exercises.loadMotion();

        effect((onCleanup) => {
            if (!this.motion() || !this.playing() || this.reduced() || !this.onScreen()) {
                return;
            }
            let last: number | null = null;
            const tick = (now: number) => {
                // A frame late by more than a few (e.g. back in a tab) carries on from where it
                // was, rather than jumping ahead
                const step = last === null ? 0 : Math.min(now - last, 100);
                last = now;
                this.elapsed.update((elapsed) => elapsed + step);
                frame = requestAnimationFrame(tick);
            };
            let frame = requestAnimationFrame(tick);
            onCleanup(() => cancelAnimationFrame(frame));
        });

        const host: HTMLElement = inject(ElementRef).nativeElement;
        const destroyRef = inject(DestroyRef);
        afterNextRender(() => {
            const observer = new IntersectionObserver(([entry]) =>
                this.onScreen.set(entry.isIntersecting)
            );
            observer.observe(host);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    protected toggle(): void {
        this.playing.update((playing) => !playing);
    }
}
