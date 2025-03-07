import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { Timer } from '../models/timer';
import { TimerLibraryComponent } from "../timer-library/timer-library.component";

@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    imports: [
        FormsModule, 
        MatButtonModule, 
        TimerLibraryComponent, 
        MatInputModule, 
        MatFormFieldModule, 
        CommonModule
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
        const index = this.timers.findIndex(timer => timer.id === timerId);
        if (index !== -1) {
            this.timers.splice(index, 1);
        }

        localStorage.setItem('timers', JSON.stringify(this.timers))
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
    
}
