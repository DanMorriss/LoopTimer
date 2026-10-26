import { Component, computed, input } from '@angular/core';
import { MUSCLE_LABELS } from '../../models/exercise';
import { MuscleBalance, WEEKLY_SETS_HIGH, WEEKLY_SETS_LOW } from '../../models/muscle-balance';

const STATUS_TEXT = {
    under: `under ${WEEKLY_SETS_LOW}`,
    'in-range': `within ${WEEKLY_SETS_LOW} to ${WEEKLY_SETS_HIGH}`,
    over: `over ${WEEKLY_SETS_HIGH}`,
};

/**
 * A bar per muscle group for this week's sets, against the 10–20 a week aimed for, shaded as a
 * band on each track: short of it is under, past it is over.
 */
@Component({
    selector: 'app-muscle-bars',
    templateUrl: './muscle-bars.component.html',
    styleUrl: './muscle-bars.component.scss',
})
export class MuscleBarsComponent {
    readonly balance = input.required<readonly MuscleBalance[]>();

    protected readonly low = WEEKLY_SETS_LOW;
    protected readonly high = WEEKLY_SETS_HIGH;

    /** The sets at the right end of the tracks: room past the band, or the most done. */
    private readonly scale = computed(() =>
        Math.max(WEEKLY_SETS_HIGH * 1.25, ...this.balance().map(({ sets }) => sets))
    );

    protected readonly band = computed(() => ({
        left: (WEEKLY_SETS_LOW / this.scale()) * 100,
        width: ((WEEKLY_SETS_HIGH - WEEKLY_SETS_LOW) / this.scale()) * 100,
    }));

    protected readonly rows = computed(() =>
        this.balance().map(({ muscle, sets, status }) => {
            const count = Number.isInteger(sets) ? `${sets}` : sets.toFixed(1);
            return {
                muscle,
                label: MUSCLE_LABELS[muscle],
                count,
                status,
                width: (sets / this.scale()) * 100,
                description: `${count} ${sets === 1 ? 'set' : 'sets'}, ${STATUS_TEXT[status]}`,
            };
        })
    );
}
