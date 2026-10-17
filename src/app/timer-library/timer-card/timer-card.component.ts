import { Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Timer } from '../../models/timer';
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
    protected readonly workTime = computed(() => formatTime(this.timer().timerMinutes, this.timer().timerSeconds));
    protected readonly restTime = computed(() => formatTime(this.timer().restMinutes, this.timer().restSeconds));
    protected readonly showPlay = computed(() => this.active() && !this.menuOpen());

    protected onCardClick(event: Event) {
        // Clicks outside any card clear the selection, so don't let this one reach the library
        event.stopPropagation();
        this.selected.emit();
    }
}
