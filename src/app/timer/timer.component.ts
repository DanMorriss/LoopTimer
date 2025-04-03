import { Component, Input } from '@angular/core';
import { Timer } from '../models/timer';

@Component({
    selector: 'app-timer',
    imports: [],
    templateUrl: './timer.component.html',
    styleUrl: './timer.component.scss'
})
export class TimerComponent {
    @Input() timer: Timer | null = null;

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

    startTimer () {
        this.minutes = this.timer?.timerMinutes
        this.seconds = this.timer?.timerSeconds
        this.isTimerActive = true;

        this.timerIntervalId = setInterval(() => {
            if (this.minutes! === 0 && this.seconds! === 0) {
                clearInterval(this.timerIntervalId)
                this.isTimerActive = false;

                this.startRest()
                return
            } 
            
            if (this.seconds! > 0) {
                this.seconds!--
            } else if (this.minutes! > 0) {
                this.minutes!--
                this.seconds = 59
            } 
        }, 1000)
    }

    startRest () {
        this.restMinutes = this.timer?.restMinutes
        this.restSeconds = this.timer?.restSeconds
        this.isRestActive = true;

        this.restIntervalId = setInterval(() => {
            if (this.restMinutes! === 0 && this.restSeconds! === 0) {
                clearInterval(this.restIntervalId)
                this.isRestActive = false;

                if (this.repeats! > 0) {
                    this.repeats!--;

                    this.startTimer()
                    return
                } else if (this.repeats === 0) {
                    this.isComplete = true;
                    return
                }

            } 
            
            if (this.restSeconds! > 0) {
                this.restSeconds!--
            } else if (this.restMinutes! > 0) {
                this.restMinutes!--
                this.restSeconds = 59
            } 
        }, 1000)
    }

    ngOnInit() {
        this.minutes = this.timer?.timerMinutes
        this.seconds = this.timer?.timerSeconds
        this.restMinutes = this.timer?.restMinutes
        this.restSeconds = this.timer?.restSeconds
        this.repeats = this.timer?.repeats
        this.isTimerActive = true;

        this.startTimer()
    }

    ngOnDestroy() {
        clearInterval(this.timerIntervalId)
        clearInterval(this.restIntervalId)
    }
}
