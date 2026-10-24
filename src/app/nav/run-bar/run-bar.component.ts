import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { formatTime } from '../../shared/format-time';
import { injectCurrentUrl, isOnPage } from '../current-url';

/**
 * The workout in progress, in a bar above the tabs on every page but its own, like a music
 * app's mini player: its name, the step and its time, and Pause or Resume. The rest of the
 * bar opens the workout. Once it's finished, the bar says so and opens its summary.
 */
@Component({
    selector: 'app-run-bar',
    imports: [MatIconModule, RouterLink],
    templateUrl: './run-bar.component.html',
    styleUrl: './run-bar.component.scss',
})
export class RunBarComponent {
    private readonly run = inject(ActiveRunService);
    private readonly url = injectCurrentUrl();

    protected readonly shown = computed(
        () => !!this.run.workout() && !isOnPage(this.url(), '/workout')
    );
    protected readonly isPaused = this.run.isPaused;
    /** Over, and waiting on its summary. */
    protected readonly finished = this.run.summaryOpen;

    protected readonly title = computed(() => this.run.workout()?.title.trim() || 'Workout');
    /** Colours the dot: the step's kind, or paused, or finished. */
    protected readonly phase = computed(() => {
        if (this.finished()) {
            return 'finished';
        }
        return this.isPaused() ? 'paused' : (this.run.state()?.phase ?? 'work');
    });
    /** e.g. "Squats · 00:23", "Push-ups · 20 reps", "Paused · Rest · 00:12". */
    protected readonly status = computed(() => {
        if (this.finished()) {
            return this.run.isComplete() ? 'Finished: see how it went' : 'See how it went';
        }
        const state = this.run.state();
        const step = state?.step;
        if (!state || !step) {
            return '';
        }
        const name = step.name || { work: 'Timed', rest: 'Rest', reps: 'Reps' }[step.kind];
        const amount =
            step.kind === 'reps'
                ? `${step.reps} reps`
                : formatTime(Math.floor(state.remainingSeconds / 60), state.remainingSeconds % 60);
        return `${this.isPaused() ? 'Paused · ' : ''}${name} · ${amount}`;
    });

    protected togglePause() {
        this.run.togglePause();
    }
}
