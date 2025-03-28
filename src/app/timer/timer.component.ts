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

    ngOnInit() {
        this.minutes = this.timer?.timerMinutes
        this.seconds = this.timer?.timerSeconds
        this.restMinutes = this.timer?.restMinutes
        this.restSeconds = this.timer?.restSeconds
        this.repeats = this.timer?.repeats

        setInterval(() => {

            if (this.seconds! > 0) {
                this.seconds!--
            } if (this.seconds === 0) {
                this.minutes!--
                this.seconds = 59
            } 
        }, 1000)
    }
}
