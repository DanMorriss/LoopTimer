import { Component, computed, input } from '@angular/core';
import { MuscleGroup } from '../../../models/exercise';
import {
    drawFigure,
    ExerciseMotion,
    motionBox,
    Point,
    Pose,
} from '../../../models/exercise-motion';

/**
 * The figure of an exercise's demo in one pose (EXR-13), on the floor, with the parts holding
 * the worked muscles shaded as the body map's main ones. Every pose of a motion is drawn in
 * the same box, so the figure doesn't jump about as it moves. Hidden from screen readers:
 * the how-to steps say the same in words.
 */
@Component({
    selector: 'app-exercise-figure',
    templateUrl: './exercise-figure.component.html',
    styleUrl: './exercise-figure.component.scss',
    host: { 'aria-hidden': 'true' },
})
export class ExerciseFigureComponent {
    readonly motion = input.required<ExerciseMotion>();
    readonly pose = input.required<Pose>();
    /** The muscles to shade. */
    readonly worked = input<readonly MuscleGroup[]>([]);

    protected readonly box = computed(() => motionBox(this.motion()));
    protected readonly viewBox = computed(() => {
        const box = this.box();
        return `${box.x} ${box.y} ${box.width} ${box.height}`;
    });
    protected readonly layers = computed(() => {
        const layers = drawFigure(this.pose(), this.motion(), this.worked());
        return [
            { name: 'far', shapes: layers.far },
            { name: 'body', shapes: layers.body },
            { name: 'near', shapes: layers.near },
        ];
    });
    /**
     * Each layer is drawn twice: first every shape a little bigger in the outline colour, then
     * every shape in its own, so the parts of a layer join into one outlined silhouette.
     */
    protected readonly passes = ['outline', 'fill'] as const;
    /** How much bigger the outline pass draws each shape. */
    protected readonly outline = 3;

    protected points(points: readonly Point[]): string {
        return points.map((point) => point.join(',')).join(' ');
    }
}
