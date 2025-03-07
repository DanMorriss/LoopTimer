import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip'
import { Timer } from '../models/timer';


@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [MatButtonModule, MatTooltipModule]
})
export class TimerLibraryComponent {
    @Input() timers: Timer[] = [];
    @Output() timerDeleted = new EventEmitter<number>();
    
    deleteTimer(timerId: number) {
        this.timerDeleted.emit(timerId);
    }
}
