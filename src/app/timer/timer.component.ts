import { Component, effect, OnDestroy } from '@angular/core';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';

@Component({
    selector: 'app-timer',
    imports: [],
    templateUrl: './timer.component.html',
    styleUrl: './timer.component.scss',
    standalone: true
})
export class TimerComponent implements OnDestroy {
    timer: Timer | null = null;

    constructor(public timerStore: TimerStore) {
        effect(() => {
            const timer = this.timerStore.activeTimer();
             
            if (timer) {
                this.timer = timer;
                this.initializeTimer();
                this.startTimer();
            }
        })

    }

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

    initializeTimer() {
        const timer = this.timer;
        if (!timer) return;

        this.minutes = timer.timerMinutes;
        this.seconds = timer.timerSeconds;
        this.restMinutes = timer.restMinutes;
        this.restSeconds = timer.restSeconds;
        this.repeats = timer.repeats;
        this.isComplete = false;
    }

    resetTimer() {
        this.minutes = this.timer?.timerMinutes;
        this.seconds = this.timer?.timerSeconds;
        this.restMinutes = this.timer?.restMinutes;
        this.restSeconds = this.timer?.restSeconds;
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

                    this.resetTimer()
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
