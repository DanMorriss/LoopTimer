import { Component, OnInit } from '@angular/core';
import { Timer } from '../models/timer';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [FormsModule, MatButton]
})
export class TimerLibraryComponent implements OnInit {
    
    newTimerTitle: string = '';
    newTimerMinutes: number = 0;
    newTimerSeconds: number = 0;
    newRestMinutes: number = 0;
    newRestSeconds: number = 0;
    newRepeats: number = 0;
    
    timers: Timer[] = [];

    ngOnInit(): void {
        let savedTimers = localStorage.getItem('timers')
        
        this.timers = savedTimers ? JSON.parse(savedTimers) : []
    }

    addTimer() {
            let newTimer: Timer = {
                id: Date.now(),
                title: this.newTimerTitle,
                timerMinutes: this.newTimerMinutes,
                timerSeconds: this.newTimerSeconds,
                restMinutes: this.newRestMinutes,
                restSeconds: this.newRestSeconds,
                repeats: this.newRepeats
            }

            this.timers.push(newTimer);

            this.newTimerTitle = '';
            this.newTimerMinutes = 0;
            this.newTimerSeconds = 0;
            this.newRestMinutes = 0;
            this.newRestSeconds = 0;
            this.newRepeats = 0;

            localStorage.setItem('timers', JSON.stringify(this.timers))
        }
        
        deleteTimer(timerId: number) {
            const index = this.timers.findIndex(timer => timer.id === timerId);
            if (index !== -1) {
                this.timers.splice(index, 1);
            }

            localStorage.setItem('timers', JSON.stringify(this.timers))
    }
}
