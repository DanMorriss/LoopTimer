import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Timer } from '../models/timer';
import { TimerLibraryComponent } from "../timer-library/timer-library.component";
import { TimerComponent } from '../timer/timer.component';


@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    imports: [
        TimerLibraryComponent, 
        TimerComponent,
        FormsModule, 
        MatButtonModule, 
        MatInputModule, 
        MatFormFieldModule, 
        CommonModule, 
        MatIconModule
    ],
    standalone: true
})
export class TimerSetupComponent {
    newTimerTitle: string = '';
    newTimerMinutes: number = 0;
    newTimerSeconds: number = 0;
    newRestMinutes: number = 0;
    newRestSeconds: number = 0;
    newRepeats: number = 0;
    
    timers: Timer[] = [];
    activeTimer: Timer | null = null;

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
        };

        this.timers.push(newTimer);

        this.resetForm();
        this.saveTimers()
    }
    
    deleteTimer(timerId: number) {
        this.timers = this.timers.filter(timer => timer.id !== timerId);
        this.saveTimers;
    }

    resetForm() {
        this.newTimerTitle = '';
        this.newTimerMinutes = 0;
        this.newTimerSeconds = 0;
        this.newRestMinutes = 0;
        this.newRestSeconds = 0;
        this.newRepeats = 0;
    }

    saveTimers() {
        localStorage.setItem('timers', JSON.stringify(this.timers))
    }

    startTimer(timer: Timer) {
        this.activeTimer = timer;
    }

    onTimerStarted(timer: Timer) {
        console.log("Timer received in TimerSetupComponent", timer);
        this.activeTimer = timer;
      }
}
