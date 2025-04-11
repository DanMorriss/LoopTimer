import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Timer } from '../models/timer';


@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [MatButtonModule, MatTooltipModule, MatIconModule],
    standalone: true
})
export class TimerLibraryComponent {
    readonly timers = input<Timer[]>([]);
    readonly timerDeleted = output<number>();
    readonly timerStarted = output<Timer>();
    
    deleteTimer(timerId: number) {
        this.timerDeleted.emit(timerId);
    }

    startTimer(timer: Timer) {
        this.timerStarted.emit(timer);
    }
}
