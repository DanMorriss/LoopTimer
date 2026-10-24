import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { repStepsPerRound, roundSeconds, runsUntilStopped, Workout } from '../../models/workout';
import { formatTime } from '../../shared/format-time';

/**
 * One workout in the library list. The library decides which card is selected and
 * which card's options are open (only one of each at a time); the card shows that
 * state and reports what the user does.
 */
@Component({
    selector: 'li[appWorkoutCard]',
    imports: [MatIconModule],
    templateUrl: './workout-card.component.html',
    styleUrl: './workout-card.component.scss',
    host: {
        class: 'workout-card',
        '[class.workout-card--active]': 'active()',
        '[class.workout-card--menu-open]': 'menuOpen()',
        '(click)': 'onCardClick($event)',
    },
})
export class WorkoutCardComponent {
    readonly workout = input.required<Workout>();
    /** Whether this card is the selected one. */
    readonly active = input(false);
    /** Whether this card's options are open. */
    readonly menuOpen = input(false);

    readonly selected = output<void>();
    readonly started = output<void>();
    readonly menuToggled = output<void>();
    readonly menuClosed = output<void>();
    readonly editRequested = output<void>();
    readonly deleteRequested = output<void>();

    protected readonly title = computed(() => this.workout().title.trim());
    /** Used in accessible names, e.g. "Start Sprints" or "Start workout". */
    protected readonly name = computed(() => this.title() || 'workout');
    /**
     * A one-line summary: its exercises, the steps' names in order, e.g. "Squats, Bench press
     * + 1 more". With no step named, "01:05 - 00:20" for one work step (and maybe one rest),
     * as workouts have always shown, or "5 steps · 02:15" with the length of a round. Rep steps
     * take as long as they take, so a round with some is "4 steps · 01:30 + reps", or
     * "2 steps · reps" with no timed steps at all.
     */
    protected readonly summary = computed(() => {
        const steps = this.workout().steps;
        const namedExercises: string[] = [];
        for (const step of steps) {
            if (step.kind === 'rest') continue;
            const name = step.name.trim();
            if (name && !namedExercises.includes(name)) {
                namedExercises.push(name);
            }
        }
        if (namedExercises.length > 0) {
            const preview = namedExercises.slice(0, 2);
            const remainder = namedExercises.length - preview.length;
            const text =
                remainder > 0 ? `${preview.join(', ')} + ${remainder} more` : preview.join(', ');
            return { text, spoken: text };
        }

        const [first, second] = steps;
        if (steps.length <= 2 && first.kind === 'work' && (!second || second.kind === 'rest')) {
            const work = clock(first.seconds);
            const rest = clock(second?.kind === 'rest' ? second.seconds : 0);
            return { text: `${work} - ${rest}`, spoken: `Timed ${work}, rest ${rest}` };
        }
        const count = steps.length === 1 ? '1 step' : `${steps.length} steps`;
        const seconds = roundSeconds(this.workout());
        const round = clock(seconds);
        if (repStepsPerRound(this.workout()) === 0) {
            return { text: `${count} · ${round}`, spoken: `${count}, ${round} a round` };
        }
        return seconds > 0
            ? { text: `${count} · ${round} + reps`, spoken: `${count}, ${round} a round plus reps` }
            : { text: `${count} · reps`, spoken: `${count}, all reps` };
    });
    /** How long it goes on: "x 4" rounds, "x ∞" until stopped, or "in 20:00" for a time limit. */
    protected readonly rounds = computed(() => {
        const { repeats, timeLimitSeconds } = this.workout();
        if (timeLimitSeconds !== undefined) {
            return `in ${clock(timeLimitSeconds)}`;
        }
        return runsUntilStopped(this.workout()) ? 'x ∞' : `x ${repeats}`;
    });
    protected readonly spokenRounds = computed(() => {
        const { repeats, timeLimitSeconds } = this.workout();
        if (timeLimitSeconds !== undefined) {
            return `as many rounds as possible in ${clock(timeLimitSeconds)}`;
        }
        return runsUntilStopped(this.workout())
            ? 'repeated until stopped'
            : `repeated ${repeats} times`;
    });
    protected readonly showPlay = computed(() => this.active() && !this.menuOpen());

    protected onCardClick(event: Event) {
        // Clicks outside any card clear the selection, so don't let this one reach the library
        event.stopPropagation();
        this.selected.emit();
    }
}

/** e.g. 75 → "01:15" */
function clock(seconds: number): string {
    return formatTime(Math.floor(seconds / 60), seconds % 60);
}
