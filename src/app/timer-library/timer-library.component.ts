import { Component, EventEmitter, Input, Output } from '@angular/core';
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
    @Input() timers: Timer[] =[];
    @Output() timerDeleted = new EventEmitter<number>();
    @Output() timerStarted = new EventEmitter<Timer>();
    
    deleteTimer(timerId: number) {
        this.timerDeleted.emit(timerId);
    }

    startTimer(timer: Timer) {
        this.timerStarted.emit(timer);
    }
}
