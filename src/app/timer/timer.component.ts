import { Component, input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';

@Component({
    selector: 'app-timer',
    imports: [],
    templateUrl: './timer.component.html',
    styleUrl: './timer.component.scss',
    standalone: true
})
export class TimerComponent implements OnChanges, OnDestroy {
    readonly timer = input<Timer | null>(null);

    constructor(public timerStore: TimerStore) {}


    minutes: number | undefined = undefined;
    seconds: number | undefined = undefined;
    restMinutes: number | undefined = undefined;
    restSeconds: number | undefined = undefined;
    repeats: number | undefined = undefined;
    
    isTimerActive: boolean = false;
    isRestActive: boolean = false;
    isComplete: boolean = false;

    private timerIntervalId: any;
    private restIntervalId: any;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['timer'] && this.timer()) {
            this.initializeTimer();
            this.startTimer();
        }
    }

    initializeTimer() {
        const timer = this.timer();
        if (!timer) return;

        this.minutes = timer.timerMinutes;
        this.seconds = timer.timerSeconds;
        this.restMinutes = timer.restMinutes;
        this.restSeconds = timer.restSeconds;
        this.repeats = timer.repeats;
        this.isComplete = false;
    }

    startTimer () {
        this.isTimerActive = true;

        this.timerIntervalId = setInterval(() => {
            if (this.minutes === 0 && this.seconds === 0) {
                clearInterval(this.timerIntervalId)
                this.isTimerActive = false;
                this.startRest()
                return
            } 
            
            if (this.seconds! > 0) {
                this.seconds!--;
            } else if (this.minutes! > 0) {
                this.minutes!--
                this.seconds = 59;
            } 
        }, 1000)
    }

    startRest () {
        this.isRestActive = true;

        this.restIntervalId = setInterval(() => {
            if (this.restMinutes === 0 && this.restSeconds === 0) {
                clearInterval(this.restIntervalId)
                this.isRestActive = false;

                if (this.repeats! > 0) {
                    this.repeats!--;
                    this.initializeTimer();
                    this.startTimer()
                } else {
                    this.isComplete = true;
                }
                return;

            } 
            
            if (this.restSeconds! > 0) {
                this.restSeconds!--;
            } else if (this.restMinutes! > 0) {
                this.restMinutes!--
                this.restSeconds = 59;
            } 
        }, 1000)
    }

    ngOnDestroy() {
        clearInterval(this.timerIntervalId)
        clearInterval(this.restIntervalId)
    }
}
