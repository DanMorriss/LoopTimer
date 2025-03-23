import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Timer } from '../models/timer';


@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [MatButtonModule, MatTooltipModule, MatIconModule]
})
export class TimerLibraryComponent {
    @Input() timers!: () => Timer[];
    
    deleteTimer(timerId: number) {
        console.log("Deleting timer: ", timerId);
    }
}
