import { Component, computed, inject, input } from '@angular/core';
import { MUSCLE_LABELS, MuscleGroup } from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { BODY_FIGURES } from './body-shapes';

/** How a shape is shaded: by how hard its muscle works, or not at all (head, hands, feet). */
type Shade = 'main' | 'supporting' | 'idle' | 'other';

let nextId = 0;

/**
 * Which muscles an exercise works (EXR-8): a front and back figure, shaded bright for the
 * main muscles and darker for supporting ones, with the muscles listed underneath. The list
 * is the figure's key and says the same in words, so screen readers get that, not the drawing.
 * The figure is male or female, as chosen in settings (SET-5).
 */
@Component({
    selector: 'app-body-map',
    templateUrl: './body-map.component.html',
    styleUrl: './body-map.component.scss',
})
export class BodyMapComponent {
    /** The muscles doing most of the work. */
    readonly main = input<readonly MuscleGroup[]>([]);
    /** Muscles that help or hold steady. A muscle in both counts as main. */
    readonly supporting = input<readonly MuscleGroup[]>([]);

    private readonly settings = inject(SettingsStore);
    protected readonly id = `body-map-${nextId++}`;

    protected readonly sides = computed(() => {
        const figure = BODY_FIGURES[this.settings.bodyFigure()];
        const main = new Set(this.main());
        const supporting = new Set(this.supporting());
        const shadeOf = (muscle: MuscleGroup | null): Shade => {
            if (muscle === null) {
                return 'other';
            }
            if (main.has(muscle)) {
                return 'main';
            }
            return supporting.has(muscle) ? 'supporting' : 'idle';
        };
        return (['front', 'back'] as const).map((side) => ({
            name: side === 'front' ? 'Front' : 'Back',
            viewBox: figure[side].viewBox,
            outline: figure[side].outline,
            paths: figure[side].shapes.flatMap((shape) =>
                shape.paths.map((d) => ({ d, shade: shadeOf(shape.muscle) }))
            ),
        }));
    });

    protected readonly mainLabels = computed(() => labels(this.main()));
    protected readonly supportingLabels = computed(() =>
        labels(this.supporting().filter((muscle) => !this.main().includes(muscle)))
    );
}

function labels(muscles: readonly MuscleGroup[]): string[] {
    return [...new Set(muscles)].map((muscle) => MUSCLE_LABELS[muscle]);
}
