import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Timer } from '../models/timer';
import { InfinityButtonComponent } from "../shared/components/infinity-button/infinity-button.component";
import { TimerStore } from '../shared/state/timer-store.service';


@Component({
    selector: 'app-timer-library',
    templateUrl: './timer-library.component.html',
    styleUrl: './timer-library.component.scss',
    imports: [MatButtonModule, MatTooltipModule, MatIconModule, InfinityButtonComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerLibraryComponent {
    timerStore = inject(TimerStore);
    router = inject(Router);

    protected isExistingTimers = computed(() => this.timerStore.timers().length > 0);

    deleteTimer(timerId: number) {
        this.timerStore.deleteTimer(timerId);
    }

    startTimer(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
        this.router.navigate(['/timer']);
    }

    navigateToCreateTimer() {
        this.router.navigate(['/setup']);
    }

    formatTime(minutes: number, seconds: number): string {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
}
