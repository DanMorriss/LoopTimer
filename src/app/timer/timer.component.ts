import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatTime } from '../shared/format-time';
import { TimerStore } from '../shared/state/timer-store.service';
import { timerStateAt } from './timer-state';

@Component({
    selector: 'app-timer',
    imports: [RouterLink],
    templateUrl: './timer.component.html',
    styleUrls: ['./timer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        // Browsers pause or slow timers in background tabs, so catch up as soon as the page is visible again
        '(document:visibilitychange)': 'syncClock()',
    },
})
export class TimerComponent implements OnDestroy {
    timerStore = inject(TimerStore);
    timer = this.timerStore.activeTimer;

    // Everything below is worked out from the clock rather than counted tick by tick,
    // so the timer stays correct even when ticks arrive late or not at all
    private readonly now = signal(Date.now());
    private readonly clockId = setInterval(() => this.syncClock(), 250);

    private readonly state = computed(() => {
        const timer = this.timer();
        const startedAt = this.timerStore.activeTimerStartedAt();
        return timer && startedAt !== null ? timerStateAt(timer, this.now() - startedAt) : null;
    });

    isTimerActive = computed(() => this.state()?.phase === 'work');
    isRestActive = computed(() => this.state()?.phase === 'rest');
    isComplete = computed(() => this.state()?.phase === 'complete');
    repeats = computed(() => this.state()?.roundsLeft ?? 0);

    private readonly remaining = computed(() => this.state()?.remainingSeconds ?? 0);
    private readonly time = computed(() => formatTime(Math.floor(this.remaining() / 60), this.remaining() % 60));
    workTime = computed(() => (this.isTimerActive() ? this.time() : ''));
    restTime = computed(() => (this.isRestActive() ? this.time() : ''));

    repeatArray = computed(() => Array.from({ length: this.repeats() }, (_, i) => i));

    progress = computed(() => {
        const state = this.state();
        if (!state) {
            return 0;
        }
        if (state.phase === 'complete') {
            return 1;
        }
        return 1 - state.remainingSeconds / state.phaseSeconds;
    });

    syncClock() {
        this.now.set(Date.now());
    }

    ngOnDestroy() {
        clearInterval(this.clockId);
    }
}
