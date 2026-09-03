import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
    protected timerPendingDelete = signal<Timer | null>(null);
    protected activeTimerCardId = signal<number | null>(null);
    protected openTimerMenuId = signal<number | null>(null);

    protected isExistingTimers = computed(() => this.timerStore.timers().length > 0);

    requestDelete(timer: Timer) {
        this.activeTimerCardId.set(null);
        this.openTimerMenuId.set(null);
        this.timerPendingDelete.set(timer);
    }

    cancelDelete() {
        this.timerPendingDelete.set(null);
    }

    confirmDelete() {
        const timer = this.timerPendingDelete();
        if (!timer) {
            return;
        }

        this.timerStore.deleteTimer(timer.id);
        this.timerPendingDelete.set(null);
        this.activeTimerCardId.set(null);
        this.openTimerMenuId.set(null);
    }

    setActiveTimerCard(timerId: number) {
        this.activeTimerCardId.set(timerId);
    }

    clearActiveTimerCard() {
        this.activeTimerCardId.set(null);
        this.openTimerMenuId.set(null);
    }

    toggleTimerMenu(timerId: number) {
        this.activeTimerCardId.set(timerId);
        this.openTimerMenuId.update(currentMenuId => currentMenuId === timerId ? null : timerId);
    }

    startTimer(timer: Timer) {
        this.timerStore.setActiveTimer(timer);
        this.router.navigate(['/timer']);
    }

    navigateToCreateTimer() {
        this.router.navigate(['/setup']);
    }

    navigateToEditTimer(timerId: number) {
        this.openTimerMenuId.set(null);
        this.activeTimerCardId.set(null);
        this.router.navigate(['/setup'], { queryParams: { editId: timerId } });
    }

    formatTime(minutes: number, seconds: number): string {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
}
