import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';
import { TimerLibraryComponent } from "../timer-library/timer-library.component";
import { TimerComponent } from '../timer/timer.component';


@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule, 
        MatButtonModule, 
        MatInputModule, 
        MatFormFieldModule, 
        MatIconModule,
        TimerLibraryComponent, 
        TimerComponent,
    ],
})
export class TimerSetupComponent {
    newTimerTitle: string = '';
    newTimerMinutes: number = 0;
    newTimerSeconds: number = 0;
    newRestMinutes: number = 0;
    newRestSeconds: number = 0;
    newRepeats: number = 0;
    
    constructor(public timerStore: TimerStore) {}

    addTimer() {
        const newTimer: Timer = {
            id: Date.now(),
            title: this.newTimerTitle,
            timerMinutes: this.newTimerMinutes,
            timerSeconds: this.newTimerSeconds,
            restMinutes: this.newRestMinutes,
            restSeconds: this.newRestSeconds,
            repeats: this.newRepeats,
            isTimerActive: false,
            isRestActive: false, 
            isComplete: false
        };

        this.timerStore.addTimer(newTimer);
        this.resetForm();
    }
    
    deleteTimer(timerId: number) {
        this.timerStore.deleteTimer(timerId);
    }

    resetForm() {
        this.newTimerTitle = '';
        this.newTimerMinutes = 0;
        this.newTimerSeconds = 0;
        this.newRestMinutes = 0;
        this.newRestSeconds = 0;
        this.newRepeats = 0;
    }

    startTimer(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
    }

    onTimerStarted(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
      }
}
