import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { repStepsPerRound, roundSeconds, runsUntilStopped, Timer } from '../../models/timer';
import { formatTime } from '../../shared/format-time';

/**
 * One timer in the library list. The library decides which card is selected and
 * which card's options are open (only one of each at a time); the card shows that
 * state and reports what the user does.
 */
@Component({
    selector: 'li[appTimerCard]',
    imports: [MatIconModule, MatTooltipModule],
    templateUrl: './timer-card.component.html',
    styleUrl: './timer-card.component.scss',
    host: {
        class: 'timer-card',
        '[class.timer-card--active]': 'active()',
        '[class.timer-card--menu-open]': 'menuOpen()',
        '(click)': 'onCardClick($event)',
    },
})
export class TimerCardComponent {
    readonly timer = input.required<Timer>();
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

    protected readonly title = computed(() => this.timer().title.trim());
    /** Used in accessible names, e.g. "Start Sprints" or "Start timer". */
    protected readonly name = computed(() => this.title() || 'timer');
    /**
     * A one-line summary: "01:05 - 00:20" for one work step (and maybe one rest), as
     * timers have always shown, or "5 steps · 02:15" with the length of a round. Rep steps
     * take as long as they take, so a round with some is "4 steps · 01:30 + reps", or
     * "2 steps · reps" with no timed steps at all.
     */
    protected readonly summary = computed(() => {
        const steps = this.timer().steps;
        const [first, second] = steps;
        if (steps.length <= 2 && first.kind === 'work' && (!second || second.kind === 'rest')) {
            const work = clock(first.seconds);
            const rest = clock(second?.kind === 'rest' ? second.seconds : 0);
            return { text: `${work} - ${rest}`, spoken: `Timer ${work}, rest ${rest}` };
        }
        const count = steps.length === 1 ? '1 step' : `${steps.length} steps`;
        const seconds = roundSeconds(this.timer());
        const round = clock(seconds);
        if (repStepsPerRound(this.timer()) === 0) {
            return { text: `${count} · ${round}`, spoken: `${count}, ${round} a round` };
        }
        return seconds > 0
            ? { text: `${count} · ${round} + reps`, spoken: `${count}, ${round} a round plus reps` }
            : { text: `${count} · reps`, spoken: `${count}, all reps` };
    });
    protected readonly rounds = computed(() =>
        runsUntilStopped(this.timer()) ? '∞' : String(this.timer().repeats)
    );
    protected readonly spokenRounds = computed(() =>
        runsUntilStopped(this.timer())
            ? 'repeated until stopped'
            : `repeated ${this.timer().repeats} times`
    );
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
