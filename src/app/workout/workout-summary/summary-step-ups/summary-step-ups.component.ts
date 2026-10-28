import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { describeSets } from '../../../history/history-format';
import { progressionSuggestions } from '../../../models/progress';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { ownExerciseName } from '../summary-sets/summary-sets.component';

/**
 * What to step up next time on the workout summary (PRG-10), e.g. "Squats: try 62.5 kg, up
 * from 60 kg", for each rep step where every set got its reps: a weight step up (as PRG-5
 * offers mid-workout), or one more rep with no weight. Follows the sets as they're corrected.
 */
@Component({
    selector: 'app-summary-step-ups',
    imports: [MatIconModule],
    template: `
        @if (lines().length) {
            <section class="step-ups" aria-labelledby="summary-step-ups">
                <h3 id="summary-step-ups">Next time</h3>
                <p class="step-ups__hint">Every set got its reps, so step up:</p>
                <ul class="step-ups__list">
                    @for (line of lines(); track line) {
                        <li>
                            <mat-icon aria-hidden="true">arrow_upward</mat-icon>
                            {{ line }}
                        </li>
                    }
                </ul>
            </section>
        }
    `,
    styleUrl: './summary-step-ups.component.scss',
})
export class SummaryStepUpsComponent {
    private readonly run = inject(ActiveRunService);
    private readonly weightUnit = inject(SettingsStore).weightUnit;
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));

    protected readonly lines = computed(() => {
        const sets = this.run.sets();
        const unit = this.weightUnit();
        const lines = progressionSuggestions(sets, this.run.workout()?.steps ?? [], unit).map(
            ({ step, kind, from, to }) => {
                // Named as its line in Sets is
                const [line] = describeSets(
                    sets.filter((set) => set.step === step),
                    unit,
                    this.exerciseName
                );
                return kind === 'weight'
                    ? `${line.name}: try ${to} ${unit}, up from ${from} ${unit}`
                    : `${line.name}: try ${to} reps, up from ${from}`;
            }
        );
        // The same exercise in two steps, both stepping up alike, says so once
        return [...new Set(lines)];
    });
}
