import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Timer } from '../models/timer';
import { formatTime } from '../shared/format-time';
import { TimerStore } from '../shared/state/timer-store.service';

@Component({
    selector: 'app-timer',
    imports: [RouterLink],
    templateUrl: './timer.component.html',
    styleUrls: ['./timer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerComponent implements OnDestroy {
    timer = signal<Timer | null>(null);
    timerStore = inject(TimerStore);

    constructor() {
        effect(() => {
            const timer = this.timerStore.activeTimer();

            // Only re-run when the active timer changes, not when the signals set below do
            untracked(() => {
                if (timer) {
                    clearInterval(this.timerIntervalId);
                    clearInterval(this.restIntervalId);

                    this.timer.set(timer);
                    this.initializeTimer();
                    this.startTimer();
                }
            });
        })
    }

    minutes = signal(0);
    seconds = signal(0);
    restMinutes = signal(0);
    restSeconds = signal(0);
    repeats = signal(0);

    workTime = computed(() => formatTime(this.minutes(), this.seconds()));
    restTime = computed(() => formatTime(this.restMinutes(), this.restSeconds()));

    get repeatArray(): number[] {
        return Array.from({ length: this.repeats() }, (_, i) => i);
    }
    
    isTimerActive = signal(false);
    isRestActive = signal(false);
    isComplete = signal(false);

    progress = computed(() => {
        if (this.isComplete()) {
            return 1;
        }

        if (this.isTimerActive()) {
            const total = (this.timer()?.timerMinutes ?? 0) * 60 + (this.timer()?.timerSeconds ?? 0);
            const remaining = (this.minutes() ?? 0) * 60 + (this.seconds() ?? 0);
            return total > 0 ? 1 - remaining / total : 0;
        }

        if (this.isRestActive()) {
            const total = (this.timer()?.restMinutes ?? 0) * 60 + (this.timer()?.restSeconds ?? 0);
            const remaining = (this.restMinutes() ?? 0) * 60 + (this.restSeconds() ?? 0);
            return total > 0 ? 1 - remaining / total : 0;
        }

        return 0;
    });

    private timerIntervalId: ReturnType<typeof setInterval> | undefined;
    private restIntervalId: ReturnType<typeof setInterval> | undefined;

    initializeTimer() {
        const timer = this.timer();
        if (!timer) return;

        this.minutes.set(timer.timerMinutes);
        this.seconds.set(timer.timerSeconds);
        this.restMinutes.set(timer.restMinutes);
        this.restSeconds.set(timer.restSeconds);
        this.repeats.set(timer.repeats);
        this.isComplete.set(false);
        this.isTimerActive.set(false);
        this.isRestActive.set(false);
    }

    resetTimer() {
        const timer = this.timer();
        if (!timer) {
            return;
        }
        this.minutes.set(timer.timerMinutes);
        this.seconds.set(timer.timerSeconds);
        this.restMinutes.set(timer.restMinutes);
        this.restSeconds.set(timer.restSeconds);
    }

    startTimer () {
        clearInterval(this.timerIntervalId);
        this.isTimerActive.set(true);

        this.timerIntervalId = setInterval(() => {
            if (this.seconds() > 0) {
                this.seconds.update(seconds => seconds - 1);
            } else if (this.minutes() > 0) {
                this.minutes.update(minutes => minutes - 1)
                this.seconds.set(59);
            }

            // Move on as soon as time runs out, rather than on the following tick
            if (this.minutes() === 0 && this.seconds() === 0) {
                clearInterval(this.timerIntervalId)
                this.isTimerActive.set(false);
                this.startRest()
            }
        }, 1000)
    }

    startRest () {
        clearInterval(this.restIntervalId);
        if (this.repeats() === 1) {
            this.repeats.update(repeats => repeats - 1);
            this.isComplete.set(true);
            return;
        }

        const totalRestTime = this.restMinutes() * 60 + this.restSeconds();
        if (totalRestTime === 0) {
            this.repeats.update(repeats => repeats - 1);
            this.resetTimer();
            this.startTimer();
            return;
        }

        this.isRestActive.set(true);

        this.restIntervalId = setInterval(() => {
            if (this.restSeconds() > 0) {
                this.restSeconds.update(restSeconds => restSeconds - 1);
            } else if (this.restMinutes() > 0) {
                this.restMinutes.update(restMinutes => restMinutes - 1)
                this.restSeconds.set(59);
            }

            // Move on as soon as time runs out, rather than on the following tick
            if (this.restMinutes() === 0 && this.restSeconds() === 0) {
                clearInterval(this.restIntervalId)
                this.isRestActive.set(false);

                if (this.repeats() > 1) {
                    this.repeats.update(repeats => repeats - 1);

                    this.resetTimer()
                    this.startTimer()
                }
            }
        }, 1000)
    }

    ngOnDestroy() {
        clearInterval(this.timerIntervalId)
        clearInterval(this.restIntervalId)
    }
}
