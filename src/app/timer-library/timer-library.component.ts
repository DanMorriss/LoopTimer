import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';


@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [MatButtonModule, MatTooltipModule, MatIconModule],
})
export class TimerLibraryComponent {

    constructor(public timerStore: TimerStore, private router: Router) {}
    
    deleteTimer(timerId: number) {
        this.timerStore.deleteTimer(timerId);
    }

    startTimer(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
        this.router.navigate(['/timer']);
    }

    onTimerStarted(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
    }
}
